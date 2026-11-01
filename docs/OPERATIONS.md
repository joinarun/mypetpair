# MyPetPair operations — v2

See [PRD2](PRD.md) and [feature002](../specs/002-open-registration-chat/). Open signup with CAPTCHA replaces invitations. Operator IDs and passwords are preserved. Neither email nor mobile verification is required until phase2; neither grants operator access.

## Setup

Use Java17+, Maven and Node24/npm. The project Maven settings use public Maven Central. `scripts/build-local.sh` builds the shared web app and backend; `scripts/verify.sh` runs backend checks, client lint/types/exports and the secret scanner. Spring does not auto-load dotenv files; set environment in the process. `.env.example` is local-only. H2 `APP_SEED=true` provides fictional examples; PostgreSQL rejects local seed data.

Runtime variables: DB_URL, DB_USERNAME, DB_PASSWORD, APP_ADMIN_OWNER_IDS, APP_CAPTCHA_HMAC_SECRET, APP_SEED, CORS_ALLOWED_ORIGINS and PORT. CAPTCHA requires at least32 UTF-8 bytes of signing key in production. Only H2 can generate an ephemeral key. The H2-only reduced test workload still requires valid proofs; never enable it in production. Old APP_INVITATION_REQUIRED/APP_INVITATION_CODE variables are removed. `/api/config` contains no key values.

The self-hosted ALTCHA widget uses `/captcha` and `/api/captcha/challenge?purpose=login|register`. Proofs expire in5minutes, are purpose-bound and are consumed once across replicas, even when the subsequent password is wrong. Issuance, auth and writes are rate-limited; per-process limiter scope is a known scale limitation. Computational proof raises automation cost but does not prove identity. Repeated failures require fresh verification.

## Deployment

Use project `mypetpair` (248924650823), region `us-central1`. Reuse Cloud Run `mypetpair`, private Artifact Registry, PostgreSQL17 Cloud SQL `mypetpair-pilot`, Cloud Build, Secret Manager and Logging. No additional paid messaging or CAPTCHA service. Foreground chat polling increases SQL/Run requests; storage, compute, builds, logs and egress are variable costs. Existing USD15–35/month baseline planning estimate is not a quote/cap; check trial/billing continuity. No budget alerts or billing upgrade are configured.

Publish reviewed, tested source to GitHub main. `python3 scripts/deploy-gcp.py build` checks clean/published source and submits Cloud Build. Wait for SUCCESS, then run the deploy stage. Cloud Run uses1CPU/1GiB, min0/max2 and concurrency20. FlywayV2/V3 are additive; V1 must not change. Pending profiles become published status; existing suspended profiles remain suspended. Do not reset the database.

Runtime identity `mypetpair-runtime@mypetpair.iam.gserviceaccount.com` has Cloud SQL access and Secret Manager access to `mypetpair-db-password` and `mypetpair-captcha-hmac`. Operator password remains operator-only. Legacy invitation secret may remain for historical rollback, but v2 does not bind or use it. Never commit, log or pass secret values in visible command arguments. Existing sessions persist through upgrade; users of older APKs must update to satisfy CAPTCHA on new logins.

Operator account identifier: `operator@mypetpair.example` (not a mailbox). Retrieve the password privately, then use normal CAPTCHA login:

```bash
gcloud secrets versions access latest --secret=mypetpair-operator-password --project=mypetpair | pbcopy
```

Complete a missing legacy mobile number in Account. No password reset is needed. On a new installation, create an account through normal signup, obtain its immutable ID through authenticated `/api/me`, then configure APP_ADMIN_OWNER_IDS. The helper refuses silent role grants based on an unverified email.

## Moderation and privacy

Published status uses the internal APPROVED enum; eligibility, availability and photo presence still control discovery. Eleven distinct OPEN reporters trigger suspension atomically; repeat reports count once. Operators can resolve invalid flags, reinstate or manually suspend with a reason, and remove photos with a reason. Edits/uploads cannot clear suspension. Keep appeals/support and welfare escalation staffed. Deleting/resolving reports can change active counts but never automatically reinstates a suspended dog. Actions are audited. Message reports show only submitted message evidence; there is no general operator chat browser.

Chat is text-only,1–2000characters, with foreground refresh, paginated history and unread counts. No push, attachments or E2EE. Every live request checks accepted connection, participants, eligibility, availability, blocks and suspension. Closing/blocking removes future access; previously copied messages cannot be recalled. Own export includes previously shared conversation history, including closed threads. Deleting either participant account cascades related messages/read state/reports. No automatic time-based chat purge is implemented. Contact grants remain independent. Never log message bodies or contact payloads.

JPEG/PNG/WebP inputs are decoded and re-encoded without metadata. Database backups retain seven copies; account deletion is not immediate deletion from backups. Restore drill, custom retention, jurisdiction and lawful notices remain follow-up decisions.

## Verification and rollback

Use `scripts/smoke-v2.py` on isolated synthetic records, verify cleanup and operator logout. Check health/config, missing/replayed CAPTCHA rejection, chat restrictions, flags, photos and account privacy. Record ready revision, source/image digest and actual checks. Preserve old image/revision for rollback, but old backend/APKs have incompatible auth policy; prefer fixing forward. Never destructively roll back schema. Monitor error rates, SQL storage, auth and flag spikes without logging payloads. Load/availability targets remain unmeasured.

`scripts/build-mobile-tests.sh android` builds a release variant with a test signing key and live API. Prerequisites: Java21, Android platform37, build tools36/37, NDK27.1 and CMake3.22.1. Publish APK/checksum as a private GitHub pre-release. Physical-device journeys, Play Store submission and iOS signing are separate checks. See the current release evidence. Themes are device-local Light/Dark/System; native WebView and SystemUI dependencies are included.
