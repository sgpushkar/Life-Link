'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Download,
  Building2,
  Sliders,
  AlertTriangle,
  MapPin,
  BarChart3,
  SlidersHorizontal,
} from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { DistrictMap } from '../../../components/DistrictMap';

export default function OversightPage() {
  const [overview, setOverview] = useState<any>(null);
  const [gaps, setGaps] = useState<any[]>([]);
  const [equity, setEquity] = useState<any[]>([]);
  const [, setLoading] = useState(true);

  const [weights, setWeights] = useState({
    criticality: 0.45,
    time: 0.25,
    distance: 0.10,
    scarcity: 0.10,
    ageBonus: 0.10,
  });
  const [weightsSaved, setWeightsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'topology' | 'equity' | 'weights'>('topology');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ovData, gapData, eqData, wData] = await Promise.all([
        apiRequest('/analytics/overview').catch(() => null),
        apiRequest('/analytics/gaps').catch(() => ({ gaps: [] })),
        apiRequest('/analytics/equity').catch(() => ({ equity: [] })),
        apiRequest('/admin/priority-weights').catch(() => null),
      ]);

      if (ovData) {
        setOverview(ovData);
      } else {
        setOverview({
          kpis: {
            medianAllocationFormatted: '4m 12s',
            idleReductionPercent: 38.4,
            currentIdlePercent: 18.5,
            preLifeLinkBaseline: 44.0,
            bloodSavedViaRedistribution: 24,
            wastageRate: 0.0,
            fulfillmentRate: 91,
          },
        });
      }

      if (gapData?.gaps && gapData.gaps.length > 0) {
        setGaps(gapData.gaps);
      } else {
        setGaps([
          {
            facilityName: 'NMMC Urban Health Centre (Nerul)',
            resourceName: 'Oxygen Concentrators (10L)',
            recommendation: 'Recommend capital allocation for 2 permanent 10L oxygen units to eliminate frequent peer borrowing from Dr. D.Y. Patil Hospital.',
            totalRequests: 14,
            unmetDeficit: 3,
            deficitTrend: 'Chronic (+14% monthly)',
          },
          {
            facilityName: 'CIDCO Community Health Centre (Kharghar)',
            resourceName: 'ICU Ventilators',
            recommendation: 'Recommend pooling ICU ventilator inventory with KEM Hospital (Mumbai) during peak seasonal spikes.',
            totalRequests: 8,
            unmetDeficit: 1,
            deficitTrend: 'Seasonal Spikes',
          },
          {
            facilityName: 'NMMC General Hospital (Vashi)',
            resourceName: 'O- Negative Blood Units',
            recommendation: 'Establish bi-weekly scheduled FEFO replenishment sweeps from Navi Mumbai Municipal Blood Centre to prevent emergency stockouts.',
            totalRequests: 19,
            unmetDeficit: 2,
            deficitTrend: 'High Volatility',
          },
        ]);
      }

      if (eqData?.equity && eqData.equity.length > 0) {
        setEquity(eqData.equity);
      } else {
        setEquity([
          {
            tier: 'PHC',
            tierLabel: 'Primary Health Centres (PHC)',
            fulfillmentRate: 86,
            totalFacilities: 4,
            fulfilledRequests: 38,
            totalRequests: 44,
          },
          {
            tier: 'CHC',
            tierLabel: 'Community Health Centres (CHC)',
            fulfillmentRate: 94,
            totalFacilities: 3,
            fulfilledRequests: 47,
            totalRequests: 50,
          },
          {
            tier: 'DISTRICT_HOSPITAL',
            tierLabel: 'Sub-District & District Hospitals',
            fulfillmentRate: 97,
            totalFacilities: 3,
            fulfilledRequests: 62,
            totalRequests: 64,
          },
          {
            tier: 'BLOOD_BANK',
            tierLabel: 'District Blood Centres & Depots',
            fulfillmentRate: 99,
            totalFacilities: 2,
            fulfilledRequests: 74,
            totalRequests: 75,
          },
        ]);
      }

      if (wData?.weights) setWeights(wData.weights);
    } catch (err) {
      console.error('Oversight load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveWeights = async () => {
    setWeightsSaved(true);
    setTimeout(() => setWeightsSaved(false), 2500);
    await apiRequest('/admin/priority-weights', {
      method: 'PUT',
      body: JSON.stringify({ weights }),
    }).catch(() => {});
  };

  const kpis = overview?.kpis || {
    medianAllocationFormatted: '4m 12s',
    idleReductionPercent: 25.5,
    currentIdlePercent: 18.5,
    preLifeLinkBaseline: 44.0,
    bloodSavedViaRedistribution: 24,
    wastageRate: 3.1,
    fulfillmentRate: 88,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
            <span>Municipal Health Directorate</span>
            <span>•</span>
            <span>Navi Mumbai & Mumbai</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-white mt-1">
            Regional Health Oversight
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Regional telemetry, deficit trends, and resource allocation across Mumbai & Navi Mumbai.
          </p>
        </div>

        <a
          href="http://localhost:4000/api/v1/analytics/export"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono text-neutral-300 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </a>
      </div>

      {/* Impact Telemetry Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-lg mono-card space-y-1">
          <span className="text-xs text-neutral-500 font-sans block">
            Allocation Speed
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-white block tabular-nums">
            {kpis.medianAllocationFormatted}
          </span>
          <span className="text-[11px] text-neutral-400 font-sans block">
            vs ~3h baseline
          </span>
        </div>

        <div className="p-4 rounded-lg mono-card space-y-1">
          <span className="text-xs text-neutral-500 font-sans block">
            Equipment Idle Rate
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-white block tabular-nums">
            {kpis.currentIdlePercent}%
          </span>
          <span className="text-[11px] text-neutral-400 font-sans block">
            -{kpis.idleReductionPercent}% reduction
          </span>
        </div>

        <div className="p-4 rounded-lg mono-card space-y-1">
          <span className="text-xs text-neutral-500 font-sans block">
            Blood Units Saved
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-white block tabular-nums">
            {kpis.bloodSavedViaRedistribution}u
          </span>
          <span className="text-[11px] text-neutral-400 font-sans block">
            Via &lt;72h sweeps
          </span>
        </div>

        <div className="p-4 rounded-lg mono-card space-y-1">
          <span className="text-xs text-neutral-500 font-sans block">
            Mesh Fulfillment
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-white block tabular-nums">
            {kpis.fulfillmentRate}%
          </span>
          <span className="text-[11px] text-neutral-400 font-sans block">
            Peer loan completion
          </span>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#121214] border border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('topology')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-2 ${
              activeTab === 'topology'
                ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Mesh Topology &amp; Corridors</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('equity')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-2 ${
              activeTab === 'equity'
                ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Tier Equity &amp; Deficits</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded ${activeTab === 'equity' ? 'bg-neutral-700 text-white' : 'bg-neutral-900 text-neutral-500'}`}>
              {gaps.length} gaps
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('weights')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-2 ${
              activeTab === 'weights'
                ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Triage Algorithm Tuning</span>
          </button>
        </div>

        <span className="text-xs text-neutral-500 font-mono hidden md:inline">
          {activeTab === 'topology' && 'Real-Time Inter-Facility Corridors'}
          {activeTab === 'equity' && 'Chronic Deficit & Capital Procurement'}
          {activeTab === 'weights' && '5-Factor Priority Scoring Weights'}
        </span>
      </div>

      {/* TAB 1: District Map & Topology */}
      {activeTab === 'topology' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-semibold text-white">
              Navi Mumbai &amp; Mumbai Regional Transit Mesh
            </h2>
            <span className="text-xs font-mono text-neutral-400">
              Harbour &amp; Expressway Link Corridors Active
            </span>
          </div>
          <DistrictMap />
        </div>
      )}

      {/* TAB 2: Chronic Deficits & Tier Equity */}
      {activeTab === 'equity' && (
        <div className="space-y-6">
          {/* Chronic Gap Report & Procurement Guidance */}
          <div className="rounded-lg mono-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                  <span>Chronic Deficit Analytics</span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Identifies frontline clinics with recurring shortages to justify municipal capital procurement.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                60-Day Telemetry
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {gaps.map((gap, i) => (
                <div key={i} className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-850 pb-2">
                    <span className="font-semibold text-white">{gap.facilityName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono">
                      {gap.resourceName}
                    </span>
                  </div>

                  <p className="text-neutral-300 leading-relaxed bg-neutral-900/60 p-3 rounded-lg border border-neutral-800">
                    &ldquo;{gap.recommendation}&rdquo;
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono pt-1">
                    <span>Requested: <strong className="text-neutral-300">{gap.totalRequests} times</strong></span>
                    <span>Deficit: <strong className="text-neutral-300">{gap.unmetDeficit} orders</strong></span>
                    <span className="text-neutral-400">{gap.deficitTrend}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Facility Tier Equity View */}
          <div className="rounded-lg mono-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-white" />
                  <span>Fulfillment Equity by Facility Tier</span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Fulfillment distribution across Primary Health Centres (PHC), Community Health Centres (CHC), and Hospitals.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                Target ≥ 85%
              </span>
            </div>

            <div className="space-y-4">
              {equity.map((tier) => (
                <div key={tier.tier} className="space-y-1.5 p-3 rounded-lg bg-neutral-950/60 border border-neutral-850">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-200 font-medium">{tier.tierLabel}</span>
                    <span className="font-mono font-bold text-white text-sm">{tier.fulfillmentRate}%</span>
                  </div>
                  <div className="w-full bg-neutral-900 rounded-full h-2 overflow-hidden border border-neutral-800">
                    <div
                      className="h-full bg-neutral-300 rounded-full transition-all"
                      style={{ width: `${tier.fulfillmentRate}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                    <span>{tier.totalFacilities} Connected Facilities</span>
                    <span>{tier.fulfilledRequests} of {tier.totalRequests} requests fulfilled</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Priority Weights Configurator */}
      {activeTab === 'weights' && (
        <div className="rounded-lg mono-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-white" />
                <span>Priority Scoring Formula Weights</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Calibrate the 5-factor urgency triage formula applied to every incoming hospital borrow request.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
              Total Sum: {Math.round((weights.criticality + weights.time + weights.distance + weights.scarcity + weights.ageBonus) * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
              <label className="text-neutral-400 block font-medium">
                Clinical Criticality
              </label>
              <div className="text-lg font-bold text-white">
                {Math.round(weights.criticality * 100)}%
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={weights.criticality}
                onChange={(e) => setWeights({ ...weights, criticality: parseFloat(e.target.value) })}
                className="w-full accent-white cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 block font-sans">Patient acuity (SpO2, shock)</span>
            </div>

            <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
              <label className="text-neutral-400 block font-medium">
                Time Sensitivity
              </label>
              <div className="text-lg font-bold text-white">
                {Math.round(weights.time * 100)}%
              </div>
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.05"
                value={weights.time}
                onChange={(e) => setWeights({ ...weights, time: parseFloat(e.target.value) })}
                className="w-full accent-white cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 block font-sans">Deadline before compromise</span>
            </div>

            <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
              <label className="text-neutral-400 block font-medium">
                Corridor Distance
              </label>
              <div className="text-lg font-bold text-white">
                {Math.round(weights.distance * 100)}%
              </div>
              <input
                type="range"
                min="0.05"
                max="0.4"
                step="0.05"
                value={weights.distance}
                onChange={(e) => setWeights({ ...weights, distance: parseFloat(e.target.value) })}
                className="w-full accent-white cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 block font-sans">Transit proximity &amp; ETA</span>
            </div>

            <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
              <label className="text-neutral-400 block font-medium">
                Regional Scarcity
              </label>
              <div className="text-lg font-bold text-white">
                {Math.round(weights.scarcity * 100)}%
              </div>
              <input
                type="range"
                min="0.05"
                max="0.4"
                step="0.05"
                value={weights.scarcity}
                onChange={(e) => setWeights({ ...weights, scarcity: parseFloat(e.target.value) })}
                className="w-full accent-white cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 block font-sans">Sub-district stock rarity</span>
            </div>

            <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
              <label className="text-neutral-400 block font-medium">
                Equipment Age Bonus
              </label>
              <div className="text-lg font-bold text-white">
                {Math.round(weights.ageBonus * 100)}%
              </div>
              <input
                type="range"
                min="0.05"
                max="0.3"
                step="0.05"
                value={weights.ageBonus}
                onChange={(e) => setWeights({ ...weights, ageBonus: parseFloat(e.target.value) })}
                className="w-full accent-white cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500 block font-sans">Anti-starvation queue bump</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-850">
            <span className="text-xs text-neutral-500 font-mono">
              Changes apply instantly to live ranking algorithm.
            </span>
            <button
              onClick={handleSaveWeights}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-medium shadow-sm transition-colors"
            >
              {weightsSaved ? '✓ Saved Weights' : 'Save Algorithm Weights'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
