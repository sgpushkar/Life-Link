# LifeLink Security Architecture & Threat Model

LifeLink coordinates medical equipment and blood units between healthcare institutions. It deliberately enforces data minimization principles to comply with DISHA (Digital Information Security in Healthcare Act) and global patient data privacy guidelines.

## 1. Patient Privacy & Data Minimization Mandate

> [!IMPORTANT]
> **Strict No-PII Invariant:** LifeLink never stores or transmits patient names, phone numbers, Aadhaar numbers, or national identification records.

- **Allowed Patient Metadata on Request:**
  - Age band: `NEONATE`, `INFANT`, `CHILD`, `ADOLESCENT`, `ADULT`, `ELDERLY`
  - Sex: `MALE`, `FEMALE`, `OTHER`
  - Brief clinical condition summary (e.g. *"Acute hypoxia secondary to COPD"*)
  - Clinician urgency assessment (1 to 5)
- **Validator Enforcement:** Both the frontend Zod schemas and backend API schemas inspect the request payload with regular expressions, automatically rejecting submissions containing 10-digit mobile numbers, 12-digit Aadhaar patterns, or personal names.

## 2. Role-Based Access Control (RBAC)

Every route enforces RBAC through `verifyAuth` and `requireRole` middlewares:

| Role | Permitted Actions |
|---|---|
| `FACILITY_ADMIN` | Read/write own facility inventory, create requests, accept/decline incoming offers, configure reserve floors |
| `BLOOD_BANK` | Manage 8x4 blood units matrix, initiate donation camps, execute donor check-in, review redistribution suggestions |
| `DONOR` | Read compatible nearby anonymous requests, pledge donation, update availability radius |
| `TRANSPORT` | View assigned pickup/return jobs, update delivery progression, commit signed handover checklists |
| `DHO` | Read district-wide aggregated analytics, chronic gap reports, equity distribution metrics |
| `STATE_ADMIN` | Tune algorithmic priority weights, inspect cross-district availability metadata, review audit logs |

## 3. Defense-in-Depth Measures
- **Rate Limiting:** General API limiter (500 req/15 min) and stricter limits on authentication endpoints.
- **Header Hardening:** Helmet enables CSP, HSTS, noSniff, and frameguard protections.
- **SQL Injection Prevention:** Prisma ORM strictly parameterizes all database queries.
- **Audit Logging:** Every state mutation records actor ID, action, before/after JSON snapshots, client IP, and timestamp into `AuditLog`.
