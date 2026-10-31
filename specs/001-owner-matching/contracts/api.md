# MyPetPair REST API contract

Base `/api`. JSON except multipart image upload. `Authorization: Bearer <opaque token>`. All endpoints authenticated except `/health`, `/config`, `/auth/register`, `/auth/login`. No cookie authentication. Errors `{message: string}` with 400 invalid, 401 no session, 403 forbidden, 404 unavailable, 409 transition conflict, 413 upload too large, 429 rate limit. IDs strings. Dates ISO `YYYY-MM-DD`. Do not distinguish other owners' hidden object existence.

## Account

- GET `/health` → `{status:"ok"}`
- GET `/config` → `{pilot:true, invitationRequired:boolean}`
- POST `/auth/register` body `{email,password,displayName,adultConfirmed,termsAccepted,invitationCode?}` → `{token,user}`.
- POST `/auth/login` `{email,password}` → `{token,user}`. User `{id,email,displayName,phone,admin}`. Password must be 12–72 UTF-8 bytes. Admin is assigned by configured owner IDs only, never email matching.
- POST `/auth/logout` → 204.
- GET `/me` → user; PATCH `/me` `{displayName,phone}` → user; changing phone revokes existing phone grants.
- GET `/me/export` → own export; DELETE `/me` body `{password}` → 204.
- GET `/entitlements` → `{plan:"FREE",unlimitedViews:true,contactSharing:true}`.

## Dogs

Dog write `{name,breed,sex,birthDate,city,latitude,longitude,weightKg?,temperament,bio,healthSummary,vetCheckedOn?,intact,vaccinated,ownershipAttested,registry?,available}`. DogOwner response includes above plus `{id,ownerId,moderation,moderationReason,archived,photoIds:string[],ageMonths,eligible}`. DogPublic contains `{id,ownerId,name,breed,sex,ageMonths,city,weightKg,temperament,bio,healthSummary,vetCheckedOn,intact,vaccinated,registry,available,photoIds,eligible,healthStatus:"SELF_DECLARED",distanceBand?}`. ownerId permits block operations, not private lookup.

- GET `/dogs/mine` → DogOwner[]; POST `/dogs` write → DogOwner (201).
- GET `/dogs/{id}` → DogOwner if own else visible DogPublic; PUT `/dogs/{id}` write → DogOwner.
- DELETE `/dogs/{id}` archives → 204.
- POST `/dogs/{id}/photos` multipart field `file` → `{id}` (201).
- GET `/photos/{id}` → processed JPEG bytes, authenticated visibility check, no-store.
- DELETE `/dogs/{id}/photos/{photoId}` → 204 and returns dog to review.
- GET `/discovery?dogId=ownedId&radiusKm=50&sex=FEMALE&breed=&minAgeMonths=24&maxAgeMonths=180&sort=nearest&page=0&size=20` → `{items:DogPublic[],page,size,hasMore}`; sort `nearest|age|newest`. Filter optional; age bounds validated; center only from owned dog, never arbitrary coordinates.

## Requests and contacts

Interest response `{id,maleDog:DogPublic,femaleDog:DogPublic,state,createdAt,updatedAt}`; own dogs may appear regardless publication for request history; unavailable/edited counterparty dogs use redacted summary `{id,ownerId,name:"Unavailable profile",photoIds:[],unavailable:true}`. No contacts in this response. Redacted summaries retain only the opaque owner ID to keep blocking available after a profile becomes hidden.

- GET `/interests` → Interest[] both inbox/outbox.
- POST `/interests` `{maleDogId,femaleDogId}` → Interest (201).
- POST `/interests/{id}/decision` `{action:"ACCEPT"|"DECLINE"|"WITHDRAW"|"CLOSE"}` → Interest.
- GET `/interests/{id}/contacts` → `{myGrant:{shareEmail,sharePhone},contact:{displayName,email?,phone?}}`; active accepted authorization with both dogs approved, eligible, available, unarchived, original sex roles and unblocked required, ungranted keys omitted/null.
- PUT `/interests/{id}/contacts` `{shareEmail:boolean,sharePhone:boolean}` → same; both false revokes. No body ownerId/contact data accepted.

## Safety and admin

- POST `/blocks` `{ownerId}` → 204 (idempotent); GET `/blocks` → `{ownerId,displayName}[]`; DELETE `/blocks/{ownerId}` → 204 (does not reopen closed requests).
- POST `/reports` `{dogId,reason,details}` → `{id,status:"OPEN"}` (201).
- GET `/admin/dogs?status=PENDING` → DogOwner[] (admin only).
- POST `/admin/dogs/{id}/moderation` `{status:"APPROVED"|"SUSPENDED",reason}` → DogOwner; approval rejects ineligible/no-photo dogs.
- GET `/admin/reports` → Report[]; POST `/admin/reports/{id}/resolve` `{resolution}` → Report.
- GET `/admin/audit` → audit entries (admin only, bounded).

## UI contract

Tabs: Discover, Requests, My dogs, Account; Connections within Requests, Admin when authorized. Active dog selector persists in screen state. Profile card has photo, age, breed, city, distance band and self-declared health prompt. Photo requests attach bearer via authenticated image source or memory blob on web. Registration and profile editors expose all required fields, attestation checkboxes and image picker. Every destructive/contact grant action has clear consequence copy and review action.
