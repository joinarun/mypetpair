# Implementation Plan: Open accounts and connection chat

Branch codex/open-registration-chat. Spec [spec.md](spec.md). Date2026-11-01.

## Summary

Implement PRD2 on existing Spring Boot3.5/Java17/PostgreSQL17+H2/Expo58 React Native Web platform. No new messaging service or payments. Open registration explicitly replaces original gated release.

## Technical Context

REST/JDBC with serialized mutations, additive Flyway V2 domain and V3 CAPTCHA redemption. Existing container serves same-origin web/API/hosted CAPTCHA page. ALTCHA key in Secret Manager. Chat paginated plain-text messages, immutable sender/client UUID idempotency, own read cursor. Existing ApiFilter rate limits + bounded challenge issuance. Native WebView needed for hosted CAPTCHA. Shared theme provider/styles updates React rendering without global mutable palette. Existing archived data retained; suspension never resets on edit. Tests H2 real HTTP/integration plus deployed PostgreSQL smoke. Android Gradle release rebuilt, iOS source/exports supported; signing deferred.

## Constitution Check

Owner consent, location privacy, responsible introductions, spec verification and reproducible simplicity PASS. Constitution1.1 explicitly amends registration gating based on new owner request. Contact consent unaffected. No unresolved material policy or secret dependency; ALTCHA key generated internally, no thirdparty account.

## Project Structure

backend/src/main/java/com/mypetpair/{PairService,ApiController,CaptchaService,CaptchaController,ApiFilter}.java; db/migration/V2,V3; focused tests. frontend/src/{Main,ui,theme,Chat,Captcha,types}.tsx/ts; existing routes and theme/auth context. scripts/{deploy-gcp,smoke-v2,build-mobile-tests}; docsPRD/verification/release/operations updated.

## Delivery and verification

Specs+contracts -> schema/auth+domain foundations -> US1/US2/US3/US4 -> cross-artifact review -> local tests/types/lint/exports -> secret-scanned GitHub source -> cloud image build -> deploy secret binding plus additive migration -> PostgreSQL smoke -> Android APK test/build/upload release. Retain old Cloud Run image and APK for rollback, but old backend cannot enforce new policy; database schema additive and V1checksum unchanged. No claim unmeasured SLA/performance or comprehensive device testing.
