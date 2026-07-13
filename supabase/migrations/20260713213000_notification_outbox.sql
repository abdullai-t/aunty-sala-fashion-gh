create extension if not exists pg_net with schema extensions;

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  channel text not null check (channel in ('email', 'whatsapp')),
  recipient text not null,
  subject text,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 8 check (max_attempts between 1 and 20),
  next_attempt_at timestamptz not null default now(),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notification_outbox_pending_idx
  on public.notification_outbox (next_attempt_at, created_at)
  where status = 'pending';

create trigger notification_outbox_set_updated_at
  before update on public.notification_outbox
  for each row execute function public.set_updated_at();

alter table public.notification_outbox enable row level security;
create policy "notification_outbox_staff_read" on public.notification_outbox
  for select to authenticated using (public.is_staff());
grant select on public.notification_outbox to authenticated;

create table public.notification_runtime_config (
  singleton boolean primary key default true check (singleton),
  dispatch_url text not null,
  publishable_key text not null,
  updated_at timestamptz not null default now()
);
alter table public.notification_runtime_config enable row level security;

create or replace function public.notification_setting(primary_key text, fallback_key text default null)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select nullif(trim(setting.value #>> '{}'), '') from public.store_settings setting where setting.key = primary_key),
    (select nullif(trim(setting.value #>> '{}'), '') from public.store_settings setting where setting.key = fallback_key)
  );
$$;

create or replace function public.enqueue_notification(
  event_type_input text,
  channel_input text,
  recipient_input text,
  subject_input text,
  payload_input jsonb,
  dedupe_key_input text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(trim(recipient_input), '') is null then return; end if;
  insert into public.notification_outbox (event_type, channel, recipient, subject, payload, dedupe_key)
  values (event_type_input, channel_input, trim(recipient_input), subject_input, coalesce(payload_input, '{}'::jsonb), dedupe_key_input)
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.enqueue_account_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_name text := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
  admin_email text := public.notification_setting('notification_admin_email', 'store_email');
begin
  perform public.enqueue_notification(
    'account_created', 'email', new.email, 'Welcome to Aunty Sala Fashion Gh',
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

create trigger enqueue_account_notifications_after_insert
  after insert on auth.users
  for each row execute function public.enqueue_account_notifications();

create or replace function public.enqueue_order_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_email text := public.notification_setting('notification_admin_email', 'store_email');
  admin_whatsapp text := public.notification_setting('notification_admin_whatsapp', 'whatsapp_number');
  event_name text;
  customer_subject text;
  event_payload jsonb;
begin
  if tg_op = 'INSERT' and new.status <> 'paid' then return new; end if;
  if tg_op = 'UPDATE' and new.status = old.status then return new; end if;

  event_name := case when new.status = 'paid' then 'order_paid' else 'order_status_changed' end;
  customer_subject := case
    when new.status = 'paid' then 'Order ' || new.order_number || ' confirmed'
    else 'Order ' || new.order_number || ' is now ' || initcap(new.status::text)
  end;
  event_payload := jsonb_build_object(
    'orderNumber', new.order_number,
    'customerName', new.customer_name,
    'customerEmail', new.customer_email,
    'status', new.status::text,
    'total', new.total,
    'currency', new.currency,
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
      'name', item.product_name,
      'quantity', item.quantity,
      'unitPrice', item.unit_price,
      'size', item.selected_size,
      'color', item.selected_color
    ) order by item.created_at), '[]'::jsonb) from public.order_items item where item.order_id = new.id),
    'whatsappText', 'Order ' || new.order_number || ' for ' || new.customer_name || ' is ' || new.status::text || ' (' || new.currency || ' ' || new.total::text || ').'
  );

  perform public.enqueue_notification(
    event_name, 'email', new.customer_email, customer_subject, event_payload,
    'order:' || new.id::text || ':customer:' || new.status::text
  );

  if new.status = 'paid' then
    perform public.enqueue_notification(
      'admin_order_paid', 'email', admin_email, 'New paid order ' || new.order_number, event_payload,
      'order:' || new.id::text || ':admin-email:paid'
    );
    perform public.enqueue_notification(
      'admin_order_paid', 'whatsapp', admin_whatsapp, null, event_payload,
      'order:' || new.id::text || ':admin-whatsapp:paid'
    );
  end if;
  return new;
end;
$$;

create trigger enqueue_order_notifications_after_change
  after insert or update of status on public.orders
  for each row execute function public.enqueue_order_notifications();

create or replace function public.enqueue_contact_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_email text := public.notification_setting('notification_admin_email', 'store_email');
  admin_whatsapp text := public.notification_setting('notification_admin_whatsapp', 'whatsapp_number');
  event_payload jsonb := jsonb_build_object(
    'customerName', new.name,
    'customerEmail', new.email,
    'subject', new.subject,
    'message', new.message,
    'whatsappText', 'New contact message from ' || new.name || ' (' || new.email || '): ' || new.subject
  );
begin
  perform public.enqueue_notification('contact_submitted', 'email', admin_email, 'Contact form: ' || new.subject, event_payload, 'contact:' || new.id::text || ':admin-email');
  perform public.enqueue_notification('contact_submitted', 'whatsapp', admin_whatsapp, null, event_payload, 'contact:' || new.id::text || ':admin-whatsapp');
  return new;
end;
$$;

create trigger enqueue_contact_notifications_after_insert
  after insert on public.contact_messages
  for each row execute function public.enqueue_contact_notifications();

create or replace function public.enqueue_custom_order_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_email text := public.notification_setting('notification_admin_email', 'store_email');
  admin_whatsapp text := public.notification_setting('notification_admin_whatsapp', 'whatsapp_number');
  event_payload jsonb := jsonb_build_object(
    'reference', new.reference_number,
    'customerName', new.customer_name,
    'customerEmail', new.email,
    'phone', new.phone,
    'style', new.style,
    'fabric', new.fabric,
    'whatsappText', 'New custom order ' || new.reference_number || ' from ' || new.customer_name || ': ' || new.style || ' in ' || new.fabric || '.'
  );
begin
  perform public.enqueue_notification('custom_order_submitted', 'email', new.email, 'Custom order ' || new.reference_number || ' received', event_payload, 'custom-order:' || new.id::text || ':customer-email');
  perform public.enqueue_notification('admin_custom_order_submitted', 'email', admin_email, 'New custom order ' || new.reference_number, event_payload, 'custom-order:' || new.id::text || ':admin-email');
  perform public.enqueue_notification('admin_custom_order_submitted', 'whatsapp', admin_whatsapp, null, event_payload, 'custom-order:' || new.id::text || ':admin-whatsapp');
  return new;
end;
$$;

create trigger enqueue_custom_order_notifications_after_insert
  after insert on public.custom_orders
  for each row execute function public.enqueue_custom_order_notifications();

create or replace function public.enqueue_newsletter_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_active then
    perform public.enqueue_notification(
      'newsletter_subscribed', 'email', new.email, 'Welcome to the Aunty Sala newsletter',
      jsonb_build_object('customerEmail', new.email),
      'newsletter:' || new.id::text || ':welcome'
    );
  end if;
  return new;
end;
$$;

create trigger enqueue_newsletter_notification_after_change
  after insert or update of is_active on public.newsletter_subscribers
  for each row execute function public.enqueue_newsletter_notification();

create or replace function public.claim_notification_batch(batch_size_input integer, channels_input text[])
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.notification_outbox notification
  set status = 'processing', attempts = notification.attempts + 1, updated_at = now()
  where notification.id in (
    select queued.id from public.notification_outbox queued
    where queued.status = 'pending'
      and queued.next_attempt_at <= now()
      and queued.channel = any(channels_input)
    order by queued.created_at
    for update skip locked
    limit greatest(1, least(batch_size_input, 50))
  )
  returning notification.*;
end;
$$;

create or replace function public.complete_notification(
  notification_id_input uuid,
  success_input boolean,
  provider_message_id_input text default null,
  error_input text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notification_outbox notification set
    status = case when success_input then 'sent' when notification.attempts >= notification.max_attempts then 'failed' else 'pending' end,
    provider_message_id = case when success_input then provider_message_id_input else notification.provider_message_id end,
    last_error = case when success_input then null else left(coalesce(error_input, 'Unknown provider error'), 1000) end,
    sent_at = case when success_input then now() else notification.sent_at end,
    next_attempt_at = case when success_input then notification.next_attempt_at else now() + make_interval(mins => least(60, power(2, least(notification.attempts, 6))::integer)) end,
    updated_at = now()
  where notification.id = notification_id_input;
end;
$$;

create or replace function public.configure_notification_dispatch(dispatch_url_input text, publishable_key_input text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if dispatch_url_input !~ '^https://[^/]+\.supabase\.co/functions/v1/notification-dispatch$' then
    raise exception 'Invalid notification dispatch URL';
  end if;
  if nullif(trim(publishable_key_input), '') is null then raise exception 'A publishable key is required'; end if;
  insert into public.notification_runtime_config (singleton, dispatch_url, publishable_key)
  values (true, dispatch_url_input, publishable_key_input)
  on conflict (singleton) do update set dispatch_url = excluded.dispatch_url, publishable_key = excluded.publishable_key, updated_at = now();
end;
$$;

create or replace function public.invoke_notification_dispatch()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  runtime public.notification_runtime_config;
begin
  select * into runtime from public.notification_runtime_config where singleton;
  if not found then return; end if;
  perform net.http_post(
    url := runtime.dispatch_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', runtime.publishable_key),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

select cron.schedule(
  'dispatch-notification-outbox',
  '* * * * *',
  'select public.invoke_notification_dispatch()'
)
where not exists (select 1 from cron.job where jobname = 'dispatch-notification-outbox');

revoke all on function public.notification_setting(text, text) from public;
revoke all on function public.enqueue_notification(text, text, text, text, jsonb, text) from public;
revoke all on function public.claim_notification_batch(integer, text[]) from public;
revoke all on function public.complete_notification(uuid, boolean, text, text) from public;
revoke all on function public.configure_notification_dispatch(text, text) from public;
revoke all on function public.invoke_notification_dispatch() from public;
grant execute on function public.claim_notification_batch(integer, text[]) to service_role;
grant execute on function public.complete_notification(uuid, boolean, text, text) to service_role;
grant execute on function public.configure_notification_dispatch(text, text) to service_role;
