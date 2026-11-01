# MyPetPair Constitution

## Core Principles

### I. Owner consent

Every private resource MUST enforce object ownership on the server. Contact sharing MUST require an accepted active connection and an explicit grant by the contact owner. Payment MUST never bypass permission.

### II. Location privacy

The service MUST quantize coordinates before persistence and MUST NOT return coordinates or exact distances to another owner. Photos MUST be decoded and re-encoded without metadata.

### III. Responsible introductions

The product MUST label health claims self-declared and MUST NOT certify breeding suitability. Registration MUST be open under the product owner’s 1 November 2026 decision. Authentication MUST enforce CAPTCHA. Profiles publish without prior review; distinct-user flags trigger suspension at more than ten reporters. Email/mobile verification is explicitly deferred to phase 2. The operator can suspend profiles and remove photos; staffing, jurisdiction and retention decisions MUST remain documented without an invitation gate.

### IV. Spec-driven verification

Implementation MUST follow the PRD and reviewed specs. Critical authorization, transitions and consent MUST have integration tests. Verification reports MUST distinguish executed checks from targets and unperformed tests.

### V. Reproducible simplicity

Use a Java Spring Boot API and one shared web/Android/iOS client. Configuration and secrets MUST remain outside source. Do not implement payments. Record material scope changes in specs.

## Constraints

Use PostgreSQL with schema migrations in production and an H2 local profile. Deploy only to the explicitly named GCP project. Use Brave for GitHub repository creation and Chrome for console access when needed.

## Development Workflow

PRD → Spec Kit specification → design/contracts/tasks → gap review → implementation → checks → private GitHub publication → documented GCP deployment. Product-owner autonomy delegates reversible defaults; real-user public launch policy remains explicitly unresolved.

## Governance

Amendments update the PRD/specs and rationale before behavior changes. Review constitution compliance at design and release. Major versions change principles; minor versions add policy; patches clarify. Initial adoption 1.0.0 establishes five principles; no prior principles or sections removed. No template changes needed.

**Version**: 1.1.0 | **Ratified**: 2026-10-31 | **Last Amended**: 2026-11-01

Amendment 1.1.0: product owner explicitly replaces invitation/pre-publication review with open signup, CAPTCHA and reactive moderation; adds private accepted-connection chat and theme selection. Existing architecture and consent principles remain.
