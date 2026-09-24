# Architecture and Tech Stack

## High-Level Overview

LifeLink is built as a monorepo with a web application and a backend API working together to coordinate medical resource flows across a district or state-level network.

## System Components

### Frontend
- Next.js application
- responsive web interface for facilities, oversight dashboards, and donor workflows
- role-aware dashboard views for facility admin, blood bank, transport, and district roles

### Backend API
- Node.js + TypeScript server
- Express-based service layer
- domain modules for requests, inventory, logistics, facilities, blood, and analytics

### Data Layer
- PostgreSQL database
- Prisma ORM for schema management and data handling
- seed data for realistic district health scenarios

### Real-Time Layer
- Socket-based realtime events for live updates and urgent notifications

### Supporting Services
- mock or provider-based SMS and WhatsApp flows
- ABDM-style integration hooks for future interoperability
- audit and tracking layers for operational transparency

## Core Architectural Pattern

The platform follows a layered structure:

1. Client layer — web app with role-specific views
2. API layer — authentication, business logic, resource matching
3. Service layer — priority calculations, matching, logistics, blood logic
4. Persistence layer — Prisma + PostgreSQL
5. Realtime layer — live events across UI and backend

## Key Functional Modules

- Auth and access control
- Facility management
- Inventory and stock tracking
- Emergency request intake
- Urgency prioritization logic
- Matching and allocation
- Blood compatibility and expiry management
- Logistics dispatch and status tracking
- District analytics and oversight
- SMS / low-bandwidth fallback flows

## Why This Stack

- TypeScript improves maintainability and correctness for critical healthcare logic.
- PostgreSQL provides reliable transactional storage for operational data.
- Prisma reduces schema friction and speeds implementation.
- Next.js enables a clean user experience for dashboards and role-driven workflows.
- WebSocket events provide near real-time coordination needed in emergency contexts.

## Deployment Model

The project is designed to be deployed in a cloud-friendly setup:

- frontend hosted on Vercel,
- backend hosted on Render,
- shared PostgreSQL database hosted through a managed service,
- secure environment variables for runtime configuration.

## Design Goals

- low-latency emergency coordination,
- transparent and explainable prioritization,
- resilience in low-connectivity environments,
- ease of operational use across multiple facility types,
- adaptability for future production integration with telecom and health data systems.
