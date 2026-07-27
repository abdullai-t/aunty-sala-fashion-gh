-- Client-specific commerce defaults. Every client deployment keeps its own
-- Supabase project, so these values can be changed without tenant leakage.
insert into public.store_settings (key, value, is_public)
values
  ('brand_name', '"Aunty Sala Fashion Gh"'::jsonb, true),
  ('currency', '"GHS"'::jsonb, true),
  ('country_name', '"Ghana"'::jsonb, true),
  ('country_code', '"GH"'::jsonb, true),
  ('order_prefix', '"ASF"'::jsonb, false),
  ('custom_order_prefix', '"CUSTOM"'::jsonb, false)
on conflict (key) do nothing;

create or replace function public.store_setting_text(setting_name text, fallback text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select nullif(trim(setting.value #>> '{}'), '')
     from public.store_settings setting
     where setting.key = setting_name),
    fallback
  );
$$;

alter table public.orders drop constraint if exists orders_currency_check;
alter table public.orders
  add constraint orders_currency_check check (currency ~ '^[A-Z]{3}$');

alter table public.custom_orders drop constraint if exists custom_orders_currency_check;
alter table public.custom_orders
  add constraint custom_orders_currency_check check (currency ~ '^[A-Z]{3}$');

alter table public.custom_order_payments drop constraint if exists custom_order_payments_currency_check;
alter table public.custom_order_payments
  add constraint custom_order_payments_currency_check check (currency ~ '^[A-Z]{3}$');

create or replace function public.next_order_number()
returns text
language sql
security definer
set search_path = ''
as $$
  select '#' || public.store_setting_text('order_prefix', 'ORDER') || '-' || nextval('public.order_number_seq')::text;
$$;

create or replace function public.next_custom_order_number()
returns text
language sql
security definer
set search_path = ''
as $$
  select '#' || public.store_setting_text('custom_order_prefix', 'CUSTOM') || '-' || upper(substr(gen_random_uuid()::text, 1, 8));
$$;

alter table public.custom_orders
  alter column reference_number set default public.next_custom_order_number();

create or replace function public.apply_client_order_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  configured_currency text := upper(public.store_setting_text('currency', 'GHS'));
  configured_country text := public.store_setting_text('country_name', 'Ghana');
  payment_prefix text := upper(public.store_setting_text('order_prefix', 'ORDER'));
begin
  new.currency := configured_currency;
  if nullif(trim(new.shipping_country), '') is null then
    new.shipping_country := configured_country;
  end if;
  if new.paystack_reference is not null then
    new.paystack_reference := payment_prefix || '-' || upper(replace(gen_random_uuid()::text, '-', ''));
  end if;
  return new;
end;
$$;

drop trigger if exists orders_apply_client_defaults on public.orders;
create trigger orders_apply_client_defaults
  before insert on public.orders
  for each row execute function public.apply_client_order_defaults();

create or replace function public.apply_client_custom_order_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.currency := upper(public.store_setting_text('currency', 'GHS'));
  return new;
end;
$$;

drop trigger if exists custom_orders_apply_client_defaults on public.custom_orders;
create trigger custom_orders_apply_client_defaults
  before insert on public.custom_orders
  for each row execute function public.apply_client_custom_order_defaults();

create or replace function public.enqueue_account_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_name text := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
  admin_email text := public.notification_setting('notification_admin_email', 'store_email');
  configured_brand text := public.store_setting_text('brand_name', 'Our store');
begin
  perform public.enqueue_notification(
    'account_created', 'email', new.email, 'Welcome to ' || configured_brand,
    jsonb_build_object('customerName', customer_name),
    'account-created:user:' || new.id::text
  );
  perform public.enqueue_notification(
    'admin_account_created', 'email', admin_email, 'New customer account created',
    jsonb_build_object('customerName', customer_name, 'customerEmail', new.email),
    'account-created:admin:' || new.id::text
  );
  return new;
end;
$$;

create or replace function public.enqueue_newsletter_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_active then
    perform public.enqueue_notification(
      'newsletter_subscribed', 'email', new.email,
      'Welcome to the ' || public.store_setting_text('brand_name', 'store') || ' newsletter',
      jsonb_build_object('customerEmail', new.email),
      'newsletter:' || new.id::text || ':welcome'
    );
  end if;
  return new;
end;
$$;
