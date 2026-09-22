# LifeLink Master Demo Script (Judges Presentation Flow)

Follow this 9-step script to demonstrate LifeLink end-to-end to the hackathon judges.

---

### Step 1: The Problem & Live Telemetry Hero (1 min)
- **URL:** `/`
- **Action:** Open the landing page.
- **Talking Points:**
  - Show the living Thane District Mesh map: pulsing nodes, color-coded health indicators, and moving equipment packets between surplus and shortage facilities.
  - Highlight the core premise: *"When an ICU ventilator is 20 km away, nobody should die waiting."*

---

### Step 2: PHC Nurse Shortage & Smart Search (1.5 min)
- **Persona:** Switch to **Sister Priya (PHC Kalyan)** via the header switcher.
- **URL:** `/dashboard`
- **Action:**
  1. Observe Oxygen Concentrators = `0` (Critical Depleted indicator flashing).
  2. Navigate to `/search` (Smart Search).
  3. Select **O2 Concentrator**, Quantity `1`, Urgency Level `5` (Life-Threatening), Needed in `45m`.
  4. Click **Locate Viable Providers in Range**.
  5. Point out the freshness badges (&lt;15m green, &lt;2h amber) and CHC Murbad listed with surplus.
  6. Click **Broadcast Urgent Request**.

---

### Step 3: CHC Admin Receives & Explains Priority (1 min)
- **Persona:** Switch to **Dr. Anand (CHC Murbad)**.
- **URL:** `/dashboard`
- **Action:**
  1. Notice Sister Priya's emergency request immediately at the top of the inbox.
  2. Click **Explain Score (ⓘ)**: show the 5-component breakdown modal (Criticality 45%, Time 25%, Proximity 10%, Scarcity 10%, Age bonus 10%). Show the clinical safety disclaimer.
  3. Click **Accept Loan**.

---

### Step 4: Transport Pickup, Checklist & Live Delivery (1.5 min)
- **Persona:** Switch to **Santosh Jadhav (Transport / Driver)**.
- **URL:** `/logistics`
- **Action:**
  1. Active job appears for Ambulance Unit 4. Point out the telemetry metric: **Request → Allocation: 2m 14s**.
  2. Advance status from **1. Picked Up** → **2. In Transit** → **3. Delivered**.
  3. Review the Handover Checklist (circuits, filters, power cable, battery %, calibration) and show the typed digital signatures. Click **Sign & Commit**.

---

### Step 5: Blood Matrix & FEFO Wastage Prevention (1.5 min)
- **Persona:** Switch to **Dr. Meera (Blood Bank Thane)**.
- **URL:** `/blood`
- **Action:**
  1. Review the 8x4 matrix grid.
  2. Highlight the **Redistribution Recommendation Banner**: O- and B+ units expiring in 48h at Thane Red Cross matching open demand at Jeevan Jyoti Blood Bank.
  3. Show the Live Request-Matching Kanban Board (Open → Pledged → Matched → Fulfilled).
  4. Switch to **Ramesh Patil (Donor)** on `/donor`, show the 90-day eligibility status, and click **Pledge Blood Donation**. Show the instant confirmation SMS.

---

### Step 6: Feature Phone Fallback Demo (1 min)
- **URL:** `/dev/feature-phone`
- **Action:**
  1. Point out the styled Nokia feature-phone chassis and monochrome LCD.
  2. Click the quick template: `NEED VENT 1 URGENT 5`.
  3. Watch the SMS dispatch to the network and return the immediate reply with the assigned Request ID and priority score.
  4. Switch to `*123#` mode to demonstrate the interactive USSD menu tree.

---

### Step 7: Live Surge Simulation & Queue Re-Ranking (1 min)
- **URL:** `/requests`
- **Action:**
  1. Show the current ranked queue.
  2. Click **Simulate Surge (5 Requests)**.
  3. Watch the queue dynamically re-rank in real time over Socket.io, with mass casualty requests taking top priority.
  4. Click **Explain Score** on any new item to see the recomputed weights.

---

### Step 8: DHO District Oversight & Chronic Gaps (1.5 min)
- **Persona:** Switch to **Dr. Rajesh Shinde (DHO)**.
- **URL:** `/oversight`
- **Action:**
  1. Review the 4 high-level KPIs: median allocation delay, 38.4% idle equipment reduction, blood units saved, and fulfillment rate.
  2. Highlight the **Chronic Gap Report**: show the automated procurement recommendation for Kalyan Rural PHC (recommending procuring 2 permanent concentrators).
  3. Show the **Healthcare Equity View** proving PHCs achieve an 86% fulfillment rate.
  4. Click **Export District CSV**.

---

### Step 9: Low-Bandwidth Mode (30 sec)
- **Action:**
  1. Click the **Low-BW Mode** toggle in the header.
  2. Show how maps and animations vanish instantly, replaced with a clean, high-density, ultra-fast table UI optimized for 2G rural health posts.
