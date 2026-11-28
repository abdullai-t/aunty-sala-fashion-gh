begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into public.orders (
  customer_name, customer_email, customer_phone,
  shipping_address, shipping_city, payment_method,
  subtotal, paystack_reference, status, payment_status
) values
  ('Test', 't@example.test', '020', 'Osu',
   'Accra', 'card', 100, 'T1', 'draft', 'pending'),
  ('Test', 't@example.test', '020', 'Osu',
   'Accra', 'card', 100, 'T2', 'delivered', 'paid');
--  test fixture



select * from finish();
ROLLBACK;