-- Keep execution history private even if table grants change in the future.

create policy "News ingestion runs stay private"
on public.news_ingestion_runs
for all
to anon, authenticated
using (false)
with check (false);
