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

select lives_ok($$ update public.orders set status = 'paid', payment_status = 'paid' where paystack_reference = 'T1' $$, 'draft to paid');
select throws_ok($$ update public.orders set status = 'delivered' where paystack_reference = 'T1' $$, '23514', null, 'paid to delivered');
select throws_ok($$ update public.orders set status = 'processing' where paystack_reference = 'T2' $$, '23514', null, 'delivered to processing');

--  history count for T1 should be 2.
--  app users cannot write the history table.

select * from finish();
rollback;
