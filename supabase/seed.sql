-- Repeatable development seed for Aunty Sala Fashion Gh.
-- It intentionally creates no users, orders, customer records, or testimonials.

insert into public.categories (id, name, slug, description, sort_order)
values
  ('a1000000-0000-4000-8000-000000000001', 'Dresses', 'dresses', 'Contemporary dresses in Ghanaian fabrics.', 1),
  ('a1000000-0000-4000-8000-000000000002', 'Sets', 'sets', 'Coordinated tops and bottoms.', 2),
  ('a1000000-0000-4000-8000-000000000003', 'Skirts', 'skirts', 'Statement skirts for everyday and occasion wear.', 3),
  ('a1000000-0000-4000-8000-000000000004', 'Tops', 'tops', 'Versatile tops made in Accra.', 4),
  ('a1000000-0000-4000-8000-000000000005', 'Jumpsuits', 'jumpsuits', 'Tailored one-piece silhouettes.', 5),
  ('a1000000-0000-4000-8000-000000000006', 'Gowns', 'gowns', 'Statement gowns for celebrations and formal occasions.', 6)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.media_assets (
  id, public_id, secure_url, resource_type, format, width, height, bytes, original_filename
)
values
  ('c1000000-0000-4000-8000-000000000001', 'aunty-sala-fashion-gh/seed/g76pbpavzlena6mxffy0', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1783951003/aunty-sala-fashion-gh/seed/g76pbpavzlena6mxffy0.svg', 'image', 'svg', 600, 800, 607, 'ankara-bloom'),
  ('c1000000-0000-4000-8000-000000000002', 'aunty-sala-fashion-gh/seed/ug9bbxk730wtl90hqp2s', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1783951006/aunty-sala-fashion-gh/seed/ug9bbxk730wtl90hqp2s.svg', 'image', 'svg', 600, 800, 587, 'batik-indigo'),
  ('c1000000-0000-4000-8000-000000000003', 'aunty-sala-fashion-gh/seed/el9egla5nxzhuiznpyin', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1783951008/aunty-sala-fashion-gh/seed/el9egla5nxzhuiznpyin.svg', 'image', 'svg', 600, 800, 524, 'heritage-clay'),
  ('c1000000-0000-4000-8000-000000000004', 'aunty-sala-fashion-gh/seed/wmmygqvw9ipcuzl9tzss', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1783951010/aunty-sala-fashion-gh/seed/wmmygqvw9ipcuzl9tzss.svg', 'image', 'svg', 600, 800, 584, 'kente-gold'),
  ('c1000000-0000-4000-8000-000000000005', 'aunty-sala-fashion-gh/site/lrviaf5c2xgastqowyfi', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1783952350/aunty-sala-fashion-gh/site/lrviaf5c2xgastqowyfi.jpg', 'image', 'jpg', 1600, 1200, 384968, 'about-story-workshop')
on conflict (public_id) do update set
  secure_url = excluded.secure_url,
  resource_type = excluded.resource_type,
  format = excluded.format,
  width = excluded.width,
  height = excluded.height,
  bytes = excluded.bytes,
  original_filename = excluded.original_filename;

insert into public.products (
  id, sku, slug, name, description, price, fabric, category_id,
  sizes, colors, badge, in_stock, is_active, inventory_quantity
)
values
  ('b1000000-0000-4000-8000-000000000001', 'SEED-DRESS-001', 'akua-ankara-wrap-dress', 'Akua Ankara Wrap Dress', 'A flattering wrap dress with a softly flared skirt and adjustable waist tie.', 520, 'Ankara', (select id from public.categories where slug = 'dresses'), array['XS','S','M','L','XL'], array['Terracotta','Gold'], 'Featured', true, true, 12),
  ('b1000000-0000-4000-8000-000000000002', 'SEED-DRESS-002', 'esi-kente-midi-dress', 'Esi Kente Midi Dress', 'A structured midi dress inspired by traditional kente geometry.', 680, 'Kente', (select id from public.categories where slug = 'dresses'), array['S','M','L','XL'], array['Gold','Black'], 'New', true, true, 8),
  ('b1000000-0000-4000-8000-000000000003', 'SEED-SET-001', 'aba-batik-coord-set', 'Aba Batik Co-ord Set', 'A relaxed blouse and wide-leg trouser pairing in indigo batik.', 590, 'Batik', (select id from public.categories where slug = 'sets'), array['XS','S','M','L','XL'], array['Indigo','Cream'], null, true, true, 10),
  ('b1000000-0000-4000-8000-000000000004', 'SEED-SKIRT-001', 'nana-heritage-maxi-skirt', 'Nana Heritage Maxi Skirt', 'A full-length skirt with generous movement and a comfortable fitted waistband.', 420, 'Ankara', (select id from public.categories where slug = 'skirts'), array['XS','S','M','L','XL','XXL'], array['Clay','Sand'], null, true, true, 9),
  ('b1000000-0000-4000-8000-000000000005', 'SEED-TOP-001', 'yaa-kente-peplum-top', 'Yaa Kente Peplum Top', 'A shaped peplum top with a clean neckline and statement woven pattern.', 320, 'Kente', (select id from public.categories where slug = 'tops'), array['XS','S','M','L'], array['Gold','Terracotta'], null, true, true, 14),
  ('b1000000-0000-4000-8000-000000000006', 'SEED-JUMP-001', 'adwoa-indigo-jumpsuit', 'Adwoa Indigo Jumpsuit', 'A tailored wide-leg jumpsuit designed for an elegant day-to-evening fit.', 610, 'Batik', (select id from public.categories where slug = 'jumpsuits'), array['S','M','L','XL'], array['Indigo'], 'Limited', true, true, 6),
  ('b1000000-0000-4000-8000-000000000007', 'SEED-DRESS-003', 'abena-ankara-shirt-dress', 'Abena Ankara Shirt Dress', 'A polished button-front shirt dress with a belted waist and softly structured sleeves.', 540, 'Ankara', (select id from public.categories where slug = 'dresses'), array['XS','S','M','L','XL'], array['Terracotta','Cream'], 'New', true, true, 11),
  ('b1000000-0000-4000-8000-000000000008', 'SEED-GOWN-001', 'efua-kente-evening-gown', 'Efua Kente Evening Gown', 'A floor-length occasion gown with a fitted bodice and dramatic woven-panel skirt.', 980, 'Kente', (select id from public.categories where slug = 'gowns'), array['S','M','L','XL'], array['Gold','Black'], 'Exclusive', true, true, 4),
  ('b1000000-0000-4000-8000-000000000009', 'SEED-SET-002', 'serwaa-batik-palazzo-set', 'Serwaa Batik Palazzo Set', 'An easy matching set pairing a cropped blouse with flowing palazzo trousers.', 620, 'Batik', (select id from public.categories where slug = 'sets'), array['XS','S','M','L','XL'], array['Indigo','Ivory'], null, true, true, 9),
  ('b1000000-0000-4000-8000-000000000010', 'SEED-SKIRT-002', 'akosua-ankara-tiered-skirt', 'Akosua Ankara Tiered Skirt', 'A high-waisted tiered skirt designed for movement, volume, and effortless styling.', 390, 'Ankara', (select id from public.categories where slug = 'skirts'), array['XS','S','M','L','XL','XXL'], array['Terracotta','Gold'], null, true, true, 13),
  ('b1000000-0000-4000-8000-000000000011', 'SEED-TOP-002', 'adjoa-kente-corset-top', 'Adjoa Kente Corset Top', 'A structured corset-inspired top finished with a flexible back panel for comfort.', 360, 'Kente', (select id from public.categories where slug = 'tops'), array['XS','S','M','L'], array['Gold','Clay'], 'Bestseller', true, true, 15),
  ('b1000000-0000-4000-8000-000000000012', 'SEED-JUMP-002', 'mansa-batik-utility-jumpsuit', 'Mansa Batik Utility Jumpsuit', 'A modern utility jumpsuit with a defined waist, practical pockets, and tapered sleeves.', 650, 'Batik', (select id from public.categories where slug = 'jumpsuits'), array['S','M','L','XL'], array['Indigo','Navy'], null, true, true, 7),
  ('b1000000-0000-4000-8000-000000000013', 'SEED-DRESS-004', 'araba-heritage-maxi-dress', 'Araba Heritage Maxi Dress', 'A graceful maxi dress with a gathered neckline and full skirt in warm heritage tones.', 720, 'Ankara', (select id from public.categories where slug = 'dresses'), array['XS','S','M','L','XL'], array['Clay','Sand'], 'Featured', true, true, 8),
  ('b1000000-0000-4000-8000-000000000014', 'SEED-SET-003', 'afia-ankara-two-piece-set', 'Afia Ankara Two-Piece Set', 'A versatile sleeveless top and midi skirt pairing that can be styled together or separately.', 570, 'Ankara', (select id from public.categories where slug = 'sets'), array['XS','S','M','L','XL'], array['Terracotta','Black'], null, true, true, 10),
  ('b1000000-0000-4000-8000-000000000015', 'SEED-SKIRT-003', 'esi-indigo-wrap-skirt', 'Esi Indigo Wrap Skirt', 'An adjustable indigo wrap skirt with an asymmetric hem and contrast topstitching.', 410, 'Batik', (select id from public.categories where slug = 'skirts'), array['XS','S','M','L','XL'], array['Indigo'], 'New', true, true, 12),
  ('b1000000-0000-4000-8000-000000000016', 'SEED-GOWN-002', 'naa-kente-cape-gown', 'Naa Kente Cape Gown', 'A refined formal gown featuring a flowing cape overlay and hand-finished kente accents.', 1100, 'Kente', (select id from public.categories where slug = 'gowns'), array['S','M','L','XL'], array['Gold','Terracotta'], 'Made to Order', true, true, 3)
on conflict (slug) do update set
  sku = excluded.sku,
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
  inventory_quantity = excluded.inventory_quantity;

insert into public.product_media (id, product_id, media_id, alt_text, sort_order)
values
  ('d1000000-0000-4000-8000-000000000001', (select id from public.products where slug = 'akua-ankara-wrap-dress'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/g76pbpavzlena6mxffy0'), 'Akua Ankara Wrap Dress', 0),
  ('d1000000-0000-4000-8000-000000000002', (select id from public.products where slug = 'esi-kente-midi-dress'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/wmmygqvw9ipcuzl9tzss'), 'Esi Kente Midi Dress', 0),
  ('d1000000-0000-4000-8000-000000000003', (select id from public.products where slug = 'aba-batik-coord-set'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/ug9bbxk730wtl90hqp2s'), 'Aba Batik Co-ord Set', 0),
  ('d1000000-0000-4000-8000-000000000004', (select id from public.products where slug = 'nana-heritage-maxi-skirt'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/el9egla5nxzhuiznpyin'), 'Nana Heritage Maxi Skirt', 0),
  ('d1000000-0000-4000-8000-000000000005', (select id from public.products where slug = 'yaa-kente-peplum-top'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/wmmygqvw9ipcuzl9tzss'), 'Yaa Kente Peplum Top', 0),
  ('d1000000-0000-4000-8000-000000000006', (select id from public.products where slug = 'adwoa-indigo-jumpsuit'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/ug9bbxk730wtl90hqp2s'), 'Adwoa Indigo Jumpsuit', 0),
  ('d1000000-0000-4000-8000-000000000007', (select id from public.products where slug = 'abena-ankara-shirt-dress'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/g76pbpavzlena6mxffy0'), 'Abena Ankara Shirt Dress', 0),
  ('d1000000-0000-4000-8000-000000000008', (select id from public.products where slug = 'efua-kente-evening-gown'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/wmmygqvw9ipcuzl9tzss'), 'Efua Kente Evening Gown', 0),
  ('d1000000-0000-4000-8000-000000000009', (select id from public.products where slug = 'serwaa-batik-palazzo-set'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/ug9bbxk730wtl90hqp2s'), 'Serwaa Batik Palazzo Set', 0),
  ('d1000000-0000-4000-8000-000000000010', (select id from public.products where slug = 'akosua-ankara-tiered-skirt'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/g76pbpavzlena6mxffy0'), 'Akosua Ankara Tiered Skirt', 0),
  ('d1000000-0000-4000-8000-000000000011', (select id from public.products where slug = 'adjoa-kente-corset-top'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/wmmygqvw9ipcuzl9tzss'), 'Adjoa Kente Corset Top', 0),
  ('d1000000-0000-4000-8000-000000000012', (select id from public.products where slug = 'mansa-batik-utility-jumpsuit'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/ug9bbxk730wtl90hqp2s'), 'Mansa Batik Utility Jumpsuit', 0),
  ('d1000000-0000-4000-8000-000000000013', (select id from public.products where slug = 'araba-heritage-maxi-dress'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/el9egla5nxzhuiznpyin'), 'Araba Heritage Maxi Dress', 0),
  ('d1000000-0000-4000-8000-000000000014', (select id from public.products where slug = 'afia-ankara-two-piece-set'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/g76pbpavzlena6mxffy0'), 'Afia Ankara Two-Piece Set', 0),
  ('d1000000-0000-4000-8000-000000000015', (select id from public.products where slug = 'esi-indigo-wrap-skirt'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/ug9bbxk730wtl90hqp2s'), 'Esi Indigo Wrap Skirt', 0),
  ('d1000000-0000-4000-8000-000000000016', (select id from public.products where slug = 'naa-kente-cape-gown'), (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/wmmygqvw9ipcuzl9tzss'), 'Naa Kente Cape Gown', 0)
on conflict (product_id, media_id) do update set
  alt_text = excluded.alt_text,
  sort_order = excluded.sort_order;

insert into public.gallery_items (id, media_id, alt_text, is_active, sort_order)
values
  ('e1000000-0000-4000-8000-000000000001', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/g76pbpavzlena6mxffy0'), 'Ankara bloom pattern', true, 1),
  ('e1000000-0000-4000-8000-000000000002', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/wmmygqvw9ipcuzl9tzss'), 'Kente gold pattern', true, 2),
  ('e1000000-0000-4000-8000-000000000003', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/ug9bbxk730wtl90hqp2s'), 'Batik indigo pattern', true, 3),
  ('e1000000-0000-4000-8000-000000000004', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/el9egla5nxzhuiznpyin'), 'Heritage clay pattern', true, 4)
on conflict (id) do update set
  media_id = excluded.media_id,
  alt_text = excluded.alt_text,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

insert into public.site_media (id, placement, media_id, alt_text, is_active)
values
  ('f1000000-0000-4000-8000-000000000001', 'home_hero', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/el9egla5nxzhuiznpyin'), 'Aunty Sala heritage pattern', true),
  ('f1000000-0000-4000-8000-000000000002', 'home_custom_banner', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/ug9bbxk730wtl90hqp2s'), 'Indigo batik pattern', true),
  ('f1000000-0000-4000-8000-000000000003', 'shop_banner', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/wmmygqvw9ipcuzl9tzss'), 'Gold kente pattern', true),
  ('f1000000-0000-4000-8000-000000000004', 'custom_order_banner', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/g76pbpavzlena6mxffy0'), 'Ankara bloom pattern', true),
  ('f1000000-0000-4000-8000-000000000005', 'fabric_ankara', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/g76pbpavzlena6mxffy0'), 'Ankara fabric pattern', true),
  ('f1000000-0000-4000-8000-000000000006', 'fabric_kente', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/wmmygqvw9ipcuzl9tzss'), 'Kente fabric pattern', true),
  ('f1000000-0000-4000-8000-000000000007', 'fabric_batik', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/ug9bbxk730wtl90hqp2s'), 'Batik fabric pattern', true),
  ('f1000000-0000-4000-8000-000000000008', 'fabric_mixed', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/el9egla5nxzhuiznpyin'), 'Mixed heritage fabric pattern', true),
  ('f1000000-0000-4000-8000-000000000009', 'contact_banner', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/seed/wmmygqvw9ipcuzl9tzss'), 'Kente contact banner', true),
  ('f1000000-0000-4000-8000-000000000010', 'about_story', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/site/lrviaf5c2xgastqowyfi'), 'Seamstress working in the Aunty Sala atelier', true)
on conflict (placement) do update set
  media_id = excluded.media_id,
  alt_text = excluded.alt_text,
  is_active = excluded.is_active;
