# REST changes

Existing /api prefix and bearer authorization unchanged. Login/register additionally require captchaPayload. Registration requires phone/mobile; contact verification remains false. GET /api/captcha/challenge and hosted widget page public, bounded issuance; solves return payload with signature/expiry, consumed once before auth. GET /api/config returns open registration/verification/CAPTCHA metadata without secret or invitation/pilot flags.

GET /interests/{id}/messages?beforeId=<long>&size=50 => {items:[{id,interestId,senderId,body,clientMessageId,createdAt}],hasMore,chatAvailable:true}; latest page by default, chronological within page. POST same {body,clientMessageId} =>200 canonical message (idempotent); mismatched retry409. PUT /interests/{id}/messages/read {messageId} =>204; cursor only in same thread, monotonic. Interest DTO adds chatAvailable, unreadCount.

POST /messages/{messageId}/report {reason,details} =>201 report, only receiving participant including afterclosure. Admin reportsDTO adds nullable messageId,messageText,interestId. DELETE /admin/dogs/{dogId}/photos/{photoId} {reason} =>204 audited. Existing admin status filters PENDING replaced by APPROVED/SUSPENDED. Report count deduplicated by reporter per dog;11th distinct unresolved reporter suspends. Existing contact endpoint always explicit per-channel grant; chat never implicitly grants.

HTTP401 anonymous/credentials;403 role;404 unrelated resources;409 inactive connection/conflicting duplicate;400 malformed text/phone/cursor/file or invalid CAPTCHA;429 rate limit with Retry-After. Error bodies reveal no credentials/messages/private ownership.
