# Security, SEO, and Search Hardening — 2026-08-30

This repair batch addresses the post-audit P0/P1/P2 findings without redesigning the site.

## Included

- Upgrade Next.js and `eslint-config-next` from 16.2.4 to 16.3.3.
- Refresh the npm lockfile and apply safe transitive dependency fixes.
- Centralize page metadata so dynamic pages always include canonical, Open Graph image, and Twitter metadata.
- Keep filtered/search/paginated pages `noindex, follow` while preserving canonical URLs.
- Prevent `مركز العسيرات` fallback scope from being exposed as a public village link.
- Add weighted search relevance so name and specialty outrank incidental address/location matches.
- Clean escaped Markdown from the affected laboratory specialty and add defensive display cleanup.
- Optimize RLS policies to evaluate `auth.uid()` once per statement where applicable.
- Harden the admin-check helper with an explicit empty `search_path` and restricted execute privileges.

## Supabase migrations already applied

- `20260830010845_improve_directory_search_relevance_and_clean_data.sql`
- `20260830011225_optimize_rls_and_harden_admin_check.sql`

## Validation

- `npm ci`: 0 vulnerabilities after safe lockfile fixes.
- ESLint: 0 errors. Five `no-img-element` warnings remain for dynamic external/member avatar images.
- Next.js production build: successful on 16.3.3.
- TypeScript: successful.
- Static generation: 309/309 pages.
- Supabase search smoke test for `صيدلية`: pharmacy entities rank above incidental address mentions.
- Supabase Performance Advisor: RLS performance warnings cleared; only informational unused-index notices remain.

## Deliberately not changed

- CSP was not tightened in this batch; it should be introduced only after a complete allowlist for GA4, Supabase OAuth, and other external origins is confirmed.
- `SECURITY DEFINER` RPCs were not disabled because authenticated application flows call them intentionally; their ACLs are restricted and the admin helper is role-checked.
- Unused indexes were not removed without enough production usage history.
- Supabase Leaked Password Protection remains a dashboard-level Auth setting and must be enabled separately.
