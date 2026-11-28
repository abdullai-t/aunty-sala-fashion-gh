create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid,
  changed_by_role text,
  changed_at timestamptz not null default clock_timestamp()
);

-- make table append only


create or replace function public.enforce_order_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Allow a same-status update as a no-op.
  -- Reject invalid status transitions with errcode 23514.
  return new;
end;
$$;

create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- skip logging when an update does not change status.
  -- insert one history row for each real status change.
  return new;
end;
$$;
