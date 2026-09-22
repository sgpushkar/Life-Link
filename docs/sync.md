# LifeLink Offline-First Synchronization & Conflict Resolution Specification

LifeLink operates in rural clinical settings where connectivity is unstable, intermittent, or dropped. This document details the offline queue architecture, sync lifecycle, and deterministic conflict resolution rules.

## 1. Client Outbox Architecture

All mutations initiated while offline are enqueued into an IndexedDB store `outbox` with the following schema:

```ts
interface SyncOp {
  id: string;              // Client-generated UUID
  clientId: string;        // Idempotency key
  userId: string;          // Authenticated staff actor
  opType: 'INVENTORY_EQUIPMENT_UPDATE' | 'CREATE_REQUEST' | 'PLEDGE_DONATION';
  payload: Record<string, any>;
  clientTimestamp: number; // UTC millisecond epoch at action time
}
```

When network restoration is detected (`window.addEventListener('online')`), the queue flushes in strict sequential order via `POST /api/v1/sync`.

## 2. Deterministic Conflict Resolution Rules

### A. Equipment Inventory Counts
- **Rule:** Last-Writer-Wins (LWW) by `clientTimestamp`.
- **Negative Depletion Guard:** If an offline decrement would drive available facility inventory below zero due to an intervening server allocation, the op is flagged with `conflict: true`, the local decrement is rolled back, and the nurse is prompted with a notification:
  *"Concurrent allocation depleted available units to zero; decrement rejected."*

### B. Emergency Resource Requests
- **Rule:** Idempotent by `clientId`.
- If an emergency request was queued offline, repeated reconnections will not create duplicate requests. The request maintains its original `clientTimestamp` for accurate anti-starvation age bonus calculation.

### C. Offers & Allocations
- **Rule:** Server Authoritative.
- The first viable provider to accept an offer wins the allocation. Any concurrent offline acceptance received after the allocation is committed is marked `EXPIRED`, and the provider is notified that the request was fulfilled by a faster peer.
