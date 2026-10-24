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

## Free PostgreSQL 17 and HTTP acceptance

`python3 tests/integration/supabase17/run.py` starts disposable Docker services:
PostgreSQL 17.6, Supabase Auth (GoTrue) and PostgREST. It replays all application
migrations without implicit Data API grants and tests real signup, password login,
refresh tokens, verified-UUID owner provisioning, member isolation, moderation,
column permissions and public/server writes through HTTP. Tokens and users come
from the real local Auth service; they are not forged member identities.

The dedicated `database-http.yml` workflow runs this on a standard GitHub-hosted
runner for this public repository, without repository secrets or managed projects.
It removes containers and volumes even on failure. For a manual run, clean up with
`docker compose -f tests/integration/supabase17/compose.yml down --volumes`.
All published ports bind to loopback. Credentials are explicit local test fixtures;
never reuse them in a deployed environment. Email auto-confirm applies only to the
disposable Auth service.

The shared test helper supplies Storage schema fixtures and no-op cron/network
functions. This test does not exercise hosted email, Storage HTTP, schedulers,
Edge Functions, or managed gateway configuration. The production Data API and
PostgreSQL checks remain separate evidence; this does not replay historical SQL
on production or claim that a managed Supabase reset was performed.

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
