drop policy if exists "News sources stay private" on public.news_sources;
create policy "News sources stay private"
on public.news_sources
for all
to anon, authenticated
using (false)
with check (false);
