-- An organizer's profile photo: the circle beside their name on every reel
-- of every event they run (instead of their initial). Set from Settings by
-- the organizer's admins.
--
-- Photos live in avatars/organizers/<organizer>/, which only that
-- organizer's admins can write to. The link is kept on the organizer.

alter table public.organizers
  add column avatar_url text
  check (avatar_url is null or (char_length(avatar_url) < 500 and avatar_url like '%/storage/v1/object/public/avatars/organizers/%'));
comment on column public.organizers.avatar_url is 'Profile photo shown beside the organizer''s name on their reels.';

create policy "Organizer admins add organizer photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'organizers'
    and public.manages_organizer((storage.foldername(name))[2])
  );

create policy "Organizer admins remove organizer photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'organizers'
    and public.manages_organizer((storage.foldername(name))[2])
  );

-- Sets (or clears, with null) an organizer's photo: only their admins, and
-- only a photo from that organizer's own folder. Renaming stays with full
-- admins, so this is a function rather than an update policy.
create function public.set_organizer_avatar(p_organizer text, p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.manages_organizer(p_organizer) then
    raise exception 'Only this organizer''s admins can change its photo.' using errcode = '42501';
  end if;
  if p_url is not null and position('/storage/v1/object/public/avatars/organizers/' || p_organizer || '/' in p_url) = 0 then
    raise exception 'That photo isn''t in this organizer''s folder.' using errcode = '22023';
  end if;
  update public.organizers set avatar_url = p_url where slug = p_organizer;
  if not found then
    raise exception 'No such organizer.' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.set_organizer_avatar(text, text) from public, anon;
grant execute on function public.set_organizer_avatar(text, text) to authenticated;
