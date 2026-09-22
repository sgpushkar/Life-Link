# LifeLink Architecture Decision Records (ADR)

This document records the architectural decisions made during development per Section 14.

## ADR-001: Monorepo Architecture with pnpm Workspaces
- **Decision:** Use pnpm workspaces with `@lifelink/shared`, `@lifelink/api`, and `@lifelink/web`.
- **Rationale:** Ensures strict TypeScript types, Zod schemas, and mathematical calculations (haversine, blood compatibility) are shared identically between client and server without code duplication.

## ADR-002: Deterministic Urgency Prioritization (§5.1) vs Black-Box ML
- **Decision:** Implement the exact multi-component weighted formula specified in §5.1 without opaque ML models.
- **Rationale:** Healthcare coordinators need immediate, explainable reasons for why one patient's request was ranked above another. Explainability builds clinician trust and prevents regulatory disputes.

## ADR-003: Clinical Blood Compatibility & FEFO Matching
- **Decision:** Separate red cell compatibility (PRBC/WHOLE) from plasma compatibility (FFP), and enforce an `etaMins + 6h` safety buffer for transit and transfusion.
- **Rationale:** Standard medical transfusion practice dictates that AB is the universal donor for plasma (inverse of red cells). The FEFO safety margin prevents blood from expiring during transit.

## ADR-004: Hardware-Agnostic Feature Phone Simulation
- **Decision:** Provide `/dev/feature-phone` with an interactive retro Nokia chassis and keypad, alongside `/dev/sms`.
- **Rationale:** Judges can evaluate the full SMS command grammar (`STOCK`, `NEED`, `FIND`, `PLEDGE`) and USSD navigation (`*123#`) live in the browser without relying on telecom carrier gateways.

## ADR-005: Privacy-Preserving No-PII Patient Invariant
- **Decision:** Strictly prohibit patient names, phone numbers, Aadhaar IDs, and private clinical narratives in database schemas and API request payloads.
- **Rationale:** LifeLink coordinates medical inventory between institutions; it is not an Electronic Health Record (EHR). Eliminating PII ensures full compliance with DISHA, HIPAA, and global privacy mandates, while minimizing cybersecurity liability.

## ADR-006: Offline-First IndexedDB Outbox with Negative Depletion Guard
- **Decision:** Buffer all client mutations offline in IndexedDB and reconcile via sequential replay upon reconnection, using Last-Writer-Wins (LWW) guarded against negative stock allocations.
- **Rationale:** Rural clinics frequently experience 2G/3G connectivity drops. Offline queues allow nurses to record critical inventory changes seamlessly, while the negative depletion guard prevents concurrent phantom allocations.

## ADR-007: Swappable Provider Abstraction for External Telecom & Identity Gateways
- **Decision:** Define abstract interfaces (`SmsProvider`, `WhatsAppProvider`, `AbdmAdapter`) with in-memory / database mock implementations selected by environment variables.
- **Rationale:** Enables fully reproducible local development and live hackathon judging demonstrations without recurring SMS gateway costs or live Indian telecom / ABDM sandbox bottlenecks.

