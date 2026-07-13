insert into public.media_assets (id, public_id, secure_url, resource_type, format, original_filename)
values
  ('f1ecfcf5-f2d4-45cd-839b-05fed4bc5523', 'aunty-sala-fashion-gh/site/op04ncn3zino1zpfmlzm', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1783974714/aunty-sala-fashion-gh/site/op04ncn3zino1zpfmlzm.jpg', 'image', 'jpg', 'tailor-measuring-fabric'),
  ('3b634708-11e7-44ae-ac50-b9d75630f82f', 'aunty-sala-fashion-gh/site/vsrofrzjqzgpsdooj1dj', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1783974717/aunty-sala-fashion-gh/site/vsrofrzjqzgpsdooj1dj.jpg', 'image', 'jpg', 'ghanaian-fabric-rolls'),
  ('73d852bc-19bf-4b5c-bf1d-38b075e7dd4b', 'aunty-sala-fashion-gh/site/f8mzfo4qybivw65cbzoq', 'https://res.cloudinary.com/db0ks5lky/image/upload/v1783974721/aunty-sala-fashion-gh/site/f8mzfo4qybivw65cbzoq.jpg', 'image', 'jpg', 'ghanaian-textiles')
on conflict (public_id) do update set
  secure_url = excluded.secure_url,
  resource_type = excluded.resource_type,
  format = excluded.format,
  original_filename = excluded.original_filename;

insert into public.site_media (id, placement, media_id, alt_text, is_active)
values
  ('d38640ad-aeed-467d-94f4-1fcf69f3c009', 'about_workshop', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/site/op04ncn3zino1zpfmlzm'), 'Tailor measuring fabric beside a sewing machine', true),
  ('9a48c118-9157-4f53-848e-bb475785c16f', 'about_fabric', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/site/vsrofrzjqzgpsdooj1dj'), 'Colourful Ghanaian fabric rolls', true),
  ('ca4617d5-3ed3-4017-976a-01fb9e9fcf3d', 'about_textiles', (select id from public.media_assets where public_id = 'aunty-sala-fashion-gh/site/f8mzfo4qybivw65cbzoq'), 'Colourful Ghanaian textiles on display', true)
on conflict (placement) do update set
  media_id = excluded.media_id,
  alt_text = excluded.alt_text,
  is_active = true,
  updated_at = now();

