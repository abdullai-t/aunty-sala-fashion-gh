create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  percent_off numeric(5,2) not null check (percent_off > 0 and percent_off <= 100),
  minimum_subtotal numeric(12,2) not null default 0 check (minimum_subtotal >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  times_used integer not null default 0 check (times_used >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.promotions (code, percent_off, minimum_subtotal)
values ('ANTY10', 10, 0)
on conflict (code) do nothing;

alter table public.orders
  add column discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  add column promo_code text,
  add column currency text not null default 'GHS' check (currency = 'GHS'),
  add column checkout_key uuid,
  add column paystack_reference text,
  add column paystack_transaction_id text,
  add column reservation_expires_at timestamptz,
  add column paid_at timestamptz;

alter table public.orders drop column total;
alter table public.orders add column total numeric(12,2)
  generated always as (subtotal - discount_amount + shipping_fee) stored;
alter table public.orders add constraint orders_user_checkout_key_unique unique (user_id, checkout_key);
alter table public.orders add constraint orders_paystack_reference_unique unique (paystack_reference);

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  status text not null default 'reserved' check (status in ('reserved', 'converted', 'released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, product_id)
);

create index inventory_reservations_expiry_idx
  on public.inventory_reservations (status, expires_at) where status = 'reserved';
create trigger promotions_set_updated_at before update on public.promotions
  for each row execute function public.set_updated_at();
create trigger inventory_reservations_set_updated_at before update on public.inventory_reservations
  for each row execute function public.set_updated_at();

alter table public.promotions enable row level security;
alter table public.inventory_reservations enable row level security;
create policy "promotions_staff_manage" on public.promotions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "reservations_read_own_or_staff" on public.inventory_reservations for select to authenticated
  using (public.is_staff() or exists (
    select 1 from public.orders orders where orders.id = order_id and orders.user_id = auth.uid()
  ));

grant select, insert, update, delete on public.promotions to authenticated;
grant select on public.inventory_reservations to authenticated;

create or replace function public.checkout_setting_numeric(setting_name text, fallback numeric)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  raw_value text;
begin
  select setting.value #>> '{}' into raw_value
  from public.store_settings setting where setting.key = setting_name;
  if raw_value is null or raw_value !~ '^[0-9]+(\.[0-9]+)?$' then return fallback; end if;
  return raw_value::numeric;
end;
$$;

create or replace function public.calculate_checkout_quote(items jsonb, promo_code_input text default null)
returns table (
  subtotal numeric,
  discount_amount numeric,
  shipping_fee numeric,
  total numeric,
  promo_applied boolean,
  promo_message text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  item jsonb;
  product public.products;
  calculated_subtotal numeric(12,2) := 0;
  calculated_discount numeric(12,2) := 0;
  calculated_shipping numeric(12,2);
  promotion public.promotions;
  normalized_code text := upper(nullif(trim(promo_code_input), ''));
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Your cart is empty';
  end if;

  for item in select value from jsonb_array_elements(items) loop
    if coalesce((item ->> 'quantity')::integer, 0) not between 1 and 20 then
      raise exception 'Invalid item quantity';
    end if;
    select * into product from public.products p
      where p.id = (item ->> 'product_id')::uuid and p.is_active and p.in_stock;
    if not found or coalesce(product.inventory_quantity, 0) < (item ->> 'quantity')::integer then
      raise exception 'A product does not have enough stock';
    end if;
    calculated_subtotal := calculated_subtotal + product.price * (item ->> 'quantity')::integer;
  end loop;

  if normalized_code is not null then
    select * into promotion from public.promotions p
      where p.code = normalized_code and p.is_active
        and (p.starts_at is null or p.starts_at <= now())
        and (p.ends_at is null or p.ends_at > now())
        and (p.usage_limit is null or p.times_used < p.usage_limit);
    if found and calculated_subtotal >= promotion.minimum_subtotal then
      calculated_discount := round(calculated_subtotal * promotion.percent_off / 100, 2);
    end if;
  end if;

  calculated_shipping := case
    when calculated_subtotal - calculated_discount >= public.checkout_setting_numeric('free_shipping_threshold', 500) then 0
    else public.checkout_setting_numeric('shipping_fee', 50)
  end;

  return query select calculated_subtotal, calculated_discount, calculated_shipping,
    calculated_subtotal - calculated_discount + calculated_shipping,
    calculated_discount > 0,
    case when normalized_code is null then null
      when calculated_discount > 0 then 'Promo code applied.'
      else 'Promo code is invalid or unavailable.' end;
end;
$$;

create or replace function public.create_checkout_order(
  customer jsonb,
  items jsonb,
  promo_code_input text,
  checkout_key_input uuid
)
returns table (
  order_id uuid,
  order_number text,
  paystack_reference text,
  subtotal numeric,
  discount_amount numeric,
  shipping_fee numeric,
  total numeric,
  currency text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_order public.orders;
  new_order public.orders;
  quote record;
  item jsonb;
  locked_product public.products;
  grouped_item record;
  expires_at timestamptz := now() + interval '60 minutes';
  normalized_code text := upper(nullif(trim(promo_code_input), ''));
begin
  if auth.uid() is null then raise exception 'Authentication is required' using errcode = '42501'; end if;
  if checkout_key_input is null then raise exception 'A checkout key is required'; end if;
  if coalesce(customer ->> 'name', '') = '' or coalesce(customer ->> 'phone', '') = ''
    or coalesce(customer ->> 'address', '') = '' or coalesce(customer ->> 'city', '') = '' then
    raise exception 'Missing required customer details';
  end if;

  select * into existing_order from public.orders o
    where o.user_id = auth.uid() and o.checkout_key = checkout_key_input;
  if found then
    return query select existing_order.id, existing_order.order_number, existing_order.paystack_reference,
      existing_order.subtotal, existing_order.discount_amount, existing_order.shipping_fee,
      existing_order.total, existing_order.currency;
    return;
  end if;

  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then raise exception 'Your cart is empty'; end if;

  for grouped_item in
    select (value ->> 'product_id')::uuid product_id, sum((value ->> 'quantity')::integer)::integer quantity
    from jsonb_array_elements(items) group by (value ->> 'product_id')::uuid order by product_id
  loop
    if grouped_item.quantity not between 1 and 20 then raise exception 'Invalid item quantity'; end if;
    select * into locked_product from public.products p where p.id = grouped_item.product_id for update;
    if not found or not locked_product.is_active or not locked_product.in_stock
      or coalesce(locked_product.inventory_quantity, 0) < grouped_item.quantity then
      raise exception 'A product does not have enough stock';
    end if;
  end loop;

  select * into quote from public.calculate_checkout_quote(items, normalized_code);

  insert into public.orders (
    user_id, customer_name, customer_email, customer_phone, shipping_address, shipping_city,
    shipping_country, payment_method, payment_status, subtotal, discount_amount, shipping_fee,
    promo_code, currency, checkout_key, paystack_reference, reservation_expires_at
  ) values (
    auth.uid(), customer ->> 'name', lower(coalesce(auth.jwt() ->> 'email', customer ->> 'email')),
    customer ->> 'phone', customer ->> 'address', customer ->> 'city',
    coalesce(nullif(customer ->> 'country', ''), 'Ghana'), 'card', 'pending',
    quote.subtotal, quote.discount_amount, quote.shipping_fee,
    case when quote.promo_applied then normalized_code else null end, 'GHS', checkout_key_input,
    'ASF-' || upper(replace(gen_random_uuid()::text, '-', '')), expires_at
  ) returning * into new_order;

  for item in select value from jsonb_array_elements(items) loop
    select * into locked_product from public.products p where p.id = (item ->> 'product_id')::uuid;
    insert into public.order_items (
      order_id, product_id, product_name, sku, unit_price, quantity, selected_size, selected_color
    ) values (
      new_order.id, locked_product.id, locked_product.name, locked_product.sku, locked_product.price,
      (item ->> 'quantity')::integer, item ->> 'size', item ->> 'color'
    );
  end loop;

  for grouped_item in
    select (value ->> 'product_id')::uuid product_id, sum((value ->> 'quantity')::integer)::integer quantity
    from jsonb_array_elements(items) group by (value ->> 'product_id')::uuid
  loop
    update public.products set
      inventory_quantity = inventory_quantity - grouped_item.quantity,
      in_stock = inventory_quantity - grouped_item.quantity > 0
    where id = grouped_item.product_id;
    insert into public.inventory_reservations (order_id, product_id, quantity, expires_at)
      values (new_order.id, grouped_item.product_id, grouped_item.quantity, expires_at);
  end loop;

  if quote.promo_applied then
    update public.promotions set times_used = times_used + 1 where code = normalized_code;
  end if;

  return query select new_order.id, new_order.order_number, new_order.paystack_reference,
    new_order.subtotal, new_order.discount_amount, new_order.shipping_fee, new_order.total, new_order.currency;
end;
$$;

create or replace function public.release_checkout_order(order_id_input uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders;
  reservation record;
begin
  select * into target_order from public.orders where id = order_id_input for update;
  if not found then return; end if;
  if auth.role() <> 'service_role' and target_order.user_id <> auth.uid() then
    raise exception 'You cannot release this checkout' using errcode = '42501';
  end if;
  if target_order.payment_status <> 'pending' then return; end if;

  for reservation in select * from public.inventory_reservations
    where order_id = target_order.id and status = 'reserved' for update
  loop
    update public.products set inventory_quantity = inventory_quantity + reservation.quantity, in_stock = is_active
      where id = reservation.product_id;
    update public.inventory_reservations set status = 'released' where id = reservation.id;
  end loop;
  update public.orders set payment_status = 'failed', status = 'cancelled' where id = target_order.id;
  if target_order.promo_code is not null then
    update public.promotions set times_used = greatest(times_used - 1, 0) where code = target_order.promo_code;
  end if;
end;
$$;

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

  update public.orders set payment_status = 'paid', paid_at = now(), paystack_transaction_id = transaction_id_input
    where id = target_order.id;
  update public.inventory_reservations set status = 'converted'
    where order_id = target_order.id and status = 'reserved';
  return target_order.order_number;
end;
$$;

create or replace function public.release_expired_checkout_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_order record;
  released_count integer := 0;
begin
  for expired_order in select id from public.orders
    where payment_status = 'pending' and reservation_expires_at < now()
    order by reservation_expires_at for update skip locked
  loop
    perform public.release_checkout_order(expired_order.id);
    released_count := released_count + 1;
  end loop;
  return released_count;
end;
$$;

revoke all on function public.checkout_setting_numeric(text, numeric) from public;
revoke all on function public.calculate_checkout_quote(jsonb, text) from public;
revoke all on function public.create_checkout_order(jsonb, jsonb, text, uuid) from public;
revoke all on function public.release_checkout_order(uuid) from public;
revoke all on function public.finalize_paid_checkout(text, bigint, text, text) from public;
revoke all on function public.release_expired_checkout_orders() from public;
revoke execute on function public.place_store_order(jsonb, jsonb, text) from anon, authenticated;

grant execute on function public.calculate_checkout_quote(jsonb, text) to anon, authenticated;
grant execute on function public.create_checkout_order(jsonb, jsonb, text, uuid) to authenticated;
grant execute on function public.release_checkout_order(uuid) to authenticated, service_role;
grant execute on function public.finalize_paid_checkout(text, bigint, text, text) to service_role;
grant execute on function public.release_expired_checkout_orders() to service_role;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
  'release-expired-checkouts',
  '*/5 * * * *',
  'select public.release_expired_checkout_orders()'
)
where not exists (select 1 from cron.job where jobname = 'release-expired-checkouts');
