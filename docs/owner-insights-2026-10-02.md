# Owner insights and member submissions — 2 October 2026

## Measurement correction
The existing analytics table allowed page_view in its CHECK constraint, but its INSERT RLS policy rejected it. Historical page_view rows were absent. The migration repairs that policy and records the start of valid measurement; the dashboard displays unavailable days as a dash instead of inventing historical zeros.

Daily counts use Africa/Cairo. Visitors mean distinct browser identifiers, views mean accepted visible route views, sessions expire after 30 minutes idle, and navigators mean distinct visitors who opened at least two distinct paths that day. Admin/API routes and known automation are excluded. These counts are estimates of browser visitors, not identified people, and are separate from GA4. Event IDs deduplicate retries. Private browser storage has an in-memory fallback.

## Submission and notification flow
Signed-in, email-verified members can submit an activity with required name, category, contact number, and description. Address, village, website/maps link, and up to three compressed photos are optional. Submitted photos remain private until publication. Owner notifications are created transactionally and addressed only to the original directory owner. The bell checks every 15 seconds while the page is visible; this is an in-site notification, not an operating-system push service. Revisions keep the same request. Publication automatically links the activity to its submitting member.

## Content and presentation
The developer biography and project showcase were adapted from the current Naqada directory to Usayrat branding and assets. News pages add cross-page search and source/topic filters, readable story navigation, publisher attribution and honest source-health labels. The deployed news collector now uses the same eight channels as the web collector. Run `node scripts/sync-news-edge-source.mjs --check` to detect drift. Jobs discovery adds WUZZUF, Shaghalni and Ministry of Labour queries; external source links remain available when discovery feeds fail. Entries still require a valid recent date, explicit local evidence and original source link. The top ticker uses width-based speed, larger touch controls, offscreen/hidden pause and reduced-motion support.

## Verification
- TypeScript: passed.
- Production build: passed after replacing a corrupt local generated cache.
- Seven new behavioral input/storage tests: passed.
- Focused visual-contract checks: passed (empty-state contract updated for the new component).
- Full suite initially: 347/360, with 12 previously documented failures and one empty-state contract subsequently updated; unrelated baseline failures were not changed.
- Transactional production database verification: owner-only notification, member denial for admin metrics, publish field preservation, automatic ownership, anonymous page_view acceptance, exclusion of admin paths, and aggregate/RPC parity passed.
- Test transaction rolled back; follow-up aggregate verification confirmed zero test users, submissions or analytics rows, and the original single admin remained.
- News and job Edge functions deployed with their existing custom cron authentication preserved.

No historical visits were reconstructed. Previously published directory records were not rewritten.
