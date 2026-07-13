create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  secure_url text not null unique check (secure_url ~ '^https://res\.cloudinary\.com/'),
  resource_type text not null default 'image' check (resource_type in ('image', 'video', 'raw')),
  format text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  bytes bigint check (bytes is null or bytes >= 0),
  original_filename text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete restrict,
  alt_text text not null default '',
  sort_order integer not null default 0,
  unique (product_id, media_id)
);

create table public.custom_order_media (
  id uuid primary key default gen_random_uuid(),
  custom_order_id uuid not null references public.custom_orders(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete restrict,
  sort_order integer not null default 0,
  unique (custom_order_id, media_id)
);

create table public.site_media (
  id uuid primary key default gen_random_uuid(),
  placement text not null unique,
  media_id uuid not null references public.media_assets(id) on delete restrict,
  alt_text text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories add column media_id uuid references public.media_assets(id) on delete set null;
alter table public.categories drop column image_url;

alter table public.gallery_items add column media_id uuid references public.media_assets(id) on delete restrict;
alter table public.gallery_items alter column media_id set not null;
alter table public.gallery_items drop column image_url;

alter table public.products drop column images;
alter table public.custom_orders drop column reference_images;

create index product_media_product_sort_idx on public.product_media (product_id, sort_order);
create index custom_order_media_order_sort_idx on public.custom_order_media (custom_order_id, sort_order);
create index site_media_active_idx on public.site_media (is_active, placement);
create trigger site_media_set_updated_at before update on public.site_media for each row execute function public.set_updated_at();

alter table public.media_assets enable row level security;
alter table public.product_media enable row level security;
alter table public.custom_order_media enable row level security;
alter table public.site_media enable row level security;

create policy "media_assets_public_read" on public.media_assets for select to anon, authenticated using (true);
create policy "media_assets_staff_manage" on public.media_assets for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "product_media_public_read" on public.product_media for select to anon, authenticated using (true);
create policy "product_media_staff_manage" on public.product_media for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "custom_order_media_read" on public.custom_order_media for select to authenticated using (
  exists (
    select 1 from public.custom_orders custom_order
    where custom_order.id = custom_order_id
      and (custom_order.user_id = auth.uid() or public.is_staff())
  )
);
create policy "site_media_public_read" on public.site_media for select to anon, authenticated using (is_active or public.is_staff());
create policy "site_media_staff_manage" on public.site_media for all to authenticated using (public.is_staff()) with check (public.is_staff());

create or replace function public.submit_custom_order(request jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order_id uuid;
  new_reference text;
  media_item jsonb;
  new_media_id uuid;
  media_index integer := 0;
begin
  if coalesce(request ->> 'name', '') = ''
    or coalesce(request ->> 'email', '') = ''
    or coalesce(request ->> 'phone', '') = ''
    or coalesce(request ->> 'style', '') = ''
    or coalesce(request ->> 'fabric', '') = '' then
    raise exception 'Missing required custom order details';
  end if;

  if request ? 'media' and jsonb_typeof(request -> 'media') <> 'array' then
    raise exception 'Invalid media payload';
  end if;
  if jsonb_array_length(coalesce(request -> 'media', '[]'::jsonb)) > 5 then
    raise exception 'A maximum of five reference files is allowed';
  end if;

  insert into public.custom_orders (
    user_id, customer_name, email, phone, style, fabric, occasion, budget_range,
    bust_cm, waist_cm, hips_cm, height_cm, notes
  ) values (
    auth.uid(), request ->> 'name', lower(request ->> 'email'), request ->> 'phone',
    request ->> 'style', request ->> 'fabric', nullif(request ->> 'occasion', ''),
    nullif(request ->> 'budget', ''), nullif(request ->> 'bust', '')::numeric,
    nullif(request ->> 'waist', '')::numeric, nullif(request ->> 'hips', '')::numeric,
    nullif(request ->> 'height', '')::numeric, nullif(request ->> 'notes', '')
  ) returning id, reference_number into new_order_id, new_reference;

  for media_item in select value from jsonb_array_elements(coalesce(request -> 'media', '[]'::jsonb)) loop
    if coalesce(media_item ->> 'publicId', '') = ''
      or coalesce(media_item ->> 'secureUrl', '') !~ '^https://res\.cloudinary\.com/' then
      raise exception 'Only Cloudinary media is accepted';
    end if;

    insert into public.media_assets (
      public_id, secure_url, resource_type, format, width, height, bytes, original_filename, created_by
    ) values (
      media_item ->> 'publicId', media_item ->> 'secureUrl', coalesce(media_item ->> 'resourceType', 'image'),
      nullif(media_item ->> 'format', ''), nullif(media_item ->> 'width', '')::integer,
      nullif(media_item ->> 'height', '')::integer, nullif(media_item ->> 'bytes', '')::bigint,
      nullif(media_item ->> 'originalFilename', ''), auth.uid()
    ) on conflict (public_id) do update set secure_url = excluded.secure_url
    returning id into new_media_id;

    insert into public.custom_order_media (custom_order_id, media_id, sort_order)
    values (new_order_id, new_media_id, media_index);
    media_index := media_index + 1;
  end loop;

  return new_reference;
end;
$$;

revoke all on function public.submit_custom_order(jsonb) from public;
grant execute on function public.submit_custom_order(jsonb) to anon, authenticated;

grant select on public.media_assets, public.product_media, public.site_media to anon, authenticated;
grant select on public.custom_order_media to authenticated;
grant insert, update, delete on public.media_assets, public.product_media, public.site_media to authenticated;
