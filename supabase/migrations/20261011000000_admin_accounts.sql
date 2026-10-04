-- Superadmin: admins with full access ('*') see and manage every admin
-- account (Settings → Accounts): who can sign in to the admin, and what each
-- can edit. Nobody changes or removes their own row, so a full admin can't
-- lock themselves out by mistake.

create policy "Full admins read every admin" on public.admin_users
  for select to authenticated
  using (public.manages_all_funnels());

create policy "Full admins add admins" on public.admin_users
  for insert to authenticated
  with check (public.manages_all_funnels());

create policy "Full admins change other admins" on public.admin_users
  for update to authenticated
  using (public.manages_all_funnels() and email <> lower(auth.jwt() ->> 'email'))
  with check (public.manages_all_funnels() and email <> lower(auth.jwt() ->> 'email'));

create policy "Full admins remove other admins" on public.admin_users
  for delete to authenticated
  using (public.manages_all_funnels() and email <> lower(auth.jwt() ->> 'email'));
