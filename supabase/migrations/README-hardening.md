# Hardening migrations

The 2026-08-30 repair batch includes migrations that have already been applied to the linked production Supabase project before merge:

- `20260830010845_improve_directory_search_relevance_and_clean_data.sql`
- `20260830011225_optimize_rls_and_harden_admin_check.sql`

They are committed here so repository state remains reproducible and future environments can apply the same schema/function/policy changes.
