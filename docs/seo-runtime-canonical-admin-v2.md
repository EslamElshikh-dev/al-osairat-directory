# SEO / Runtime / Canonical / Admin V2

## Rollout safeguards

- Public Supabase reads use a 60-second revalidation window and a 4.5-second timeout.
- `directory_entities` is preferred only when at least 300 active rows are returned.
- If the canonical read is unavailable or incomplete, existing static data, published submissions, and listing overrides remain available as fallbacks.
- No production data rows are deleted by this rollout.
- Admin APIs remain `private, no-store`; `/admin` remains non-indexable and non-cacheable.
- Legacy Vercel hosts continue to permanently redirect to `https://usayrat.online`.

## SEO changes

- Normalize page titles before applying the global `| دليل العسيرات` title template.
- Expand unusually short `/directory/*` meta descriptions only.
- Add Organization / Place / WebSite entity relationships and a SearchAction.
- Add an Organization logo to blog publisher structured data.
- Strengthen internal links from the indexed blog hub to key directory sections and the Center guide.
- Add non-brand entity variants: `العسيرات`, `العسيرات سوهاج`, `مركز العسيرات`, `مركز العسيرات سوهاج`.

## Canonical data phase

### Phase 1

Directory search and category browsing prefer `directory_entities`, guarded by the 300-row minimum and the static fallback.

### Phase 2

- The canonical table is exposed through a shared `getCanonicalDirectoryListings()` repository loader.
- Existing static-derived surfaces now receive canonical versions of matching listings through `applyListingOverrides()`, while unmatched records retain the legacy override fallback.
- Listing detail, village pages, village/category landings, service intent pages, and sitemap generation therefore consume the same canonical values without duplicating fetch logic across each route.
- The homepage uses the canonical catalog for featured listings, emergency listings, category counts, Google-verified counts, and the visible total.
- The global footer uses the same canonical total, removing the previous 323/324 visible count mismatch.
- Static data remains a seed and outage fallback; it is not deleted in this phase.

## Auth setting still external

Supabase Leaked Password Protection is a project Auth setting and is not exposed by the connected management actions available in this session. It must be enabled in the Supabase Dashboard if the project plan supports it.
