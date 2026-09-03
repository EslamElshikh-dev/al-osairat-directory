alter table public.news_sources drop constraint if exists news_sources_url_check;
alter table public.news_sources add constraint news_sources_url_check check (
  source_url like 'https://www.facebook.com/%'
  or source_url like 'https://facebook.com/%'
);
