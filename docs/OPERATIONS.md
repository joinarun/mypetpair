# MyPetPair operations

Run MyPetPair as a capped, invite-only pilot until the product-owner launch decisions are complete. The [architecture](ARCHITECTURE.md) defines the proposed GCP deployment; [release status](RELEASE.md) records what was actually published and deployed. Use only GCP project `mypetpair`, project number `248924650823`.

## Configuration and secrets

The root [README](../README.md) lists environment variables and local commands. Production needs a PostgreSQL JDBC URL, dedicated database user, database password, invitation gate and invitation secret. Store secret values in Secret Manager and grant the Cloud Run runtime identity access only to the required secret versions. Never put secrets in frontend `EXPO_PUBLIC_` variables, source files, logs, URLs or screenshots.

Keep seed mode disabled in production. Local H2 is a development convenience, not deployment storage. Set the PostgreSQL connection, invitation gate and seed flag explicitly; do not rely on development defaults. Use an allowlist for development CORS and same-origin web/API hosting in production.

## GCP deployment commands

Run these stages only after verification, a secret scan and GitHub publication of the exact source commit. They require Python 3, authenticated `gcloud`, billing and appropriate provisioning permissions. Provisioning creates billable Cloud SQL resources. The script verifies project number `248924650823` and supplies `--project=mypetpair` rather than changing the user's default project.

```sh
python3 scripts/deploy-gcp.py provision
python3 scripts/deploy-gcp.py build
```

`build` submits Cloud Build asynchronously and records its image, commit and build ID in ignored `.local/deployment.json`. Wait for that specific build to succeed in Cloud Build before continuing. `deploy` rejects an unfinished or failed build; do not submit another build merely to poll the first one.

```sh
python3 scripts/deploy-gcp.py deploy
python3 scripts/deploy-gcp.py bootstrap
```

`deploy` creates or updates Cloud Run with the built image, PostgreSQL connector, invitation gate, Secret Manager references, seed disabled and the configured runtime identity. It records the actual application URL. The proposed limits are 1 vCPU, 1 GiB, zero minimum instances, two maximum instances and concurrency 20; verify the resulting revision in [release status](RELEASE.md).

`bootstrap` creates an operator account using the private invitation, assigns its immutable account ID as administrator and revokes the one-time bootstrap session. The placeholder login email is `operator@mypetpair.example`; it is not a deliverable mailbox. A randomly generated password is stored in Secret Manager as `mypetpair-operator-password` and is never printed or committed. Restrict access to this secret to approved operators; the runtime service does not need the operator's password. Subsequent invocations do not recreate a locally recorded operator.

The script reuses existing resources and does not silently rotate an existing database password. Keep the ignored `.local` directory private; it contains deployment/operator identifiers and temporary secret files that the script removes after use. If deployment state is lost, inspect existing resources and accounts before bootstrapping again. Secret rotation and ownership handover require an operator procedure; they are not implemented as application self-service.

## Administrator assignment

1. Have the intended moderator create a regular account through the gated registration flow.
2. Independently confirm that the intended person controls that account. Email ownership is not verified by the pilot, so an email string is insufficient.
3. Obtain the account UUID from the authenticated `GET /api/me` response through an approved operator process.
4. Add only that UUID to `APP_ADMIN_OWNER_IDS`, then restart or deploy a revision with the updated configuration.
5. Verify that the intended account can open Admin and that an ordinary account receives a forbidden response from admin APIs.

Removing a UUID removes the configured role after the configuration change takes effect. Restrict who can edit Cloud Run configuration and service-account permissions. Do not publish moderator IDs together with credentials or reuse shared moderator accounts.

## Profile and report moderation

An owner creates a private pending profile, adds a photo and supplies eligibility attestations. A moderator reviews the profile before approving it. Review the image and free text for contact details, home addresses, misleading verification claims, fraud, harassment and welfare concerns. Approval publishes a self-declared profile; it is not veterinary certification.

Public profile edits return the dog to pending review. Suspend content when needed and give an owner-facing moderation reason without revealing reporter identities or confidential report details. Review incoming reports through the Admin queue, record a resolution and verify the resulting visibility. Approval, suspension and resolution create audit events.

Before inviting real users, name a responsible moderator, provide a support and appeals channel and agree how urgent welfare concerns will be escalated in the launch jurisdiction. The app does not dispatch emergency services. The 48-hour report-triage goal in the PRD is a staffing target, not an implemented escalation service.

## Database and migration operations

Flyway migrations are versioned under `backend/src/main/resources/db/migration/`. Apply reviewed migrations through application startup; do not rewrite a migration that has already run on a persistent deployment. Back up production data before a schema-changing release. Test a restore into a separate database before relying on backups for recovery.

The [data model](../specs/001-owner-matching/data-model.md) defines accounts, hashed sessions, dogs, private processed photos, interests, grants, blocks, reports and de-identified audit events. Photos consume database storage and backup capacity. Bound the pilot population and monitor database size; moving media to private object storage and discovery to indexed PostGIS queries is future scale work.

Account deletion removes the private relationship graph defined in the PRD, including sessions and contact grants. Database backups can retain deleted records until their retention period ends. Restoring a backup can resurrect deleted data; preserve a restricted deletion ledger outside the restored database or otherwise reconcile deletion requests before re-opening traffic. That reconciliation is an operator procedure, not an automated feature of this pilot.

## Retention policy requiring operator adoption

The application does not implement a general automatic retention/purge scheduler. Seven-day session expiry and 30-day pending-interest expiry are access/state rules, not proof that expired rows have been purged.

The provisioning script requests a daily SQL backup schedule and seven retained backup copies. Seven copies are not a guaranteed seven-day deletion deadline; verify actual backup history and settings, including any on-demand backups. The script does not set a Cloud Logging retention period. A proposed pilot policy is 30 days of operational logs; inspect and configure the actual bucket setting before promising that period. Record deployed settings in release documentation and obtain approval for the launch jurisdiction. Audit/report retention, inactive-account deletion, legal holds and erasure exceptions still require a documented owner decision. Avoid real-user public launch until notices and actual settings agree.

## Health and incident checks

Verify `/api/health`, the web shell and an authenticated discovery call after deployment. A successful health response alone does not verify database persistence, migrations, authorization or contact consent. Use fictional accounts in a separate test environment to exercise request, acceptance, grant, revoke and block behavior.

Keep logs limited to operational identifiers and sanitized errors. Do not enable HTTP body logging or capture bearer tokens, contact payloads or coordinates. For suspected contact exposure, restrict invitations and traffic as needed, preserve minimal restricted evidence, revoke affected sessions/grants and follow the operator's notification obligations. Investigate who had access before restoring service.

Rate limiting is bounded and per application instance. Multiple Cloud Run instances each have their own limiter; local limits are not a global abuse-prevention guarantee. Limit pilot scale, monitor failures and move to shared rate-limit infrastructure before public growth. Cloud budget alerts notify; they do not impose a hard spending cap.

## Release and rollback

Run the documented backend tests, frontend typecheck and platform exports before publishing. Keep source, lockfiles, migrations and deployment configuration together in one reviewed commit. Consult [verification evidence](VERIFICATION.md) for executed checks and limitations.

Cloud Run can direct traffic back to an earlier healthy revision, but application rollback does not reverse a database migration. Check schema compatibility before shifting traffic. Keep the previous revision and database backup until smoke checks pass. Do not delete Cloud SQL or disable deletion protection as a routine rollback step.

Cloud Run uses the Java Cloud SQL connector with `cloudSqlRefreshStrategy=lazy` so certificate refresh happens during connection attempts rather than relying on background CPU. This follows [Google Cloud serverless connection guidance](https://docs.cloud.google.com/sql/docs/postgres/connect-run). The JDBC URL contains configuration only; the database password remains a separate Secret Manager runtime binding.

Operator access uses `operator@mypetpair.example`. Retrieve the password only in a private operator terminal:

```sh
gcloud secrets versions access latest --secret=mypetpair-operator-password --project=mypetpair
```

The invitation is stored separately as `mypetpair-invitation`. Do not paste either value into source, issue trackers, logs or public chat. The bootstrap saves the generated password before account creation and can resume a partially completed registration by signing in with that stored password; it re-applies the immutable administrator ID on retry.
