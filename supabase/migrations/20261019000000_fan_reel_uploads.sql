-- Fans-only reels (docs/plans/02-fans.md, step 3): an event's admins upload
-- its fans-only files to the private reel-media-fans bucket, in a folder per
-- event slug, like reel-media. No one reads the bucket directly: the server
-- signs short-lived addresses for followers (and for the event's admins).

create policy "Admins upload to their funnels' private folders" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reel-media-fans'
    and public.can_publish_funnel((storage.foldername(name))[1])
  );
