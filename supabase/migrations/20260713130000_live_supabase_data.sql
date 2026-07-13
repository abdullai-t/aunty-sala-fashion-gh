create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.categories (name, slug, sort_order)
select distinct category, lower(regexp_replace(trim(category), '[^a-zA-Z0-9]+', '-', 'g')), 0
from public.products
on conflict (name) do nothing;

alter table public.products add column category_id uuid;
update public.products p set category_id = c.id from public.categories c where c.name = p.category;
alter table public.products alter column category_id set not null;
drop index if exists public.products_active_category_idx;
alter table public.products drop column category;
alter table public.products add constraint products_category_id_fkey foreign key (category_id) references public.categories(id) on delete restrict;

alter table public.products add column new_id uuid not null default gen_random_uuid();
alter table public.order_items add column new_product_id uuid;
update public.order_items oi set new_product_id = p.new_id from public.products p where oi.product_id = p.id;
alter table public.order_items drop constraint order_items_product_id_fkey;
alter table public.order_items drop column product_id;
alter table public.order_items rename column new_product_id to product_id;
alter table public.products drop constraint products_pkey;
alter table public.products drop column id;
alter table public.products rename column new_id to id;
alter table public.products add primary key (id);
alter table public.order_items add constraint order_items_product_id_fkey foreign key (product_id) references public.products(id) on delete set null;
drop sequence if exists public.products_id_seq;

create index categories_active_sort_idx on public.categories (is_active, sort_order);
create index products_active_category_idx on public.products (is_active, category_id);
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
create policy "categories_public_read" on public.categories for select to anon, authenticated using (is_active or public.is_staff());
create policy "categories_staff_insert" on public.categories for insert to authenticated with check (public.is_staff());
create policy "categories_staff_update" on public.categories for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "categories_staff_delete" on public.categories for delete to authenticated using (public.is_staff());

create or replace function public.place_store_order(customer jsonb, items jsonb, payment_method_input text)
returns table (order_id uuid, order_number text, total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order public.orders;
  item jsonb;
  product public.products;
  calculated_subtotal numeric(12,2) := 0;
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then raise exception 'Your cart is empty'; end if;
  if payment_method_input not in ('momo', 'card', 'cash') then raise exception 'Unsupported payment method'; end if;
  if coalesce(customer ->> 'name', '') = '' or coalesce(customer ->> 'email', '') = ''
    or coalesce(customer ->> 'phone', '') = '' or coalesce(customer ->> 'address', '') = ''
    or coalesce(customer ->> 'city', '') = '' then raise exception 'Missing required customer details'; end if;

  for item in select value from jsonb_array_elements(items) loop
    if coalesce((item ->> 'quantity')::integer, 0) not between 1 and 20 then raise exception 'Invalid item quantity'; end if;
    select * into product from public.products p
      where p.id = (item ->> 'product_id')::uuid and p.is_active and p.in_stock;
    if not found then raise exception 'A product is unavailable'; end if;
    calculated_subtotal := calculated_subtotal + (product.price * (item ->> 'quantity')::integer);
  end loop;

  insert into public.orders (user_id, customer_name, customer_email, customer_phone, shipping_address,
    shipping_city, shipping_country, payment_method, subtotal, shipping_fee)
  values (auth.uid(), customer ->> 'name', lower(customer ->> 'email'), customer ->> 'phone',
    customer ->> 'address', customer ->> 'city', coalesce(nullif(customer ->> 'country', ''), 'Ghana'),
    payment_method_input, calculated_subtotal, 50) returning * into new_order;

  for item in select value from jsonb_array_elements(items) loop
    select * into product from public.products p where p.id = (item ->> 'product_id')::uuid;
    insert into public.order_items (order_id, product_id, product_name, sku, unit_price, quantity, selected_size, selected_color)
    values (new_order.id, product.id, product.name, product.sku, product.price,
      (item ->> 'quantity')::integer, item ->> 'size', item ->> 'color');
  end loop;
  return query select new_order.id, new_order.order_number, new_order.total;
end;
$$;

create table public.testimonials (
  id uuid primary key default gen_random_uuid(), customer_name text not null, location text,
  rating integer not null check (rating between 1 and 5), body text not null,
  is_active boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.gallery_items (
  id uuid primary key default gen_random_uuid(), image_url text not null, alt_text text not null default '',
  is_active boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.customer_measurements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  bust_cm numeric(6,2), waist_cm numeric(6,2), hips_cm numeric(6,2), height_cm numeric(6,2),
  shoulder_width_cm numeric(6,2), arm_length_cm numeric(6,2),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.addresses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null, address_line text not null, city text not null, country text not null default 'Ghana',
  phone text, is_default boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.wishlists (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade, created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
create table public.store_settings (
  id uuid primary key default gen_random_uuid(), key text not null unique, value jsonb not null,
  is_public boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index testimonials_active_sort_idx on public.testimonials (is_active, sort_order);
create index gallery_items_active_sort_idx on public.gallery_items (is_active, sort_order);
create index addresses_user_idx on public.addresses (user_id, is_default desc);
create index wishlists_user_idx on public.wishlists (user_id, created_at desc);
create trigger testimonials_set_updated_at before update on public.testimonials for each row execute function public.set_updated_at();
create trigger gallery_items_set_updated_at before update on public.gallery_items for each row execute function public.set_updated_at();
create trigger customer_measurements_set_updated_at before update on public.customer_measurements for each row execute function public.set_updated_at();
create trigger addresses_set_updated_at before update on public.addresses for each row execute function public.set_updated_at();
create trigger store_settings_set_updated_at before update on public.store_settings for each row execute function public.set_updated_at();

alter table public.testimonials enable row level security;
alter table public.gallery_items enable row level security;
alter table public.customer_measurements enable row level security;
alter table public.addresses enable row level security;
alter table public.wishlists enable row level security;
alter table public.store_settings enable row level security;
create policy "testimonials_public_read" on public.testimonials for select to anon, authenticated using (is_active or public.is_staff());
create policy "testimonials_staff_manage" on public.testimonials for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "gallery_public_read" on public.gallery_items for select to anon, authenticated using (is_active or public.is_staff());
create policy "gallery_staff_manage" on public.gallery_items for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "measurements_own_or_staff" on public.customer_measurements for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "measurements_insert_own" on public.customer_measurements for insert to authenticated with check (user_id = auth.uid());
create policy "measurements_update_own_or_staff" on public.customer_measurements for update to authenticated using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());
create policy "addresses_read_own_or_staff" on public.addresses for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "addresses_insert_own" on public.addresses for insert to authenticated with check (user_id = auth.uid());
create policy "addresses_update_own" on public.addresses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "addresses_delete_own" on public.addresses for delete to authenticated using (user_id = auth.uid());
create policy "wishlists_read_own" on public.wishlists for select to authenticated using (user_id = auth.uid());
create policy "wishlists_insert_own" on public.wishlists for insert to authenticated with check (user_id = auth.uid());
create policy "wishlists_delete_own" on public.wishlists for delete to authenticated using (user_id = auth.uid());
create policy "settings_public_read" on public.store_settings for select to anon, authenticated using (is_public or public.is_staff());
create policy "settings_staff_manage" on public.store_settings for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select on public.categories, public.testimonials, public.gallery_items, public.store_settings to anon, authenticated;
grant insert, update, delete on public.categories, public.testimonials, public.gallery_items, public.store_settings to authenticated;
grant select, insert, update on public.customer_measurements to authenticated;
grant select, insert, update, delete on public.addresses, public.wishlists to authenticated;
