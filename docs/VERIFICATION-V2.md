# V2 verification — 1 November 2026

Feature [002](../specs/002-open-registration-chat/) replaces the gated/approval-based baseline. This report is updated as release checks finish; it does not claim unexecuted device or load tests.

## Executed before deployment

- Backend: full33 passing tests (22API,6CAPTCHA,3limiter/config,2realHTTPstartup), plus focused foreign-history-cursor and monotonic-read/privacy assertion check. No failure/error reported. V1 migration unchanged; H2 migrationV1→V2→V3 passes.
- Real local HTTP:31 v2 workflow checks passed using production CAPTCHA workload. Open registration and mandatory mobile, actual solved/replayed CAPTCHA, preserved operator role,13 synthetic accounts without invitations, auto publication, WebP→JPEG, pending/closed/unrelated chat denials, contact privacy, send/retry/conflict, unread/read, stable history, scoped post-close reports, participant export, report deduplication, ten/eleven reporters, suspension persistence, non-admin denial and audited operator photo removal. All13 accounts removed; operator session logged out.
- Client: lint and TypeScript passed after final stale-response/retry fixes; fresh web/Android/iOS export passed. Dependencies installed with Expo SDK58 resolver; app1.1.0/code2. No Expo Go-only substitution for native build.
- Browser: packaged web landing and Light/Dark theme surfaces render; Dark selection survives reload. Signup displays required mobile, real CAPTCHA and explicit phase2 verification disclosure, with no invitation field. Production-workload self-hosted CAPTCHA completed after user action-time permission; widget showed Verified, status completed, no console warnings/errors. CSP/worker/verified-event flow passed. No full interactive signup/login/chat journey is claimed; those workflows were tested through HTTP.
- Review: existing owner/contact/location checks retained; cross-artifact contradictions resolved in feature analysis. Unverified account collusion, per-process limits, chat export/history policy, no E2EE/push and retention limits documented. Vendor ALTCHA widget3.5.0 integrity checked against npm SHA512 and license retained. WebP decoder is pure Java. No secrets printed/committed.

## Deployment and Android

Cloud Build succeeded and revision mypetpair-00003-79d serves the new image. All31 live PostgreSQL HTTP checks passed and13 synthetic accounts plus the operator session were cleaned up. Android1.1.0 release build617tasks, signature/alignment/non-debuggable/API/ABI checks, update installation and cold launch passed on Android16 ARM64; startup logs had no app errors. Live signup iframe render and keyboard focus passed in fresh Chrome tabs without console errors. An initial blank frame during rollout was resolved by a clean page reload; no code change needed. GitHub release publication is the final remaining action at this documentation commit. See release record for exact hashes and artifact links. Older1.0.0 APK lacks required CAPTCHA controls and must be upgraded for new logins.

## Limitations

No email/mobile verification, password recovery, chat attachments, push, typing indicators, read receipts to others or E2EE. CAPTCHA raises automation cost but does not prove a human/identity; distinct unverified accounts are not necessarily distinct people. No full physical-device journeys or iOS signing/store release; no p95/availability/restore/pentest claim. Existing documented build-tool advisories and dependency/Gradle deprecation warnings are not represented as a completed vulnerability audit. Backup retention/appeals/staffing/jurisdiction need owner policy follow-up, without invitation gating.
