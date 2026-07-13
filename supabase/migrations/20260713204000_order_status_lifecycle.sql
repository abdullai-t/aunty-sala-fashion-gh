alter table public.orders alter column status drop default;
alter table public.orders alter column status type text using status::text;

update public.orders
set payment_status = 'paid',
    paid_at = coalesce(paid_at, updated_at, created_at)
where status in ('processing', 'measuring', 'cutting', 'sewing', 'fitting', 'ready', 'shipped', 'delivered')
  and payment_status = 'pending';

update public.orders
set status = case
  when status = 'pending' and payment_status = 'paid' then 'paid'
  when status = 'pending' then 'draft'
  when status in ('measuring', 'cutting', 'sewing', 'fitting', 'ready') then 'processing'
  else status
end;

drop type public.order_status;
create type public.order_status as enum ('draft', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');

alter table public.orders
  alter column status type public.order_status using status::public.order_status,
  alter column status set default 'draft';

alter table public.orders add constraint orders_fulfilment_requires_payment
  check (status not in ('paid', 'processing', 'shipped', 'delivered') or payment_status = 'paid');

create or replace function public.finalize_paid_checkout(
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
  target_order public.orders;
begin
  select * into target_order from public.orders where paystack_reference = paystack_reference_input for update;
  if not found then raise exception 'Checkout order was not found'; end if;
  if target_order.payment_status = 'paid' then return target_order.order_number; end if;
  if target_order.payment_status <> 'pending' then raise exception 'Checkout reservation is no longer active'; end if;
  if round(target_order.total * 100)::bigint <> amount_minor_input then raise exception 'Payment amount does not match'; end if;
  if target_order.currency <> upper(currency_input) then raise exception 'Payment currency does not match'; end if;

  update public.orders set
    payment_status = 'paid',
    status = 'paid',
    paid_at = now(),
    paystack_transaction_id = transaction_id_input
  where id = target_order.id;
  update public.inventory_reservations set status = 'converted'
    where order_id = target_order.id and status = 'reserved';
  return target_order.order_number;
end;
$$;

revoke all on function public.finalize_paid_checkout(text, bigint, text, text) from public;
grant execute on function public.finalize_paid_checkout(text, bigint, text, text) to service_role;
