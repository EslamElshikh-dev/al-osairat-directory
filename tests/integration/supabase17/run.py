"""Real PostgreSQL 17.6 + GoTrue + PostgREST, with disposable data only.

Runs on a local Docker host or a free standard runner for this public repository.
There is no managed project URL, API key, production data, or billable resource.
Auth schema/users/sessions come from GoTrue itself; application SQL is unmodified
apart from replacing scheduling/network extensions with no-op local fixtures.
"""
import base64
import hashlib
import hmac
import json
import re
import secrets
import subprocess
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
COMPOSE = ["docker", "compose", "-f", str(Path(__file__).with_name("compose.yml"))]
JWT_SECRET = b"isolated-acceptance-jwt-only-never-production-144"
RESULTS = []


def command(*args, data=None):
    return subprocess.run(args, input=data, text=True, capture_output=True, check=True).stdout


def sql(query):
    return command(*COMPOSE, "exec", "-T", "db", "psql", "-U", "postgres", "-d", "postgres",
                   "-v", "ON_ERROR_STOP=1", "-At", data=query).strip()


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def check(name, condition):
    if not condition:
        raise AssertionError(name)
    RESULTS.append(name)
    print("PASS " + name, flush=True)


def request(service, path, method="GET", data=None, token=None, expected=(200,), headers=None):
    port = {"auth": 19999, "rest": 13000}[service]
    url = f"http://127.0.0.1:{port}/{path}"
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = "Bearer " + token
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, method=method, headers=h,
                                 data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read()
    body = json.loads(raw) if raw else None
    if status not in expected:
        code = body.get("code", body.get("error_code")) if isinstance(body, dict) else None
        raise AssertionError(f"{service} {method} {path}: HTTP {status}, code {code}; expected {expected}")
    return body


def ready(service, path):
    for _ in range(60):
        try:
            request(service, path)
            return
        except (OSError, AssertionError):
            time.sleep(1)
    raise RuntimeError(service + " did not become ready")


def local_service_jwt():
    def encode(value):
        return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).rstrip(b"=")
    payload = {"role": "service_role", "iss": "supabase", "iat": int(time.time()), "exp": int(time.time()) + 3600}
    unsigned = encode({"alg": "HS256", "typ": "JWT"}) + b"." + encode(payload)
    sig = base64.urlsafe_b64encode(hmac.new(JWT_SECRET, unsigned, hashlib.sha256).digest()).rstrip(b"=")
    return (unsigned + b"." + sig).decode()


def denied(name, path, token=None, method="GET", data=None, headers=None):
    body = request("rest", path, method, data, token, (401, 403), headers)
    check(name, body["code"] == "42501")


def main():
    subprocess.run([*COMPOSE, "up", "-d", "--wait", "db"], check=True)
    check("real PostgreSQL 17.6", sql("show server_version;").startswith("17.6"))
    # Reuse the existing infrastructure fixtures, but let GoTrue install its real
    # auth.users / sessions / refresh-token tables instead of a simplified table.
    helper = (ROOT / "tests/helpers/supabase-postgres.mjs").read_text()
    bootstrap = helper.split("await db.exec(`", 1)[1].split("`);", 1)[0]
    bootstrap = re.sub(r"create table auth\.users\s*\([\s\S]*?\);", "", bootstrap)
    assert "create table auth.users" not in bootstrap
    sql(bootstrap + "\ncreate role authenticator login noinherit password 'isolated-acceptance-rest-only';"
        "grant anon,authenticated,service_role to authenticator;")
    subprocess.run([*COMPOSE, "up", "-d", "auth"], check=True)
    ready("auth", "health")
    check("GoTrue installed real Auth tables", sql("select to_regclass('auth.refresh_tokens') is not null;") == "t")
    check("empty application schema", sql("select count(*) from pg_tables where schemaname='public';") == "0")
    files = sorted((ROOT / "supabase/migrations").glob("*.sql"))
    for file in files:
        source = re.sub(r"create\s+extension\s+if\s+not\s+exists\s+(?:pg_cron|pg_net)(?:\s+with\s+schema\s+\w+)?\s*;",
                        "-- Scheduling/network is isolated local scaffolding.", file.read_text(), flags=re.I)
        try:
            sql(source)
        except subprocess.CalledProcessError as error:
            raise RuntimeError(f"Migration {file.name}: {error.stderr}") from error
    check("all 79 migrations replay on PostgreSQL 17.6", len(files) == 79)
    check("34 application tables have RLS", sql("select count(*)=34 and bool_and(rowsecurity) from pg_tables where schemaname='public';") == "t")
    check("empty install has no invented owner", sql("select count(*) from directory_internal.settings;") == "0")
    subprocess.run([*COMPOSE, "up", "-d", "rest"], check=True)
    ready("rest", "osairat_jobs?select=id&limit=0")

    users = []
    for index in range(3):
        email, password = f"acceptance-{index}@example.invalid", secrets.token_urlsafe(24)
        signup = request("auth", "signup", "POST", {"email": email, "password": password,
            "data": {"full_name": f"Isolated member {index}", "role": "admin", "is_admin": True}})
        user = signup.get("user", signup)
        check(f"Auth signup {index} confirmed in isolated environment", bool(user.get("email_confirmed_at")))
        session = request("auth", "token?grant_type=password", "POST", {"email": email, "password": password})
        refreshed = request("auth", "token?grant_type=refresh_token", "POST", {"refresh_token": session["refresh_token"]})
        identity = request("auth", "user", token=refreshed["access_token"])
        check(f"login and refreshed token preserve identity {index}", identity["id"] == user["id"])
        users.append({"id": identity["id"], "token": refreshed["access_token"]})
    a, b, owner = users
    aid, bid, oid = a["id"], b["id"], owner["id"]
    at, bt, ot = a["token"], b["token"], owner["token"]
    rep = {"Prefer": "return=representation"}
    check("signup and editable admin metadata do not bootstrap ownership", sql("select (select count(*) from directory_internal.settings)=0 and (select count(*) from public.admin_members)=0;") == "t")
    check("ordinary account is not admin", request("rest", "rpc/is_directory_admin", "POST", {}, at) is False)
    check("ordinary account is not owner", request("rest", "rpc/is_directory_owner", "POST", {}, at) is False)
    sql(f"insert into public.admin_members(user_id) values({quote(oid)}); insert into directory_internal.settings(owner_id) values({quote(oid)});")
    check("trusted operator provisions verified Auth UUID", request("rest", "rpc/is_directory_owner", "POST", {}, ot) is True)
    denied("member cannot enroll as admin", "admin_members", at, "POST", {"user_id": aid})
    private = request("rest", "settings?select=owner_id", token=at, expected=(406,), headers={"Accept-Profile": "directory_internal"})
    check("owner schema is not exposed", private["code"] == "PGRST106")

    check("own private profile readable", len(request("rest", f"profiles?id=eq.{aid}", token=at)) == 1)
    check("other private profile hidden", request("rest", f"profiles?id=eq.{aid}", token=bt) == [])
    denied("anonymous private profile denied", "profiles?select=id")
    check("own profile update", len(request("rest", f"profiles?id=eq.{aid}", "PATCH", {"full_name": "Own updated name"}, at, headers=rep)) == 1)
    denied("profile reassignment denied", f"profiles?id=eq.{aid}", at, "PATCH", {"id": bid})
    check("feed state create", len(request("rest", "community_feed_state", "POST", {"user_id": aid}, at, (201,), rep)) == 1)
    check("feed state own update", len(request("rest", f"community_feed_state?user_id=eq.{aid}", "PATCH", {"last_seen_at": "2026-10-24T00:00:00Z"}, at, headers=rep)) == 1)
    check("feed state isolated from second JWT", request("rest", "community_feed_state", token=bt) == [])
    check("foreign feed update affects no rows", request("rest", f"community_feed_state?user_id=eq.{aid}", "PATCH", {"last_seen_at": None}, bt, headers=rep) == [])
    denied("feed ownership transfer denied", f"community_feed_state?user_id=eq.{aid}", at, "PATCH", {"user_id": bid})
    denied("anonymous feed state denied", "community_feed_state")
    check("favorite create", len(request("rest", "favorites", "POST", {"user_id": aid, "listing_id": "isolated-favorite"}, at, (201,), rep)) == 1)
    check("favorite isolated", request("rest", "favorites", token=bt) == [])
    check("foreign favorite deletion affects no rows", request("rest", "favorites?listing_id=eq.isolated-favorite", "DELETE", token=bt, headers=rep) == [])
    check("own favorite delete", len(request("rest", "favorites?listing_id=eq.isolated-favorite", "DELETE", token=at, headers=rep)) == 1)
    check("private public-profile projection hidden", request("rest", f"member_public_profiles?user_id=eq.{bid}") == [])
    check("approved profile columns editable", len(request("rest", f"member_public_profiles?user_id=eq.{aid}", "PATCH", {"bio": "Isolated biography", "is_public": True}, at, headers=rep)) == 1)
    check("opt-in profile visible", len(request("rest", f"member_public_profiles?user_id=eq.{aid}")) == 1)
    denied("identity columns cannot be forged", f"member_public_profiles?user_id=eq.{aid}", at, "PATCH", {"display_name": "Forged identity"})

    job = {"id": str(uuid.uuid4()), "user_id": aid, "kind": "offer", "title": "Isolated vacancy",
        "village": "Test village", "field": "Test field", "description": "Isolated acceptance vacancy without real contact information",
        "contact_kind": "email", "contact_value": "nobody@example.invalid"}
    jid = job["id"]
    check("member job submission pending", request("rest", "osairat_jobs", "POST", job, at, (201,), rep)[0]["status"] == "pending")
    check("pending job hidden from visitor", request("rest", f"osairat_jobs?id=eq.{jid}") == [])
    check("pending job hidden from other JWT", request("rest", f"osairat_jobs?id=eq.{jid}", token=bt) == [])
    check("job self-approval affects no rows", request("rest", f"osairat_jobs?id=eq.{jid}", "PATCH", {"status": "approved"}, at, headers=rep) == [])
    denied("preapproved job insertion denied", "osairat_jobs", at, "POST", {**job, "id": str(uuid.uuid4()), "status": "approved"})
    service = local_service_jwt()
    check("server job moderation succeeds", request("rest", f"osairat_jobs?id=eq.{jid}", "PATCH", {"status": "approved", "published_at": "2026-10-24T00:00:00Z"}, service, headers=rep)[0]["status"] == "approved")
    check("approved job public", len(request("rest", f"osairat_jobs?id=eq.{jid}")) == 1)
    denied("job scheduler state private", "osairat_job_feed_state")

    submission = {"id": str(uuid.uuid4()), "user_id": aid, "business_name": "Isolated test business",
        "category": "shops", "village": "Test village", "location_details": "Isolated test location", "description": "No real business"}
    sid = submission["id"]
    check("business submission pending", request("rest", "business_submissions", "POST", submission, at, (201,), rep)[0]["status"] == "pending")
    check("business request private to member", request("rest", f"business_submissions?id=eq.{sid}", token=bt) == [])
    check("business self-approval affects no rows", request("rest", f"business_submissions?id=eq.{sid}", "PATCH", {"status": "approved"}, at, headers=rep) == [])
    rejected = request("rest", "rpc/review_business_submission", "POST", {"p_id": sid, "p_status": "approved"}, at, (400,))
    check("member cannot invoke moderation RPC", rejected["code"] == "P0001")
    check("verified owner can moderate through API", request("rest", "rpc/review_business_submission", "POST", {"p_id": sid, "p_status": "approved"}, ot)["status"] == "approved")
    check("requester sees moderation notice", len(request("rest", f"member_notifications?entity_id=eq.{sid}", token=at)) == 1)
    check("other JWT cannot read notices", request("rest", f"member_notifications?entity_id=eq.{sid}", token=bt) == [])
    request("rest", "news_items", "POST", {"id": "isolated-news", "title": "Isolated news", "url": "https://example.invalid/news",
        "source": "Isolated", "source_url": "https://example.invalid", "published_at": "2026-10-24T00:00:00Z", "village": "Test village", "topic": "test", "source_text": "PRIVATE RAW TEXT"}, service, (201,))
    check("safe news projection public", len(request("rest", "news_items?id=eq.isolated-news&select=id,title")) == 1)
    denied("raw news text denied", "news_items?select=source_text")
    denied("news source registry private", "news_sources")
    denied("news run logs private to server", "news_ingestion_runs", at)
    request("rest", "sand_requests", "POST", {"mode": "direct", "intent": "directory", "data_source": "none", "result_count": 0, "duration_ms": 10}, expected=(201,))
    check("anonymous analytics insert succeeds", sql("select count(*) from public.sand_requests;") == "1")
    denied("anonymous analytics read denied", "sand_requests")
    check("ordinary JWT analytics hidden", request("rest", "sand_requests", token=at) == [])
    check("owner can read permitted analytics", len(request("rest", "sand_requests", token=ot)) == 1)
    invalid = request("rest", "rpc/is_directory_owner", "POST", {}, "invalid-jwt", (401,))
    check("invalid JWT rejected", invalid["code"].startswith("PGRST"))
    check("owner identity unchanged", sql(f"select owner_id={quote(oid)}::uuid from directory_internal.settings;") == "t")
    print(json.dumps({"postgres": "17.6", "migrations": len(files), "rls_tables": 34,
        "passed": len(RESULTS), "cases": RESULTS, "environment": "disposable local services; no managed resources"}), flush=True)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        # Commands contain only local fixture values, never remote credentials.
        print(error.stderr, flush=True)
        raise
