# LifeLink Architecture & System Design

LifeLink is an end-to-end, real-time, low-bandwidth inventory-sharing platform designed for rural public health ecosystems in India.

## System Architecture Diagram

```mermaid
flowchart TB
    subgraph Clients["Frontend Clients (PWA / Mobile / Web)"]
        Landing["Cinematic Landing Page"]
        FacDash["Facility Admin Dashboard"]
        SearchWizard["Smart Search & Request"]
        BloodBank["Blood 8x4 Matrix & Kanban"]
        DonorPWA["Mobile Donor PWA"]
        Transport["Logistics & Handover View"]
        DHO["District Oversight & Gap Report"]
        FeaturePhone["Retro Feature Phone Simulator"]
        SmsSim["SMS Outbox Simulator"]
    end

    subgraph Edge["Network & Gateway Layer"]
        CORS["CORS & Helmet Security"]
        AuthMid["JWT & RBAC Middleware"]
        Limiter["Rate Limiting Gateway"]
        SocketServer["Socket.io Realtime Engine"]
    end

    subgraph API["Node.js / Express Core Services"]
        PriorityEngine["Urgency Prioritization Engine (§5.1)\n(45% Crit, 25% Time, 10% Dist, 10% Scarcity, 10% Age)"]
        MatchingEngine["Provider Matching Engine (§5.2)\n(FEFO, Reserve Floors, Step Radius)"]
        ForecastEngine["Demand Forecasting Engine (§5.4)\n(SMA7/30, Day-of-Week Seasonality, Slope)"]
        SmsParser["Feature Phone SMS & USSD Grammar"]
        SyncEngine["Offline Sync & Conflict Reconciler"]
    end

    subgraph Adapters["Swappable External Adapters"]
        SmsMock["MockSmsProvider (Twilio / Msg91 stubs)"]
        WhatsAppMock["MockWhatsAppProvider"]
        AbdmMock["MockAbdmAdapter (14-Digit ABHA)"]
    end

    subgraph Persistence["Storage Layer (PostgreSQL 15)"]
        Postgres[(PostgreSQL Database)]
        PrismaORM["Prisma ORM (18 Domain Models)"]
    end

    Clients --> Edge
    Edge --> API
    API --> Adapters
    API --> PrismaORM
    PrismaORM --> Postgres
    SocketServer -. Realtime updates .-> Clients
```

## Real-Time WebSocket Event Matrix

| Event | Room | Payload | Trigger |
|---|---|---|---|
| `inventory:changed` | `facility:{id}` | `{ facilityId, typeCode, action, unit }` | One-tap +/- stepper, status toggle, intake |
| `request:created` | Global / `district:{id}` | `{ request, offers }` | New urgent loan request broadcast |
| `queue:updated` | Global | `{ queue: Request[] }` | 60s periodic re-rank, surge, status changes |
| `offer:received` | `facility:{id}` | `{ offerId, requestId, etaMins, expiresAt }` | Provider matching finds candidate donor |
| `offer:resolved` | `facility:{id}` | `{ offer, request, allocation, pickupJob }` | Provider accepts loan offer |
| `pledge:created` | `facility:{id}` | `{ requestId, donorName, bloodGroup }` | Donor pledges unit on mobile PWA |
| `blood:expiry_sweep` | Global | `{ expiredCount, redistributionSuggestions }` | 72h FEFO automated watch scan |
| `logistics:updated` | Global | `{ job: LogisticsJob }` | Transport driver status advance |
| `surge:triggered` | Global | `{ count }` | Live surge re-ranking simulation |
