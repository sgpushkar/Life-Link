# LifeLink REST & Real-Time API Specification

This document provides a comprehensive reference for the LifeLink API (`/api/v1`) and real-time Socket.io events. All API request and response schemas are strictly validated using Zod definitions shared across `@lifelink/shared` and `@lifelink/api`.

---

## 1. General API Architecture

### 1.1 Base URL & Content Type
- **Base URL:** `http://localhost:4000/api/v1` (or your staging/production host)
- **Headers:** `Content-Type: application/json`
- **CORS:** Permissive for trusted frontends (`credentials: true` enabled)

### 1.2 Authentication & Sessions
LifeLink supports dual authentication via HttpOnly session cookies and HTTP `Authorization: Bearer <token>` headers:
- **Access Token:** Short-lived JWT (15-minute expiration) stored in `lifelink_access_token` cookie or Bearer header.
- **Refresh Token:** Long-lived JWT (7-day expiration) stored in `lifelink_refresh_token` cookie.
- **Roles:** `FACILITY_ADMIN`, `BLOOD_BANK`, `DONOR`, `TRANSPORT`, `DHO`, `STATE_ADMIN`.

### 1.3 Unified Error Response Format
All errors adhere to the standard envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_SERVER_ERROR",
    "message": "Human-readable description of error",
    "details": {}
  }
}
```

---

## 2. Authentication & Personas (`/api/v1/auth`)

### 2.1 Password Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Body:**
  ```json
  {
    "phone": "9820011001",
    "password": "demo1234"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "user": {
      "id": "usr_kalyan_nurse",
      "name": "Sister Priya Shinde",
      "phone": "9820011001",
      "role": "FACILITY_ADMIN",
      "facilityId": "fac_kalyan_phc",
      "facility": { "name": "Kalyan Rural Primary Health Centre", "type": "PHC" }
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```

### 2.2 Instant Persona Login (Demo Switcher)
Instant 1-click authentication designed for evaluators and judges.
- **Endpoint:** `POST /api/v1/auth/persona-login`
- **Body:**
  ```json
  { "phone": "9820011002" }
  ```
  *or*
  ```json
  { "role": "DHO" }
  ```
- **Response (200 OK):** Returns user profile and sets session cookies.

### 2.3 List Demo Personas
- **Endpoint:** `GET /api/v1/auth/personas`
- **Response (200 OK):** Returns all 7 pre-seeded evaluators with role scopes.

### 2.4 OTP Verification (Mock Telecom Mode)
- **Request OTP:** `POST /api/v1/auth/otp/request` (`{ "phone": "9820011001" }`)
- **Verify OTP:** `POST /api/v1/auth/otp/verify` (`{ "phone": "9820011001", "otp": "123456" }`)

### 2.5 Refresh Session
- **Endpoint:** `POST /api/v1/auth/refresh`
- **Headers/Cookies:** Uses `lifelink_refresh_token`
- **Response (200 OK):** Returns renewed `accessToken` and `refreshToken`.

### 2.6 Logout & Session Invalidation
- **Endpoint:** `POST /api/v1/auth/logout`
- **Response (200 OK):** Clears authentication cookies.

### 2.7 Current User Profile
- **Endpoint:** `GET /api/v1/auth/me`
- **Auth:** Required

---

## 3. Facilities & Geolocation (`/api/v1/facilities`)

### 3.1 List Facilities
- **Endpoint:** `GET /api/v1/facilities`
- **Query Parameters:**
  - `type` (optional): `DISTRICT_HOSPITAL` | `CHC` | `PHC` | `BLOOD_BANK` | `DONATION_CAMP`
  - `districtId` (optional): Filter by district UUID
- **Response (200 OK):** Array of facility records with counts of equipment and blood inventory.

### 3.2 Facility Details
- **Endpoint:** `GET /api/v1/facilities/:id`
- **Response (200 OK):** Comprehensive facility metadata, GPS coordinates, 24x7 status, equipment list, and blood inventory.

### 3.3 Update Facility Sharing Rules & Reserve Floors
- **Endpoint:** `PATCH /api/v1/facilities/:id/share-settings`
- **Auth:** Required (`FACILITY_ADMIN`, `BLOOD_BANK`, `STATE_ADMIN`)
- **Body:**
  ```json
  {
    "reserveFloors": {
      "VENTILATOR": 1,
      "OXYGEN_CONCENTRATOR": 2,
      "O_NEG": 2
    },
    "quietHoursStart": "22:00",
    "quietHoursEnd": "06:00"
  }
  ```

---

## 4. Inventory Management (`/api/v1`)

### 4.1 Get Full Facility Inventory
- **Endpoint:** `GET /api/v1/facilities/:id/inventory`
- **Response (200 OK):**
  - Equipment aggregated by type code (`VENTILATOR`, `OXYGEN_CONCENTRATOR`, etc.) with counts (`total`, `available`, `inUse`, `reserved`, `maintenance`, `onLoan`, `shareable`).
  - 8x4 blood matrix aggregated by blood group and component.

### 4.2 Batch Update Equipment Units (One-Tap Stepper)
- **Endpoint:** `PATCH /api/v1/facilities/:id/inventory/equipment`
- **Auth:** Required (`FACILITY_ADMIN`)
- **Body:**
  ```json
  {
    "typeCode": "OXYGEN_CONCENTRATOR",
    "action": "INCREMENT | DECREMENT | SET_STATUS",
    "status": "AVAILABLE | IN_USE | RESERVED | MAINTENANCE",
    "shareable": true
  }
  ```
- **Real-Time Trigger:** Emits `inventory:changed` to `facility:{id}`.

### 4.3 Add Blood Unit
- **Endpoint:** `POST /api/v1/facilities/:id/blood-units`
- **Auth:** Required (`BLOOD_BANK`)
- **Body:**
  ```json
  {
    "bloodGroup": "O_NEG",
    "component": "PRBC",
    "collectedAt": "2026-09-20T10:00:00.000Z",
    "expiresAt": "2026-10-25T10:00:00.000Z"
  }
  ```

---

## 5. Smart Search (`/api/v1/search`)

### 5.1 Locate Viable Resource Providers
Queries facilities within a step radius, filters by available and shareable inventory, enforces reserve floors, and calculates road ETAs.
- **Endpoint:** `GET /api/v1/search/resources`
- **Query Parameters:**
  - `type`: Equipment code (e.g. `VENTILATOR`, `OXYGEN_CONCENTRATOR`)
  - `bloodGroup`: Blood group code (e.g. `O_NEG`, `B_POS`)
  - `component`: Component type (`WHOLE`, `PRBC`, `PLATELETS`, `PLASMA`)
  - `lat`: Target latitude (decimal)
  - `lng`: Target longitude (decimal)
  - `radiusKm`: Maximum search distance (default `50`, max `150`)
  - `qty`: Requested quantity (default `1`)
  - `requesterFacilityId`: Exclude requester's own facility
- **Response (200 OK):**
  ```json
  {
    "results": [
      {
        "facility": {
          "id": "fac_murbad_chc",
          "name": "Murbad Community Health Centre",
          "type": "CHC",
          "lat": 19.25,
          "lng": 73.38
        },
        "distanceKm": 26.4,
        "etaMins": 39,
        "availableUnits": 3,
        "shareableUnits": 2,
        "freshness": "RECENT",
        "lastUpdatedMinutesAgo": 4
      }
    ]
  }
  ```

---

## 6. Resource Requests & Urgency Engine (`/api/v1/requests`)

### 6.1 Create Resource Request
Automatically computes urgency priority score ($0 - 100$) based on patient criticality, time-sensitivity, distance, scarcity, and age bonus.
- **Endpoint:** `POST /api/v1/requests`
- **Auth:** Required (`FACILITY_ADMIN`, `BLOOD_BANK`)
- **Body:**
  ```json
  {
    "kind": "EQUIPMENT",
    "requesterFacilityId": "fac_kalyan_phc",
    "equipmentTypeId": "eq_o2_concentrator",
    "quantity": 1,
    "patientCriticality": 5,
    "timeSensitivityMins": 45,
    "neededBy": "2026-09-22T00:30:00.000Z",
    "patientSummary": {
      "ageBand": "ADULT",
      "sex": "FEMALE",
      "condition": "Severe acute respiratory distress; peripheral SpO2 78%"
    }
  }
  ```
  > [!IMPORTANT]
  > **DISHA No-PII Invariant:** Payloads containing patient names, Aadhaar numbers, or personal telephone numbers will fail Zod validation with code `PRIVACY_VIOLATION`.

- **Response (201 Created):**
  ```json
  {
    "request": {
      "id": "req_xyz789",
      "status": "OPEN",
      "priorityScore": 91.4,
      "scoreBreakdown": {
        "criticalityScore": 100.0,
        "timeScore": 81.25,
        "distanceScore": 73.6,
        "scarcityScore": 66.7,
        "ageBonus": 0.0,
        "compositeScore": 91.4,
        "weightsApplied": { "criticality": 0.45, "time": 0.25, "distance": 0.10, "scarcity": 0.10, "ageBonus": 0.10 }
      }
    },
    "offersGenerated": 3
  }
  ```

### 6.2 List Requests
- **Endpoint:** `GET /api/v1/requests`
- **Query Parameters:**
  - `scope`: `incoming` | `outgoing` | `open` | `history`
  - `facilityId`: Filter by facility
  - `status`: `OPEN` | `MATCHED` | `IN_TRANSIT` | `FULFILLED` | `CANCELLED`
- **Response (200 OK):** Ranked array of requests ordered by `priorityScore DESC`.

### 6.3 Explain Priority Score
- **Endpoint:** `GET /api/v1/requests/:id/score-breakdown`
- **Response (200 OK):** Detailed explainability weights, raw sub-scores, formula factors, and clinical safety disclaimer.

### 6.4 Offer Actions
- **Accept Offer:** `POST /api/v1/offers/:id/accept`
  - Locks the allocation, reserves inventory units, transitions competing offers to `EXPIRED`, and auto-creates a `LogisticsJob` (PICKUP).
- **Decline Offer:** `POST /api/v1/offers/:id/decline`
- **Counter Offer:** `POST /api/v1/offers/:id/counter` (`{ "counterQuantity": 1 }`)

---

## 7. Blood Bank & Donor PWA (`/api/v1/blood` & `/api/v1/donors`)

### 7.1 Blood Inventory 8x4 Grid
- **Endpoint:** `GET /api/v1/blood/matrix`
- **Query Parameters:** `facilityId` (optional)
- **Response (200 OK):** Complete 8 groups $\times$ 4 components matrix, shelf-life indicators, units expiring in $<72\text{h}$, and summary metrics.

### 7.2 Automated Near-Expiry Redistribution Suggestions
- **Endpoint:** `GET /api/v1/blood/redistribution-suggestions`
- **Response (200 OK):** Pairs blood units expiring in $<72\text{h}$ at surplus facilities with open compatible requests at nearby facilities to prevent discard wastage.

### 7.3 Donation Camps
- **List Camps:** `GET /api/v1/blood/camps`
- **Create Camp:** `POST /api/v1/blood/camps`
- **Donor Camp Check-In:** `POST /api/v1/blood/camps/:id/checkin`

### 7.4 Donor PWA: Nearby Urgent Requests Feed
- **Endpoint:** `GET /api/v1/donors/nearby-requests`
- **Auth:** Required (`DONOR`)
- **Response (200 OK):** Active blood requests compatible with the authenticated donor's blood group within their configured radius, ranked by urgency.

### 7.5 Pledge Blood Donation
- **Endpoint:** `POST /api/v1/donors/pledge`
- **Auth:** Required (`DONOR`)
- **Body:**
  ```json
  {
    "requestId": "req_blood_bpos",
    "slotAt": "2026-09-22T14:00:00.000Z"
  }
  ```
- **Response (201 Created):** Confirms pledge, triggers SMS notification with camp/hospital location, and updates live Kanban board.

---

## 8. Logistics & Transport Fleet (`/api/v1/logistics`)

### 8.1 List Active Logistics Jobs
- **Endpoint:** `GET /api/v1/logistics/jobs`
- **Query Parameters:**
  - `status`: `PENDING` | `ASSIGNED` | `PICKED_UP` | `IN_TRANSIT` | `DELIVERED` | `RETURNED`
  - `type`: `PICKUP` | `RETURN`
- **Response (200 OK):** Delivery assignments with route waypoints, contact info, and elapsed time metrics.

### 8.2 Advance Job Status
- **Endpoint:** `PATCH /api/v1/logistics/jobs/:id/status`
- **Auth:** Required (`TRANSPORT`, `FACILITY_ADMIN`)
- **Body:**
  ```json
  {
    "status": "PICKED_UP | IN_TRANSIT | DELIVERED | RETURNED"
  }
  ```

### 8.3 Digital Handover Checklist & Signatures
- **Endpoint:** `POST /api/v1/logistics/jobs/:id/checklist`
- **Auth:** Required
- **Body:**
  ```json
  {
    "checklist": {
      "circuitsIncluded": true,
      "filtersVerified": true,
      "powerCablePresent": true,
      "batteryPercentage": 96,
      "calibrationPassed": true
    },
    "providerSignature": {
      "signerName": "Dr. Anand Deshpande",
      "timestamp": "2026-09-21T23:50:00.000Z"
    },
    "receiverSignature": {
      "signerName": "Sister Priya Shinde",
      "timestamp": "2026-09-22T00:15:00.000Z"
    }
  }
  ```

---

## 9. District Oversight & Analytics (`/api/v1/analytics`)

### 9.1 High-Level District KPIs
- **Endpoint:** `GET /api/v1/analytics/overview`
- **Response (200 OK):**
  - Median request-to-allocation duration (e.g. `2m 14s`)
  - Equipment idle-time reduction (`38.4%` decrease vs baseline)
  - Blood wastage units saved vs discarded
  - Overall fulfillment rate (`92.3%`)

### 9.2 Chronic Gap & Automated Procurement Report
- **Endpoint:** `GET /api/v1/analytics/gaps`
- **Response (200 OK):** Facilities with recurrent borrow requests over 30/60/90 days and automated capital expenditure recommendations:
  > *"Kalyan Rural PHC requested oxygen concentrators 14 times in 60 days (fulfilled 11 from neighbours). Recommendation: Procure 2 permanent units."*

### 9.3 Healthcare Tier Equity
- **Endpoint:** `GET /api/v1/analytics/equity`
- **Response (200 OK):** Fulfillment percentages segmented by facility tier (`PHC`: 86.4%, `CHC`: 91.2%, `DISTRICT_HOSPITAL`: 94.8%) proving peripheral health access.

### 9.4 Expiry & Wastage Ledger
- **Endpoint:** `GET /api/v1/analytics/wastage`
- **Response (200 OK):** Blood units saved via FEFO redistribution vs expired units across the district.

---

## 10. Demand Forecasting (`/api/v1/forecast`)

### 10.1 Proactive Surge Alerts
- **Endpoint:** `GET /api/v1/forecast/alerts`
- **Response (200 OK):** Surges predicted 3 days in advance combining 7-day moving averages, 8-week weekday seasonality, and 14-day trend slopes.

### 10.2 "What-If" Scenario Surge Simulator
- **Endpoint:** `POST /api/v1/forecast/whatif`
- **Body:**
  ```json
  {
    "facilityId": "fac_kalyan_phc",
    "resourceKey": "OXYGEN_CONCENTRATOR",
    "surgeMultiplier": 2.5
  }
  ```
- **Response (200 OK):** Forecast demand projection under elevated surge factor.

---

## 11. Offline Sync Protocol (`/api/v1/sync`)

Replays mutations queued in client IndexedDB during network disconnections.
- **Endpoint:** `POST /api/v1/sync`
- **Body:**
  ```json
  {
    "ops": [
      {
        "id": "op_uuid_1",
        "clientId": "client_session_xyz",
        "userId": "usr_kalyan_nurse",
        "opType": "INVENTORY_EQUIPMENT_UPDATE",
        "payload": {
          "facilityId": "fac_kalyan_phc",
          "typeCode": "VENTILATOR",
          "delta": -1
        },
        "clientTimestamp": 1726950000000
      }
    ]
  }
  ```
- **Response (200 OK):** Returns applied status for each operation, with `conflict: true` and rollback instructions if negative inventory depletion was prevented.

---

## 12. Feature Phone SMS & USSD Fallback (`/api/v1/sms` & `/api/v1/ussd`)

Enables 2G feature phones (e.g. Nokia 105) to interact with LifeLink without web connectivity.

### 12.1 Inbound SMS Webhook
- **Endpoint:** `POST /api/v1/sms/inbound`
- **Body:**
  ```json
  {
    "fromPhone": "9820011001",
    "body": "NEED VENT 1 URGENT 5"
  }
  ```
- **Supported SMS Grammar:**
  | Command Syntax | Action | Example |
  |---|---|---|
  | `STOCK <TYPE> <QTY>` | Update local equipment count | `STOCK VENT 3` |
  | `STOCK BLOOD <GROUP> <QTY>` | Update blood units | `STOCK BLOOD O+ 4` |
  | `NEED <TYPE> <QTY> URGENT <1-5>` | Broadcast emergency request | `NEED VENT 1 URGENT 5` |
  | `NEED BLOOD <GROUP> <QTY> URGENT <1-5>` | Broadcast blood request | `NEED BLOOD B- 2 URGENT 4` |
  | `FIND <TYPE>` | Query nearest shareable supply | `FIND VENT` |
  | `ACCEPT <REQ_CODE>` | Accept incoming loan offer | `ACCEPT R104` |
  | `DECLINE <REQ_CODE>` | Decline loan offer | `DECLINE R104` |
  | `STATUS <REQ_CODE>` | Query progress of request | `STATUS R104` |
  | `PLEDGE <REQ_CODE>` | Pledge blood unit as donor | `PLEDGE R104` |
  | `HELP` | Return command cheat sheet | `HELP` |

### 12.2 SMS Outbox Inspection (Simulator Support)
- **Endpoint:** `GET /api/v1/sms/outbox`
- **Response (200 OK):** Returns all outbound messages sent by the mock gateway for display in `/dev/sms`.

### 12.3 Interactive USSD Menu Session
- **Endpoint:** `POST /api/v1/ussd`
- **Body:**
  ```json
  {
    "sessionId": "sess_9820011001_1",
    "phone": "9820011001",
    "text": "*123*1*1#"
  }
  ```
- **Menu Tree:**
  - `*123#` $\rightarrow$ 1: Update Stock | 2: Request Resource | 3: Find Nearest | 4: My Active Requests

---

## 13. System Administration & Surge Tools (`/api/v1/admin`)

### 13.1 Dynamic Priority Weights
- **Get Weights:** `GET /api/v1/admin/priority-weights`
- **Update Weights:** `PUT /api/v1/admin/priority-weights`
  - Body: `{ "criticality": 0.45, "time": 0.25, "distance": 0.10, "scarcity": 0.10, "ageBonus": 0.10 }`
  - Re-ranks all active requests across the district in real time.

### 13.2 Trigger Synthetic Surge
- **Endpoint:** `POST /api/v1/admin/simulate/surge`
- **Body:** `{ "count": 5 }`
- **Response (200 OK):** Injects 5 synthetic high-criticality requests; triggers real-time queue re-ranking over Socket.io.

### 13.3 Reset Simulation
- **Endpoint:** `POST /api/v1/admin/simulate/reset`
- **Response (200 OK):** Cleans up synthetic surge requests and restores baseline state.

---

## 14. Real-Time WebSocket Specifications

### 14.1 Socket Connection & Handshake
- **URL:** `ws://localhost:4000`
- **Transports:** `websocket`, `polling`
- **Authentication:** `auth: { token: "<jwt_access_token>" }`

### 14.2 Client Rooms
- `facility:{facilityId}`: Subscribed to facility-specific inventory, offers, and incoming alerts.
- `district:{districtId}`: Subscribed to district-wide updates.
- `request:{requestId}`: Subscribed to specific request progress.
- `donor:{donorId}`: Subscribed to compatible donor pledges and reminders.

### 14.3 Event Catalog
| Event | Room | Payload | Trigger Scenario |
|---|---|---|---|
| `inventory:changed` | `facility:{id}` | `{ facilityId, typeCode, action, unit }` | Equipment stepper tapped or blood status toggled |
| `request:created` | Global / District | `{ request, offers }` | New urgent loan request raised |
| `queue:updated` | Global | `{ queue: Request[] }` | Periodic 60s priority recompute or surge injection |
| `offer:received` | `facility:{id}` | `{ offerId, requestId, etaMins, expiresAt }` | Provider matching finds candidate donor hospital |
| `offer:resolved` | `facility:{id}` | `{ offer, request, allocation, pickupJob }` | Provider hospital clicks "Accept Loan" |
| `pledge:created` | `facility:{id}` | `{ requestId, donorName, bloodGroup }` | Citizen pledges unit on mobile Donor PWA |
| `blood:expiry_sweep` | Global | `{ expiredCount, redistributionSuggestions }` | 72h automated FEFO sweep detects wastage risk |
| `logistics:updated` | Global | `{ job: LogisticsJob }` | Ambulance driver advances status or signs checklist |
| `surge:triggered` | Global | `{ count }` | Evaluator clicks "Simulate Surge" |
| `notification:new` | `facility:{id}` | `{ id, template, message, level }` | Broadcast alert dispatched |

---

## 15. System Health Check (`/api/v1/health`)

- **Endpoint:** `GET /api/v1/health`
- **Response (200 OK):**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-09-21T23:55:00.000Z",
    "uptime": 1420.5,
    "database": "connected",
    "version": "1.0.0",
    "mode": "development"
  }
  ```
