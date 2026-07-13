create or replace function public.admin_directory()
returns table (
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  admin_user_id uuid,
  admin_role public.admin_role,
  admin_is_active boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Staff access is required' using errcode = '42501';
  end if;

  return query
  select
    auth_user.id,
    auth_user.email::text,
    profile.full_name,
    auth_user.created_at,
    admin_user.id,
    admin_user.role,
    admin_user.is_active
  from auth.users auth_user
  left join public.profiles profile on profile.user_id = auth_user.id
  left join public.admin_users admin_user on admin_user.user_id = auth_user.id
  order by auth_user.created_at desc;
end;
$$;

create or replace function public.add_admin_user_by_email(
  user_email text,
  requested_role public.admin_role default 'staff'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  membership_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  select auth_user.id into target_user_id
  from auth.users auth_user
  where lower(auth_user.email) = lower(trim(user_email));

  if target_user_id is null then
    raise exception 'No authenticated user exists with that email';
  end if;

  insert into public.admin_users (user_id, role, is_active, created_by)
  values (target_user_id, requested_role, true, auth.uid())
  on conflict (user_id) do update set
    role = excluded.role,
    is_active = true,
    updated_at = now()
  returning id into membership_id;

  return membership_id;
end;
$$;

create or replace function public.set_admin_user_access(
  admin_membership_id uuid,
  requested_role public.admin_role,
  requested_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  select admin_user.user_id into target_user_id
  from public.admin_users admin_user
  where admin_user.id = admin_membership_id;

  if target_user_id is null then
    raise exception 'Admin membership was not found';
  end if;
  if target_user_id = auth.uid() and not requested_active then
    raise exception 'You cannot deactivate your own admin access';
  end if;

  update public.admin_users
  set role = requested_role,
      is_active = requested_active,
      updated_at = now()
  where id = admin_membership_id;
end;
$$;

revoke all on function public.admin_directory() from public;
revoke all on function public.add_admin_user_by_email(text, public.admin_role) from public;
revoke all on function public.set_admin_user_access(uuid, public.admin_role, boolean) from public;
grant execute on function public.admin_directory() to authenticated;
grant execute on function public.add_admin_user_by_email(text, public.admin_role) to authenticated;
grant execute on function public.set_admin_user_access(uuid, public.admin_role, boolean) to authenticated;
