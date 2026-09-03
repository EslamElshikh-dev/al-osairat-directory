alter table public.news_sources
  add column if not exists graph_page_id text,
  add column if not exists default_village text;

alter table public.news_sources
  drop constraint if exists news_sources_graph_page_id_check,
  add constraint news_sources_graph_page_id_check
    check (graph_page_id is null or graph_page_id ~ '^[0-9]{3,30}$'),
  drop constraint if exists news_sources_default_village_check,
  add constraint news_sources_default_village_check
    check (
      default_village is null or default_village in (
        'مركز العسيرات',
        'أولاد حمزة',
        'جزيرة أولاد حمزة',
        'الرشايدة',
        'الأحايوة غرب',
        'النويرات',
        'عوامر العسيرات',
        'الشهداء',
        'أولاد جبارة',
        'المساعيد',
        'أولاد بهيج'
      )
    );

update public.news_sources
set graph_page_id = '61573733801697'
where id = 'facebook-local-61573733801697';

update public.news_sources
set default_village = 'جزيرة أولاد حمزة',
    require_local_match = false
where id = 'facebook-aljazeraa1';

comment on column public.news_sources.graph_page_id is 'Resolved numeric Meta Page ID. The ingestion worker prefers this over a username/handle once known.';
comment on column public.news_sources.default_village is 'Optional source-level village routing fallback for highly specific local sources.';
