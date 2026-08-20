#!/usr/bin/env python3
"""Copy the weeeb data from a legacy PocketBase instance into the current one.

Both instances are read and written through their REST API, so this works
between two running servers without touching any backup archive.

Record ids are preserved, which keeps every relation valid without an id
mapping table, and keeps user emails intact so that Google sign-in reattaches
to the migrated accounts on the next login.

Usage:

    export LEGACY_URL=https://old.example.com
    export LEGACY_EMAIL=admin@example.com
    export LEGACY_PASSWORD=...
    export TARGET_URL=https://new.example.com
    export TARGET_EMAIL=admin@example.com
    export TARGET_PASSWORD=...

    python3 scripts/import-legacy.py --dry-run   # report only, writes nothing
    python3 scripts/import-legacy.py             # actually import

The script is idempotent: a record whose id already exists in the target is
skipped, so it can be re-run safely after fixing an error.
"""

import argparse
import json
import os
import secrets
import sys
import urllib.error
import urllib.parse
import urllib.request

# Dependency order: a collection may only be imported once everything it
# points at already exists.
#
# The list is explicit rather than discovered, because the order matters and no
# reliable order can be derived from the schema alone. audit_coverage() below
# guards against the obvious downside: a collection present on the legacy side
# but missing from this list would otherwise be skipped in silence.
COLLECTIONS = ["genres", "users", "animes", "watchlists", "comments", "elo_matches"]

# Fields that must never be copied verbatim.
#   - file fields need a real upload, which the REST create call cannot express
#     from a plain JSON body
#   - auth internals are re-derived by the target instance
SKIPPED_FIELDS = {
    "avatar",  # file field
    "password",
    "tokenKey",
    "created",
    "updated",
    "expand",
    "collectionId",
    "collectionName",
}


class Instance:
    """A PocketBase server reachable over HTTP."""

    def __init__(self, label, base_url, email, password):
        self.label = label
        self.base_url = base_url.rstrip("/")
        self.email = email
        self.password = password
        self.token = None

    def request(self, method, path, body=None, expect_json=True):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base_url + path, data=data, method=method)
        req.add_header("Content-Type", "application/json")
        # A zip-unfriendly proxy is irrelevant here, but identity keeps
        # responses byte-exact and avoids surprises on large listings.
        req.add_header("Accept-Encoding", "identity")
        if self.token:
            req.add_header("Authorization", self.token)

        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                raw = response.read()
                return response.status, (json.loads(raw) if expect_json and raw else {})
        except urllib.error.HTTPError as error:
            raw = error.read()
            try:
                return error.code, json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                return error.code, {"message": raw[:200].decode("utf-8", "replace")}
        except urllib.error.URLError as error:
            die(f"{self.label}: unreachable ({error.reason})")

    def login(self):
        status, body = self.request(
            "POST",
            "/api/collections/_superusers/auth-with-password",
            {"identity": self.email, "password": self.password},
        )
        if status != 200 or "token" not in body:
            die(f"{self.label}: superuser login failed ({status}) {body.get('message', '')}")
        self.token = body["token"]

    def all_collections(self):
        """Every non-system collection, superuser-only endpoint."""
        status, body = self.request("GET", "/api/collections?perPage=200&skipTotal=1")
        if status != 200:
            die(f"{self.label}: cannot list the collections ({status}) "
                f"{body.get('message', '')}")

        return [
            item for item in body.get("items", [])
            # views hold no data of their own, they are recomputed from a query
            if not item.get("system") and not item["name"].startswith("_")
            and item.get("type") != "view"
        ]

    def collection_fields(self, name):
        """Field names the target collection actually accepts."""
        status, body = self.request("GET", f"/api/collections/{name}")
        if status != 200:
            return None
        return {field["name"] for field in body.get("fields", [])}

    def list_records(self, name):
        """Every record of a collection, following pagination."""
        records, page = [], 1
        while True:
            query = urllib.parse.urlencode({"page": page, "perPage": 500, "skipTotal": 1})
            status, body = self.request("GET", f"/api/collections/{name}/records?{query}")
            if status != 200:
                die(f"{self.label}: cannot read {name} ({status}) {body.get('message', '')}")
            items = body.get("items", [])
            records.extend(items)
            if len(items) < 500:
                return records
            page += 1

    def existing_ids(self, name):
        return {record["id"] for record in self.list_records(name)}


def audit_coverage(legacy):
    """Warn about legacy collections this script would not copy.

    Without this, adding a collection to the app and forgetting to list it here
    would produce a silent partial import that looks like a success.
    """
    found = {item["name"] for item in legacy.all_collections()}
    unlisted = sorted(found - set(COLLECTIONS))
    absent = sorted(set(COLLECTIONS) - found)

    for name in absent:
        print(f"  note: '{name}' does not exist on the legacy instance, nothing to copy")

    if unlisted:
        print("\n  WARNING — these legacy collections are NOT copied:")
        for name in unlisted:
            print(f"    - {name}")
        print("  Add them to COLLECTIONS, in dependency order, if they hold data you need.\n")

    return unlisted


def die(message):
    print(f"\n  ERROR  {message}", file=sys.stderr)
    sys.exit(1)


def build_payload(record, allowed_fields, collection):
    """Reduce a source record to what the target collection will accept."""
    payload = {"id": record["id"]}

    for key, value in record.items():
        if key in SKIPPED_FIELDS or key == "id" or key.startswith("@"):
            continue
        if key not in allowed_fields:
            continue  # field does not exist on this side
        payload[key] = value

    if collection == "users":
        # Auth records need a password even when the account only ever signs in
        # through OAuth. It is random and unusable on purpose: Google sign-in
        # reattaches by email, and nobody should be able to log in with it.
        generated = secrets.token_urlsafe(24)
        payload["password"] = generated
        payload["passwordConfirm"] = generated

    return payload


def import_collection(name, legacy, target, dry_run):
    allowed_fields = target.collection_fields(name)
    if allowed_fields is None:
        print(f"  {name:12s} absent from the target instance — skipped")
        return 0, 0, 0

    records = legacy.list_records(name)
    if not records:
        print(f"  {name:12s} nothing to copy")
        return 0, 0, 0

    already_there = target.existing_ids(name)

    created = skipped = failed = 0
    for record in records:
        if record["id"] in already_there:
            skipped += 1
            continue

        if dry_run:
            created += 1
            continue

        payload = build_payload(record, allowed_fields, name)
        status, body = target.request("POST", f"/api/collections/{name}/records", payload)

        if status in (200, 201):
            created += 1
        else:
            failed += 1
            print(f"    {record['id']}: {status} {body.get('message', '')} {body.get('data', '')}")

    verb = "would create" if dry_run else "created"
    print(f"  {name:12s} source: {len(records):<5d} {verb}: {created}   "
          f"already present: {skipped}   failed: {failed}")
    return created, skipped, failed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report only, write nothing")
    args = parser.parse_args()

    required = ["LEGACY_URL", "LEGACY_EMAIL", "LEGACY_PASSWORD",
                "TARGET_URL", "TARGET_EMAIL", "TARGET_PASSWORD"]
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        die("missing environment variables: " + ", ".join(missing))

    legacy = Instance("legacy", os.environ["LEGACY_URL"],
                      os.environ["LEGACY_EMAIL"], os.environ["LEGACY_PASSWORD"])
    target = Instance("target", os.environ["TARGET_URL"],
                      os.environ["TARGET_EMAIL"], os.environ["TARGET_PASSWORD"])

    if legacy.base_url == target.base_url:
        die("legacy and target point at the same instance")

    legacy.login()
    target.login()

    print(f"\n{'DRY RUN — nothing will be written' if args.dry_run else 'IMPORT'}")
    print(f"  from {legacy.base_url}\n  to   {target.base_url}\n")

    unlisted = audit_coverage(legacy)

    total_failed = 0
    for name in COLLECTIONS:
        _, _, failed = import_collection(name, legacy, target, args.dry_run)
        total_failed += failed

    if total_failed:
        print(f"\n{total_failed} record(s) failed — fix the cause and re-run, "
              "already imported records are skipped.")
        sys.exit(1)

    print("\nDone." if not args.dry_run else "\nDry run complete.")

    if unlisted:
        print(f"Reminder: {len(unlisted)} legacy collection(s) were left behind, listed above.")


if __name__ == "__main__":
    main()
