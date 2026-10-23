-- Restored from Supabase schema history: 20260828113923 / restrict_notification_updates.
-- Production data and configuration seeds are intentionally excluded.
-- The historical version is retained; do not replay it on an existing database.

revoke update on table public.member_notifications from authenticated;

grant update(read_at) on table public.member_notifications to authenticated;
