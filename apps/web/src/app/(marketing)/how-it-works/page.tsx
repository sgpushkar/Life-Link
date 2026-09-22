'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Layers,
  Droplets,
  Truck,
  Smartphone,
  CheckCircle2,
  Activity,
  Sliders,
  Building2,
  FileCheck,
  KeyRound,
  Calculator,
  Compass,
} from 'lucide-react';

export default function HowItWorksPage() {
  const [activeTab, setActiveTab] = useState<'protocol' | 'triage' | 'blood' | 'offline' | 'roles'>('protocol');

  return (
    <div className="space-y-12 pb-16 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="space-y-3 pt-2 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-neutral-300" />
          <span>System Protocol & Architecture • Mumbai & Navi Mumbai</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-display font-semibold text-neutral-100 tracking-tight">
          How LifeLink Works
        </h1>

        <p className="text-sm sm:text-base text-neutral-400 max-w-3xl leading-relaxed">
          A decentralized coordination layer interconnecting urban health centers, tertiary medical hospitals, municipal blood banks, and transit fleets across Mumbai and Navi Mumbai.
        </p>

        {/* Quick Nav Anchor Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-4">
          <button
            onClick={() => setActiveTab('protocol')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'protocol'
                ? 'bg-neutral-800 text-neutral-100 border border-neutral-700 shadow-sm'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 border border-neutral-850'
            }`}
          >
            4-Phase Lending Protocol
          </button>
          <button
            onClick={() => setActiveTab('triage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'triage'
                ? 'bg-neutral-800 text-neutral-100 border border-neutral-700 shadow-sm'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 border border-neutral-850'
            }`}
          >
            Triage Scoring Formula
          </button>
          <button
            onClick={() => setActiveTab('blood')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'blood'
                ? 'bg-neutral-800 text-neutral-100 border border-neutral-700 shadow-sm'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 border border-neutral-850'
            }`}
          >
            FEFO Blood Matrix
          </button>
          <button
            onClick={() => setActiveTab('offline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'offline'
                ? 'bg-neutral-800 text-neutral-100 border border-neutral-700 shadow-sm'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 border border-neutral-850'
            }`}
          >
            Offline 2G / SMS Fallback
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'roles'
                ? 'bg-neutral-800 text-neutral-100 border border-neutral-700 shadow-sm'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 border border-neutral-850'
            }`}
          >
            Demo Testing Guide
          </button>
        </div>
      </div>

      {/* Content Section 1: 4-Phase Protocol */}
      {(activeTab === 'protocol' || activeTab === 'triage') && (
        <section className="space-y-6">
          <div className="border-b border-neutral-800 pb-3">
            <h2 className="text-xl sm:text-2xl font-display font-semibold text-neutral-200">
              The 4-Phase Peer Lending Protocol
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Guarantees zero asset hoarding, protects minimum safety floors, and enforces digital dual sign-offs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Step 1 */}
            <div className="p-5 rounded-xl bg-[#121214] border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-900 text-neutral-200 border border-neutral-800">
                  Phase 01
                </span>
                <span className="text-[11px] text-neutral-500 uppercase tracking-wider">
                  Deficit Detection
                </span>
              </div>
              <h3 className="text-base font-semibold text-neutral-200">
                1. Shortage Flagged & Urgency Broadcast
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                When a frontline facility (e.g. <strong className="text-neutral-300">NMMC Urban Health Centre Nerul</strong>) exhausts stock (such as oxygen concentrators = 0), clinic staff triggers an urgent peer loan appeal specifying patient criticality (1–5) and required deadline.
              </p>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 text-xs font-mono space-y-1 text-neutral-400">
                <span className="text-[10px] text-neutral-500 block uppercase">Protocol Action</span>
                <p>Broadcasts live WebSocket distress packet across Mumbai & Navi Mumbai telemetry mesh.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-xl bg-[#121214] border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-900 text-neutral-200 border border-neutral-800">
                  Phase 02
                </span>
                <span className="text-[11px] text-neutral-500 uppercase tracking-wider">
                  Reserve Floor Safety
                </span>
              </div>
              <h3 className="text-base font-semibold text-neutral-200">
                2. Surplus Matching & Safety Thresholds
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Neighboring tertiary hospitals (e.g. <strong className="text-neutral-300">Dr. D.Y. Patil Medical Hospital Nerul</strong>) receive the request ranked by explainable clinical score. The system strictly isolates surplus from local reserves:
              </p>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 text-xs font-mono space-y-1 text-neutral-400">
                <span className="text-[10px] text-neutral-500 block uppercase">Safety Rule</span>
                <code className="text-neutral-200 block font-bold">ShareableUnits = TotalUnits - ReserveFloor</code>
                <span className="text-[11px] text-neutral-500">Facilities can NEVER be drained below their reserve floor.</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-xl bg-[#121214] border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-900 text-neutral-200 border border-neutral-800">
                  Phase 03
                </span>
                <span className="text-[11px] text-neutral-500 uppercase tracking-wider">
                  Transit Verification
                </span>
              </div>
              <h3 className="text-base font-semibold text-neutral-200">
                3. Fleet Dispatch & Cold-Chain Checklist
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Dedicated emergency transport units (e.g. <strong className="text-neutral-300">Ambulance Fleet — Unit MH-43</strong>) accept cargo dispatch. Before departing, the driver must complete a 3-point digital safety checklist:
              </p>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 text-xs font-mono space-y-1.5 text-neutral-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Battery charge verified &gt; 80%</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Calibration self-test passed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Physical casing intact & sanitized</span>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-xl bg-[#121214] border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-900 text-neutral-200 border border-neutral-800">
                  Phase 04
                </span>
                <span className="text-[11px] text-neutral-500 uppercase tracking-wider">
                  Chain-of-Custody
                </span>
              </div>
              <h3 className="text-base font-semibold text-neutral-200">
                4. Verified Dual Sign-Off & Mesh Rebalance
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Upon delivery, both the provider hospital representative and the receiving clinic administrator record verified digital sign-offs. The network immediately updates stock counts in real time.
              </p>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 text-xs font-mono space-y-1 text-neutral-400">
                <span className="text-[10px] text-neutral-500 block uppercase">Immutability</span>
                <p>Every transaction logs SHA-256 audit events accessible to the Municipal Health Directorate.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Content Section 2: Explainable Triage Formula */}
      {(activeTab === 'triage' || activeTab === 'protocol') && (
        <section className="p-6 rounded-xl bg-[#121214] border border-neutral-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-850 pb-4">
            <div>
              <span className="text-[10px] uppercase font-mono text-neutral-500">
                Mathematical Engine
              </span>
              <h3 className="text-lg font-semibold text-neutral-200 mt-0.5 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-neutral-400" />
                <span>Explainable 5-Factor Priority Scoring (0–100)</span>
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded bg-neutral-900 text-neutral-300 font-mono text-xs border border-neutral-800">
              Score = Σ (Factor_i × Weight_i)
            </span>
          </div>

          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Rather than a black-box AI model, LifeLink uses a deterministic, medically explainable formula validated by healthcare directors. Clinicians can click <strong>Score (ⓘ)</strong> on any emergency order to audit exactly why it was ranked:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 space-y-1">
              <span className="text-neutral-500 block text-[11px]">Weight: 45%</span>
              <span className="font-bold text-neutral-200 block text-sm">Criticality</span>
              <p className="text-[11px] text-neutral-400 font-sans">
                Patient severity triage (scale 1 to 5). Score = Criticality × 20.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 space-y-1">
              <span className="text-neutral-500 block text-[11px]">Weight: 25%</span>
              <span className="font-bold text-neutral-200 block text-sm">Time Window</span>
              <p className="text-[11px] text-neutral-400 font-sans">
                Minutes remaining before irreversible decompensation.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 space-y-1">
              <span className="text-neutral-500 block text-[11px]">Weight: 10%</span>
              <span className="font-bold text-neutral-200 block text-sm">Distance</span>
              <p className="text-[11px] text-neutral-400 font-sans">
                Haversine road-network transit distance between facilities.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 space-y-1">
              <span className="text-neutral-500 block text-[11px]">Weight: 10%</span>
              <span className="font-bold text-neutral-200 block text-sm">Scarcity</span>
              <p className="text-[11px] text-neutral-400 font-sans">
                District-wide availability index of the specific equipment or blood group.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-850 space-y-1">
              <span className="text-neutral-500 block text-[11px]">Weight: 10%</span>
              <span className="font-bold text-neutral-200 block text-sm">Wait Age</span>
              <p className="text-[11px] text-neutral-400 font-sans">
                Queue aging factor preventing low-criticality patients from starving indefinitely.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Content Section 3: FEFO Blood Matrix */}
      {(activeTab === 'blood' || activeTab === 'protocol') && (
        <section className="space-y-6">
          <div className="border-b border-neutral-800 pb-3">
            <h2 className="text-xl sm:text-2xl font-display font-semibold text-neutral-200">
              FEFO Blood Matrix & Expiry Sweeps
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              First-Expiry, First-Out logistics routing to bring component spoilage to near-zero.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-xl bg-[#121214] border border-neutral-800 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <Droplets className="w-4 h-4 text-neutral-300" />
              </div>
              <h3 className="font-semibold text-sm text-neutral-200">8×4 Component Matrix</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Tracks 8 blood groups (O-, O+, A-, A+, B-, B+, AB-, AB+) across 4 distinct components (PRBC, Whole Blood, Platelets, Fresh Frozen Plasma) with strict biological compatibility rules.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#121214] border border-neutral-800 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <Compass className="w-4 h-4 text-neutral-300" />
              </div>
              <h3 className="font-semibold text-sm text-neutral-200">Automated Expiry Sweeps</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                When units have &lt;72 hours shelf life remaining, the algorithm automatically flags sweep transfers from regional depots (e.g. Navi Mumbai Municipal Blood Centre) to high-volume emergency trauma surgical wards.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#121214] border border-neutral-800 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <Activity className="w-4 h-4 text-neutral-300" />
              </div>
              <h3 className="font-semibold text-sm text-neutral-200">Citizen Donor Distress Pledges</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                When rare blood units (e.g. O- PRBC) drop below critical safety floors, automated geofenced distress appeals alert registered citizen donors within a 10 km radius for walk-in pledges.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Content Section 4: Offline 2G Fallback */}
      {(activeTab === 'offline' || activeTab === 'protocol') && (
        <section className="p-6 rounded-xl bg-[#121214] border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-neutral-400" />
            <h3 className="text-lg font-semibold text-neutral-200">
              Offline 2G / Basic Feature Phone Fallback
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            In disaster conditions, heavy monsoons, or remote health posts where internet connectivity drops completely, clinical staff can still broadcast orders using basic feature phones without data:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs pt-2">
            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-850 space-y-2">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="font-bold text-neutral-200">Structured SMS Syntax</span>
                <span className="text-[10px] text-neutral-500">GSM / 2G</span>
              </div>
              <p className="text-xs font-sans text-neutral-400">
                Send short SMS to the mesh dispatch gateway:
              </p>
              <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200">
                <code>NEED VENT 1 URGENT 5</code>
              </div>
              <p className="text-[11px] text-neutral-500 font-sans">
                The SMS parser parses the equipment token, quantity, and criticality level, creating an immediate queue entry.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-850 space-y-2">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="font-bold text-neutral-200">Interactive USSD Menu</span>
                <span className="text-[10px] text-neutral-500">*123#</span>
              </div>
              <p className="text-xs font-sans text-neutral-400">
                Dial the USSD shortcode on any basic device:
              </p>
              <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-200">
                <code>1. Check Stock<br />2. Request O2<br />3. Request Blood</code>
              </div>
              <p className="text-[11px] text-neutral-500 font-sans">
                Operates entirely over telecom signaling channels with zero packet data usage.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Content Section 5: Demonstration & Role Walkthrough Guide */}
      {(activeTab === 'roles' || activeTab === 'protocol') && (
        <section className="space-y-6">
          <div className="border-b border-neutral-800 pb-3">
            <h2 className="text-xl sm:text-2xl font-display font-semibold text-neutral-200">
              Interactive Demonstration Walkthrough
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Follow these recommended test steps to experience the complete multi-stakeholder workflow.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-[#121214]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500 font-mono text-[11px]">
                  <th className="py-3 px-4">Step</th>
                  <th className="py-3 px-4">Role & Persona</th>
                  <th className="py-3 px-4">Login Phone</th>
                  <th className="py-3 px-4">Operational Action to Test</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 font-sans">
                <tr className="hover:bg-neutral-900/50">
                  <td className="py-3 px-4 font-mono font-bold text-neutral-300">01</td>
                  <td className="py-3 px-4 font-semibold text-neutral-200">Facility Admin (Urban PHC)</td>
                  <td className="py-3 px-4 font-mono text-neutral-400">9820011001</td>
                  <td className="py-3 px-4 text-neutral-400">
                    Observe <strong className="text-neutral-300">0 Concentrators On-Site</strong> alert. Open <code className="text-neutral-300 font-mono">/search</code>, locate nearby surplus, and broadcast an urgent request.
                  </td>
                </tr>
                <tr className="hover:bg-neutral-900/50">
                  <td className="py-3 px-4 font-mono font-bold text-neutral-300">02</td>
                  <td className="py-3 px-4 font-semibold text-neutral-200">Facility Admin (Medical Hub)</td>
                  <td className="py-3 px-4 font-mono text-neutral-400">9820011002</td>
                  <td className="py-3 px-4 text-neutral-400">
                    Inspect incoming queue, click <strong className="text-neutral-300">Score (ⓘ)</strong> to audit the 5-factor calculation, and click <strong className="text-neutral-300">Approve Loan</strong>.
                  </td>
                </tr>
                <tr className="hover:bg-neutral-900/50">
                  <td className="py-3 px-4 font-mono font-bold text-neutral-300">03</td>
                  <td className="py-3 px-4 font-semibold text-neutral-200">Emergency Transport Driver</td>
                  <td className="py-3 px-4 font-mono text-neutral-400">9820011005</td>
                  <td className="py-3 px-4 text-neutral-400">
                    Review assigned cargo (Unit MH-43), complete the 3-point digital safety checklist, advance transit stages, and capture receiver sign-off.
                  </td>
                </tr>
                <tr className="hover:bg-neutral-900/50">
                  <td className="py-3 px-4 font-mono font-bold text-neutral-300">04</td>
                  <td className="py-3 px-4 font-semibold text-neutral-200">Blood Bank Officer</td>
                  <td className="py-3 px-4 font-mono text-neutral-400">9820011003</td>
                  <td className="py-3 px-4 text-neutral-400">
                    Review the 8×4 blood matrix at Navi Mumbai Municipal Blood Centre, and trigger automated FEFO sweeps on near-expiry O- units.
                  </td>
                </tr>
                <tr className="hover:bg-neutral-900/50">
                  <td className="py-3 px-4 font-mono font-bold text-neutral-300">05</td>
                  <td className="py-3 px-4 font-semibold text-neutral-200">Municipal Health Officer (MHO)</td>
                  <td className="py-3 px-4 font-mono text-neutral-400">9820011006</td>
                  <td className="py-3 px-4 text-neutral-400">
                    Review district-wide telemetry, idle asset reduction metrics, chronic deficit recommendations, and export the official CSV report.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Bottom CTA Card */}
      <div className="p-6 rounded-xl bg-[#121214] border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-neutral-100">
            Ready to test the network in live simulation?
          </h3>
          <p className="text-xs text-neutral-400">
            Select any test credential or sign in with your phone number to access the workspace.
          </p>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-neutral-100 shadow-sm transition-colors whitespace-nowrap"
        >
          <KeyRound className="w-3.5 h-3.5 text-neutral-300" />
          <span>Access Login Directory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
