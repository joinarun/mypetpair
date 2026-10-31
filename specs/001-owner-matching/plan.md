# Implementation Plan: Owner controlled dog matching

**Branch**: `main` | **Date**: 2026-10-31 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification and `docs/PRD.md`.

## Summary

Implement a gated pilot with one Spring Boot REST backend and one Expo React Native / React Native Web client. Persist profiles, processed images, authorization and consent in PostgreSQL. Serve the web export with Spring to avoid cross-origin production cookies and separate hosting complexity.

## Technical Context

**Language/Version**: Java 17 and TypeScript 6.
**Primary Dependencies**: maintained available Spring Boot 3.5.x, JDBC, Spring Security BCrypt, Flyway; Expo stable SDK with React Native Web, image picker, location and SecureStore.
**Storage**: PostgreSQL 17 production; file-backed H2 local; Flyway portable SQL. Bounded private photos in SQL for pilot.
**Testing**: JUnit/MockMvc critical API integration tests; TypeScript check; Expo export three targets; browser smoke checks.
**Target Platform**: Linux Cloud Run backend, modern browsers, Expo-supported Android/iOS versions.
**Project Type**: shared mobile/web application plus REST API.
**Performance Goals**: warmed p95 discovery <500ms at 20 concurrent users / 1,000 profiles, measured status reported separately.
**Constraints**: consent and location privacy, manual moderation, invite registration, no payments or raw documents; deployment secrets external.
**Scale/Scope**: capped pilot, 20 dogs/owner, 6 photos/dog, 50 results/page, bounded candidate scans; indexed PostGIS is future scale work.

## Constitution Check

Before research: PASS. Consent is server enforced; coarse location and processed photos planned; gated pilot avoids unsupported public policy claims; negative authorization tests required; one shared client and Java service.
After design: PASS. No principle exceptions. Broadening to public registration requires D1–D7 review.

## Project Structure

```text
backend/pom.xml
backend/src/main/java/com/mypetpair/
backend/src/main/resources/db/migration/
backend/src/test/java/com/mypetpair/
frontend/App.tsx
frontend/src/
frontend/assets/
frontend/app.json
frontend/eas.json
scripts/
docs/
specs/001-owner-matching/
Dockerfile
compose.yaml
.github/workflows/ci.yml
```

**Structure Decision**: Backend and frontend can be implemented in parallel against `contracts/api.md`, with independent ownership of those directories. Root integration owns deployment and verification. Within the backend, establish config/schema/auth foundation before story endpoints. Within frontend, establish API/types/session foundation before screens.

## Complexity Tracking

No constitution violations. Database photos and in-process rate limiting are explicit pilot limitations; avoid additional services until justified.
