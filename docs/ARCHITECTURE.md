# MyPetPair architecture decisions

## Frontend choice before implementation

| Approach | Benefits | Trade-offs |
|---|---|---|
| Expo React Native with React Native Web | Shared TypeScript screens, React ecosystem, native image/location/secure-storage modules, accessible DOM-backed web controls | Platform permissions, secure storage and responsive layout still require testing; native signing/toolchains; web SEO less direct than dedicated site |
| Flutter | Consistent rich application rendering across three targets | Dart skill requirement, app-centric web, less conventional content/DOM integration |
| React web plus independent Swift/Kotlin clients | Deep platform control and web semantics | Three UIs, duplicated features/testing and slower iteration |

Decision: Expo React Native + React Native Web. This profile-centric authenticated app benefits more from shared behavior than SEO. Native-only features use Expo modules with platform checks. Public marketing SEO may later use a separate static landing page. See [Expo](https://docs.expo.dev/workflow/web/) and [Flutter](https://docs.flutter.dev/platform-integration/web/faq).

## Runtime

One Java 17 Spring Boot REST service serves the static Expo web export and `/api`. Shared client calls same-origin API on web and a configured HTTPS API origin on native. PostgreSQL persists accounts, hashed expiring sessions, dog profiles, processed photos, interest requests, contact grants, blocks, reports and audits. H2 is local-only. Flyway owns schema. Java image decoding/re-encoding removes image metadata. Keep photos in a bounded database pilot; no GCS public bucket.

Bearer sessions avoid browser cookie CSRF: web stores token in memory; native uses SecureStore. Explicit DTOs are the privacy boundary. Request and consent transitions use transactions/locking, not frontend checks. Role assignment derives from a deployment owner-ID allowlist. Per-instance rate limiting is adequate only for a capped pilot and must move to shared infrastructure before horizontal public growth.

## GCP proposal before deployment

Project MyPetPair, ID `mypetpair`, number `248924650823`. Explicit project flags on every command; do not modify the user's default GCP project.

- Cloud Run, us-central1, Java container serving API and web, 1 vCPU / 512MiB or 1GiB after observation, minimum instances 0, maximum 2, limited concurrency. Public ingress serves login; all personal endpoints enforce application authentication and pilot invitations.
- Cloud SQL PostgreSQL 17 Enterprise shared-core `db-f1-micro`, 10GiB SSD, backups enabled, deletion protection. Cloud SQL connector with IAM service-account access; no authorized public networks. Single-zone pilot, not HA.
- Artifact Registry for image; Cloud Build for remote Docker build where needed; Secret Manager for DB password and pilot invitation; dedicated Cloud Run runtime identity with narrow SQL/secret roles. Cloud Logging with no request-body logging.
- No payments, load balancer, domain, paid maps, public media bucket or SMTP service initially. Native clients connect to the Cloud Run URL. Future scale uses GCS private media/signed reads and PostGIS indexed search.

Cost planning assumption, not a quote: low pilot traffic, one shared-core SQL instance, 10GiB storage, modest logs/builds. Plan roughly USD 15–35/month for baseline SQL/storage/backups plus variable Cloud Run compute/requests, image storage/build minutes, logs and internet egress. SQL runs continuously and is the main fixed cost; scale-to-zero only applies to Cloud Run. No free-tier guarantee; currency, region, usage and taxes vary. Set budget alerts once billing-account permissions are available; alerts do not cap spending. Exact estimate must be refreshed with the region's [Cloud SQL pricing](https://cloud.google.com/sql/pricing), [Cloud Run pricing](https://cloud.google.com/run/pricing), [Secret Manager pricing](https://cloud.google.com/secret-manager/pricing) and [calculator](https://cloud.google.com/products/calculator).

Required configuration: billing enabled, APIs enabled, deployer permissions, runtime service account, database/user/password, invitation secret, admin owner-ID allowlist, production registration gate, API origin for native, operator privacy/terms and support details before real-user launch. No secrets belong in client public environment variables or Git. Signed native store builds need user-owned Apple/Google publisher credentials.
