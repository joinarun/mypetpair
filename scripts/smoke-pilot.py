#!/usr/bin/env python3
"""Exercise the pilot API with synthetic data, then remove the test accounts.

Local seeded backend:
  python3 scripts/smoke-pilot.py http://localhost:8080
Deployed MyPetPair service, after operator bootstrap:
  python3 scripts/smoke-pilot.py https://SERVICE.run.app --cloud-secrets

For another HTTPS test environment, supply MYPETPAIR_SMOKE_ADMIN_EMAIL,
MYPETPAIR_SMOKE_ADMIN_PASSWORD and optionally MYPETPAIR_SMOKE_INVITATION.
Credentials and response bodies are never printed. Cleanup is best effort if the
server or process becomes unavailable; all created accounts use Smoke test names.
"""

import argparse
import datetime as dt
import json
import os
import secrets
import signal
import struct
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import zlib


PROJECT = "mypetpair"
MARKER = b"MYPETPAIR_SMOKE_PRIVATE_SOURCE_METADATA"
MAX_RESPONSE = 10 * 1024 * 1024


class SmokeFailure(Exception):
    """Messages must contain only static labels and HTTP status codes."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Never forward a bearer token to a redirect target.


def cloud_value(*args):
    try:
        result = subprocess.run(
            ["gcloud", *args, f"--project={PROJECT}", "--quiet"],
            capture_output=True, text=True, timeout=45, check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        raise SmokeFailure("Cloud configuration could not be read") from None
    if result.returncode or not result.stdout.strip():
        raise SmokeFailure("Cloud configuration could not be read")
    return result.stdout.strip()


def png_fixture():
    """Create a tiny RGB PNG with a source-only text metadata marker."""
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    width, height = 32, 24
    pixels = b"".join(b"\x00" + bytes((103, 127, 82)) * width for _ in range(height))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"tEXt", b"Comment\x00" + MARKER)
        + chunk(b"IDAT", zlib.compress(pixels))
        + chunk(b"IEND", b"")
    )


class PilotSmoke:
    def __init__(self, base_url, admin_email, admin_password, invitation):
        self.base = base_url
        self.admin_email = admin_email
        self.admin_password = admin_password
        self.invitation = invitation
        self.admin = None
        self.accounts = []
        self.passed = 0
        self.stage = "initialization"
        self.opener = urllib.request.build_opener(NoRedirect())
        self.run_id = secrets.token_hex(6)

    def check(self, name, condition):
        if not condition:
            raise SmokeFailure(name)
        self.passed += 1
        print(f"PASS {name}", flush=True)

    def request(self, method, path, token=None, body=None, expected=200, raw=False, content_type=None):
        data = body if isinstance(body, bytes) else None if body is None else json.dumps(body).encode()
        headers = {"Accept": "application/json", "User-Agent": "MyPetPair-synthetic-smoke/1"}
        if token:
            headers["Authorization"] = "Bearer " + token
        if data is not None:
            headers["Content-Type"] = content_type or "application/json"
        req = urllib.request.Request(self.base + "/api" + path, data=data, headers=headers, method=method)
        try:
            try:
                response = self.opener.open(req, timeout=45)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                status = response.code
                response_headers = {key.lower(): value for key, value in response.headers.items()}
                payload = response.read(MAX_RESPONSE + 1)
        except (urllib.error.URLError, TimeoutError, OSError):
            raise SmokeFailure("API connection failed") from None
        wanted = (expected,) if isinstance(expected, int) else expected
        if status not in wanted:
            raise SmokeFailure(f"Unexpected HTTP status {status}; expected {'/'.join(map(str, wanted))}")
        if len(payload) > MAX_RESPONSE:
            raise SmokeFailure("API response exceeded the smoke check limit")
        if raw:
            return status, response_headers, payload
        if not payload:
            return None
        try:
            return json.loads(payload)
        except (UnicodeError, ValueError):
            raise SmokeFailure("API returned an invalid JSON response") from None

    def register(self, role):
        account = {
            "email": f"smoke-{self.run_id}-{role}@mypetpair.example",
            "password": secrets.token_urlsafe(24),
            "displayName": f"Smoke test {role}", "deleted": False, "token": None,
        }
        self.accounts.append(account)  # Retain recovery credentials even if response handling fails.
        result = self.request("POST", "/auth/register", body={
            "email": account["email"], "password": account["password"],
            "displayName": account["displayName"], "adultConfirmed": True,
            "termsAccepted": True, "invitationCode": self.invitation,
        }, expected=201)
        account.update(token=result["token"], id=result["user"]["id"])
        self.check("synthetic owner registration", result["user"].get("admin") is False)
        return account

    def dog_fields(self, name, sex, latitude):
        today = dt.datetime.now(dt.timezone.utc).date()
        return {
            "name": f"Smoke test {name}", "breed": f"Smoke fixture {self.run_id}",
            "sex": sex, "birthDate": str(today - dt.timedelta(days=3 * 366)),
            "city": "Fictional smoke location", "latitude": latitude, "longitude": 77.590921,
            "weightKg": 24, "temperament": "Synthetic test fixture",
            "bio": "Synthetic verification profile. Remove after verification.",
            "healthSummary": "Synthetic test data with no real medical or breeding claims.",
            "vetCheckedOn": str(today - dt.timedelta(days=1)), "intact": True,
            "vaccinated": True, "ownershipAttested": True, "registry": "", "available": True,
        }

    def create_dog(self, account, name, sex, latitude):
        fields = self.dog_fields(name, sex, latitude)
        dog = self.request("POST", "/dogs", account["token"], fields, expected=201)
        boundary = "mypetpair-smoke-" + secrets.token_hex(8)
        form = (
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="fixture.png"\r\n'
            'Content-Type: image/png\r\n\r\n'
        ).encode() + png_fixture() + f"\r\n--{boundary}--\r\n".encode()
        photo = self.request("POST", f'/dogs/{dog["id"]}/photos', account["token"], form,
                             expected=201, content_type="multipart/form-data; boundary=" + boundary)
        return {"id": dog["id"], "photo": photo["id"], "fields": fields}

    def moderate(self, dog, state="APPROVED"):
        return self.request("POST", f'/admin/dogs/{dog["id"]}/moderation', self.admin,
                            {"status": state, "reason": "Synthetic smoke verification"})

    @staticmethod
    def private_keys_absent(value):
        forbidden = {"latitude", "longitude", "birthDate", "email", "phone", "password",
                     "password_hash", "token", "distanceKm", "exactDistance", "moderationReason"}
        if isinstance(value, dict):
            return not forbidden.intersection(value) and all(PilotSmoke.private_keys_absent(v) for v in value.values())
        if isinstance(value, list):
            return all(PilotSmoke.private_keys_absent(v) for v in value)
        return True

    @staticmethod
    def hidden_contacts(result):
        contact = result.get("contact", {})
        return not contact.get("email") and not contact.get("phone")

    def run(self):
        self.stage = "health and administrator login"
        self.check("database health", self.request("GET", "/health").get("status") == "ok")
        self.request("GET", "/me", expected=401)
        self.check("unauthenticated private API denied", True)
        config = self.request("GET", "/config")
        if config.get("invitationRequired") and not self.invitation:
            raise SmokeFailure("The target requires an invitation secret")
        result = self.request("POST", "/auth/login", body={"email": self.admin_email, "password": self.admin_password})
        self.admin = result["token"]
        self.check("operator administrator role", result["user"].get("admin") is True)

        self.stage = "synthetic account and dog setup"
        male, female, outsider = [self.register(role) for role in ("male", "female", "outsider")]
        self.request("PATCH", "/me", female["token"], {"displayName": female["displayName"], "phone": "+12025550101"})
        m = self.create_dog(male, "male", "MALE", 12.970123)
        f = self.create_dog(female, "near female", "FEMALE", 12.990123)
        far = self.create_dog(outsider, "far female", "FEMALE", 13.200123)
        second = self.create_dog(male, "second profile", "MALE", 12.980123)
        own = self.request("GET", "/dogs/mine", male["token"])
        self.check("multiple dogs per owner", len(own) == 2)
        self.check("coordinate quantization", all(d["latitude"] == round(d["latitude"], 2) for d in own))
        self.request("GET", f'/dogs/{f["id"]}', outsider["token"], expected=404)
        self.request("PUT", f'/dogs/{f["id"]}', outsider["token"], f["fields"], expected=404)
        self.request("GET", f'/photos/{f["photo"]}', outsider["token"], expected=404)
        self.check("pending profile ownership and photo privacy", True)
        _, headers, photo = self.request("GET", f'/photos/{f["photo"]}', self.admin, raw=True)
        self.check("moderator can review pending photos", headers.get("content-type", "").startswith("image/jpeg"))
        self.check("photo reencoding strips source metadata", photo.startswith(b"\xff\xd8") and MARKER not in photo)
        self.check("private photo caching disabled", "no-store" in headers.get("cache-control", ""))
        for dog in (m, f, far):
            self.moderate(dog)
        public = self.request("GET", f'/dogs/{f["id"]}', male["token"])
        self.check("public dog DTO excludes private fields", self.private_keys_absent(public))
        self.request("GET", "/admin/reports", outsider["token"], expected=403)
        self.check("ordinary owner cannot moderate", True)

        self.stage = "nearby discovery"
        query = urllib.parse.urlencode({"dogId": m["id"], "radiusKm": 50, "sex": "FEMALE",
                                       "breed": f["fields"]["breed"], "size": 50})
        discovery = self.request("GET", "/discovery?" + query, male["token"])
        self.check("nearest first discovery", [d["id"] for d in discovery["items"]] == [f["id"], far["id"]])
        self.check("discovery omits coordinates and contacts", self.private_keys_absent(discovery))
        self.request("GET", "/discovery?" + urllib.parse.urlencode({"dogId": f["id"]}), male["token"], expected=404)
        self.check("discovery requires an owned center", True)
        entitlement = self.request("GET", "/entitlements", male["token"])
        self.check("free unlimited entitlement", entitlement.get("plan") == "FREE" and entitlement.get("unlimitedViews") is True)

        self.stage = "interest ownership and acceptance"
        interest = self.request("POST", "/interests", male["token"], {"maleDogId": m["id"], "femaleDogId": f["id"]}, expected=201)
        iid = interest["id"]
        decision, contacts = f"/interests/{iid}/decision", f"/interests/{iid}/contacts"
        self.request("POST", "/interests", male["token"], {"maleDogId": m["id"], "femaleDogId": f["id"]}, expected=409)
        self.request("POST", decision, male["token"], {"action": "ACCEPT"}, expected=403)
        self.request("POST", decision, outsider["token"], {"action": "ACCEPT"}, expected=404)
        self.check("unique requests and recipient control", True)
        inbox = self.request("GET", "/interests", female["token"])
        self.check("incoming request visible to recipient", any(i["id"] == iid for i in inbox))
        accepted = self.request("POST", decision, female["token"], {"action": "ACCEPT"})
        again = self.request("POST", decision, female["token"], {"action": "ACCEPT"})
        self.check("acceptance is idempotent", accepted.get("state") == again.get("state") == "ACCEPTED")
        self.check("acceptance alone keeps contacts private", self.hidden_contacts(self.request("GET", contacts, male["token"])))
        self.request("GET", contacts, outsider["token"], expected=404)
        self.check("outsider cannot read connection contacts", True)

        self.stage = "independent contact grants and phone changes"
        self.request("PUT", contacts, female["token"], {"shareEmail": True, "sharePhone": False})
        shown = self.request("GET", contacts, male["token"])["contact"]
        reverse = self.request("GET", contacts, female["token"])
        self.check("email grant is channel specific and independent", shown.get("email") == female["email"] and not shown.get("phone") and self.hidden_contacts(reverse))
        self.request("PUT", contacts, female["token"], {"shareEmail": False, "sharePhone": False})
        self.check("contact revocation takes effect", self.hidden_contacts(self.request("GET", contacts, male["token"])))
        self.request("PUT", contacts, female["token"], {"shareEmail": True, "sharePhone": True})
        self.check("phone shared only with grant", self.request("GET", contacts, male["token"])["contact"].get("phone") == "+12025550101")
        self.request("PATCH", "/me", female["token"], {"displayName": female["displayName"], "phone": "+12025550102"})
        changed = self.request("GET", contacts, male["token"])["contact"]
        self.check("changing phone revokes its prior grant", not changed.get("phone") and changed.get("email") == female["email"])

        self.stage = "profile edit and moderation revocation"
        self.request("PUT", f'/dogs/{f["id"]}', female["token"], f["fields"])
        self.request("GET", contacts, male["token"], expected=409)
        history = self.request("GET", "/interests", male["token"])
        matching = next(i for i in history if i["id"] == iid)
        self.check("pending edits redact connection history", matching["femaleDog"].get("unavailable") is True)
        self.request("PUT", contacts, female["token"], {"shareEmail": False, "sharePhone": False})
        self.check("revocation remains possible while pending", True)
        self.moderate(f)
        self.check("reapproval does not restore old grants", self.hidden_contacts(self.request("GET", contacts, male["token"])))
        report = self.request("POST", "/reports", male["token"], {"dogId": f["id"], "reason": "PRIVACY", "details": "Synthetic smoke report, not a real allegation."}, expected=201)
        queue = self.request("GET", "/admin/reports", self.admin)
        self.check("report reaches moderator queue", any(r["id"] == report["id"] for r in queue))
        resolved = self.request("POST", f'/admin/reports/{report["id"]}/resolve', self.admin, {"resolution": "Synthetic verification completed."})
        audit = self.request("GET", "/admin/audit", self.admin)
        self.check("report resolution is audited", resolved.get("status") == "RESOLVED" and any(a.get("targetId") == report["id"] and a.get("action") == "REPORT_RESOLVED" for a in audit))
        self.request("PUT", contacts, female["token"], {"shareEmail": True, "sharePhone": False})
        self.moderate(f, "SUSPENDED")
        self.request("GET", contacts, male["token"], expected=409)
        self.request("GET", f'/photos/{f["photo"]}', male["token"], expected=404)
        self.check("suspension removes profile and contact access", True)
        self.moderate(f)
        self.check("suspension permanently clears prior grants", self.hidden_contacts(self.request("GET", contacts, male["token"])))

        self.stage = "blocking and account deletion"
        self.request("PUT", contacts, female["token"], {"shareEmail": True, "sharePhone": False})
        self.request("POST", "/blocks", male["token"], {"ownerId": female["id"]}, expected=204)
        for owner in (male, female):
            self.request("GET", contacts, owner["token"], expected=409)
        self.request("GET", f'/photos/{f["photo"]}', male["token"], expected=404)
        blocked = self.request("GET", "/discovery?" + query, male["token"])
        self.check("blocking hides profiles photos and contacts", all(d["id"] != f["id"] for d in blocked["items"]))
        self.request("DELETE", f'/blocks/{female["id"]}', male["token"], expected=204)
        self.request("GET", contacts, male["token"], expected=409)
        self.check("unblocking does not reopen a connection", True)
        self.request("DELETE", f'/dogs/{second["id"]}', male["token"], expected=204)
        exported = self.request("GET", "/me/export", male["token"])
        encoded = json.dumps(exported)
        self.check("export includes retained archived dogs", any(d["id"] == second["id"] and d.get("archived") for d in exported["dogs"]))
        self.check("export excludes unrelated private data", female["email"] not in encoded and outsider["email"] not in encoded and "password_hash" not in encoded and male["password"] not in encoded)
        self.request("DELETE", "/me", male["token"], {"password": male["password"]}, expected=204)
        male["deleted"] = True
        self.request("GET", "/me", male["token"], expected=401)
        self.request("POST", "/auth/login", body={"email": male["email"], "password": male["password"]}, expected=401)
        self.request("GET", contacts, female["token"], expected=404)
        self.check("account deletion invalidates sessions and connections", True)

    def cleanup(self):
        failed = 0
        removed = sum(account["deleted"] for account in self.accounts)
        for account in reversed(self.accounts):
            if account["deleted"]:
                continue
            try:
                token = account["token"]
                if token is None:
                    result = self.request("POST", "/auth/login", body={"email": account["email"], "password": account["password"]}, expected=(200, 401))
                    token = result.get("token") if isinstance(result, dict) else None
                    if not token:
                        continue  # Registration never committed, or the account is already absent.
                status, _, _ = self.request("DELETE", "/me", token, {"password": account["password"]}, expected=(204, 401), raw=True)
                if status != 204:
                    result = self.request("POST", "/auth/login", body={"email": account["email"], "password": account["password"]}, expected=(200, 401))
                    token = result.get("token") if isinstance(result, dict) else None
                    if token:
                        self.request("DELETE", "/me", token, {"password": account["password"]}, expected=204)
                account["deleted"] = True
                removed += 1
            except Exception:
                failed += 1
        if self.admin:
            try:
                self.request("POST", "/auth/logout", self.admin, expected=(204, 401))
            except Exception:
                failed += 1
        if failed:
            print(f"FAIL cleanup incomplete for {failed} operation(s); operator review of Smoke test accounts is required", flush=True)
        else:
            self.passed += 1
            print(f"PASS synthetic account cleanup ({removed} accounts removed)", flush=True)
        return failed == 0


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("base_url", help="Application origin, without /api")
    parser.add_argument("--cloud-secrets", action="store_true", help="Read invitation/operator credentials from project mypetpair Secret Manager; verify the Cloud Run origin")
    args = parser.parse_args()
    smoke = None
    failure = None
    cleaned = True
    try:
        parsed = urllib.parse.urlsplit(args.base_url)
        local = parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in {"", "/"}:
            raise SmokeFailure("Supply only an application HTTP or HTTPS origin")
        if parsed.scheme != "https" and not local:
            raise SmokeFailure("Remote smoke checks require HTTPS")
        base = args.base_url.rstrip("/")
        if args.cloud_secrets:
            actual = cloud_value("run", "services", "describe", "mypetpair", "--region=us-central1", "--format=value(status.url)").rstrip("/")
            if base != actual:
                raise SmokeFailure("Cloud credentials are restricted to the configured MyPetPair service origin")
            invitation = cloud_value("secrets", "versions", "access", "latest", "--secret=mypetpair-invitation")
            password = cloud_value("secrets", "versions", "access", "latest", "--secret=mypetpair-operator-password")
            email = "operator@mypetpair.example"
        else:
            invitation = os.environ.get("MYPETPAIR_SMOKE_INVITATION", "")
            email = os.environ.get("MYPETPAIR_SMOKE_ADMIN_EMAIL", "moderator@example.invalid" if local else "")
            password = os.environ.get("MYPETPAIR_SMOKE_ADMIN_PASSWORD", "Fictional-local-only-42!" if local else "")
            if not email or not password:
                raise SmokeFailure("A remote test administrator must be configured securely")
        smoke = PilotSmoke(base, email, password, invitation)
        smoke.run()
    except SmokeFailure as error:
        failure = str(error)
    except (KeyboardInterrupt, InterruptedError):
        failure = "Smoke check interrupted"
    except Exception:
        failure = "Unexpected smoke check error; response data suppressed"
    finally:
        if smoke:
            cleaned = smoke.cleanup()
    if failure:
        print(f"FAIL {smoke.stage if smoke else 'configuration'}: {failure}", flush=True)
    if smoke:
        print(f"{'PASS' if not failure and cleaned else 'FAIL'} smoke result ({smoke.passed} checks passed)", flush=True)
    return 0 if not failure and cleaned else 1


if __name__ == "__main__":
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(InterruptedError()))
    sys.exit(main())
