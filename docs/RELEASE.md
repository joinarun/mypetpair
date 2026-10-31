# MyPetPair deployed pilot release

Released 1 November 2026 as an invitation-only pilot. Open registration and app-store publication are separate milestones.

## Application and source

- [Live MyPetPair](https://mypetpair-248924650823.us-central1.run.app)
- [Private GitHub repository](https://github.com/joinarun/mypetpair), created and verified in Brave, uploaded with the existing authenticated SSH identity.
- Alternate Cloud Run service origin: `https://mypetpair-mj7inumdvq-uc.a.run.app`.
- Application image source commit: `345a646dab81eb5bc6de57a65192ac8b3cbd7cae`. Subsequent commits cover deployment helpers, documentation and native release environment configuration; application behavior in the deployed image matches the reviewed source.
- Cloud Build: `dba1d11a-8ac8-4d36-81a2-e7ac0e72ecd7`, SUCCESS. [Build record](https://console.cloud.google.com/cloud-build/builds;region=us-central1/dba1d11a-8ac8-4d36-81a2-e7ac0e72ecd7?project=mypetpair).
- Image: `us-central1-docker.pkg.dev/mypetpair/mypetpair/app:345a646dab81`.
- Image digest: `sha256:16e70bf196bdcac0d20c8fc596f1e77bcc25b247c5b11f9c2f66efb5bde4a33f`.

## Deployed Google Cloud resources

Project MyPetPair, ID `mypetpair`, number `248924650823`; region `us-central1`. Chrome was used to inspect the target project and Cloud SQL provisioning. Every provisioning command selected the project explicitly; the user's default GCP project was preserved.

| Resource | Actual configuration |
|---|---|
| Cloud Run `mypetpair` | Ready revision `mypetpair-00002-h2c`, 100% traffic; 1 vCPU, 1 GiB, concurrency 20, min 0/max 2 instances |
| Cloud SQL `mypetpair-pilot` | RUNNABLE, PostgreSQL 17 Enterprise, `db-f1-micro`, 10 GB SSD, zonal |
| Backups and protection | Daily backup schedule 03:00 UTC, 7 retained copies, deletion protection enabled; restore drill not performed |
| Database/user | Dedicated `mypetpair` database and application user; Flyway V1 applied successfully |
| Networking | Managed HTTPS; public app ingress with application authentication; SQL has no authorized public networks and uses authenticated Cloud SQL Java connector |
| Runtime identity | `mypetpair-runtime@mypetpair.iam.gserviceaccount.com`; Cloud SQL client and access to the two runtime secrets |
| Build identity | `mypetpair-build@mypetpair.iam.gserviceaccount.com`; image upload, source read and build logging |
| Artifact Registry | Private Docker repository `us-central1/mypetpair` |
| Secret Manager | Database password, pilot invitation and operator password; no values committed or printed |
| Cloud Logging | Operational logs; no application request-body logging; custom retention not configured |

The JDBC connector uses lazy credential refresh for serverless execution. Production enables invitation gating, disables local seeds and assigns administrator access by immutable account ID. No payment service exists.

## Operator access

Login email: `operator@mypetpair.example` (an operator account identifier, not a deliverable mailbox). Password: Secret Manager `mypetpair-operator-password`. Invitation: Secret Manager `mypetpair-invitation`. Retrieve these only in a private operator terminal or the authorized Google Cloud console; see [operations](OPERATIONS.md). The runtime service was not granted access to the operator-password secret.

The first bootstrap's empty-form logout request was rejected. The helper now sends the same bodyless logout format used by the verified client. All prior operator validation sessions were invalidated through the session cap, the final session was logged out, and subsequent reads returned 401. The production smoke operator session also logged out successfully.

## Verification and remaining setup

[Verification report](VERIFICATION.md): 20 backend tests; 40 local and 40 deployed HTTP checks; lint, TypeScript, Expo Doctor 20/20; web/Android/iOS exports; desktop and 390×844 browser checks; live Chrome landing/invitation form; private API401 without session. All three synthetic production accounts were removed. GitHub Actions succeeded for the application-image source commit.

EAS preview/production profiles target the canonical live API. Production-targeted web assets and Android/iOS Hermes bundles were exported to ignored `.local/production-bundles`; these are not signed installable apps. Configure user-owned EAS/Apple/Google publisher accounts and signing, then perform device testing before store submission.

Before open real-user launch, complete PRD D1–D7: jurisdiction/operator notices, veterinary eligibility review, staffed moderation/support, retention/data-region decisions and transactional email verification/recovery. Load, availability and restore targets remain unmeasured. Build-toolchain advisories are recorded in verification.

The pre-deployment planning range remains roughly USD 15–35/month for baseline database/storage/backups, plus usage-dependent compute, builds, logs, images and egress; it is not a quote or cap. Budget alerts are not configured. The account showed about 14 days of free trial remaining at deployment; confirm billing continuity before relying on the service. No billing upgrade was performed. Current pricing sources and assumptions are in [architecture](ARCHITECTURE.md).
