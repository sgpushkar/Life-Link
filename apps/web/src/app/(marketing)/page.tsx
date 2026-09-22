'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Droplets,
  Smartphone,
  Layers,
  KeyRound,
} from 'lucide-react';
import { DistrictMap } from '../../components/DistrictMap';
import { useAppStore } from '../../lib/store';

export default function MarketingLandingPage() {
  const currentUser = useAppStore((s) => s.currentUser);

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="pt-2 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left: Mission & Navigation */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-neutral-800 bg-neutral-900/60 text-neutral-300 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
              <span>Pilot • Navi Mumbai & Mumbai</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-semibold text-neutral-200 tracking-tight leading-[1.08]">
              Healthcare inventory sharing, in real time.
            </h1>

            <p className="text-base text-neutral-400 max-w-xl leading-relaxed">
              Connect clinics, tertiary hospitals, blood banks, and transport fleets across Mumbai and Navi Mumbai to borrow and redistribute life-saving medical equipment and blood units.
            </p>

            {/* Direct Actions */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {currentUser ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-medium text-xs shadow-sm transition-colors"
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-medium text-xs shadow-sm transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Sign In to Access System</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}

              <Link
                href="/dev/feature-phone"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white text-xs font-mono transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 text-neutral-400" />
                <span>Feature Phone (2G)</span>
              </Link>
            </div>

            {/* Baseline Telemetry */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-neutral-800/80 font-mono">
              <div>
                <span className="text-2xl sm:text-3xl font-bold text-white block tabular-nums">
                  4.2<span className="text-sm font-sans text-neutral-500 ml-1">min</span>
                </span>
                <span className="text-xs text-neutral-400 mt-0.5 block font-sans">Match Time</span>
              </div>

              <div>
                <span className="text-2xl sm:text-3xl font-bold text-white block tabular-nums">
                  38<span className="text-sm font-sans text-neutral-500 ml-0.5">%</span>
                </span>
                <span className="text-xs text-neutral-400 mt-0.5 block font-sans">Surplus Reclaimed</span>
              </div>

              <div>
                <span className="text-2xl sm:text-3xl font-bold text-white block tabular-nums">
                  0<span className="text-sm font-sans text-neutral-500 ml-0.5">%</span>
                </span>
                <span className="text-xs text-neutral-400 mt-0.5 block font-sans">Blood Spoilage</span>
              </div>
            </div>
          </div>

          {/* Right: District Map */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between text-xs px-1 text-neutral-400 font-mono">
              <span>District Topology</span>
              <span className="text-neutral-500">14 Nodes</span>
            </div>

            <DistrictMap />
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="space-y-6 pt-2">
        <div className="border-b border-neutral-800 pb-3">
          <h2 className="text-xl sm:text-2xl font-display font-semibold text-white">
            Core Capabilities
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Built for rural healthcare networks and low-bandwidth environments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-lg mono-card space-y-3">
            <div className="w-8 h-8 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Urgency Prioritization</h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Prioritizes emergency requests using patient criticality, required timeline, distance, and local scarcity.
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-850 text-[11px] text-neutral-500 flex items-center justify-between font-mono">
              <span>Triage Scoring</span>
              <span className="text-neutral-300">Explainable</span>
            </div>
          </div>

          <div className="p-5 rounded-lg mono-card space-y-3">
            <div className="w-8 h-8 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Blood & FEFO Routing</h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Component compatibility matching and automated 72-hour expiry sweeps to transfer blood before spoilage.
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-850 text-[11px] text-neutral-500 flex items-center justify-between font-mono">
              <span>PRBC & Plasma</span>
              <span className="text-neutral-300">Expiry Watch</span>
            </div>
          </div>

          <div className="p-5 rounded-lg mono-card space-y-3">
            <div className="w-8 h-8 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Offline 2G Fallback</h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Structured SMS commands and USSD menu (*123#) allow clinic staff to request stock without mobile internet.
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-850 text-[11px] text-neutral-500 flex items-center justify-between font-mono">
              <span>Zero-Data</span>
              <span className="text-neutral-300">Basic Phones</span>
            </div>
          </div>
        </div>
      </section>

      {/* Sleek Protocol Teaser leading to dedicated /how-it-works page */}
      <section className="p-6 sm:p-8 rounded-xl bg-[#121214] border border-neutral-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
            <span>Protocol Architecture & Triage</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-semibold text-neutral-100 tracking-tight">
            How LifeLink Coordinates Regional Sharing
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Read the full protocol specification: 5-factor triage formulas, reserve floor safety thresholds, automated FEFO blood sweeps, and step-by-step role demonstration flows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-medium text-xs shadow-sm transition-colors"
          >
            <span>Learn How It Works</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-medium transition-colors"
          >
            <span>Test Demo Roles</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
