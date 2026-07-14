alter table public.custom_orders
  add column currency text not null default 'GHS' check (currency ~ '^[A-Z]{3}$'),
  add column payment_plan text not null default 'full' check (payment_plan in ('full', 'deposit')),
  add column deposit_percentage integer not null default 100 check (deposit_percentage between 1 and 100),
  add column quote_status text not null default 'pending' check (quote_status in ('pending', 'sent', 'accepted', 'declined')),
  add column quoted_at timestamptz,
  add column accepted_at timestamptz,
  add column payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'partially_paid', 'paid', 'refunded')),
  add column amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  add column quote_version integer not null default 0 check (quote_version >= 0);

create table public.custom_order_payments (
  id uuid primary key default gen_random_uuid(),
  custom_order_id uuid not null references public.custom_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_kind text not null check (payment_kind in ('deposit', 'balance', 'full')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'GHS' check (currency ~ '^[A-Z]{3}$'),
  paystack_reference text not null unique,
  paystack_transaction_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_order_payments_order_created_idx on public.custom_order_payments (custom_order_id, created_at desc);
create index custom_order_payments_user_created_idx on public.custom_order_payments (user_id, created_at desc);
create trigger custom_order_payments_set_updated_at before update on public.custom_order_payments
  for each row execute function public.set_updated_at();

alter table public.custom_order_payments enable row level security;
create policy "custom_order_payments_read_own_or_staff" on public.custom_order_payments
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
grant select on public.custom_order_payments to authenticated;

create or replace function public.admin_set_custom_order_quote(
  custom_order_id_input uuid,
  quoted_price_input numeric,
  due_date_input date,
  payment_plan_input text,
  deposit_percentage_input integer default 50
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.custom_orders%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Staff access is required' using errcode = '42501';
  end if;
  if quoted_price_input is null or quoted_price_input <= 0 then raise exception 'The quoted price must be greater than zero'; end if;
  if payment_plan_input not in ('full', 'deposit') then raise exception 'Invalid payment plan'; end if;
  if payment_plan_input = 'deposit' and deposit_percentage_input not between 1 and 99 then raise exception 'Deposit percentage must be between 1 and 99'; end if;

  select * into target from public.custom_orders where id = custom_order_id_input for update;
  if target.id is null then raise exception 'Custom order was not found'; end if;
  if target.amount_paid > 0 and (
    target.quoted_price is distinct from quoted_price_input
    or target.payment_plan is distinct from payment_plan_input
    or target.deposit_percentage is distinct from deposit_percentage_input
  ) then
    raise exception 'The price or payment plan cannot change after a payment';
  end if;

  update public.custom_orders
  set quoted_price = quoted_price_input,
      due_date = due_date_input,
      payment_plan = payment_plan_input,
      deposit_percentage = case when payment_plan_input = 'deposit' then deposit_percentage_input else 100 end,
      quote_status = case when amount_paid > 0 then 'accepted' else 'sent' end,
      quoted_at = now(),
      quote_version = quote_version + 1,
      status = case when status = 'new' then 'quoted'::public.custom_order_status else status end
  where id = custom_order_id_input;
end;
$$;

create or replace function public.create_custom_payment_attempt(custom_order_id_input uuid)
returns table (
  payment_id uuid,
  custom_order_reference text,
  paystack_reference text,
  amount numeric,
  currency text,
  payment_kind text,
  customer_email text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.custom_orders%rowtype;
  due_amount numeric(12,2);
  kind text;
  new_payment_id uuid;
  new_reference text;
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  select * into target from public.custom_orders where id = custom_order_id_input and user_id = auth.uid() for update;
  if target.id is null then raise exception 'Custom order was not found'; end if;
  if target.quoted_price is null or target.quote_status not in ('sent', 'accepted') then raise exception 'This custom order is not ready for payment'; end if;
  if target.payment_status = 'paid' then raise exception 'This custom order is already fully paid'; end if;

  if target.payment_plan = 'deposit' and target.amount_paid = 0 then
    due_amount := round(target.quoted_price * target.deposit_percentage / 100.0, 2);
    kind := 'deposit';
  else
    due_amount := round(target.quoted_price - target.amount_paid, 2);
    kind := case when target.amount_paid > 0 then 'balance' else 'full' end;
  end if;
  if due_amount <= 0 then raise exception 'No payment is currently due'; end if;

  update public.custom_order_payments
  set status = 'failed'
  where custom_order_id = target.id and status = 'pending';

  new_reference := 'ASFC-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.custom_order_payments (custom_order_id, user_id, payment_kind, amount, currency, paystack_reference)
  values (target.id, auth.uid(), kind, due_amount, target.currency, new_reference)
  returning id into new_payment_id;

  update public.custom_orders
  set quote_status = 'accepted', accepted_at = coalesce(accepted_at, now())
  where id = target.id;

  return query select new_payment_id, target.reference_number, new_reference, due_amount, target.currency, kind, target.email;
end;
$$;

create or replace function public.finalize_custom_order_payment(
  paystack_reference_input text,
  amount_minor_input bigint,
  currency_input text,
  transaction_id_input text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment public.custom_order_payments%rowtype;
  target public.custom_orders%rowtype;
  next_amount_paid numeric(12,2);
begin
  select * into payment from public.custom_order_payments where paystack_reference = paystack_reference_input for update;
  if payment.id is null then raise exception 'Custom payment was not found'; end if;
  select * into target from public.custom_orders where id = payment.custom_order_id for update;
  if target.id is null then raise exception 'Custom order was not found'; end if;
  if payment.status = 'paid' then return target.reference_number; end if;
  if payment.status <> 'pending' then raise exception 'Custom payment is no longer active'; end if;
  if amount_minor_input <> round(payment.amount * 100)::bigint
    or upper(currency_input) <> payment.currency then
    raise exception 'Payment verification did not match the custom order';
  end if;

  next_amount_paid := least(target.quoted_price, target.amount_paid + payment.amount);
  update public.custom_orders
  set amount_paid = next_amount_paid,
      payment_status = case when next_amount_paid >= quoted_price then 'paid' else 'partially_paid' end,
      quote_status = 'accepted',
      accepted_at = coalesce(accepted_at, now()),
      status = case when status in ('new', 'reviewing', 'quoted') then 'measuring'::public.custom_order_status else status end
  where id = target.id;

  update public.custom_order_payments
  set status = 'paid', paid_at = now(), paystack_transaction_id = transaction_id_input
  where id = payment.id;

  return target.reference_number;
end;
$$;

revoke all on function public.admin_set_custom_order_quote(uuid, numeric, date, text, integer) from public;
revoke all on function public.create_custom_payment_attempt(uuid) from public;
revoke all on function public.finalize_custom_order_payment(text, bigint, text, text) from public;
grant execute on function public.admin_set_custom_order_quote(uuid, numeric, date, text, integer) to authenticated;
grant execute on function public.create_custom_payment_attempt(uuid) to authenticated;
grant execute on function public.finalize_custom_order_payment(text, bigint, text, text) to service_role;

create or replace function public.enqueue_custom_quote_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb;
begin
  if new.quote_status <> 'sent' or new.quote_version = old.quote_version then return new; end if;
  payload := jsonb_build_object(
    'reference', new.reference_number, 'customerName', new.customer_name,
    'total', new.quoted_price, 'currency', new.currency,
    'paymentPlan', new.payment_plan, 'depositPercentage', new.deposit_percentage,
    'whatsappText', 'Your custom order ' || new.reference_number || ' quote is ready: ' || new.currency || ' ' || new.quoted_price::text || '. Sign in to review and pay.'
  );
  perform public.enqueue_notification('custom_quote_ready', 'email', new.email, 'Quote ready for ' || new.reference_number, payload, 'custom-quote:' || new.id::text || ':' || new.quote_version::text || ':email');
  perform public.enqueue_notification('custom_quote_ready', 'whatsapp', new.phone, null, payload, 'custom-quote:' || new.id::text || ':' || new.quote_version::text || ':whatsapp');
  return new;
end;
$$;

create trigger enqueue_custom_quote_after_update
  after update of quote_status, quote_version on public.custom_orders
  for each row execute function public.enqueue_custom_quote_notification();

create or replace function public.enqueue_custom_payment_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.custom_orders%rowtype;
  admin_email text := public.notification_setting('notification_admin_email', 'store_email');
  admin_whatsapp text := public.notification_setting('notification_admin_whatsapp', 'whatsapp_number');
  payload jsonb;
begin
  if new.status <> 'paid' or old.status = 'paid' then return new; end if;
  select * into target from public.custom_orders where id = new.custom_order_id;
  payload := jsonb_build_object(
    'reference', target.reference_number, 'customerName', target.customer_name,
    'customerEmail', target.email, 'paymentKind', new.payment_kind,
    'total', new.amount, 'currency', new.currency,
    'amountPaid', target.amount_paid, 'quotedPrice', target.quoted_price,
    'paymentStatus', target.payment_status,
    'whatsappText', 'Custom order ' || target.reference_number || ' received a ' || new.payment_kind || ' payment of ' || new.currency || ' ' || new.amount::text || '.'
  );
  perform public.enqueue_notification('custom_payment_received', 'email', target.email, 'Payment received for ' || target.reference_number, payload, 'custom-payment:' || new.id::text || ':customer-email');
  perform public.enqueue_notification('admin_custom_payment_received', 'email', admin_email, 'Custom order payment ' || target.reference_number, payload, 'custom-payment:' || new.id::text || ':admin-email');
  perform public.enqueue_notification('admin_custom_payment_received', 'whatsapp', admin_whatsapp, null, payload, 'custom-payment:' || new.id::text || ':admin-whatsapp');
  return new;
end;
$$;

create trigger enqueue_custom_payment_after_update
  after update of status on public.custom_order_payments
  for each row execute function public.enqueue_custom_payment_notification();
