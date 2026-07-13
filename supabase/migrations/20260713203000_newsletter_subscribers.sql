create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  is_active boolean not null default true,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create unique index newsletter_subscribers_email_unique
  on public.newsletter_subscribers (lower(email));

alter table public.newsletter_subscribers enable row level security;

create or replace function public.subscribe_to_newsletter(subscriber_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(subscriber_email));
begin
  if normalized_email = '' or normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address';
  end if;

  insert into public.newsletter_subscribers (email)
  values (normalized_email)
  on conflict (lower(email)) do update set
    is_active = true,
    subscribed_at = now(),
    unsubscribed_at = null;
end;
$$;

revoke all on table public.newsletter_subscribers from anon, authenticated;
revoke all on function public.subscribe_to_newsletter(text) from public;
grant execute on function public.subscribe_to_newsletter(text) to anon, authenticated;

