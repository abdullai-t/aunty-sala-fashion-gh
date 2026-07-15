insert into public.media_assets (
  public_id, secure_url, resource_type, format, width, height, bytes, original_filename
) values
  ('aunty-sala/fabrics/ankara', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1784114176/aunty-sala/fabrics/ankara.webp', 'image', 'webp', 1254, 1254, 644502, 'ankara'),
  ('aunty-sala/fabrics/batik', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1784114179/aunty-sala/fabrics/batik.webp', 'image', 'webp', 1254, 1254, 411156, 'batik'),
  ('aunty-sala/fabrics/kente', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1784114181/aunty-sala/fabrics/kente.webp', 'image', 'webp', 1254, 1254, 599610, 'kente'),
  ('aunty-sala/fabrics/mixed', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1784114184/aunty-sala/fabrics/mixed.webp', 'image', 'webp', 1254, 1254, 479224, 'mixed'),
  ('aunty-sala/products/afia-ankara-two-piece-set', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1784114186/aunty-sala/products/afia-ankara-two-piece-set.webp', 'image', 'webp', 1086, 1448, 191828, 'afia-ankara-two-piece-set'),
  ('aunty-sala/products/araba-heritage-maxi-dress', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1784114188/aunty-sala/products/araba-heritage-maxi-dress.webp', 'image', 'webp', 1086, 1448, 290466, 'araba-heritage-maxi-dress'),
  ('aunty-sala/products/esi-indigo-wrap-skirt', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1784114190/aunty-sala/products/esi-indigo-wrap-skirt.webp', 'image', 'webp', 1086, 1448, 115450, 'esi-indigo-wrap-skirt'),
  ('aunty-sala/products/naa-kente-cape-gown', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1784114192/aunty-sala/products/naa-kente-cape-gown.webp', 'image', 'webp', 1086, 1448, 130762, 'naa-kente-cape-gown')
on conflict (public_id) do update
set secure_url = excluded.secure_url,
    format = excluded.format,
    width = excluded.width,
    height = excluded.height,
    bytes = excluded.bytes,
    original_filename = excluded.original_filename;

with placements(placement, public_id, alt_text) as (
  values
    ('fabric_ankara', 'aunty-sala/fabrics/ankara', 'Close-up of premium burnt orange, gold, black and cream Ankara fabric'),
    ('fabric_kente', 'aunty-sala/fabrics/kente', 'Close-up of authentic handwoven Ghanaian Kente cloth'),
    ('fabric_batik', 'aunty-sala/fabrics/batik', 'Close-up of premium indigo Ghanaian batik cotton'),
    ('fabric_mixed', 'aunty-sala/fabrics/mixed', 'Coordinated Ankara, Kente and batik textiles')
)
insert into public.site_media (placement, media_id, alt_text, is_active)
select placements.placement, media_assets.id, placements.alt_text, true
from placements
join public.media_assets on media_assets.public_id = placements.public_id
on conflict (placement) do update
set media_id = excluded.media_id,
    alt_text = excluded.alt_text,
    is_active = true,
    updated_at = now();

update public.product_media
set sort_order = sort_order + 1
where product_id in (
  'b1000000-0000-4000-8000-000000000013'::uuid,
  'b1000000-0000-4000-8000-000000000014'::uuid,
  'b1000000-0000-4000-8000-000000000015'::uuid,
  'b1000000-0000-4000-8000-000000000016'::uuid
);

with product_images(product_id, public_id, alt_text) as (
  values
    ('b1000000-0000-4000-8000-000000000016'::uuid, 'aunty-sala/products/naa-kente-cape-gown', 'Model wearing the Naa Kente Cape Gown'),
    ('b1000000-0000-4000-8000-000000000015'::uuid, 'aunty-sala/products/esi-indigo-wrap-skirt', 'Model wearing the Esi Indigo Wrap Skirt'),
    ('b1000000-0000-4000-8000-000000000014'::uuid, 'aunty-sala/products/afia-ankara-two-piece-set', 'Model wearing the Afia Ankara Two-Piece Set'),
    ('b1000000-0000-4000-8000-000000000013'::uuid, 'aunty-sala/products/araba-heritage-maxi-dress', 'Model wearing the Araba Heritage Maxi Dress')
)
insert into public.product_media (product_id, media_id, alt_text, sort_order)
select product_images.product_id, media_assets.id, product_images.alt_text, 0
from product_images
join public.media_assets on media_assets.public_id = product_images.public_id
on conflict (product_id, media_id) do update
set alt_text = excluded.alt_text,
    sort_order = 0;
