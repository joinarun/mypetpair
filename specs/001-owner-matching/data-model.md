# MyPetPair data model

All IDs are random UUID strings. Timestamps UTC. All relationships require server authorization; never serialize database rows directly to another owner.

| Entity | Fields and constraints | Relationships and lifecycle |
|---|---|---|
| Owner | id; unique lowercase email ≤254; password hash (input 12–72 UTF-8 bytes); displayName 1–80; phone optional ≤30; admin boolean; createdAt | Adult/policy acknowledgements required at registration; delete cascades private content, sessions, interests/grants/photos/reports/blocks; audit actor de-identified |
| Session | hash (SHA-256 of random 32-byte token); ownerId; expiresAt | 7 days maximum, logout deletes; bearer raw value only returned once |
| Dog | id; ownerId; name 1–80; breed 1–100; sex MALE/FEMALE; birthDate past; city 1–100; latitude -90..90/longitude -180..180 quantized .01; weightKg >0 ≤150 optional; temperament ≤300; bio ≤1000; healthSummary ≤2000; vetCheckedOn past; intact/vaccinated/ownershipAttested booleans; registry optional ≤200; available boolean; moderation PENDING/APPROVED/SUSPENDED; moderationReason ≤1000 owner/admin only; archived boolean | At most 20/owner. Eligible age ≥24 months, intact, vaccinated, ownership and vet attestation within 12 months; publication requires photo. Updates return PENDING; archive hides immediately |
| Photo | id; dogId; image bytes; MIME image/jpeg; createdAt | ≤6/dog, source ≤5MB/16MP; re-encoded, max 1600px edge; private reads |
| Interest | id; maleDogId; femaleDogId; state; createdAt; updatedAt | PENDING→ACCEPTED/DECLINED/WITHDRAWN/EXPIRED (30d); ACCEPTED→CLOSED; only one active pair, serialized across state writes |
| ContactGrant | interestId + ownerId; shareEmail; sharePhone | Caller grants own fields only. Active accepted connection and eligible/unblocked dogs required on every read; close/block/suspend invalidates access |
| Block | blockerId + blockedId; createdAt | Bidirectional visibility denial even though one actor initiated; closes active interest and removes grants |
| Report | id; reporterId; dogId; reason enum WELFARE/FRAUD/HARASSMENT/PRIVACY/OTHER; details ≤1000; status OPEN/RESOLVED; resolution ≤1000 | Only admin and reporter may access own relevant records; never reported owner |
| Audit | id; actorId nullable; action; targetId; timestamp; bounded sanitized detail | No credentials, contacts, coordinate payloads; actor de-identified on deletion |
| MutationLock | singleton row | Database lock coordinates matching/contact/block/moderation transitions across replicas |

DTOs: OwnerSelf contains own email/phone/admin. DogOwner contains own coordinates and moderation. DogPublic omits owner contacts/coordinates/DOB (ageMonths instead), exposes self-declared label, distanceBand and approved photo IDs. Interest response embeds authorized public dog summaries; hidden counterpart summaries retain opaque ownerId for blocking but no private content; Contact response exposes only explicitly granted counterparty fields. Export contains own records and counterpart IDs/public summaries, not ungranted private data.
