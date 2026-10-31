# MyPetPair specification review

Spec Kit initialized from official github/spec-kit commit 7370e592f3cd9c06e5b698983957e227c75b30e2 with Codex integration. Constitution/spec templates resolved with bundled scripts, plan/tasks setup scripts ran, prerequisites passed. AI-authored artifacts follow the installed workflows; the CLI scaffolds workflows, it does not generate product content itself.

Independent read-only cross-artifact review and root analysis completed before implementation. No extension hooks were configured. Requirements checklist 9/9 checked. 11 functional requirement groups map to 21 tasks, coverage 100%; no unmapped tasks or constitution violations.

| Finding | Severity | Resolution adopted before implementation |
|---|---|---|
| Email admin allowlist + unverified signup permits privilege acquisition | High | Operator-selected immutable owner IDs only |
| BCrypt 128 character promise exceeds byte limit | High | Validate 12–72 UTF-8 bytes, including Unicode tests |
| Edited/unavailable dog leaks via connection history/contact reads | High | Redact counterparty summary; recheck visibility/eligibility on contact read; closing/revoking always allowed |
| Vet attestation recency undefined | Medium | Past 12 months, explicitly provisional platform rule |
| Deletion relationship lifecycle unclear | Medium | Cascade private graph and de-identify audit actor |
| Moderation reason missing from owner model | Medium | Include owner/admin-only moderationReason |
| Rate limit not testable | Medium | Auth 20/IP/15min; writes 120/owner/min; bounded state, Retry-After |

No remaining material ambiguity blocks the gated pilot. Open real-user public-launch decisions remain PRD D1–D7. The owner explicitly delegated wise defaults; there is no claim of a separate explicit PRD approval message.

Coverage: FR-001 T003/T005/T006/T007; FR-002/003 T005/T006/T007; FR-004 T008–010; FR-005/006 T011–013; FR-007/008 T014–016; FR-009 T017; FR-010 T004/T007/T010/T013/T016; FR-011 T001/T002/T018–021. SC-001/005 T019; SC-002 T019; SC-003 T019; SC-004 T019 (target remains unmeasured until load check).
