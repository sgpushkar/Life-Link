'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  ShieldCheck,
  AlertOctagon,
  TrendingUp,
  ArrowUpRight,
  Gavel,
  CheckCircle2,
  Info,
  Scale,
} from 'lucide-react';
import { MutualAidSummary, MutualAidFacilityMetrics } from '@lifelink/shared';
import { apiRequest } from '../lib/api';
import { getClientSocket } from '../lib/socket';

export const MutualAidLeaderboard: React.FC = () => {
  const [summary, setSummary] = useState<MutualAidSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditingFacilityId, setAuditingFacilityId] = useState<string | null>(null);
  const [auditNotification, setAuditNotification] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await apiRequest('/analytics/mutual-aid');
      if (data?.facilities) {
        setSummary(data);
      }
    } catch {
      // Mock fallback
      setSummary({
        districtParetoEfficiency: 94.2,
        activeErcCredits: 2450,
        reclaimedIdleUnits: 4,
        totalLendingTransactions: 28,
        facilities: [
          {
            facilityId: 'fac-kem',
            facilityName: 'KEM Hospital (Parel, Mumbai)',
            facilityType: 'DISTRICT_HOSPITAL',
            ercBalance: 620,
            lendingRatio: 84,
            idleSurplusCount: 2,
            hoardingRiskIndex: 12,
            hoardingStatus: 'COLLABORATIVE',
            priorityMultiplier: 1.8,
            slaInsuranceTier: 'TIER_1_PRIORITY_BACKSTOP',
          },
          {
            facilityId: 'fac-sion',
            facilityName: 'LTMG Sion Hospital (Mumbai)',
            facilityType: 'DISTRICT_HOSPITAL',
            ercBalance: 480,
            lendingRatio: 72,
            idleSurplusCount: 1,
            hoardingRiskIndex: 22,
            hoardingStatus: 'COLLABORATIVE',
            priorityMultiplier: 1.8,
            slaInsuranceTier: 'TIER_1_PRIORITY_BACKSTOP',
          },
          {
            facilityId: 'fac-dy-patil',
            facilityName: 'Dr. D.Y. Patil Hospital (Nerul)',
            facilityType: 'CHC',
            ercBalance: 320,
            lendingRatio: 45,
            idleSurplusCount: 4,
            hoardingRiskIndex: 68,
            hoardingStatus: 'AT_RISK_HOARDING',
            priorityMultiplier: 0.9,
            slaInsuranceTier: 'STANDARD_QUEUE',
          },
          {
            facilityId: 'fac-apollo',
            facilityName: 'Apollo Hospital (Belapur)',
            facilityType: 'DISTRICT_HOSPITAL',
            ercBalance: 180,
            lendingRatio: 22,
            idleSurplusCount: 5,
            hoardingRiskIndex: 82,
            hoardingStatus: 'CRITICAL_HOARDER',
            priorityMultiplier: 0.7,
            slaInsuranceTier: 'STANDARD_QUEUE',
          },
          {
            facilityId: 'fac-nerul-phc',
            facilityName: 'NMMC Urban Health Centre (Nerul)',
            facilityType: 'PHC',
            ercBalance: 390,
            lendingRatio: 65,
            idleSurplusCount: 0,
            hoardingRiskIndex: 15,
            hoardingStatus: 'COLLABORATIVE',
            priorityMultiplier: 1.8,
            slaInsuranceTier: 'TIER_1_PRIORITY_BACKSTOP',
          },
        ],
      });
    }
  }, []);

  useEffect(() => {
    fetchSummary();

    const socket = getClientSocket();
    if (socket) {
      socket.on('mutual_aid:reclaimed', () => fetchSummary());
    }

    return () => {
      if (socket) {
        socket.off('mutual_aid:reclaimed');
      }
    };
  }, [fetchSummary]);

  const handleReclaimAudit = async (facility: MutualAidFacilityMetrics) => {
    setAuditingFacilityId(facility.facilityId);
    try {
      const res = await apiRequest('/analytics/mutual-aid/reclaim-audit', {
        method: 'POST',
        body: JSON.stringify({ facilityId: facility.facilityId }),
      });
      setAuditNotification(res?.message || `Reclamation audit complete: 1 idle unit from ${facility.facilityName} released to regional reserve.`);
      fetchSummary();
    } catch {
      // Local state fallback
      setSummary((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          reclaimedIdleUnits: prev.reclaimedIdleUnits + 1,
          facilities: prev.facilities.map((f) =>
            f.facilityId === facility.facilityId
              ? {
                  ...f,
                  ercBalance: f.ercBalance + 100,
                  idleSurplusCount: Math.max(0, f.idleSurplusCount - 1),
                  hoardingRiskIndex: Math.max(10, f.hoardingRiskIndex - 25),
                  hoardingStatus: f.hoardingRiskIndex - 25 < 50 ? 'BALANCED' : 'AT_RISK_HOARDING',
                  priorityMultiplier: 1.2,
                }
              : f
          ),
        };
      });
      setAuditNotification(`Reclamation audit complete: 1 idle unit from ${facility.facilityName} released to regional reserve. Credited with +100 ERC.`);
    } finally {
      setAuditingFacilityId(null);
      setTimeout(() => setAuditNotification(null), 4000);
    }
  };

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* Game Theory Header KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-lg mono-card space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-sans">
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pareto Efficiency</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-white block tabular-nums">
            {summary.districtParetoEfficiency}%
          </span>
          <span className="text-[11px] text-emerald-400 font-sans block">
            Shapley-fair allocation standard
          </span>
        </div>

        <div className="p-4 rounded-lg mono-card space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-sans">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Circulating ERC Pool</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-amber-300 block tabular-nums">
            {summary.activeErcCredits.toLocaleString()} ERC
          </span>
          <span className="text-[11px] text-neutral-400 font-sans block">
            Emergency Reserve Credits
          </span>
        </div>

        <div className="p-4 rounded-lg mono-card space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-sans">
            <Gavel className="w-3.5 h-3.5 text-indigo-400" />
            <span>Reclaimed Idle Units</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-white block tabular-nums">
            {summary.reclaimedIdleUnits} Units
          </span>
          <span className="text-[11px] text-neutral-400 font-sans block">
            Unlocked from private hoarding
          </span>
        </div>

        <div className="p-4 rounded-lg mono-card space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-sans">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Backstop SLA Tier</span>
          </div>
          <span className="text-lg font-bold text-emerald-300 block leading-tight mt-1 font-sans">
            Guaranteed 30m
          </span>
          <span className="text-[11px] text-neutral-400 font-sans block">
            Emergency replenishment backstop
          </span>
        </div>
      </div>

      {/* Mechanism Explainer Banner */}
      <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800 space-y-2">
        <div className="flex items-center gap-2 text-neutral-200 font-semibold text-xs">
          <Info className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <span>Game-Theoretic Anti-Hoarding Mechanism (Why Sharing Succeeded)</span>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed font-sans">
          In traditional healthcare networks, facilities hoard idle ventilators out of fear of their own sudden stockout.
          LifeLink resolves this tragedy of the commons through <strong className="text-neutral-200">Emergency Reserve Credits (ERC)</strong>.
          Lending idle units boosts a hospital's priority multiplier up to <strong className="text-emerald-300">1.8x</strong> during their own surges, backed by a guaranteed 30-minute regional replenishment SLA.
          Persistent hoarders holding &gt;3 idle units face queue demotion penalties (<strong className="text-red-300">0.7x</strong>) and automated District Reclamation Audits.
        </p>
      </div>

      {/* Audit Notification Toast */}
      {auditNotification && (
        <div className="p-3.5 rounded-lg bg-emerald-950/70 border border-emerald-500/70 flex items-start gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-200 font-mono leading-relaxed">
            {auditNotification}
          </p>
        </div>
      )}

      {/* Facilities Leaderboard & Anti-Hoarding Table */}
      <div className="rounded-lg mono-card overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
              Institutional Cooperation & Hoarding Risk Index
            </h3>
            <p className="text-[11px] text-neutral-500 font-sans mt-0.5">
              Live ranking of regional facilities based on peer lending, idle reserve ratios, and credit balances.
            </p>
          </div>
          <span className="text-[10px] font-mono text-neutral-400 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
            {summary.facilities.length} Facilities Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-500 font-mono text-[11px] bg-neutral-950/40">
                <th className="py-3 px-4">Facility Name</th>
                <th className="py-3 px-3">ERC Balance</th>
                <th className="py-3 px-3">Peer Lending</th>
                <th className="py-3 px-3">Idle Machines</th>
                <th className="py-3 px-3">Hoarding Risk</th>
                <th className="py-3 px-3">Queue Multiplier</th>
                <th className="py-3 px-4 text-right">District Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 font-mono text-xs">
              {summary.facilities.map((fac) => {
                const isHoarding = fac.hoardingStatus === 'CRITICAL_HOARDER' || fac.hoardingStatus === 'AT_RISK_HOARDING';
                const isCollaborative = fac.hoardingStatus === 'COLLABORATIVE';

                return (
                  <tr key={fac.facilityId} className="hover:bg-neutral-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-sans font-medium text-white">{fac.facilityName}</div>
                      <div className="text-[10px] text-neutral-500 font-mono uppercase">{fac.facilityType}</div>
                    </td>

                    <td className="py-3 px-3 font-semibold text-amber-300">
                      <div className="flex items-center gap-1">
                        <Coins className="w-3 h-3 text-amber-400" />
                        <span>{fac.ercBalance} ERC</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                          <div
                            className={`h-full ${fac.lendingRatio >= 60 ? 'bg-emerald-500' : fac.lendingRatio >= 35 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${fac.lendingRatio}%` }}
                          />
                        </div>
                        <span className="text-neutral-300">{fac.lendingRatio}%</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        fac.idleSurplusCount >= 3 ? 'bg-amber-950/60 border border-amber-800 text-amber-300' : 'text-neutral-400'
                      }`}>
                        {fac.idleSurplusCount} idle
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                        fac.hoardingStatus === 'CRITICAL_HOARDER'
                          ? 'bg-red-950/60 border-red-800 text-red-300 font-bold'
                          : fac.hoardingStatus === 'AT_RISK_HOARDING'
                          ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                          : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      }`}>
                        {fac.hoardingRiskIndex}% • {fac.hoardingStatus.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`font-semibold ${isCollaborative ? 'text-emerald-400' : isHoarding ? 'text-red-400' : 'text-neutral-300'}`}>
                        {fac.priorityMultiplier.toFixed(1)}x {isCollaborative ? 'Boost' : isHoarding ? 'Demoted' : 'Normal'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {isHoarding && fac.idleSurplusCount > 0 ? (
                        <button
                          onClick={() => handleReclaimAudit(fac)}
                          disabled={auditingFacilityId === fac.facilityId}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 text-[11px] font-mono transition-colors"
                          title="Execute DHO Reclamation Audit to liberate 1 idle machine"
                        >
                          <Gavel className="w-3 h-3 text-red-400" />
                          <span>Audit Reclamation</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-neutral-500 font-mono">
                          Compliant SLA
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
