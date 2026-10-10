-- Fans in the admin (docs/plans/02-fans.md, step 6): an organizer's
-- admins see who follows them, export the list and remove a fan. The fan
-- tables stay closed (supabase/migrations/*_fans.sql); these two functions
-- open exactly this, to admins who manage the organizer.

-- Everyone who has followed the organizer: who, when, from where, and
-- whether they've since unfollowed. Newest first.
create function public.organizer_fans(p_organizer text)
returns table (
  email text,
  source_tag text,
  funnel_id text,
  confirmed_at timestamptz,
  unfollowed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.manages_organizer(p_organizer) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select f.email, w.source_tag, w.funnel_id, w.confirmed_at, w.unfollowed_at
    from public.follows w
    join public.fans f on f.id = w.fan_id
    where w.organizer_slug = p_organizer
    order by w.confirmed_at desc;
end;
$$;

-- Removes a fan from the organizer's list (their follow, not the fan: they
-- may follow others). Returns whether there was one to remove.
create function public.remove_fan(p_organizer text, p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.manages_organizer(p_organizer) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.follows w
   using public.fans f
   where f.id = w.fan_id and w.organizer_slug = p_organizer and f.email = lower(btrim(p_email));
  return found;
end;
$$;

revoke all on function public.organizer_fans(text) from public, anon;
revoke all on function public.remove_fan(text, text) from public, anon;
grant execute on function public.organizer_fans(text) to authenticated;
grant execute on function public.remove_fan(text, text) to authenticated;
