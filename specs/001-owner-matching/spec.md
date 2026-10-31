# Feature Specification: Owner controlled dog matching

**Feature Branch**: `main` (spec directory independent of branch)
**Created**: 2026-10-31
**Status**: Baseline adopted under delegated product-owner autonomy
**Input**: MyPetPair product requirements in `docs/PRD.md`, C1–C8, A1–A7.

## User Scenarios & Testing

### User Story 1 - Manage owner and dog profiles (Priority: P1)

Adult invited owners register, sign in and manage multiple dogs and processed photos.

**Why this priority**: Owned profiles are the foundation of every interaction.
**Independent Test**: Two owners create dogs; one cannot modify or privately read the other's pending profile.
**Acceptance Scenarios**:
1. **Given** valid adult/policy acknowledgement and pilot invitation, **When** signup and login complete, **Then** an owner can add two dogs and logout invalidates the session.
2. **Given** a missing field, invalid DOB, oversized image or unrelated owner, **When** a write occurs, **Then** validation or authorization rejects it.
3. **Given** an approved dog, **When** public content changes, **Then** it returns to pending review.

### User Story 2 - Discover nearby dogs (Priority: P1)

Owners select their own dog as a search center and browse nearby eligible dogs, nearest first.

**Why this priority**: Discovery creates useful introductions.
**Independent Test**: Fixed coarse locations yield stable nearest-first cards; filters work and private fields never occur.
**Acceptance Scenarios**:
1. **Given** approved eligible dogs, **When** a 50km search runs, **Then** own, blocked, pending, archived and unavailable profiles are excluded.
2. **Given** a breed/sex/age filter or new sort, **When** applied, **Then** cards follow the filter with stable pagination and city/distance-band only.

### User Story 3 - Request and connect with consent (Priority: P1)

Male owners send interest, female owners accept/decline; owners independently share chosen contact channels.

**Why this priority**: This is the core matching promise.
**Independent Test**: Three owners exercise request/accept/grant/revoke and an outsider cannot obtain contacts.
**Acceptance Scenarios**:
1. **Given** an eligible male and female from different owners, **When** the male sends interest, **Then** only the female owner can accept it; duplicates and reversed roles fail.
2. **Given** acceptance, **When** contacts are read, **Then** counterparty details remain absent until that owner grants a specific channel.
3. **Given** granted email, **When** revoked, blocked, suspended or closed, **Then** future reads return no counterparty details.

### User Story 4 - Moderate and control account data (Priority: P1)

Owners report/block; admins review dogs/reports; owners export/delete their own data.

**Why this priority**: Privacy and welfare are release requirements.
**Independent Test**: Report and suspension remove visibility and non-admin moderation fails.
**Acceptance Scenarios**:
1. **Given** a report, **When** an admin resolves it or approves/suspends a dog, **Then** an audit event records actor/time/action; a non-admin is forbidden.
2. **Given** an owner account, **When** exported/deleted, **Then** export contains no unrelated private fields and deletion invalidates sessions/removes contacts/photos.

### Edge Cases

Expired requests, concurrent transitions, duplicate active pairs, archived dog after request, blocked participant after acceptance, absent phone during grant, missing GPS permission, empty results, invalid numeric filters and unauthorized image URLs all fail safely. Repeated acceptance is idempotent. Distance bands are computed from coarse coordinates and not marketed as anonymity against determined inference.

## Requirements

### Functional Requirements

- **FR-001**: Account and session behavior MUST satisfy PRD FR01 and AC01.
- **FR-002**: Dog ownership, field limits, moderation and eligibility MUST satisfy PRD FR02 and AC02.
- **FR-003**: Private photo processing/read/delete MUST satisfy PRD FR03 and AC03.
- **FR-004**: Discovery filters, privacy and sorting MUST satisfy PRD FR04 and AC04.
- **FR-005**: Request states, roles, expiration and atomicity MUST satisfy PRD FR05 and AC05.
- **FR-006**: Independent contact grants and revocation MUST satisfy PRD FR06 and AC06.
- **FR-007**: Block/report/admin audit MUST satisfy PRD FR07 and AC07.
- **FR-008**: Export/deletion and secret/log controls MUST satisfy PRD FR08 and AC08.
- **FR-009**: Free server entitlements MUST satisfy PRD FR09 and AC09; no payments.
- **FR-010**: Shared accessible web/Android/iOS flows MUST satisfy PRD FR10 and AC10.
- **FR-011**: Reproducible setup, private repository and documented deployment MUST satisfy AC11.

### Key Entities

Owner, Session, Dog, Photo, Interest (connection when accepted), ContactGrant, Block, Report, AuditEvent, EntitlementPolicy. Details/limits in `data-model.md`; normative product field visibility in PRD.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All negative authorization and contact privacy acceptance cases pass before release.
- **SC-002**: Owners can complete signup, add a profile, send interest, accept and revoke contact on the web in a repeatable smoke scenario.
- **SC-003**: Shared app bundles for web, Android and iOS; native device/signing checks reported separately.
- **SC-004**: Pilot targets 95% of warmed discovery requests under 500ms at 20 concurrent users and 1,000 profiles; report measured status honestly.
- **SC-005**: No known raw coordinates, ungranted contacts or image metadata appear in another owner's responses.

## Assumptions

PRD A1–A7 are the adopted baseline. PRD D1–D7 are public-launch dependencies, not hidden implementation questions. No public readiness or native store release is claimed without those decisions.
