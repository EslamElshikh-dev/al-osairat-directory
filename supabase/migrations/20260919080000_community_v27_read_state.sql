-- Community V2.7: private per-watch reading position for smart conversations.

alter table public.community_thread_watches
  add column if not exists last_seen_at timestamptz,
  add column if not exists last_seen_reply_id uuid
    references public.content_review_replies(id) on delete set null;

create index if not exists community_thread_watches_last_seen_reply_idx
  on public.community_thread_watches (last_seen_reply_id)
  where last_seen_reply_id is not null;

-- Existing watches start from what existed when the member began watching.
update public.community_thread_watches w
set
  last_seen_at = coalesce(w.last_seen_at, w.created_at),
  last_seen_reply_id = coalesce(
    w.last_seen_reply_id,
    (
      select rr.id
      from public.content_review_replies rr
      where rr.review_id = w.review_id
        and rr.status = 'published'
        and rr.created_at <= coalesce(w.last_seen_at, w.created_at)
      order by rr.created_at desc, rr.id desc
      limit 1
    )
  )
where w.last_seen_at is null
   or w.last_seen_reply_id is null;

-- Keep watch identity immutable to direct Data API clients; only read-state columns
-- are writable after creation.
grant update (last_seen_at, last_seen_reply_id)
on table public.community_thread_watches
to authenticated;

drop policy if exists community_thread_watches_insert_own
on public.community_thread_watches;

create policy community_thread_watches_insert_own
on public.community_thread_watches
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.content_reviews r
    where r.id = community_thread_watches.review_id
      and r.status = 'published'
      and r.user_id <> (select auth.uid())
  )
  and (
    last_seen_reply_id is null
    or exists (
      select 1
      from public.content_review_replies rr
      where rr.id = community_thread_watches.last_seen_reply_id
        and rr.review_id = community_thread_watches.review_id
        and rr.status = 'published'
    )
  )
);

drop policy if exists community_thread_watches_update_read_state
on public.community_thread_watches;

create policy community_thread_watches_update_read_state
on public.community_thread_watches
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
  and (
    last_seen_reply_id is null
    or exists (
      select 1
      from public.content_review_replies rr
      where rr.id = community_thread_watches.last_seen_reply_id
        and rr.review_id = community_thread_watches.review_id
        and rr.status = 'published'
    )
  )
);
