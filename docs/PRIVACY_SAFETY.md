# MyPetPair privacy and safety

MyPetPair introduces dog owners who may investigate responsible breeding together. Matching, moderation and registry references do not certify an animal's health, genetics, ownership, identity or suitability for breeding. This guide describes the pilot design and the decisions required before public launch; it is not a jurisdiction-specific privacy notice or legal policy.

## Contact consent

A male-dog owner sends interest and the female-dog owner accepts or declines. Acceptance creates a connection without sharing email or phone. Within an active connection, each owner independently chooses whether to share their own email, phone or both. Neither the other owner's consent nor a future paid entitlement substitutes for that owner's permission.

Revoking a grant, closing a connection or blocking the owner stops future authorized API access. Previously copied details cannot be recovered or erased from another person's device. Use the review step before sharing, and share only channels you are comfortable making available to that owner. Existing connections do not guarantee exclusivity or a breeding agreement.

Contact reads require approved, available, eligible and unarchived dogs with the original matching roles. Pending or unavailable counterparty profiles are redacted from connection history. Owners can still withdraw, close and revoke access. Account deletion invalidates sessions and removes the private relationship graph; residual backup copies follow the operator's retention settings.

## Location and photos

Owners may enter a city and approximate coordinates without granting device location access. If they choose device location, the application asks for permission. The backend quantizes coordinates to a 0.01-degree grid before persistence. Other owners receive a city and distance band, not coordinates, an exact distance or a home address. Quantization reduces precision; it does not guarantee anonymity against inference, especially in sparsely populated places.

The pilot collects no background location. Search uses a selected owned dog's coarse location rather than a public arbitrary-coordinate search endpoint. Do not type an address in a biography or include identifiable home details in photographs.

Uploaded JPEG/PNG photos are decoded, resized and re-encoded without source image metadata. This removes EXIF metadata, not identifying objects visible in a picture. Photos are privately stored and require authenticated profile-visibility authorization to read. No arbitrary external image URL is ingested.

## Profile health and welfare

Health screening summaries, vaccination declarations, registry references and veterinary-consultation dates are owner supplied. There is no verified-health badge or raw health-document upload. Owners should investigate breed-relevant screening, ancestry and relatedness with qualified professionals before making any breeding decision.

The provisional pilot eligibility rule requires an intact, available dog at least 24 months old, ownership/vaccination attestations and a pre-breeding veterinary consultation within the previous 12 months. This is a configurable platform rule awaiting veterinary review. It does not determine whether any particular dog should be bred, and it does not establish compliance with local law.

The pilot does not collect reproductive-cycle dates, arrange mating, sell puppies, handle stud fees, provide genetic compatibility scores or create breeding contracts. Breed-specific tests, breeding-history restrictions and relatedness policy remain product-owner decisions with veterinary input.

## Reporting and moderation

Use Report for welfare concerns, fraud, harassment, privacy exposure or other problematic profile content. Report details are restricted to authorized administration; they are not shown to the reported owner. Blocking hides the owners' dogs from each other and prevents further interactions and contact access.

Moderators review profiles before discovery and record approval, suspension and report-resolution actions. Profiles can contain information that automated checks miss. Staff must examine text and images for contact details and addresses, misleading claims, abusive behavior and welfare concerns. Moderation verifies compliance with the platform's publication rules; it does not establish medical fitness.

Before inviting real users, publish an operator support and appeals contact and define jurisdiction-appropriate welfare escalation. The application has no emergency dispatch or unattended round-the-clock moderation service.

## Accounts and data rights

Registration requires an adult and policy acknowledgement. The pilot does not perform identity checks, verify email ownership or provide automated password recovery. Do not treat an email string or owner declaration as verified identity. Administrator roles are assigned to independently verified owner UUIDs by the operator, never automatically from an unverified email.

Owners can export their own account data and delete their accounts after password confirmation. Exports exclude other owners' private contacts unless those contacts are currently authorized. Passwords are hashed and session tokens are stored as hashes on the server. Web sessions are held in memory; native secure storage is used where supported.

Retention notices must match deployment settings. [Operations](OPERATIONS.md) records proposed pilot retention and distinguishes session/request expiry from row purging. A deleted account may remain in protected backups until their retention window ends, and operators must reconcile deletions after a restore. Do not promise immediate removal from every backup or a scheduled purge that has not been implemented.

## Public launch decisions

The product owner must select and document:

1. Launch jurisdictions, operator identity, breeding/licensing terms and an actual privacy notice.
2. Veterinary-reviewed eligibility, breed-specific health testing and reproductive-history policy.
3. Named moderation/support staff, welfare escalation and appeals contact.
4. Retention and deletion policy, subprocessors, hosting geography and any cross-border requirements.
5. Transactional email provider, domain, email verification and password recovery.
6. Apple/Google publisher identities, signing credentials and native privacy disclosures.
7. Whether health evidence will be reviewed and how evidence access would be controlled.

Keep production registration gated while these decisions remain unresolved. Future monetization can limit ordinary discovery allowances, but it must preserve server authorization and contact-owner consent. No payments or consent bypass are part of this release.
