# MyPetPair product requirements

Version 1.0 • Baseline adopted under the product owner's instruction to make wise decisions autonomously • 31 October 2026

MyPetPair helps adult dog owners discover nearby dogs and form owner-controlled connections for investigating responsible breeding. A match is an introduction, never a veterinary recommendation, pedigree certification, breeding agreement, or sale.

## Stage 1 clarification and decisions

### Confirmed requirements

C1. Accounts manage multiple dog profiles. C2. Profiles contain photos, breed, age and location. C3. Discovery prioritizes proximity. C4. Male-dog owners send interest; female-dog owners decide acceptance. C5. Contact details remain private until permission. C6. Initial service is free, with a future entitlement foundation and no payments. C7. Web, Android and iOS clients use a Java Spring Boot API. C8. Use Spec Kit before implementation, publish the project to GitHub using Brave, and deploy to GCP project `mypetpair` (248924650823), using Chrome if console access is needed.

### Adopted assumptions

A1. MVP is an English-language, invite-only pilot for owners aged 18 or older; deployment does not mean an unattended public launch. Local development permits registration without an invitation. Public deployment requires an invitation secret. Email ownership verification and password recovery require a transactional email provider before open registration; the pilot does not claim email verification.

A2. Multiple accepted connections are permitted. Acceptance expresses interest only, with no exclusivity or contractual commitment. There is no chat in MVP. Each participant independently shares their own chosen email and/or phone with an accepted connection. Neither acceptance nor future payment implies consent.

A3. Dogs must be intact, at least 24 months old, available, and covered by owner attestations concerning ownership, current vaccination and pre-breeding veterinary consultation within the past 12 months to participate. This is a configurable interim platform policy, not medical advice or a universal legal threshold. All health information is labelled self-declared. No verified-health badge exists.

A4. Location is entered as city and approximate coordinates or obtained with explicit device permission. Coordinates are quantized to 0.01 degrees before storage. Other owners see city and distance bands, never coordinates, exact distance or address. No background location collection or map pins.

A5. Profile changes require moderation before discovery. Admins approve or suspend dogs and review reports; role assignment uses operator-selected owner IDs in server configuration, never an unverified email allowlist. The app is not a puppy marketplace. No stud-fee collection, breeding contracts, shipping, litter sales or mating scheduling.

A6. PostgreSQL is production storage; H2 is local development/test storage. Photos are size-limited JPEG/PNG, decoded and re-encoded to strip metadata, stored privately in the database initially. This is a bounded pilot simplification; move media to private object storage at scale.

A7. Use Expo and React Native Web with a shared TypeScript app. Spring serves the exported web build and API from one Cloud Run service. Use us-central1 provisionally to minimize pilot infrastructure complexity; this does not select the launch jurisdiction or promise data residency.

### Product owner decisions before real-user public launch

D1. Launch jurisdictions, operator identity, lawful breeding/licensing terms and privacy notice. D2. Veterinarian-reviewed eligibility, breed-specific tests and reproductive-history policy. D3. Named moderation/support staff, welfare escalation and appeals contact. D4. Retention and deletion obligations, subprocessors and hosting geography. D5. Transactional email provider, domain and email verification/recovery policy. D6. App-store publisher identities and signing credentials. D7. Whether any health evidence will be manually reviewed. These do not prevent a gated pilot; they block describing the service as ready for open public use.

## Goals and scope

Deliver an understandable nearby-discovery experience, reliable male-to-female requests, female-owner control, and explicit contact consent. Make dangerous object-level authorization and location leaks testable. Provide a deployable pilot with documentation and reproducible builds.

Primary user types: an adult owner with male dogs, an adult owner with female dogs, an owner with both, and a separately authorized moderator. Visitors can view the product introduction and enter login/registration, but cannot enumerate real profiles or contacts.

Out of scope: payments, paid contact bypass, recommendations asserting breeding compatibility, veterinary diagnosis, genetic inference, chat, push/email notifications, automatic geocoding, maps, heat-cycle tracking, puppy sales, marketplace transactions, social login and production app-store submission. Native signed releases remain dependent on publisher credentials.

## Journeys

1. An owner registers with email, password, display name, adult/terms attestations and pilot invitation if required; signs in and signs out. Invalid credentials receive a generic error. The owner can update name/phone, export account data and delete their account.
2. An owner adds a dog, provides health/ownership attestations and photo, then submits for review. The profile is private until approved. They can edit, pause, resume or archive their dogs. Any edit of public profile content returns it to review.
3. The owner selects one of their dogs, chooses a radius and filters, and sees cards ordered nearest first. They inspect health information and self-declared status before deciding. Owners can browse both sexes; sending interest requires their selected dog to be male and the target female.
4. The male owner sends one pending request per dog pair. The female owner reviews profile and request, then accepts or declines. The male owner may withdraw a pending request. Requests expire after 30 days. An accepted request becomes a connection; either owner can close it.
5. Within a connection, each owner chooses whether to share their own contact channels. The other sees only the granted channels. Revoking consent or closing/blocking removes future API access immediately; already copied details cannot be retracted. The UI explains this before sharing.
6. Either owner reports a profile or blocks its owner. Blocking immediately hides all dogs in both directions and disables interactions/contact access. Moderators see a report queue, resolve reports and approve/suspend dogs with audit events.

## Dog data and field rationale

| Field | Visibility | Purpose |
|---|---|---|
| Name, breed or mix, sex, date of birth | Profile (age derived from DOB) | Identity and role/age eligibility |
| One to six photos | Authenticated approved discovery | Identify the dog; strip EXIF and validate image data |
| City, quantized coordinates | City public to members; coordinates private | Nearby search without home addresses |
| Weight in kg, temperament, biography | Profile | Practical size/handling context; no inferred suitability |
| Intact status and availability | Profile | Prevent inappropriate requests; allow pauses |
| Health screening summary and last vet consultation date | Profile, self-declared | Inform due diligence without certifying fitness |
| Vaccination and lawful-ownership attestations | Eligibility and profile summary | Accountability and welfare baseline |
| Optional registry/pedigree reference | Profile | Owner investigation; not a health guarantee |
| Breeding history / relatedness | Not collected in initial pilot | Requires veterinary and privacy policy; discuss privately after consent |
| Owner email, optional phone | Owner only, then per-channel grant | Consent-based follow-up |
| Moderation state and reason | Owner/admin | Publication and appeal transparency |

Do not put phone numbers, emails, addresses or sensitive records in biography/health text. UI guidance, report reasons and manual review enforce this operationally; initial automated heuristics may not catch all personal data. No raw health documents are uploaded.

## Functional requirements

FR01 Account: canonical case-insensitive unique email; BCrypt passwords of 12–72 UTF-8 bytes; random opaque expiring bearer sessions stored only as hashes on server; logout revokes session. Web holds bearer only in memory; native secure storage may be used. No tokens in URLs/logs. Registration requires explicit adult and policy acknowledgement and configurable invitation gate. UI supports login, signup, logout and profile management.

FR02 Dogs: enforce owner authorization on create/read private/edit/archive/photo operations. Max 20 dogs/account and 6 photos/dog. Require name, sex, breed, DOB, city and valid bounded coordinates; validate text lengths and positive weight. Ineligible dogs may be saved but not published/requested. Archived dogs are hidden immediately.

FR03 Photos: uploads max 5 MB/file; accept decoded JPEG/PNG up to 16 megapixels; resize longest edge to at most 1600px, strip metadata, persist MIME safely. Photo download checks owner or approved visible profile access; blocked/unapproved photos are inaccessible. Owner can remove photos. No arbitrary remote URL ingestion.

FR04 Discovery: authenticated, radius 1–500 km, default 50; latitude/longitude from selected owned dog. Only approved, available, eligible dogs from unblocked other owners. Filter sex, case-insensitive breed, min/max age. Nearest ascending default; age ascending and newest optional; stable ID tie-break, page/size bounds (max 50). Responses omit contacts and all coordinates. Show distance bands (under 5, 5–10, 10–25, 25–50, 50–100, 100+ km). Never return exact distance as a hidden property. Query parameters must not enable arbitrary repeated center probing.

FR05 Interest: only eligible owned male to visible eligible female; no self-interest, reversed sex, duplicates or blocked pair. Pair has at most one pending/accepted request; declined/withdrawn/expired may be re-requested subject to rate limit. States: PENDING → ACCEPTED, DECLINED, WITHDRAWN, EXPIRED; ACCEPTED → CLOSED. Repeated acceptance is idempotent. Only recipient owner accepts/declines, sender withdraws, either closes accepted. Mutation validates state atomically and rechecks ownership, moderation and blocks.

FR06 Contacts: grant operation requires an active accepted connection and authorizes only the caller's own email/phone. Phone can be shared only when present. Changing or removing the phone number revokes previous phone grants. Contact-read returns caller contact plus counterparty's explicitly granted channels. Revocation, block, account deletion, suspension or closing defeats stale requests immediately. Authorization and consent are never monetization concerns.

FR07 Safety: block owner across all dogs, requests and contacts; report dog with reason (welfare, fraud, harassment, privacy, other) and optional bounded details. No report details exposed to reported owner. Admin role checked on all moderation endpoints; approve/suspend/resolve records timestamp and actor. Do not expose pending/rejected content to discovery.

FR08 Privacy: export authenticated account, dogs and connections; account deletion cascades profile, sessions, photos, interests, grants, blocks and reports involving deleted dogs; it removes contacts, with minimal de-identified moderation audit only. UI confirms deletion purposefully. Log no credentials, contact payloads or location. Document residual backup retention. Photos and private APIs use no-store caching.

FR09 Free foundation: server entitlement response includes plan FREE, unlimited profile views and contact sharing subject to consent. Policy service owns future allowance decisions. No checkout, payment SDK, card data, credits purchasing or hidden paid restrictions.

FR10 Responsive shared client: discovery, profile detail, dog editor/photo picker, request inbox/outbox, connections/contact controls, owner settings and admin queue. Accessible labels, readable text/contrast, keyboard-capable web controls, loading/error/empty states and responsive wide/narrow layouts. Familiar profile-card navigation with original MyPetPair branding; no Bumble assets or logo.

## Nonfunctional requirements

NFR01 Use TLS through managed ingress; parameterized database access; strict same-origin web policy and allowlisted CORS for development; server-side roles and DTOs. No client-derived owner IDs or entitlement decisions trusted. Rate limit auth (20 attempts per source IP per 15 minutes) and authenticated writes (120 per owner per minute) with bounded state and Retry-After responses; document single-process pilot limitations.

NFR02 Target p95 API latency below 500ms at 20 concurrent pilot users after warmup with 1,000 profiles. This is a target until measured. Limit candidate scanning and document the pilot ceiling; migrate to PostGIS indexed queries for scale.

NFR03 Atomic request transitions and unique active-pair constraints; durable PostgreSQL, schema migrations, backups, health checks and sanitized structured logs. Target 99.5% monthly availability for pilot, not an SLA; Cloud SQL shared-core lacks SLA.

NFR04 Config via environment, secrets in Secret Manager, no committed credentials. Pin dependency versions and lockfiles. Build/test in CI. Native bundling must work for Android and iOS; signing and physical device testing must be honestly reported separately.

NFR05 Owner can use approximate city location without granting GPS. Never collect background position, exact address, human DOB, government identity or payment data. All health/registration claims remain self-declared.

## Metrics

Measure aggregate signup completion, submitted/approved dog profiles, discovery-to-request conversion, accepted/request ratio, time to owner response, grants/revocations, reports per 100 connections and moderation response time. Initial goals: 80% completion in moderated usability tests; 100% negative authorization cases passing; zero known contact/location leaks; 90% reports triaged within 48 hours once staffed. Do not log profile-view identities for analytics by default. Analytics dashboards are later scope; operational counts and test evidence suffice for pilot.

## Acceptance criteria

AC01 A new adult invited owner registers, signs in/out and manages two dogs; a different owner cannot edit either. Invalid invitation/adult acknowledgement prevents signup.
AC02 Saving a dog without required values fails with field-readable errors; an ineligible dog cannot be approved or sent a request. Editing an approved profile returns it to pending.
AC03 Uploading a valid image succeeds and strips source metadata; oversized/non-image inputs fail. Unauthorized photo reads fail.
AC04 Two nearby approved dogs sort by quantized proximity with stable ties; filters and pagination work; own/blocked/paused/unapproved dogs never appear; output has no coordinates/contact/exact distance.
AC05 A male owner's request appears in the female owner's inbox; only she can accept. Duplicate, own-dog, reversed-sex and stale transitions fail safely. Repeated accept returns accepted state.
AC06 Acceptance alone exposes no counterparty contacts. Grant email reveals only that channel, revocation removes it, and unrelated callers cannot read contacts. Block/close/suspend defeats existing grants.
AC07 Report appears only in admin queue; a non-admin cannot moderate; an admin approves/suspends and resolves with an audit event.
AC08 Owner export excludes other owners' private data; deletion removes account/session/photos and prevents subsequent login/contact access.
AC09 FREE entitlements are unlimited and never override consent. No payment integration exists.
AC10 TypeScript validation, web export, Android/iOS bundles and backend tests pass. Manual browser smoke test covers login, discovery and a request decision. Report any unperformed native-device, load, recovery or infrastructure tests.
AC11 A secret-scanned commit is published to the requested GitHub destination; GCP deployment has health/API checks, documented region/services/cost drivers and a verifiable application URL, or a concrete external blocker with runnable deployment assets.

## Sources supporting architecture and safety review

[Expo universal web support](https://docs.expo.dev/workflow/web/), [Flutter web trade-offs](https://docs.flutter.dev/platform-integration/web/faq), [OWASP object authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/), [RSPCA inherited dog conditions](https://www.rspca.org.uk/adviceandwelfare/pets/genetics/dogs), [ASPCA responsible breeding](https://www.aspca.org/about-us/aspca-policy-and-position-statements/position-statement-criteria-responsible-breeding). These do not establish legal compliance for an undecided jurisdiction.

## Review resolutions before implementation

Only operator-selected owner IDs can receive admin privileges; registration cannot self-elevate through an unverified email. Password limits are 12–72 UTF-8 bytes to respect BCrypt. Vet attestation must be within 12 months. Contacts require both dogs to remain approved, eligible, available, unarchived and in original sex roles on every read. Edited/pending or unavailable counterparty dogs are redacted from request history; the opaque owner ID remains to support blocking. Owners can always close/withdraw/revoke/block. Deletion cascades interests/grants/photos/reports/blocks and de-identifies audit actors. Session lifetime is seven days.
