-- Sign-up invites (docs/plans/05-signup.md, step 0). Sign-up is
-- invite-only: Showlnk's full admins create an invite link for an
-- organizer; the wizard at /start works only with a valid one. Only a hash
-- of each code is kept, so a link is shown once, when it's made.
--
-- Full admins create, list and revoke invites through the functions below.
-- The wizard's server (secret key) checks an invite, counts its flyer reads
-- (AI costs money) and marks it claimed. Nobody else can read the table.

create table public.signup_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  -- Who it's for, in Showlnk's words ("DJ Mike, Velvet Room").
  note text not null check (char_length(btrim(note)) between 1 and 120),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  -- Flyers read with it so far; the wizard stops at 5.
  flyer_reads integer not null default 0 check (flyer_reads between 0 and 5),
  claimed_at timestamptz,
  claimed_organizer text references public.organizers (slug) on delete set null,
  revoked_at timestamptz
);

comment on table public.signup_invites is
  'Invite links for the sign-up wizard (hash only). Full admins manage them through create/list/revoke functions; the server reads and claims them.';

alter table public.signup_invites enable row level security;
revoke all on public.signup_invites from anon, authenticated;

-- A new invite, for a full admin. Returns its id.
create function public.create_signup_invite(p_code_hash text, p_note text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.manages_all_funnels() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.signup_invites (code_hash, note) values (p_code_hash, btrim(p_note)) returning id into v_id;
  return v_id;
end;
$$;

-- Every invite, newest first, for a full admin (never the hashes).
create function public.signup_invites_list()
returns table (
  id uuid,
  note text,
  created_at timestamptz,
  expires_at timestamptz,
  flyer_reads integer,
  claimed_at timestamptz,
  claimed_organizer text,
  revoked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.manages_all_funnels() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select i.id, i.note, i.created_at, i.expires_at, i.flyer_reads, i.claimed_at, i.claimed_organizer, i.revoked_at
    from public.signup_invites i
    order by i.created_at desc;
end;
$$;

-- Revokes an unclaimed invite, for a full admin. Whether there was one.
create function public.revoke_signup_invite(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.manages_all_funnels() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.signup_invites set revoked_at = now()
   where id = p_id and revoked_at is null and claimed_at is null;
  return found;
end;
$$;

-- Counts one flyer read against a usable invite (the server, before it
-- reads a flyer). Whether it was allowed: unexpired, unrevoked, unclaimed,
-- and under 5 reads.
create function public.use_signup_invite_read(p_code_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.signup_invites set flyer_reads = flyer_reads + 1
   where code_hash = p_code_hash
     and revoked_at is null and claimed_at is null and expires_at > now()
     and flyer_reads < 5;
  return found;
end;
$$;

revoke all on function public.create_signup_invite(text, text) from public, anon;
revoke all on function public.signup_invites_list() from public, anon;
revoke all on function public.revoke_signup_invite(uuid) from public, anon;
revoke all on function public.use_signup_invite_read(text) from public, anon, authenticated;
grant execute on function public.create_signup_invite(text, text) to authenticated;
grant execute on function public.signup_invites_list() to authenticated;
grant execute on function public.revoke_signup_invite(uuid) to authenticated;
grant execute on function public.use_signup_invite_read(text) to service_role;
