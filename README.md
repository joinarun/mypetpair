# MyPetPair

Nearby dog discovery, female-owner-controlled connections and private in-app chat, built with Java Spring Boot and one Expo React Native/Web client for web, Android and iOS. Free service; no payments.

[Live app](https://mypetpair-248924650823.us-central1.run.app) · [PRD](docs/PRD.md) · [Current specs/API](specs/002-open-registration-chat/) · [Operations](docs/OPERATIONS.md) · [Mobile testing](docs/MOBILE_TESTING.md)

## Current scope

- Open signup with required mobile, email, password and adult/terms acknowledgement; CAPTCHA on both signup and login. **Email and mobile verification are not required; planned for phase2.**
- Profiles publish automatically when eligible, available and photo-present. No invitation or prior approval. Eleven distinct unresolved reporters suspend a profile; operators can suspend/reinstate, resolve reports and remove photos with audit reasons.
- JPEG, PNG and WebP uploads, decoded and re-encoded without metadata, private media access and coarse location.
- Male-to-female interest; female owner accepts. Accepted active connections unlock text chat, history, unread counts and safe retries. Contact sharing remains a separate explicit choice.
- Light, Dark and System themes across web/mobile, saved per device. No chat attachments, push notifications or end-to-end encryption.

All health claims are self-declared. Eligibility is an interim platform rule, not a veterinary certification. See [privacy/safety](docs/PRIVACY_SAFETY.md). Historical invitation-gated requirements are archived in docs/history and spec001; spec002 supersedes conflicts.

## Local setup

Java17+ and Maven, Node24/npm. For native Android builds use Java21 and Android SDK. Global Maven mirrors are bypassed with project settings. Spring does not automatically read dotenv files; set variables in the server process. H2 is default local storage; PostgreSQL is production.

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm run export:web
cd ../backend
mvn -s maven-settings.xml verify
```

`scripts/build-local.sh` packages the web export into the Spring Boot JAR. Start it with explicit local seed configuration, for example:

```bash
APP_SEED=true DB_URL='jdbc:h2:file:./.local/mypetpair;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE' \
  java -Djava.awt.headless=true -jar backend/target/mypetpair-api-1.0.0.jar
```

Use http://localhost:8080. Fictional H2-only accounts: male@example.invalid, female@example.invalid and moderator@example.invalid, with local-only password `Fictional-local-only-42!`. Login still requires the real local CAPTCHA. These accounts are never seeded into PostgreSQL. Fresh databases need no invitation. Existing owners can sign in without a legacy mobile number and are prompted to complete it.

For separate Expo development, set EXPO_PUBLIC_API_URL to the reachable backend HTTPS origin or local API address; CAPTCHA framing is restricted to configured CORS origins. A phone cannot use the computer's localhost. `npm start`, `npm run android` or `npm run ios` in frontend starts the corresponding development workflow. `npm run export:all` exports web and Android/iOS JavaScript bundles; bundles are not installable apps. EAS profiles are optional and require a user-owned Expo account/signing setup.

## Configuration and API

`.env.example` and `frontend/.env.example` document local settings. Production requires DB_URL/DB_USERNAME/DB_PASSWORD, APP_CAPTCHA_HMAC_SECRET (32+UTF8bytes), APP_ADMIN_OWNER_IDS, APP_SEED=false and the intended CORS_ALLOWED_ORIGINS list. Public EXPO_PUBLIC_API_URL contains only an API origin, never secrets. H2 may generate an ephemeral CAPTCHA key; PostgreSQL refuses missing key or test-only CAPTCHA workload. No production authentication bypass exists.

REST endpoints use `/api`. Account/auth/dog/discovery/request/contact/block/report/operator endpoints remain from spec001; [spec002 contracts](specs/002-open-registration-chat/contracts/api.md) define CAPTCHA, chat, open signup and moderator photo removal changes. Bearer token required for private APIs; tokens are hashed on server, memory-only on web and secure storage on native. CAPTCHA proofs are expiring, single-use and purpose-bound. Rate limits remain. Mobile/email are unverified private contact fields, not identity proof.

Database schema: [V1](backend/src/main/resources/db/migration/V1__initial_schema.sql), additive V2/V3 migrations in the same directory, and [current data model](specs/002-open-registration-chat/data-model.md). Do not edit applied migrations or reset production data. Photos remain privately stored in the database for now. Message deletion follows account/connection FK cascades; report snapshots are scoped operator evidence.

## Checks and deployment

`scripts/verify.sh` runs backend tests, client checks/exports and a secret-pattern scan. `scripts/smoke-v2.py http://localhost:8080` exercises real HTTP with synthetic data and cleans up. Cloud mode requires `--cloud-secrets`, verifies the destination before reading the operator secret, solves real CAPTCHA, and prints no credentials/tokens/message bodies. `scripts/smoke-pilot.py` is historical v1 tooling and is incompatible with mandatory CAPTCHA.

Deploy only to GCP mypetpair/248924650823, us-central1. Review [architecture/cost drivers](docs/ARCHITECTURE.md), operations and the latest verification/release report before deployment. Reuse Cloud Run/Cloud SQL/Artifact Registry/Cloud Build/Secret Manager. No new paid CAPTCHA/chat service. Secrets and signing material stay outside GitHub. Android APKs use internal test signing; physical-device journeys and iOS signing/store publication are separate steps. GitHub repository remains private.
