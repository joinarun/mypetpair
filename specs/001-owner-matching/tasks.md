# Tasks: Owner controlled dog matching

Input: spec.md, plan.md, research.md, data-model.md and contracts/api.md. Critical behavioral tests required by specification.

## Phase 1 Setup

- [X] T001 Establish ignore/config/build structure in `.gitignore`, `backend/pom.xml`, `frontend/package.json` (FR-011).
- [X] T002 [P] Create deployment architecture and environment examples in `docs/ARCHITECTURE.md`, `compose.yaml`, `.env.example` (FR-011).

## Phase 2 Foundation

- [X] T003 Create migrations, parameterized persistence, transaction lock, session authorization and generic errors in `backend/src/main/` (FR-001, FR-005, FR-006, FR-008).
- [X] T004 [P] Create shared API/types/session/accessible primitives in `frontend/src/` (FR-010).

## Phase 3 US1 Manage profiles

Goal: account + multiple dogs. Independent test: two owners cannot cross-edit.

- [X] T005 [US1] Write critical registration, ownership and invalid photo tests in `backend/src/test/java/com/mypetpair/` (FR-001–003).
- [X] T006 [US1] Implement accounts, dogs, private photo pipeline with ≤5MB/16MP/6 photos, 20 dogs, text/range/date validation in `backend/src/main/java/com/mypetpair/` (FR-001–003).
- [X] T007 [P] [US1] Implement auth, owner settings, multi-dog editor and image picker in `frontend/` (FR-001–003, FR-010).

## Phase 4 US2 Discovery

Goal: nearby private-safe cards. Independent test: fixed coordinates/filter exclusions.

- [X] T008 [US2] Write discovery exclusion, stable sorting and privacy tests in `backend/src/test/java/com/mypetpair/` (FR-004).
- [X] T009 [US2] Implement owned-center search, radius 1–500km, pagination max50, sex/breed/age filters and bands in `backend/src/main/java/com/mypetpair/` (FR-004).
- [X] T010 [P] [US2] Implement responsive cards, active dog/filter controls and details in `frontend/` (FR-004, FR-010).

## Phase 5 US3 Requests and consent

Goal: owner-controlled match and contact grants. Independent test: send/accept/grant/revoke/outsider.

- [X] T011 [US3] Write state, pair uniqueness, concurrent contact/block authorization tests in `backend/src/test/java/com/mypetpair/` (FR-005, FR-006).
- [X] T012 [US3] Implement serialized interest transitions, 30-day expiry and per-channel grants in `backend/src/main/java/com/mypetpair/` (FR-005, FR-006).
- [X] T013 [P] [US3] Implement inbox/outbox/connections/contact consent screens in `frontend/` (FR-005, FR-006, FR-010).

## Phase 6 US4 Safety and data rights

Goal: report/block/moderate/export/delete. Independent test: role and revoked visibility.

- [X] T014 [US4] Write safety/admin/export/deletion tests in `backend/src/test/java/com/mypetpair/` (FR-007, FR-008).
- [X] T015 [US4] Implement block/report/admin audit/export/delete in `backend/src/main/java/com/mypetpair/` (FR-007, FR-008).
- [X] T016 [P] [US4] Implement safety/admin/account-data controls in `frontend/` (FR-007, FR-008, FR-010).

## Phase 7 Integration and release

- [X] T017 Implement FREE entitlement policy in `backend/src/main/java/com/mypetpair/` (FR-009).
- [X] T018 [P] Create Docker/CI/scripts/seed/setup/API/database documentation in `Dockerfile`, `.github/workflows/ci.yml`, `scripts/`, `README.md`, `docs/` (FR-011).
- [X] T019 Execute backend tests, frontend typecheck, three-platform exports and web smoke; record target vs measured checks in `docs/VERIFICATION.md` (FR-001–011).
- [X] T020 Scan source for secrets and publish private GitHub repository using Brave; record URL in `docs/RELEASE.md` (FR-011).
- [X] T021 Deploy documented GCP pilot and verify URL/health/data; record services/config/limitations in `docs/RELEASE.md` (FR-011).

## Dependencies and execution order

T001–002 precede foundation. Backend T003 precedes backend stories; frontend T004 precedes screens. Backend tests for each story precede corresponding implementation. Backend and frontend run in parallel against contracts. US2/3/4 integration depends on US1 data/auth; seed fixtures permit independent story tests. T019 precedes publication, publication precedes deployment. Do not mark unfinished work complete.

Parallel example: backend US1 tests/implementation alongside frontend US1 editor in separate directories. Same applies to discovery, requests and safety UI. Root release work in `scripts/` and docs does not touch agent-owned implementation files.

Implementation strategy: foundations, profiles, nearby discovery, matching/consent, safety, then integrated pilot checks. No open public launch or payments.
