with banner_asset as (
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
    'aunty-sala/site/loypijy7owzaawvgjugk',
    'https://res.cloudinary.com/db0ks5lky/image/upload/v1784031420/aunty-sala/site/loypijy7owzaawvgjugk.webp',
    'image',
    'webp',
    2172,
    724,
    147100,
    'aunty-sala-contact-banner'
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
  'contact_banner',
  id,
  'A warm and elegant Aunty Sala Fashion Gh atelier reception ready to welcome customers',
  true
from banner_asset
on conflict (placement) do update
  set media_id = excluded.media_id,
      alt_text = excluded.alt_text,
      is_active = true,
      updated_at = now();
