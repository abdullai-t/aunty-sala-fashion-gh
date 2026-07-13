-- Remove only the demonstration catalogue inserted by the initial migration.
-- Historical order items are preserved; their product_id becomes null through
-- the existing foreign key while product_name, SKU, price, and quantity remain.
delete from public.products
where sku in (
  'ASF-DRESS-001',
  'ASF-GOWN-001',
  'ASF-TOP-001',
  'ASF-SKIRT-001',
  'ASF-DRESS-002',
  'ASF-SET-001',
  'ASF-GOWN-002',
  'ASF-JUMP-001'
);

delete from public.categories category
where not exists (
  select 1
  from public.products product
  where product.category_id = category.id
);
