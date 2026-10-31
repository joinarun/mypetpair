# MyPetPair validation quickstart

Prerequisites Java 17, Maven, Node 22+, npm; Docker for optional PostgreSQL. Install/run commands are maintained in root README after implementation.

1. Run backend tests (`cd backend && mvn -s maven-settings.xml test`). Expected: authorization, discovery privacy, transitions, contact grant/revoke/block and moderation checks pass.
2. Run shared client typecheck and export for all platforms (`cd frontend && npm ci && npm run typecheck && npx expo export --platform all`). Expected: web assets plus Android/iOS bundles; this does not prove signed/native-device behavior.
3. Start local backend with seed profile and client web. Sign into fictional male and female test owners as documented in README. View discovery, send a request, switch owner, accept, verify no contact until explicit grant, revoke and block.
4. Register a third owner and verify they cannot edit others' dogs, read contacts, photos of hidden dogs, reports or admin endpoints.
5. Check production invitation required, no seed credentials/data, database persistent, secrets external, health and deployed web load.

Model constraints are in `data-model.md`; endpoint shapes in `contracts/api.md`; criteria in PRD AC01–AC11. Record executed results and limitations in `docs/VERIFICATION.md`.
