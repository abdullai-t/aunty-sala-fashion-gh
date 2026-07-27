# Multiclient deployment guide

This repository is a white-label commerce platform. Each client should have an
isolated deployment and isolated service accounts rather than sharing customer
records across businesses.

## Isolation model

Give each client:

- one Supabase project;
- one Cloudflare Pages project and Turnstile widget;
- one Cloudinary cloud or isolated upload folder/preset;
- their own Paystack and Resend credentials;
- their own storefront and admin domains.

This avoids cross-client access to customers, orders, payments, media, and
notification recipients.

## Add a client

1. Copy `src/config/clients/client.template.ts`.
2. Name the file after the client, complete every field, and export the profile.
3. Import the profile into `src/config/clients/index.ts` and add it to `clients`.
4. Copy the client's logo, favicon, and fallback hero into `public/brand/`.
5. Set `VITE_CLIENT_ID` to the profile `id`.
6. Set the client-specific service variables from `.env.example`.
7. Create a fresh Supabase project, link it, and run `supabase db push`.
8. In Admin → Settings → Store details, set the brand name, ISO currency,
   country, order prefixes, contact details, and notification recipients.
9. Configure Supabase Auth redirect URLs for every storefront/admin domain pair.
10. Configure `PAYMENT_CALLBACK_ORIGINS`, Turnstile domains, `PUBLIC_SITE_URL`,
    and the notification branding secrets.
11. Build and deploy to the client's Cloudflare Pages project.

## Runtime resolution

The app selects the profile named by `VITE_CLIENT_ID`. If it is absent, it
matches the current hostname against every registered profile. A profile may
contain multiple storefront/admin domain pairs, so aliases remain within the
same domain family.

The active profile controls:

- names, tagline, legal identity and jurisdiction, location and currency formatting;
- logo, favicon and fallback hero;
- primary, accent, background, foreground and muted theme tokens;
- storefront/admin routing;
- SEO and structured-data defaults;
- social/contact fallbacks;
- custom-order, wishlist, testimonial and gallery feature visibility.

Supabase `store_settings` remains the source for content that admins may update
without deploying. Profile values are safe build-time fallbacks.

## Database configuration

Migration `20260723105000_multiclient_configuration.sql` introduces settings for:

- `brand_name`
- `currency`
- `country_name`
- `country_code`
- `order_prefix`
- `custom_order_prefix`

The database applies currency and reference defaults when orders are created,
so checkout does not depend on hard-coded GHS or ASF values.

## Transactional notification branding

Set these Supabase Edge Function secrets per client:

```env
PUBLIC_BRAND_NAME=Client Fashion Store
PUBLIC_BRAND_TAGLINE=A short client tagline
PUBLIC_CURRENCY=GHS
PUBLIC_SITE_URL=https://example.com
PUBLIC_LOGO_URL=https://example.com/brand/client-logo.png
PUBLIC_BRAND_PRIMARY=#c39b42
PUBLIC_BRAND_BACKGROUND=#faf8f4
PUBLIC_BRAND_FOREGROUND=#1d1b19
```

Never expose payment, Supabase service-role, Resend, WhatsApp, or Cloudflare
secrets through `VITE_` variables.
