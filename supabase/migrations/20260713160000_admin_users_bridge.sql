create type public.admin_role as enum ('staff', 'admin');

create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.admin_role not null default 'staff',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.admin_users (user_id, role, created_by)
select profile.user_id, profile.role::text::public.admin_role, profile.user_id
from public.profiles profile
where profile.role in ('staff', 'admin')
on conflict (user_id) do update set
  role = excluded.role,
  is_active = true;

create index admin_users_active_role_idx on public.admin_users (is_active, role);
create trigger admin_users_set_updated_at before update on public.admin_users
for each row execute function public.set_updated_at();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users admin_user
    where admin_user.user_id = auth.uid()
      and admin_user.is_active
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users admin_user
    where admin_user.user_id = auth.uid()
      and admin_user.role = 'admin'
      and admin_user.is_active
  );
$$;

alter table public.admin_users enable row level security;

create policy "admin_users_read_self_or_admin"
on public.admin_users for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "admin_users_admin_insert"
on public.admin_users for insert to authenticated
with check (public.is_admin());

create policy "admin_users_admin_update"
on public.admin_users for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "admin_users_admin_delete"
on public.admin_users for delete to authenticated
using (public.is_admin());

alter table public.profiles drop column role;

revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_staff(), public.is_admin() to anon, authenticated;
grant select, insert, update, delete on public.admin_users to authenticated;
