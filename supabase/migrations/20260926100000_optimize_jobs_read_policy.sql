-- A single authenticated SELECT policy avoids evaluating several permissive
-- policies per visible row while keeping public, owner, and admin access intact.
drop policy "Published active jobs visible to everyone" on public.osairat_jobs;
drop policy "Members see own job submissions" on public.osairat_jobs;
drop policy "Admins see all job submissions" on public.osairat_jobs;

create policy "Published active jobs visible to visitors" on public.osairat_jobs
  for select to anon
  using (status = 'approved' and expires_at > now());

create policy "Members see active jobs or own submissions" on public.osairat_jobs
  for select to authenticated
  using (
    (status = 'approved' and expires_at > now())
    or user_id = (select auth.uid())
    or (select public.is_directory_admin())
  );
