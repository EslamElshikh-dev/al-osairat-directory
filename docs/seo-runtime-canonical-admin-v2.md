# SEO / Runtime / Canonical / Admin V2

## Rollout safeguards

- Public Supabase reads use a 60-second revalidation window and a 4.5-second timeout.
- `directory_entities` is preferred for directory search/browse only when at least 300 active rows are returned.
- If the canonical read is unavailable or incomplete, the existing static catalog + overrides + published submissions remains the fallback.
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

This is phase 1 of the canonical cutover. Directory search and category browsing prefer `directory_entities`; detail, village, and service surfaces keep their current merged source until parity and runtime behavior are verified in Preview/Production telemetry.

## Auth setting still external

Supabase Leaked Password Protection is a project Auth setting and is not exposed by the connected management actions available in this session. It must be enabled in the Supabase Dashboard if the project plan supports it.
