# MyPetPair 1.1.0 release

Current source/specifications implement open accounts, accepted-connection chat, reactive moderation, CAPTCHA, WebP and Light/Dark/System themes. Historical [v1 deployment](history/RELEASE-1.0.md) and [PRD1](history/PRD-1.0.md) are retained for context; their invitation and prior-approval behavior is superseded.

## Application and infrastructure

- [Live web app](https://mypetpair-248924650823.us-central1.run.app).
- [Private source repository](https://github.com/joinarun/mypetpair), [PRD2](PRD.md), [spec002](../specs/002-open-registration-chat/), [verification](VERIFICATION-V2.md).
- Project mypetpair, number248924650823, regionus-central1. Cloud Run revision `mypetpair-00003-79d` is ready, serving100% traffic. Existing1CPU/1GiB/min0max2/concurrency20 configuration retained.
- Image source commit `f8817983e778c0b0aa67e30e9683f44685125b9d`; Cloud Build `17708d36-c1ef-4e89-8967-4e54f2724ff9` SUCCESS.
- Image `us-central1-docker.pkg.dev/mypetpair/mypetpair/app:f8817983e778`, digest `sha256:61afcac35046accfeca3b57a29d04a28604935597b950acaa7a2ffb70217bd17`; deployed revision digest matches.
- Existing PostgreSQL17 Cloud SQL instance/database retained. Additive V2/V3 migrations succeeded at startup; V1 unchanged. Thirty-one live HTTP checks passed using genuine CAPTCHA and PostgreSQL, and all13 synthetic accounts plus the diagnostic operator session were cleaned up.
- CAPTCHA HMAC key in Secret Manager `mypetpair-captcha-hmac`; DB password binding preserved. Invitation environment settings/binding removed. No operator credentials reset. Existing operator ID/role verified by actual login with stored secret.

## Product behavior

Signup is open with required mobile and CAPTCHA. Login also requires CAPTCHA. Email/mobile verification is NOT required and is explicitly phase2. No invitation or prior profile approval. Profiles publish automatically subject to existing eligibility/photo/availability checks. Eleven distinct OPEN/unresolved reporter accounts suspend a dog; repeated flags count once. Operators can resolve, reinstate after flags reduce to10 or fewer, manually suspend, and remove photos with reason/audit. Edits/photos cannot bypass suspension.

An accepted active connection enables private text chat for its two owners, with unread counts, history and retry-safe IDs. Blocking, closing or restricted dogs disable live chat; own portability export includes previously shared history. Contact sharing remains independently permission-based. JPEG/PNG/WebP are decoded and re-encoded without metadata. Themes are device-local Light/Dark/System for web and native.

## Android

[Android1.1.0 test release](https://github.com/joinarun/mypetpair/releases/tag/v1.1.0-test.1): APK/versionCode2,53,654,002bytes, ARM64/x86_64, Android7+. [Install/rebuild instructions](MOBILE_TESTING.md). APK signature,16KB ZIP alignment, non-debuggable metadata, embedded live API, update installation and Android16 emulator cold-launch passed. SHA256 `efccdd844f0c83658157e5e71ad792575eff0830c97f115e09f49221b4f4cde3`. Internal test signing only; no Play Store or physical-device journey claim. Older1.0.0 APK lacks CAPTCHA and must be updated for new logins. iOS shares implementation/exports; signing/testing remains deferred at the user's prior request.

## Remaining checks and limitations

The live signup CAPTCHA frame renders in fresh Chrome tabs, supports keyboard focus and produces no console warnings/errors. An initial frame opened during rollout appeared blank; clean page reload resolved it, and a second fresh-tab check passed without code changes. GitHub pre-release publication is the final remaining release action at this documentation commit. Local actual CAPTCHA completion passed after action-time user permission; live API proof verification passed. No full native chat/CAPTCHA/theme journeys, physical devices, push, attachments, E2EE, contact verification, password recovery, load/availability/restore or complete vulnerability audit is claimed. Distinct unverified accounts can collude; maintain monitoring, appeals and staffed moderation. No new paid messaging/CAPTCHA service or payment implementation. Existing database/storage baseline planning estimate USD15–35/month plus usage still applies; trial/billing, legal jurisdiction, notices, retention and support staffing remain owner follow-up.
