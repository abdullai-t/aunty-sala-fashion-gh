insert into public.categories (id, name, slug, description, sort_order)
values
  ('a1000000-0000-4000-8000-000000000001', 'Dresses', 'dresses', 'Contemporary dresses in Ghanaian fabrics.', 1),
  ('a1000000-0000-4000-8000-000000000002', 'Sets', 'sets', 'Coordinated tops and bottoms.', 2)
on conflict do nothing;

insert into public.media_assets (
  public_id, secure_url, resource_type, format, width, height, bytes, original_filename
) values
  (
    'aunty-sala-fashion-gh/products/2026-permutations/esnchgaxdjtzr2pnym7h',
    'https://res.cloudinary.com/db0ks5lky/image/upload/v1784116863/aunty-sala-fashion-gh/products/2026-permutations/esnchgaxdjtzr2pnym7h.webp',
    'image', 'webp', 1200, 1600, 122352, 'ama-sika-kente-blazer-dress'
  ),
  (
    'aunty-sala-fashion-gh/products/2026-permutations/kdwv5uhticdwuduqxuzo',
    'https://res.cloudinary.com/db0ks5lky/image/upload/v1784116861/aunty-sala-fashion-gh/products/2026-permutations/kdwv5uhticdwuduqxuzo.webp',
    'image', 'webp', 1200, 1600, 154578, 'adom-sika-kente-trouser-set'
  ),
  (
    'aunty-sala-fashion-gh/products/2026-permutations/srcwnh7ubd0boyyslk75',
    'https://res.cloudinary.com/db0ks5lky/image/upload/v1784116865/aunty-sala-fashion-gh/products/2026-permutations/srcwnh7ubd0boyyslk75.webp',
    'image', 'webp', 1200, 1600, 173280, 'efe-indigo-batik-midi-dress'
  ),
  (
    'aunty-sala-fashion-gh/products/2026-permutations/gfdtilidphmdforkkqlj',
    'https://res.cloudinary.com/db0ks5lky/image/upload/v1784116867/aunty-sala-fashion-gh/products/2026-permutations/gfdtilidphmdforkkqlj.webp',
    'image', 'webp', 1200, 1600, 205902, 'nhyira-indigo-batik-kimono-set'
  )
on conflict (public_id) do update
set secure_url = excluded.secure_url,
    resource_type = excluded.resource_type,
    format = excluded.format,
    width = excluded.width,
    height = excluded.height,
    bytes = excluded.bytes,
    original_filename = excluded.original_filename;

insert into public.products (
  id, sku, slug, name, description, price, fabric, category_id,
  sizes, colors, badge, in_stock, is_active, inventory_quantity
) values
  (
    '0125cd63-7f67-4751-aa38-0bc25d7a324e'::uuid,
    'ASF-KEN-BLD-001',
    'ama-sika-kente-blazer-dress',
    'Ama Sika Kente Blazer Dress',
    'A polished sleeveless blazer dress tailored in emerald, antique-gold and burnt-orange mosaic Kente. Finished with a defined waist, double-breasted buttons and an elegant below-knee hem.',
    790.00,
    'Kente',
    'a1000000-0000-4000-8000-000000000001'::uuid,
    array['XS','S','M','L','XL'],
    array['Emerald','Antique Gold','Burnt Orange'],
    'New', true, true, 10
  ),
  (
    '84935f20-2e96-4333-ae08-d4577d4f18e6'::uuid,
    'ASF-KEN-SET-001',
    'adom-sika-kente-trouser-set',
    'Adom Sika Kente Trouser Set',
    'A statement one-shoulder peplum top with matching high-waisted wide-leg trousers, cut from the same emerald, antique-gold and burnt-orange mosaic Kente as the Ama Sika dress.',
    840.00,
    'Kente',
    'a1000000-0000-4000-8000-000000000002'::uuid,
    array['XS','S','M','L','XL'],
    array['Emerald','Antique Gold','Burnt Orange'],
    'New', true, true, 8
  ),
  (
    'fa6a9929-218c-4e71-8f3e-d1815c4e090e'::uuid,
    'ASF-BAT-MID-001',
    'efe-indigo-batik-midi-dress',
    'Efe Indigo Batik Midi Dress',
    'A graceful one-shoulder midi dress in hand-dyed indigo Batik, patterned with organic ivory spirals and copper-dot accents. A gathered waist and flowing skirt create an easy occasion silhouette.',
    640.00,
    'Batik',
    'a1000000-0000-4000-8000-000000000001'::uuid,
    array['XS','S','M','L','XL','XXL'],
    array['Indigo','Ivory','Copper'],
    'New', true, true, 12
  ),
  (
    'fc4f2bef-5c46-4600-a8d4-1e63670740d2'::uuid,
    'ASF-BAT-KIM-001',
    'nhyira-indigo-batik-kimono-set',
    'Nhyira Indigo Batik Kimono Set',
    'A flowing longline kimono and palazzo-trouser set made from the same indigo spiral Batik as the Efe midi dress, styled with a clean ivory camisole for effortless versatility.',
    720.00,
    'Batik',
    'a1000000-0000-4000-8000-000000000002'::uuid,
    array['XS','S','M','L','XL','XXL'],
    array['Indigo','Ivory','Copper'],
    'New', true, true, 9
  )
on conflict (id) do update
set sku = excluded.sku,
    slug = excluded.slug,
    name = excluded.name,
    description = excluded.description,
    price = excluded.price,
    fabric = excluded.fabric,
    category_id = excluded.category_id,
    sizes = excluded.sizes,
    colors = excluded.colors,
    badge = excluded.badge,
    in_stock = excluded.in_stock,
    is_active = excluded.is_active,
    inventory_quantity = excluded.inventory_quantity,
    updated_at = now();

with product_images(product_id, public_id, alt_text) as (
  values
    (
      '0125cd63-7f67-4751-aa38-0bc25d7a324e'::uuid,
      'aunty-sala-fashion-gh/products/2026-permutations/esnchgaxdjtzr2pnym7h',
      'Model wearing the Ama Sika Kente Blazer Dress'
    ),
    (
      '84935f20-2e96-4333-ae08-d4577d4f18e6'::uuid,
      'aunty-sala-fashion-gh/products/2026-permutations/kdwv5uhticdwuduqxuzo',
      'Model wearing the Adom Sika Kente Trouser Set'
    ),
    (
      'fa6a9929-218c-4e71-8f3e-d1815c4e090e'::uuid,
      'aunty-sala-fashion-gh/products/2026-permutations/srcwnh7ubd0boyyslk75',
      'Model wearing the Efe Indigo Batik Midi Dress'
    ),
    (
      'fc4f2bef-5c46-4600-a8d4-1e63670740d2'::uuid,
      'aunty-sala-fashion-gh/products/2026-permutations/gfdtilidphmdforkkqlj',
      'Model wearing the Nhyira Indigo Batik Kimono Set'
    )
)
insert into public.product_media (product_id, media_id, alt_text, sort_order)
select product_images.product_id, media_assets.id, product_images.alt_text, 0
from product_images
join public.media_assets on media_assets.public_id = product_images.public_id
on conflict (product_id, media_id) do update
set alt_text = excluded.alt_text,
    sort_order = excluded.sort_order;
