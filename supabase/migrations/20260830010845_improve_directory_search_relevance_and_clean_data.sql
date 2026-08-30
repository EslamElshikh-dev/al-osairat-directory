create or replace function public.search_directory_entities(
  p_query text default null,
  p_category text default null,
  p_village text default null,
  p_page integer default 1,
  p_page_size integer default 24
)
returns jsonb
language plpgsql
stable
set search_path to 'public', 'extensions'
as $function$
declare
  v_query text := public.normalize_arabic_search(coalesce(p_query, ''));
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 24), 60));
  v_requested_page integer := greatest(1, coalesce(p_page, 1));
  v_total bigint;
  v_total_pages integer;
  v_page integer;
  v_offset integer;
  v_items jsonb;
  v_ready boolean;
begin
  select exists(select 1 from public.directory_entities where is_active = true) into v_ready;

  select count(*) into v_total
  from public.directory_entities e
  where e.is_active = true
    and (p_category is null or p_category = '' or e.category = p_category)
    and (p_village is null or p_village = '' or p_village = 'all' or e.village = p_village)
    and (
      v_query = ''
      or e.search_text like '%' || v_query || '%'
      or e.search_text operator(extensions.%) v_query
    );

  v_total_pages := greatest(1, ceil(v_total::numeric / v_page_size)::integer);
  v_page := least(v_requested_page, v_total_pages);
  v_offset := (v_page - 1) * v_page_size;

  select coalesce(
    jsonb_agg(to_jsonb(row_data) order by row_data.search_rank desc, row_data.quality_score desc, row_data.title),
    '[]'::jsonb
  )
  into v_items
  from (
    select
      e.id,
      e.slug,
      e.title,
      e.category,
      e.sub_category,
      e.location,
      e.village,
      e.locality,
      e.phone,
      e.whatsapp,
      e.hours,
      e.description,
      e.rating,
      e.review_count,
      e.rating_source,
      e.source,
      e.source_status,
      e.delivery_available,
      e.emergency,
      e.google_place_id,
      e.google_maps_plus_code,
      e.google_maps_url,
      e.last_updated_at,
      e.quality_score,
      case
        when v_query = '' then 0::real
        else (
          case
            when public.normalize_arabic_search(e.title) = v_query then 150
            when public.normalize_arabic_search(e.title) like v_query || '%' then 135
            when public.normalize_arabic_search(e.title) like '%' || v_query || '%' then 120
            else 0
          end
          + case
            when public.normalize_arabic_search(coalesce(e.sub_category, '')) = v_query then 100
            when public.normalize_arabic_search(coalesce(e.sub_category, '')) like v_query || '%' then 90
            when public.normalize_arabic_search(coalesce(e.sub_category, '')) like '%' || v_query || '%' then 80
            else 0
          end
          + case when public.normalize_arabic_search(coalesce(e.description, '')) like '%' || v_query || '%' then 30 else 0 end
          + case when public.normalize_arabic_search(e.village) like '%' || v_query || '%' then 22 else 0 end
          + case when public.normalize_arabic_search(coalesce(e.locality, '')) like '%' || v_query || '%' then 18 else 0 end
          + case when public.normalize_arabic_search(e.location) like '%' || v_query || '%' then 8 else 0 end
          + greatest(
              extensions.similarity(public.normalize_arabic_search(e.title), v_query) * 45,
              extensions.similarity(public.normalize_arabic_search(coalesce(e.sub_category, '')), v_query) * 35,
              extensions.similarity(public.normalize_arabic_search(coalesce(e.description, '')), v_query) * 15,
              extensions.similarity(public.normalize_arabic_search(e.village), v_query) * 10,
              extensions.similarity(public.normalize_arabic_search(coalesce(e.locality, '')), v_query) * 8,
              extensions.similarity(public.normalize_arabic_search(e.location), v_query) * 4,
              extensions.similarity(e.search_text, v_query) * 3
            )
        )::real
      end as search_rank
    from public.directory_entities e
    where e.is_active = true
      and (p_category is null or p_category = '' or e.category = p_category)
      and (p_village is null or p_village = '' or p_village = 'all' or e.village = p_village)
      and (
        v_query = ''
        or e.search_text like '%' || v_query || '%'
        or e.search_text operator(extensions.%) v_query
      )
    order by search_rank desc, e.quality_score desc, e.title
    limit v_page_size offset v_offset
  ) row_data;

  return jsonb_build_object(
    'canonicalReady', v_ready,
    'items', v_items,
    'total', v_total,
    'page', v_page,
    'totalPages', v_total_pages,
    'pageSize', v_page_size,
    'from', case when v_total = 0 then 0 else v_offset + 1 end,
    'to', case when v_total = 0 then 0 else least(v_offset + v_page_size, v_total::integer) end
  );
end;
$function$;

update public.directory_entities
set sub_category = 'دكتورة: سهام عبدالله أمين - أخصائية التحاليل الطبية',
    search_text = public.normalize_arabic_search(
      concat_ws(' ', title, category, 'دكتورة: سهام عبدالله أمين - أخصائية التحاليل الطبية', location, village, locality, description, phone)
    ),
    updated_at = now()
where id = 'doctors-معمل-الحياه-للتحاليل-الطبيه';
