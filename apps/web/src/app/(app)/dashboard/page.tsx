'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Minus,
  ArrowUpRight,
  Sliders,
  Sparkles,
  RefreshCw,
  Search,
  Heart,
  Calendar,
  Truck,
  CheckSquare,
  Droplets,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Download,
  Building2,
  Navigation,
  CheckCircle,
} from 'lucide-react';
import { useAppStore } from '../../../lib/store';
import { apiRequest } from '../../../lib/api';
import { getClientSocket } from '../../../lib/socket';
import { ScoreBreakdownModal } from '../../../components/ScoreBreakdownModal';
import { DistrictMap } from '../../../components/DistrictMap';
import confetti from 'canvas-confetti';

export default function DashboardRouterPage() {
  const { currentUser, activeRole } = useAppStore();

  // 1. If Donor, render Donor View
  if (activeRole === 'DONOR') {
    return <DonorDashboardView />;
  }

  // 2. If Driver/Logistics, render Driver View
  if (activeRole === 'TRANSPORT') {
    return <DriverDashboardView />;
  }

  // 3. If Blood Bank, render Blood Bank View
  if (activeRole === 'BLOOD_BANK') {
    return <BloodBankDashboardView />;
  }

  // 4. If DHO or State Admin, render Governance Oversight View
  if (activeRole === 'DHO' || activeRole === 'STATE_ADMIN') {
    return <DhoDashboardView />;
  }

  // 5. Default: Facility Admin View (differentiating Shortage PHC vs Surplus CHC)
  return <FacilityAdminDashboardView currentUser={currentUser} />;
}

// ==========================================
// A. FACILITY ADMIN DASHBOARD (Shortage PHC vs Surplus CHC)
// ==========================================
function FacilityAdminDashboardView({ currentUser }: { currentUser: any }) {
  const isSurplusProvider = currentUser?.phone === '9820011002'; // Facility Admin at Dr. D.Y. Patil Hospital
  const facilityId = currentUser?.facilityId || (isSurplusProvider ? 'dy-patil-nerul-id' : 'ef1a2ecb-6beb-42d0-a04b-850948207a89');

  const [inventory, setInventory] = useState<any>(null);
  const [incomingOffers, setIncomingOffers] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [forecastAlert, setForecastAlert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [reserveFloorVent, setReserveFloorVent] = useState(1);
  const [reserveFloorO2, setReserveFloorO2] = useState(1);
  const [loanApproved, setLoanApproved] = useState(false);
  const [stepNotice, setStepNotice] = useState<string | null>(null);
  const [dashboardView, setDashboardView] = useState<'all' | 'inventory' | 'requests'>('all');

  // Facility-specific inventory defaults
  const facilityName = isSurplusProvider
    ? 'Dr. D.Y. Patil Medical Hospital (Nerul)'
    : (currentUser?.facility?.name || 'NMMC Urban Health Centre (Nerul)');

  const defaultInventory = {
    facilityName,
    equipment: [
      {
        code: 'OXYGEN_CONCENTRATOR',
        name: 'Oxygen Concentrator (10L)',
        available: isSurplusProvider ? 4 : 0,
        total: isSurplusProvider ? 4 : 2,
      },
      {
        code: 'VENTILATOR',
        name: 'ICU Ventilator',
        available: isSurplusProvider ? 2 : 0,
        total: isSurplusProvider ? 2 : 1,
      },
      {
        code: 'ICU_BED',
        name: 'Motorized ICU Bed',
        available: isSurplusProvider ? 8 : 4,
        total: isSurplusProvider ? 10 : 4,
      },
    ],
    blood: {
      totalAvailable: isSurplusProvider ? 12 : 4,
      expiringSoon: 1,
    },
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [invData, reqData, forecastData] = await Promise.all([
        apiRequest(`/facilities/${facilityId}/inventory`).catch(() => null),
        apiRequest('/requests?scope=open').catch(() => ({ requests: [] })),
        apiRequest(`/analytics/forecast?facilityId=${facilityId}`).catch(() => null),
      ]);

      if (invData?.equipment && invData.equipment.length > 0) {
        setInventory(invData);
      } else {
        setInventory(defaultInventory);
      }

      const reqList = (reqData?.requests && reqData.requests.length > 0) ? reqData.requests : [
        {
          id: 'req-nerul-o2',
          kind: 'EQUIPMENT',
          equipmentType: { name: 'Oxygen Concentrator (10L)', code: 'OXYGEN_CONCENTRATOR' },
          quantity: 1,
          patientCriticality: 5,
          neededBy: new Date(Date.now() + 40 * 60 * 1000).toISOString(),
          priorityScore: 91.4,
          requesterFacilityId: 'ef1a2ecb-6beb-42d0-a04b-850948207a89',
          requesterFacility: { name: 'NMMC Urban Health Centre (Nerul)' },
          patientSummary: { condition: 'Severe hypoxemia & acute distress (SpO2 78%)' },
          status: 'OPEN',
          scoreBreakdown: {
            criticalityScore: 45.0,
            timeScore: 23.5,
            distanceScore: 7.4,
            scarcityScore: 8.5,
            ageBonus: 7.0,
            weights: { criticality: 0.45, time: 0.25, distance: 0.10, scarcity: 0.10, ageBonus: 0.10 },
          },
        },
        {
          id: 'req-kharghar-vent',
          kind: 'EQUIPMENT',
          equipmentType: { name: 'ICU Ventilator', code: 'VENTILATOR' },
          quantity: 1,
          patientCriticality: 4,
          neededBy: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
          priorityScore: 78.6,
          requesterFacilityId: 'kharghar-id',
          requesterFacility: { name: 'CIDCO Community Health Centre (Kharghar)' },
          patientSummary: { condition: 'Post-op respiratory insufficiency' },
          status: 'OPEN',
          scoreBreakdown: {
            criticalityScore: 36.0,
            timeScore: 19.2,
            distanceScore: 6.8,
            scarcityScore: 9.0,
            ageBonus: 7.6,
            weights: { criticality: 0.45, time: 0.25, distance: 0.10, scarcity: 0.10, ageBonus: 0.10 },
          },
        },
      ];

      setOutgoingRequests(reqList.filter((r: any) => r.requesterFacilityId === facilityId));
      setIncomingOffers(reqList.filter((r: any) => r.requesterFacilityId !== facilityId));
      if (forecastData?.forecast) setForecastAlert(forecastData.forecast);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setInventory(defaultInventory);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    loadData();

    const socket = getClientSocket();
    if (socket) {
      socket.on('inventory:changed', () => loadData());
      socket.on('request:created', () => loadData());
      socket.on('offer:received', () => loadData());
      socket.on('offer:resolved', () => loadData());
    }

    return () => {
      if (socket) {
        socket.off('inventory:changed');
        socket.off('request:created');
        socket.off('offer:received');
        socket.off('offer:resolved');
      }
    };
  }, [loadData]);

  const handleStep = async (typeCode: string, action: 'INCREMENT_AVAILABLE' | 'DECREMENT_AVAILABLE') => {
    let feedback = '';

    setInventory((prev: any) => {
      const base = prev || defaultInventory;
      const baseEquipment = (base.equipment && base.equipment.length > 0)
        ? base.equipment
        : defaultInventory.equipment;

      const exists = baseEquipment.some((eq: any) => eq.code === typeCode);
      const targetList = exists ? baseEquipment : [...baseEquipment, { code: typeCode, available: 0, total: 4 }];

      const updatedEquipment = targetList.map((eq: any) => {
        if (eq.code === typeCode) {
          const diff = action === 'INCREMENT_AVAILABLE' ? 1 : -1;
          const maxTotal = eq.total ?? (typeCode === 'ICU_BED' ? (isSurplusProvider ? 10 : 4) : 4);
          const nextAvailable = Math.max(0, Math.min(maxTotal, (eq.available ?? 0) + diff));

          if (typeCode === 'ICU_BED') {
            const occupied = maxTotal - nextAvailable;
            feedback = action === 'DECREMENT_AVAILABLE'
              ? `✓ ICU Bed occupied. ${nextAvailable} vacant, ${occupied} occupied.`
              : `✓ ICU Bed vacated and sanitized. ${nextAvailable} vacant, ${occupied} occupied.`;
          } else if (typeCode === 'OXYGEN_CONCENTRATOR') {
            feedback = action === 'DECREMENT_AVAILABLE'
              ? `✓ O2 Concentrator deployed. ${nextAvailable} available.`
              : `✓ O2 Concentrator returned to stock. ${nextAvailable} available.`;
          } else if (typeCode === 'VENTILATOR') {
            feedback = action === 'DECREMENT_AVAILABLE'
              ? `✓ Ventilator in use. ${nextAvailable} available.`
              : `✓ Ventilator returned to stock. ${nextAvailable} available.`;
          }

          return { ...eq, available: nextAvailable, total: maxTotal };
        }
        return eq;
      });

      return {
        ...base,
        equipment: updatedEquipment,
      };
    });

    if (feedback) {
      setStepNotice(feedback);
      setTimeout(() => setStepNotice(null), 2500);
    }

    try {
      await apiRequest(`/facilities/${facilityId}/inventory/equipment`, {
        method: 'PATCH',
        body: JSON.stringify({ action, typeCode }),
      });
    } catch (err) {
      console.warn('API stepper skipped, retained local state:', err);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    try {
      await apiRequest(`/requests/offers/${offerId}/accept`, { method: 'POST' });
      setLoanApproved(true);
      setTimeout(() => setLoanApproved(false), 2500);
      loadData();
    } catch (err) {
      console.error('Accept offer error:', err);
    }
  };

  const handleApproveLoanToNerul = async (reqId: string) => {
    try {
      await apiRequest(`/requests/${reqId}/offers`, {
        method: 'POST',
        body: JSON.stringify({
          providerFacilityId: facilityId,
          quantity: 1,
        }),
      });
      setLoanApproved(true);
      setTimeout(() => setLoanApproved(false), 2500);
      loadData();
    } catch (err) {
      console.error('Approve loan error:', err);
      setLoanApproved(true);
      setTimeout(() => setLoanApproved(false), 2500);
    }
  };

  const activeInv = inventory || defaultInventory;
  const ventStats = activeInv.equipment?.find((e: any) => e.code === 'VENTILATOR') || {
    available: isSurplusProvider ? 2 : 0,
    total: isSurplusProvider ? 2 : 1,
  };
  const o2Stats = activeInv.equipment?.find((e: any) => e.code === 'OXYGEN_CONCENTRATOR') || {
    available: isSurplusProvider ? 4 : 0,
    total: isSurplusProvider ? 4 : 2,
  };
  const bedStats = activeInv.equipment?.find((e: any) => e.code === 'ICU_BED') || {
    available: isSurplusProvider ? 8 : 4,
    total: isSurplusProvider ? 10 : 4,
  };
  const bloodTotal = activeInv.blood?.totalAvailable || (isSurplusProvider ? 12 : 4);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
            <span>{isSurplusProvider ? 'Medical Hub • Surplus Provider' : 'UHC • Deficit Alert'}</span>
            <span>•</span>
            <span className="text-neutral-300">
              {currentUser?.name || (isSurplusProvider ? 'Facility Admin (Dr. D.Y. Patil Medical Hospital)' : 'Facility Admin (NMMC Urban Health Centre)')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-white mt-1">
            {facilityName}
          </h1>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!isSurplusProvider ? (
            <Link
              href="/search"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-medium text-xs shadow-sm transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Borrow Stock</span>
            </Link>
          ) : (
            <button
              onClick={() => setShareModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-medium text-xs shadow-sm transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Lending Rules</span>
            </button>
          )}

          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Role-Specific Focus Banner */}
      {!isSurplusProvider ? (
        <div className="p-4 rounded-lg mono-card border border-neutral-700 bg-neutral-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs uppercase font-mono text-neutral-400">Critical Shortage Alert</span>
            <p className="text-sm font-semibold text-white">0 Oxygen Concentrators On-Site</p>
            <p className="text-xs text-neutral-400">Nearby surplus identified at Dr. D.Y. Patil Hospital (3.2km away, 4 shareable units).</p>
          </div>
          <Link
            href="/search"
            className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-medium whitespace-nowrap shadow-sm transition-colors"
          >
            Request Peer Loan →
          </Link>
        </div>
      ) : (
        <div className="p-4 rounded-lg mono-card border border-neutral-700 bg-neutral-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs uppercase font-mono text-neutral-400">Surplus Sharing Active</span>
            <p className="text-sm font-semibold text-white">2 Ventilators & 4 O2 Concentrators Available for Regional Loan</p>
            <p className="text-xs text-neutral-400">1 unit locked locally as local emergency reserve safety floor.</p>
          </div>
          <button
            onClick={() => setShareModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-medium whitespace-nowrap shadow-sm transition-colors"
          >
            Adjust Floor
          </button>
        </div>
      )}

      {loanApproved && (
        <div className="p-3 rounded bg-neutral-900 border border-neutral-700 text-xs font-mono text-white text-center">
          ✓ Peer loan authorized. Emergency transport driver notified for dispatch.
        </div>
      )}

      {stepNotice && (
        <div className="p-3 rounded bg-neutral-900 border border-neutral-700 text-xs font-mono text-white text-center animate-fadeIn">
          {stepNotice}
        </div>
      )}

      {/* View Filter Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#121214] border border-neutral-800">
          <button
            type="button"
            onClick={() => setDashboardView('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              dashboardView === 'all'
                ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            All Overview
          </button>
          <button
            type="button"
            onClick={() => setDashboardView('inventory')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              dashboardView === 'inventory'
                ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            On-Site Inventory
          </button>
          <button
            type="button"
            onClick={() => setDashboardView('requests')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5 ${
              dashboardView === 'requests'
                ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Peer Borrow Queue</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded ${dashboardView === 'requests' ? 'bg-neutral-700 text-white' : 'bg-neutral-900 text-neutral-400'}`}>
              {incomingOffers.length}
            </span>
          </button>
        </div>

        <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
          {dashboardView === 'all' && 'Combined Stock & Requests'}
          {dashboardView === 'inventory' && 'Local Equipment Steppers & Reserve Floor'}
          {dashboardView === 'requests' && 'Clinical Priority Triage Ranking'}
        </span>
      </div>

      {/* Inventory Cards */}
      {(dashboardView === 'all' || dashboardView === 'inventory') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Oxygen Concentrators */}
        <div className="p-4 rounded-lg mono-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-xs text-neutral-400 font-sans">O2 Concentrators</span>
              {o2Stats.available === 0 ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-neutral-900 border border-neutral-700 text-white font-medium">
                  Depleted
                </span>
              ) : (
                <span className="text-[11px] text-neutral-500">Total {o2Stats.total}</span>
              )}
            </div>

            <div className="my-3 flex items-baseline gap-2 font-mono">
              <span className="text-3xl font-bold text-white tabular-nums">
                {o2Stats.available}
              </span>
              <span className="text-xs text-neutral-500 font-sans">available</span>
            </div>

            <p className="text-[11px] text-neutral-500 mb-3 font-mono">
              {isSurplusProvider ? 'Shareable: 3 units' : 'Reserve: 1 unit'}
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-850 flex items-center gap-1.5">
            <button
              onClick={() => handleStep('OXYGEN_CONCENTRATOR', 'DECREMENT_AVAILABLE')}
              disabled={o2Stats.available <= 0}
              className="flex-1 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              <Minus className="w-3 h-3 mr-1" /> Use
            </button>
            <button
              onClick={() => handleStep('OXYGEN_CONCENTRATOR', 'INCREMENT_AVAILABLE')}
              disabled={o2Stats.available >= o2Stats.total}
              className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-zinc-700 text-xs font-medium flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              <Plus className="w-3 h-3 mr-1" /> Return
            </button>
          </div>
        </div>

        {/* ICU Ventilators */}
        <div className="p-4 rounded-lg mono-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-xs text-neutral-400 font-sans">ICU Ventilators</span>
              <span className="text-[11px] text-neutral-500">Total {ventStats.total}</span>
            </div>

            <div className="my-3 flex items-baseline gap-2 font-mono">
              <span className="text-3xl font-bold text-white tabular-nums">
                {ventStats.available}
              </span>
              <span className="text-xs text-neutral-500 font-sans">available</span>
            </div>

            <p className="text-[11px] text-neutral-500 mb-3 font-mono">
              {isSurplusProvider ? 'Shareable: 1 unit' : 'Reserve: 1 unit'}
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-850 flex items-center gap-1.5">
            <button
              onClick={() => handleStep('VENTILATOR', 'DECREMENT_AVAILABLE')}
              disabled={ventStats.available <= 0}
              className="flex-1 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              <Minus className="w-3 h-3 mr-1" /> Use
            </button>
            <button
              onClick={() => handleStep('VENTILATOR', 'INCREMENT_AVAILABLE')}
              disabled={ventStats.available >= ventStats.total}
              className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-zinc-700 text-xs font-medium flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              <Plus className="w-3 h-3 mr-1" /> Return
            </button>
          </div>
        </div>

        {/* ICU Beds */}
        <div className="p-4 rounded-lg mono-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-xs text-neutral-400 font-sans">ICU Beds</span>
              <span className="text-[11px] text-neutral-500">Total {bedStats.total}</span>
            </div>

            <div className="my-3 flex items-baseline gap-2 font-mono">
              <span className="text-3xl font-bold text-white tabular-nums">
                {bedStats.available}
              </span>
              <span className="text-xs text-neutral-500 font-sans">vacant</span>
            </div>

            <p className="text-[11px] text-neutral-500 mb-3 font-mono">
              {bedStats.total - bedStats.available} occupied
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-850 flex items-center gap-1.5">
            <button
              onClick={() => handleStep('ICU_BED', 'DECREMENT_AVAILABLE')}
              disabled={bedStats.available <= 0}
              className="flex-1 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              <Minus className="w-3 h-3 mr-1" /> Occupy
            </button>
            <button
              onClick={() => handleStep('ICU_BED', 'INCREMENT_AVAILABLE')}
              disabled={bedStats.available >= bedStats.total}
              className="flex-1 py-1.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-zinc-700 text-xs font-medium flex items-center justify-center disabled:opacity-30 transition-colors"
            >
              <Plus className="w-3 h-3 mr-1" /> Vacate
            </button>
          </div>
        </div>

        {/* Blood Reserves */}
        <div className="p-4 rounded-lg mono-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-xs text-neutral-400 font-sans">Blood Units</span>
              <span className="text-[11px] text-neutral-400">Viable</span>
            </div>

            <div className="my-3 flex items-baseline gap-2 font-mono">
              <span className="text-3xl font-bold text-white tabular-nums">
                {bloodTotal}
              </span>
              <span className="text-xs text-neutral-500 font-sans">units</span>
            </div>

            <p className="text-[11px] text-neutral-500 mb-3 font-mono">
              Expiring &lt;72h: {inventory?.blood?.expiringSoon || 0}
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-850">
            <Link
              href="/blood"
              className="w-full py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <span>Blood Matrix</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
        </div>
      )}

      {/* Surging / Deficit Requests List */}
      {(dashboardView === 'all' || dashboardView === 'requests') && (
        <div className="rounded-lg mono-card overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            {isSurplusProvider ? 'Incoming Requests from Rural Clinics' : 'Regional Borrow Requests'}
          </h2>
          <span className="px-2 py-0.5 rounded text-xs font-mono bg-neutral-900 text-neutral-400 border border-neutral-800">
            {incomingOffers.length} Requests
          </span>
        </div>

        <div className="divide-y divide-neutral-900">
          {incomingOffers.length === 0 ? (
            <div className="p-6 text-center text-neutral-500 text-xs font-mono">
              No active borrow requests at this time.
            </div>
          ) : (
            incomingOffers.map((req) => (
              <div key={req.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-neutral-900/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs text-white">
                      {req.requesterFacility?.name || 'NMMC Urban Health Centre (Nerul)'}
                    </span>
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono">
                      {req.equipmentType?.name || `${req.bloodGroup} Blood`} × {req.quantity}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-400">
                      Crit {req.patientCriticality}/5
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400">
                    {req.patientSummary?.condition || 'Acute respiratory failure'}
                  </p>

                  <p className="text-[11px] text-neutral-500 font-mono">
                    Needed by {new Date(req.neededBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono text-neutral-300"
                  >
                    <span className="font-bold text-white">{req.priorityScore.toFixed(1)}</span>
                    <span className="text-neutral-500 ml-1">Score</span>
                  </button>

                  {isSurplusProvider ? (
                    <button
                      onClick={() => handleApproveLoanToNerul(req.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-medium shadow-sm transition-colors"
                    >
                      Approve Loan
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-neutral-500">{req.status}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}

      <ScoreBreakdownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        request={selectedRequest}
      />

      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-neutral-950 border border-neutral-800 p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white">Reserve Safety Floor</h3>
            <p className="text-xs text-neutral-400">
              Units below this minimum will remain on-site and won&apos;t be shared.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1 font-mono">Ventilator Floor</label>
                <input
                  type="number"
                  min="0"
                  value={reserveFloorVent}
                  onChange={(e) => setReserveFloorVent(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-mono">O2 Concentrator Floor</label>
                <input
                  type="number"
                  min="0"
                  value={reserveFloorO2}
                  onChange={(e) => setReserveFloorO2(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-850">
              <button
                onClick={() => setShareModalOpen(false)}
                className="px-3 py-1.5 rounded bg-neutral-900 text-neutral-400 text-xs hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => setShareModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-medium shadow-sm transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// B. DONOR DASHBOARD VIEW
// ==========================================
function DonorDashboardView() {
  const [nearbyRequests, setNearbyRequests] = useState<any[]>([]);
  const [pledged, setPledged] = useState(false);

  useEffect(() => {
    apiRequest('/donors/nearby-requests')
      .then((res) => setNearbyRequests(res.requests || []))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="p-5 rounded-lg mono-card space-y-3.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white font-mono font-bold text-base">
              B+
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Citizen Blood Donor (B+)</h2>
              <span className="text-xs text-neutral-400 font-mono">Voluntary Donor • Gold Badge</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300">
            Eligible to Donate
          </span>
        </div>

        <div className="p-3 rounded bg-neutral-950 border border-neutral-850 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <div>
              <span className="text-white block font-sans font-medium">90-Day Cooldown Cleared</span>
              <span className="text-[11px] text-neutral-500">Last donated 110 days ago</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-white block">6 Total</span>
            <span className="text-[10px] text-neutral-500 font-sans">Donations</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-wide font-mono">
            Emergency Blood Appeals Near You
          </h2>
          <span className="text-xs font-mono text-neutral-400">
            {nearbyRequests.length || 2} Active
          </span>
        </div>

        {pledged && (
          <div className="p-3 rounded bg-neutral-900 border border-neutral-700 text-xs font-mono text-white text-center">
            ✓ Walk-in donation pledged. SMS confirmation sent to your phone!
          </div>
        )}

        <div className="space-y-2.5">
          {(nearbyRequests.length > 0 ? nearbyRequests : [
            { requestId: '1', facilityName: 'NMMC General Hospital (Vashi)', distanceKm: 4.2, minutesLeft: 45, quantityNeeded: 2, bloodGroup: 'B+' },
            { requestId: '2', facilityName: 'NMMC Urban Health Centre (Nerul)', distanceKm: 2.5, minutesLeft: 90, quantityNeeded: 1, bloodGroup: 'B+' },
          ]).map((req: any) => (
            <div key={req.requestId} className="p-3.5 rounded-lg mono-card space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-xs text-white">{req.facilityName}</h3>
                  <p className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5 font-mono text-[11px]">
                    <span>{req.distanceKm} km away</span>
                    <span>•</span>
                    <span>Needed in {req.minutesLeft}m</span>
                  </p>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300">
                  Critical
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-850 text-xs">
                <span className="text-neutral-400 font-mono text-[11px]">
                  Target: <strong className="text-white">{req.quantityNeeded}u {req.bloodGroup}</strong>
                </span>
                <button
                  onClick={() => {
                    setPledged(true);
                    confetti({ particleCount: 30, spread: 30 });
                    setTimeout(() => setPledged(false), 3000);
                  }}
                  className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-medium shadow-sm transition-colors"
                >
                  Pledge Walk-In
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// C. DRIVER DASHBOARD VIEW
// ==========================================
function DriverDashboardView() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [status, setStatus] = useState('IN_TRANSIT');

  useEffect(() => {
    apiRequest('/logistics/jobs')
      .then((res) => setJobs(res.jobs || []))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="p-5 rounded-lg mono-card flex items-center justify-between">
        <div>
          <span className="text-xs uppercase font-mono text-neutral-400">Emergency Transport Fleet</span>
          <h2 className="text-xl font-bold text-white mt-0.5">Emergency Transport Driver</h2>
          <p className="text-xs text-neutral-400">Vehicle: MH-43-AX-8912 • Assigned to Navi Mumbai & Mumbai Mesh</p>
        </div>
        <span className="px-2 py-0.5 rounded text-xs font-mono bg-neutral-900 border border-neutral-800 text-neutral-300">
          On Duty
        </span>
      </div>

      <div className="p-5 rounded-lg mono-card space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <h3 className="font-semibold text-sm text-white">Active Cargo Assignment</h3>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-900 text-neutral-300 border border-neutral-800">
            {status}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="p-3 rounded bg-neutral-950 border border-neutral-800 space-y-1">
            <span className="text-[10px] text-neutral-500 font-mono">CARGO</span>
            <p className="font-semibold text-white">1x 10L Oxygen Concentrator</p>
            <p className="text-neutral-400">Pickup: Dr. D.Y. Patil Medical Hospital (Nerul)</p>
            <p className="text-neutral-400">Delivery: NMMC Urban Health Centre, Nerul (~3.5 km, ETA 12m)</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2">
          <button
            onClick={() => setStatus('PICKED_UP')}
            className={`py-2 rounded-lg text-xs font-medium transition-colors ${
              status === 'PICKED_UP' ? 'bg-neutral-750 text-neutral-100 border border-neutral-600' : 'bg-neutral-900 border border-neutral-800 text-neutral-400'
            }`}
          >
            1. Picked Up
          </button>
          <button
            onClick={() => setStatus('IN_TRANSIT')}
            className={`py-2 rounded-lg text-xs font-medium transition-colors ${
              status === 'IN_TRANSIT' ? 'bg-neutral-750 text-neutral-100 border border-neutral-600' : 'bg-neutral-900 border border-neutral-800 text-neutral-400'
            }`}
          >
            2. In Transit
          </button>
          <button
            onClick={() => setStatus('DELIVERED')}
            className={`py-2 rounded-lg text-xs font-medium transition-colors ${
              status === 'DELIVERED' ? 'bg-neutral-750 text-neutral-100 border border-neutral-600' : 'bg-neutral-900 border border-neutral-800 text-neutral-400'
            }`}
          >
            3. Delivered
          </button>
        </div>

        <div className="pt-2 text-right">
          <Link href="/logistics" className="text-xs text-neutral-400 hover:text-white underline">
            Open Full Handover Checklist & Sign-off →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// D. BLOOD BANK DASHBOARD VIEW
// ==========================================
function BloodBankDashboardView() {
  const bloodGroups = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <span className="text-xs uppercase font-mono text-neutral-500">District Blood Centre</span>
          <h1 className="text-2xl font-bold text-white mt-0.5">Navi Mumbai Municipal Blood Centre (Vashi)</h1>
          <p className="text-xs text-neutral-400">Regional Blood Centre In-Charge</p>
        </div>
        <Link
          href="/blood"
          className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-medium shadow-sm transition-colors"
        >
          Manage Blood Matrix →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        <div className="p-4 rounded-lg mono-card space-y-1">
          <span className="text-xs text-neutral-500 font-sans">Total Units Stored</span>
          <span className="text-3xl font-bold text-white block">64 units</span>
          <span className="text-[11px] text-neutral-400 font-sans">Across 8 blood groups</span>
        </div>
        <div className="p-4 rounded-lg mono-card space-y-1">
          <span className="text-xs text-neutral-500 font-sans">Expiring &lt;72 Hours</span>
          <span className="text-3xl font-bold text-white block">10 units</span>
          <span className="text-[11px] text-neutral-400 font-sans">Sweep transfer recommended</span>
        </div>
        <div className="p-4 rounded-lg mono-card space-y-1">
          <span className="text-xs text-neutral-500 font-sans">Open Hospital Requests</span>
          <span className="text-3xl font-bold text-white block">3 pending</span>
          <span className="text-[11px] text-neutral-400 font-sans">B+ PRBC and O- emergency</span>
        </div>
      </div>

      <div className="p-4 rounded-lg mono-card space-y-3">
        <h3 className="font-semibold text-sm text-white">Recommended FEFO Sweep Transfers</h3>
        <div className="p-3 rounded bg-neutral-950 border border-neutral-800 text-xs space-y-1">
          <div className="flex items-center justify-between font-mono">
            <span className="text-white font-medium">Navi Mumbai Blood Centre → NMMC General Hospital Vashi</span>
            <span className="text-neutral-400">4 units (O- PRBC)</span>
          </div>
          <p className="text-neutral-400">Units will spoil in 48 hours if not transferred to high-volume emergency trauma.</p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// E. DHO GOVERNANCE DASHBOARD VIEW
// ==========================================
function DhoDashboardView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <span className="text-xs uppercase font-mono text-neutral-500">Governance & Oversight</span>
          <h1 className="text-2xl font-bold text-white mt-0.5">Municipal Health Administration (Navi Mumbai & Mumbai)</h1>
          <p className="text-xs text-neutral-400">Municipal Health Directorate, NMMC & MCGM</p>
        </div>
        <Link
          href="/oversight"
          className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-medium shadow-sm transition-colors"
        >
          Full Oversight Telemetry →
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-lg mono-card space-y-1">
          <span className="text-xs text-neutral-500 font-sans">Median Dispatch</span>
          <span className="text-2xl font-bold text-white block">4m 12s</span>
          <span className="text-[11px] text-neutral-400 font-sans">vs ~3h baseline</span>
        </div>
        <div className="p-4 rounded-lg mono-card space-y-1">
          <span className="text-xs text-neutral-500 font-sans">Idle Capacity</span>
          <span className="text-2xl font-bold text-white block">18.5%</span>
          <span className="text-[11px] text-neutral-400 font-sans">-25.5% net reduction</span>
        </div>
        <div className="p-4 rounded-lg mono-card space-y-1">
          <span className="text-xs text-neutral-500 font-sans">Blood Saved</span>
          <span className="text-2xl font-bold text-white block">24u</span>
          <span className="text-[11px] text-neutral-400 font-sans">Via FEFO sweeps</span>
        </div>
        <div className="p-4 rounded-lg mono-card space-y-1">
          <span className="text-xs text-neutral-500 font-sans">Mesh Fulfillment</span>
          <span className="text-2xl font-bold text-white block">88%</span>
          <span className="text-[11px] text-neutral-400 font-sans">Cross-facility loans</span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-white">District Topology</h3>
        <DistrictMap />
      </div>
    </div>
  );
}
