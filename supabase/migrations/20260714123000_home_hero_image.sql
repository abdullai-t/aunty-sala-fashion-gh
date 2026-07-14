with hero_asset as (
  insert into public.media_assets (
    public_id,
    secure_url,
    resource_type,
    format,
    width,
    height,
    bytes,
    original_filename
  ) values (
    'aunty-sala/site/r0pxvqlfmccsuejio2yl',
    'https://res.cloudinary.com/db0ks5lky/image/upload/v1784030647/aunty-sala/site/r0pxvqlfmccsuejio2yl.webp',
    'image',
    'webp',
    1672,
    941,
    111116,
    'aunty-sala-hero-elegant'
  )
  on conflict (public_id) do update
    set secure_url = excluded.secure_url,
        format = excluded.format,
        width = excluded.width,
        height = excluded.height,
        bytes = excluded.bytes
  returning id
)
insert into public.site_media (placement, media_id, alt_text, is_active)
select
  'home_hero',
  id,
  'Aunty Sala Fashion Gh model wearing an elegant contemporary Ghanaian print gown',
  true
from hero_asset
on conflict (placement) do update
  set media_id = excluded.media_id,
      alt_text = excluded.alt_text,
      is_active = true,
      updated_at = now();
