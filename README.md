
  # Aunty Sala Fashion Gh

  This is the codebase for Aunty Sala Fashion Gh. The original design is available at https://www.figma.com/design/ilM2MDHyExcj0Ecm27pLDM/E-commerce-Website-Design.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Supabase setup

  1. Create a project at [Supabase](https://supabase.com/dashboard).
  2. Open the SQL Editor and run `supabase/migrations/20260713000000_initial_store_schema.sql`.
  3. Copy `.env.example` to `.env.local`.
  4. From the project's **Connect** panel, add the project URL and publishable key to `.env.local`.
  5. Restart the development server.

  ### Authentication setup

  In Supabase, open **Authentication → URL Configuration** and add your production `/account` URL plus your local development URL (for example `http://localhost:5173/account`) to the redirect allow list.

  Email magic-link authentication works through Supabase Auth email settings. To enable Google login, open **Authentication → Providers → Google**, enable it, and add the Google OAuth client ID and secret. Configure the callback URL shown by Supabase in your Google Cloud OAuth client.

  Products and all dynamic store data load from Supabase. Custom orders, contact messages, checkout orders, addresses, wishlists, and Cloudinary media metadata are persisted there.

  Never put a Supabase secret key in a `VITE_` variable. Browser code should only use the publishable key; the database migration enables Row Level Security and exposes narrowly scoped functions for public submissions.

  Administrative access is stored separately from customer profiles in `public.admin_users`. To make an existing authenticated user an admin, run this in the SQL Editor:

  ```sql
  insert into public.admin_users (user_id, role)
  select id, 'admin'::public.admin_role
  from auth.users
  where lower(email) = lower('admin@example.com')
  on conflict (user_id) do update
  set role = excluded.role, is_active = true;
  ```

  ## Transactional notifications

  Notifications are written to `public.notification_outbox` by database triggers and delivered by the `notification-dispatch` Edge Function. Failed deliveries are retried automatically by a one-minute database cron job.

  Configure email delivery with a Resend sending-only API key and a verified sender:

  ```bash
  npx supabase secrets set \
    RESEND_API_KEY=re_xxxxxxxxx \
    RESEND_FROM_EMAIL='Aunty Sala Fashion Gh <orders@your-domain.com>'
  ```

  Configure admin WhatsApp delivery with Meta WhatsApp Cloud API credentials:

  ```bash
  npx supabase secrets set \
    WHATSAPP_ACCESS_TOKEN=your_meta_access_token \
    WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id \
    WHATSAPP_GRAPH_API_VERSION=vXX.X \
    WHATSAPP_TEMPLATE_NAME=admin_notification \
    WHATSAPP_TEMPLATE_LANGUAGE=en_US
  ```

  The `admin_notification` WhatsApp template should contain one body variable for the notification text and must be approved by Meta. Set the recipient email and WhatsApp number under **Admin Portal → Settings → Store**. If the notification-specific values are blank, the store email and WhatsApp number are used.
