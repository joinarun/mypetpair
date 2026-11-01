# Feature Specification: Open registration, reactive moderation and connection chat

Created 2026-11-01. Status: adopted from explicit owner instruction; extends/supersedes conflicting v1 requirements. Product baseline: [PRD v2](../../docs/PRD.md).

## User Scenarios & Testing

### US1 — Open secure accounts (P1)
Any adult signs up with mobile/email and CAPTCHA; no invite or contact verification. Login requires CAPTCHA. Legacy users complete mobile without account lockout. Validate AC01 and auth replay/expiration/credential failures; email/phone unverified and phase2 disclosure.

### US2 — Publish and react to abuse (P1)
Owners publish eligible dogs/photos immediately. Eleven distinct flags suspend; ten/repeat/self flags do not. Operators remove photos, suspend/reinstate with reasons and resolve reports. Validate AC02–04, existing-suspension preservation and migration. JPEG/PNG/WebP share safe media processing.

### US3 — Chat after acceptance (P1)
Participants open chat from an accepted connection, send text, refresh, load history, see unread count and retry safely. Verify deny-before-acceptance/unrelated/closed/blocked/suspended/ineligible, independent contact consent, reports after closure, own export and cascades (AC05–06). Operator cannot enumerate private conversations.

### US4 — Theme everywhere (P2)
Visitors/owners select light/dark/system with persistent device preference across auth, cards, chat and settings on web/native. System follows OS. Verify AC07 and accessible contrast; themes never persist auth tokens.

## Edge Cases

Concurrent11th flag and edits serialize; suspension survives uploads/edits. Duplicate sender client IDs return same content or409 conflict if payload differs. Concurrent close/block and send/read serialize, and frontend clears inaccessible cached thread. Cursor belongs to own connection; large IDs bounded by valid integer parsing. All pending profiles migrate but missingphotos/ineligible/paused remain undiscoverable. CAPTCHA verification is independent of credentials; consumed tokens cannot be reused after failed login. Account deletion removes chat/evidence; backups follow existing retention. Network retry does not duplicate; background polling stops. Lack of email/phone verification enables collusive flags, explicitly disclosed.

## Requirements

FR001 Open registration requires mobile, email, password, display name, adult/terms and CAPTCHA; no invitations. Both login/signup require expiring single-use computational verification with rate controls; verification is not contact/identity proof.
FR002 Automatic publication with eligibility/photo/access conditions; reactive suspension at11 distinct other-account reports. Operator photo removal/reasoned suspend/reinstate/audit. No approval queue or edit reapproval.
FR003 JPEG/PNG/WebP decoded validated, 5MB/16MP max, longestedge1600, metadata-free storage and authorized reads.
FR004 Active accepted dog-pair connection chat: two participants only;1–2000 character plain text, timestamps, max50/page, stable order, duplicate-safe retries, own read cursor/unread count and foreground refresh. No automatic contact sharing. Block/close/suspension/ineligibility restrict every live chat read/write. Own portability export includes previously shared history, including closed threads.
FR005 Participants report received message after restriction; admins see only scoped reported evidence and resolve with audit. Own export/deletion respects access and privacy.
FR006 Light/dark/system choice persists device-locally, updates whole shared client including CAPTCHA and OS status surfaces, accessible controls and readable contrast.
FR007 Preserve consent, coarse location, welfare eligibility, adult acknowledgements and free service; additive migrations preserve existing data and suspensions.

## Key Entities

Owner mobile and explicitly unverified status; published/suspended Dog; distinct Reporter per Dog; accepted Interest as conversation; Message with immutable sender/client ID/body/time/ordered ID; per-owner ReadCursor; scoped MessageReport; single-use CaptchaRedemption; device ThemePreference.

## Success Criteria

SC01 All specified negative-access, CAPTCHA and distinct-report threshold cases pass; zero known contact/location disclosure.
SC02 Owner sends and retries one message without duplication, peer sees it within10s on healthy foreground connection (usability target; report measured checks separately).
SC03 Owners choose and retain readable themes across restart on web/native; primary functional flows export on all three platforms.
SC04 Safe migration, web/API deployment and Android test artifact are verified; native/iOS, load and retention limitations reported honestly.

## Assumptions and Scope

See PRD Decisions. Text-only polling MVP, no push/attachments/read receipts/E2EE; no invitation, verification or prior approval. Explicit product instruction adopts behavior; no missing material clarification. Followup public legal/staffing obligations remain documented, not silently asserted solved.
