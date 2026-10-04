-- Profile photos for admins (Settings in the admin).
--
-- Each admin's photo lives in avatars/<their user id>/, and only they can
-- write there. Photos are public to read: they show in the admin's own
-- sidebar, and a photo link reveals nothing else. The name and the photo's
-- link are kept on the sign-in account (user_metadata), not in a table.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Admins add their own photo" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Admins replace their own photo" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Admins remove their own photo" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
