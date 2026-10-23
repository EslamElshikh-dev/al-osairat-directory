# Reproducible Supabase schema

This repository now includes previously missing schema migrations recovered from
Supabase's recorded migration history. Only SQL schema and authorization code was
restored. Production rows, account mappings, activation values and sync-key seeds
are not copied into new environments.

Run `npm run test:database` to rebuild an empty, isolated PostgreSQL database and
exercise actual `anon`, `authenticated` and `service_role` permissions. The test
uses pinned PGlite, real GRANT/REVOKE and RLS, and no default Data API table or
sequence grants. Managed Auth/Storage scaffolding and scheduler/network entrypoints
are local test fixtures; no network calls or production credentials are used.

Historical versions are preserved where recovered from the server. These files
are for reproducible fresh environments, not a request to reapply old migrations
to production. This change does not run `db push`, repair remote migration history,
change production default privileges or deploy Edge Functions. Existing repository
and remote history already contain some differently named historical versions;
do not use a blanket history-repair or `--include-all` deployment to reconcile them.

The local test runs PostgreSQL 18.3 through PGlite 0.5.8. Managed production uses
PostgreSQL 17.6. A full Docker Supabase / managed PostgREST acceptance run is a
separate deployment check; the tests here verify database schema and access rules.

## Directory coverage and owner provisioning

All 34 public directory tables are rebuilt without borrowing production tables.
The other applications sharing the Supabase project have their own repositories
and schema tests. The restored migrations include the 15 original directory
foundation tables and their existing functions, triggers, policies and grants.

Fresh installation must not require an Auth account before the schema exists.
With zero existing administrators, the owner migration leaves
`directory_internal.settings` empty. It never assigns ownership to the first user
who signs up. A trusted operator must create/verify the intended owner in Auth,
then provision that exact UUID in `public.admin_members` and
`directory_internal.settings`. Only the intended owner's UUID should be inserted;
there is no browser-accessible owner bootstrap RPC. Owner-only actions and owner
notifications require this configuration.

With exactly one pre-existing administrator, the historical migration still
captures that existing owner. With several administrators it still fails rather
than choosing an owner arbitrarily. The private settings schema has no browser
grants, and later moderator accounts cannot replace its stored owner.

`npm run test:database` tests the empty-install case, explicit synthetic owner
provisioning, denial of ordinary-member owner changes, private community state,
column-level profiles, news source privacy, job moderation, favorites and Sand
metrics. `npm test` runs the full repository suite. A dedicated GitHub workflow
runs database checks for migration/test changes on PRs and main.
