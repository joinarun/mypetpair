# Tasks: Open registration and connection chat

## Setup and foundation
- [x] T001 Update PRD and constitution for explicit owner changes in docs/PRD.md and .specify/memory/constitution.md.
- [x] T002 Generate and review feature design/contracts/checklist in specs/002-open-registration-chat/.
- [x] T003 Add additive V2 domain and V3 CAPTCHA replay schemas in backend/src/main/resources/db/migration/; preserve V1 and existing suspended states.

## US1 — Accounts and CAPTCHA
- [x] T004 [US1] Implement signed purpose-bound 5min single-use challenges and auth consumption in backend/src/main/java/com/mypetpair/CaptchaService.java and CaptchaController.java; production secret failclosed.
- [x] T005 [US1] Require valid mobile on registration/update and remove invitation gate in backend/src/main/java/com/mypetpair/PairService.java; existing legacy phone-less login remains allowed.
- [x] T006 [US1] Add mandatory CAPTCHA, mobile, phase2 disclosure and remove invitations from frontend/src/Main.tsx and Captcha.tsx.
- [x] T007 [US1] Test malformed/expired/replayed/purpose-mismatched proof, generic credentials and required phone in backend/src/test/java/com/mypetpair/.

## US2 — Reactive safety and media
- [x] T008 [US2] Auto publish eligible profiles and preserve suspension across edits/photos in backend/src/main/java/com/mypetpair/PairService.java.
- [x] T009 [US2] Count distinct non-owner reporters; 11th suspends atomically, repeated reporter doesn't inflate; audit and operator photo deletion in backend/src/main/java/com/mypetpair/PairService.java and ApiController.java.
- [x] T010 [US2] Add actual WebP decoder alongside JPEG/PNG; preserve5MB/16MP/metadata stripping in backend/pom.xml and PairService.java.
- [x] T011 [US2] Replace approval UI with published/suspended management and photo removal/report evidence in frontend/src/Main.tsx/types.ts.
- [x] T012 [US2] Test10/11/repeat/self reports, suspension persistence, role-protected audited photo removal and decoded WebP in backend/src/test/java/com/mypetpair/.

## US3 — Chat
- [x] T013 [US3] Add authorized accepted-thread message/read/report/export APIs in backend/src/main/java/com/mypetpair/PairService.java and ApiController.java; text1–2000, max50/page, perthread sender/clientUUID idempotency.
- [x] T014 [US3] Add chat UI, retry/pagination/unread/foregroundrefresh and clear restricted cached messages in frontend/src/Chat.tsx and Main.tsx.
- [x] T015 [US3] Test anonymous/unrelated/pending/closed/blocked/suspended access, duplicate send, read cursor, pagination, scoped reports and cascades in backend/src/test/java/com/mypetpair/.

## US4 — Themes
- [x] T016 [US4] Central theme provider Light/Dark/System with device persistence and OS changes in frontend/src/theme.tsx, ui.tsx and src/app/_layout.tsx.
- [x] T017 [US4] Apply palette to all Main/chat/CAPTCHA/forms/statusbar and setting controls in frontend/src/.

## Integration and release
- [x] T018 Update operations/privacy/API/database/architecture and release instructions in docs/ and README.md; configure Secret Manager CAPTCHA and deployment in scripts/deploy-gcp.py.
- [x] T019 Run cross-artifact review and resolve findings in specs/002-open-registration-chat/analysis.md.
- [ ] T020 Run backend checks, client lint/types/exports, localHTTP/browser/theme checks and isolated PostgreSQL smoke; record docs/VERIFICATION-V2.md.
- [ ] T021 Publish secret-scanned source and deploy additive migration/web/API to GCP mypetpair; verify deployed changes and cleanup synthetic data in scripts/smoke-v2.py.
- [ ] T022 Build updated signed Android test APK, verify signature/hash/API; upload GitHub pre-release with notes and report iOS signing/device limits in docs/MOBILE_TESTING.md and docs/RELEASE.md.

Dependencies: T001–003 before stories; auth T004–007 before end-to-end checks. US2/US3 share domain service: coordinate edits in one owner. US4 is independent palette work after client integration. CAPTCHA can progress independently of domain service; schema versions separated. Root owns specs/operations/release; server agent owns domain+tests; CAPTCHA agent owns dedicated authproof files; client agent owns shared UI. Integration/release require all stories verified. All features ship together under this explicit owner request, no partially disabled production CAPTCHA.
