insert into public.store_settings (key, value, is_public)
values ('instagram_handle', to_jsonb('auntsalafashiongh'::text), true)
on conflict (key) do update set
  value = excluded.value,
  is_public = true,
  updated_at = now();

insert into public.testimonials (id, customer_name, location, rating, body, is_active, sort_order)
values
  ('8fd00e16-a544-4a4e-a1cc-779e32470b2b', 'Akua M.', 'Accra, Ghana', 5, 'The fit was beautiful and the finishing was so neat. I felt confident the moment I put it on.', true, 1),
  ('0efad37e-6620-42e3-9d6e-4b9f2bc4aa94', 'Adwoa K.', 'Kumasi, Ghana', 5, 'The team helped me choose the right fabric and kept me updated throughout my custom order.', true, 2),
  ('bbc3798c-66c0-45e4-bec7-d2db3e0e2b51', 'Esi B.', 'Tema, Ghana', 5, 'My dress looked even better in person. The shape, colours, and attention to detail were excellent.', true, 3),
  ('47a98da5-28a3-4ad5-b9d5-57d93c785f10', 'Nana A.', 'London, UK', 5, 'Ordering from abroad was straightforward, and my outfit arrived carefully packaged and beautifully made.', true, 4),
  ('c739c5d4-01a1-4517-8ef9-f47b54d589ac', 'Ama S.', 'Toronto, Canada', 5, 'A lovely blend of Ghanaian fabric and a modern silhouette. I received compliments all evening.', true, 5)
on conflict (id) do update set
  customer_name = excluded.customer_name,
  location = excluded.location,
  rating = excluded.rating,
  body = excluded.body,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

