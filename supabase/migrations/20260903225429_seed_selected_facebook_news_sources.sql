delete from public.news_sources where id = 'facebook-sohag-education';

insert into public.news_sources (
  id, source_kind, name, external_id, source_url, trust_level, publish_mode,
  require_local_match, allow_sensitive_auto_publish, active, poll_interval_seconds,
  graph_page_id, default_village
) values
  ('facebook-osiratnews','facebook','أخبار العسيرات - osiratnews','osiratnews','https://www.facebook.com/osiratnews/','trusted','automatic',true,false,false,120,null,null),
  ('facebook-osirat-sohag','facebook','العسيرات سوهاج - osirat.sohag','osirat.sohag','https://www.facebook.com/osirat.sohag/','trusted','automatic',true,false,false,120,null,null),
  ('facebook-local-61573733801697','facebook','مصدر محلي - 61573733801697','61573733801697','https://www.facebook.com/profile.php?id=61573733801697','trusted','automatic',true,false,false,120,'61573733801697',null),
  ('facebook-alosayrat1','facebook','العسيرات - alosayrat1','alosayrat1','https://www.facebook.com/alosayrat1','trusted','automatic',true,false,false,120,null,null),
  ('facebook-nabdasirat','facebook','نبض العسيرات - nabdasirat','nabdasirat','https://www.facebook.com/nabdasirat','trusted','automatic',true,false,false,120,null,null),
  ('facebook-aljazeraa1','facebook','الجزيرة - جزيرة أولاد حمزة','AlJazeraa1','https://www.facebook.com/AlJazeraa1','trusted','automatic',false,false,false,120,null,'جزيرة أولاد حمزة')
on conflict (id) do update set
  name = excluded.name,
  external_id = excluded.external_id,
  source_url = excluded.source_url,
  trust_level = excluded.trust_level,
  publish_mode = excluded.publish_mode,
  require_local_match = excluded.require_local_match,
  allow_sensitive_auto_publish = excluded.allow_sensitive_auto_publish,
  active = excluded.active,
  poll_interval_seconds = excluded.poll_interval_seconds,
  graph_page_id = coalesce(public.news_sources.graph_page_id, excluded.graph_page_id),
  default_village = excluded.default_village,
  updated_at = now();
