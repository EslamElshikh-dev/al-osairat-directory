-- Community V2.6.1: cover saved contribution foreign keys for delete/update performance.

create index if not exists community_saved_contributions_review_idx
  on public.community_saved_contributions (review_id)
  where review_id is not null;

create index if not exists community_saved_contributions_reply_idx
  on public.community_saved_contributions (reply_id)
  where reply_id is not null;
