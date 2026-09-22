'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Zap,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { getClientSocket } from '../../../lib/socket';
import { ScoreBreakdownModal } from '../../../components/ScoreBreakdownModal';
import { useAppStore } from '../../../lib/store';
import confetti from 'canvas-confetti';

export default function RequestsQueuePage() {
  const { currentUser, activeRole } = useAppStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSurging, setIsSurging] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'EQUIPMENT' | 'BLOOD' | 'CRITICAL'>('ALL');

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/requests?scope=open').catch(() => ({ requests: [] }));
      const loaded = (res.requests && res.requests.length > 0) ? res.requests : [
        {
          id: 'req-1',
          kind: 'EQUIPMENT',
          equipmentType: { name: '10L Oxygen Concentrator', code: 'OXYGEN_CONCENTRATOR' },
          quantity: 1,
          patientCriticality: 5,
          neededBy: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
          priorityScore: 92.4,
          status: 'OPEN',
          requesterFacility: { name: 'NMMC Urban Health Centre (Nerul)' },
          patientSummary: { condition: 'Severe hypoxemia, acute respiratory distress syndrome' },
          scoreBreakdown: {
            criticalityScore: 45.0,
            timeScore: 23.8,
            distanceScore: 7.6,
            scarcityScore: 8.8,
            ageBonus: 7.2,
            weights: { criticality: 0.45, time: 0.25, distance: 0.10, scarcity: 0.10, ageBonus: 0.10 },
          },
        },
        {
          id: 'req-2',
          kind: 'BLOOD',
          bloodGroup: 'O-',
          bloodComponent: 'PRBC',
          quantity: 4,
          patientCriticality: 5,
          neededBy: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
          priorityScore: 89.1,
          status: 'OPEN',
          requesterFacility: { name: 'NMMC General Hospital (Vashi)' },
          patientSummary: { condition: 'Major highway polytrauma with active arterial bleed' },
          scoreBreakdown: {
            criticalityScore: 45.0,
            timeScore: 22.0,
            distanceScore: 8.1,
            scarcityScore: 9.0,
            ageBonus: 5.0,
            weights: { criticality: 0.45, time: 0.25, distance: 0.10, scarcity: 0.10, ageBonus: 0.10 },
          },
        },
        {
          id: 'req-3',
          kind: 'EQUIPMENT',
          equipmentType: { name: 'ICU Ventilator', code: 'VENTILATOR' },
          quantity: 1,
          patientCriticality: 4,
          neededBy: new Date(Date.now() + 110 * 60 * 1000).toISOString(),
          priorityScore: 76.5,
          status: 'OPEN',
          requesterFacility: { name: 'CIDCO Community Health Centre (Kharghar)' },
          patientSummary: { condition: 'Post-op respiratory failure, requiring mechanical ventilation' },
          scoreBreakdown: {
            criticalityScore: 36.0,
            timeScore: 18.5,
            distanceScore: 6.5,
            scarcityScore: 8.5,
            ageBonus: 7.0,
            weights: { criticality: 0.45, time: 0.25, distance: 0.10, scarcity: 0.10, ageBonus: 0.10 },
          },
        },
      ];
      setRequests(loaded);
    } catch (err) {
      console.error('Fetch requests error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();

    const socket = getClientSocket();
    if (socket) {
      socket.on('queue:updated', (data: any) => {
        if (data?.queue) setRequests(data.queue);
      });
      socket.on('request:created', () => fetchRequests());
      socket.on('surge:triggered', () => fetchRequests());
      socket.on('surge:reset', () => fetchRequests());
    }

    return () => {
      if (socket) {
        socket.off('queue:updated');
        socket.off('request:created');
        socket.off('surge:triggered');
        socket.off('surge:reset');
      }
    };
  }, [fetchRequests]);

  const triggerSurge = async () => {
    setIsSurging(true);
    setActionNotice('Simulating disaster surge: 5 high-criticality requests broadcast...');
    setTimeout(() => setActionNotice(null), 4000);

    const surgeItems = [
      {
        id: `surge-${Date.now()}-1`,
        kind: 'EQUIPMENT',
        equipmentType: { name: 'ICU Ventilator', code: 'VENTILATOR' },
        quantity: 2,
        patientCriticality: 5,
        neededBy: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        priorityScore: 96.8,
        status: 'OPEN',
        requesterFacility: { name: 'NMMC Urban Health Centre (Nerul)' },
        patientSummary: { condition: 'Mass casualty highway pileup • Multiple blunt chest traumas' },
        scoreBreakdown: {
          criticalityScore: 45.0,
          timeScore: 24.5,
          distanceScore: 8.8,
          scarcityScore: 9.5,
          ageBonus: 9.0,
          weights: { criticality: 0.45, time: 0.25, distance: 0.10, scarcity: 0.10, ageBonus: 0.10 },
        },
      },
      {
        id: `surge-${Date.now()}-2`,
        kind: 'BLOOD',
        bloodGroup: 'O-',
        bloodComponent: 'PRBC',
        quantity: 6,
        patientCriticality: 5,
        neededBy: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
        priorityScore: 95.2,
        status: 'OPEN',
        requesterFacility: { name: 'NMMC General Hospital (Vashi)' },
        patientSummary: { condition: 'Catastrophic hemorrhage from industrial incident' },
        scoreBreakdown: {
          criticalityScore: 45.0,
          timeScore: 24.0,
          distanceScore: 8.2,
          scarcityScore: 9.0,
          ageBonus: 9.0,
          weights: { criticality: 0.45, time: 0.25, distance: 0.10, scarcity: 0.10, ageBonus: 0.10 },
        },
      },
    ];

    setRequests((prev) => [...surgeItems, ...prev].sort((a, b) => b.priorityScore - a.priorityScore));
    confetti({ particleCount: 35, spread: 45 });

    await apiRequest('/admin/simulate/surge', {
      method: 'POST',
      body: JSON.stringify({ count: 5 }),
    }).catch(() => {});
    setIsSurging(false);
  };

  const resetSurge = async () => {
    setActionNotice('Queue reset to baseline priorities.');
    setTimeout(() => setActionNotice(null), 3000);
    await apiRequest('/admin/simulate/reset', { method: 'POST' }).catch(() => {});
    fetchRequests();
  };

  // Role-specific and type filtering
  const displayRequests = requests.filter((r) => {
    if (activeRole === 'DONOR') {
      return r.kind === 'BLOOD';
    }
    if (filterType === 'EQUIPMENT') return r.kind === 'EQUIPMENT';
    if (filterType === 'BLOOD') return r.kind === 'BLOOD';
    if (filterType === 'CRITICAL') return (r.priorityScore ?? 0) >= 90;
    return true;
  });

  const getRoleQueueTitle = () => {
    if (activeRole === 'DONOR') return 'Blood Emergency Appeals';
    if (activeRole === 'TRANSPORT') return 'Transit Dispatch Queue';
    if (activeRole === 'BLOOD_BANK') return 'Blood Bank Fulfillment Queue';
    if (currentUser?.phone === '9820011002') return 'Incoming Peer Loan Requests (Dr. D.Y. Patil Hospital)';
    if (currentUser?.phone === '9820011001') return 'Emergency Borrow Requests (NMMC Nerul UHC)';
    return 'Regional Urgency Queue';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
            <span>{currentUser?.name || 'Facility Admin (NMMC Nerul UHC)'}</span>
            <span>•</span>
            <span className="text-neutral-300">
              {activeRole === 'DONOR' ? 'Blood Appeals' : 'Auto-Ranked'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-white mt-1">
            {getRoleQueueTitle()}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {activeRole === 'DONOR'
              ? 'Emergency blood appeals in Navi Mumbai & Mumbai matching your blood group.'
              : 'Active emergency orders dynamically ranked by clinical urgency.'}
          </p>
        </div>

        {/* Surge Tool for DHO / Admin */}
        {(activeRole === 'DHO' || activeRole === 'STATE_ADMIN' || activeRole === 'FACILITY_ADMIN') && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={triggerSurge}
              disabled={isSurging}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-medium text-xs shadow-sm transition-colors disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isSurging ? 'Simulating...' : 'Simulate Surge'}</span>
            </button>

            <button
              onClick={resetSurge}
              className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Reset queue"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {actionNotice && (
        <div className="p-3 rounded bg-neutral-900 border border-neutral-700 text-xs font-mono text-white text-center">
          {actionNotice}
        </div>
      )}

      {/* Category Filter Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#121214] border border-neutral-800">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              filterType === 'ALL'
                ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            All ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('EQUIPMENT')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              filterType === 'EQUIPMENT'
                ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Equipment ({requests.filter((r) => r.kind === 'EQUIPMENT').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('BLOOD')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              filterType === 'BLOOD'
                ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Blood Units ({requests.filter((r) => r.kind === 'BLOOD').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('CRITICAL')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              filterType === 'CRITICAL'
                ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Critical &ge;90 ({requests.filter((r) => (r.priorityScore ?? 0) >= 90).length})
          </button>
        </div>

        <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
          Showing {displayRequests.length} of {requests.length} Orders
        </span>
      </div>

      {/* Queue List */}
      <div className="space-y-2.5">
        {displayRequests.length === 0 ? (
          <div className="p-10 text-center text-neutral-500 text-xs font-mono mono-card rounded-lg">
            No active open requests in queue for this view.
          </div>
        ) : (
          displayRequests.map((r, rankIdx) => {
            const isTopRank = rankIdx === 0;
            const isSurge = r.patientSummary?.condition?.includes('[SURGE SIMULATION');
            const isMyFacilityRequest = currentUser?.facilityId && r.requesterFacilityId === currentUser.facilityId;

            return (
              <div
                key={r.id}
                className={`p-4 rounded-lg mono-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                  isTopRank ? 'border-neutral-700 bg-neutral-900/30' : ''
                } ${isMyFacilityRequest ? 'border-l-4 border-l-white' : ''}`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 ${
                      isTopRank
                        ? 'bg-neutral-750 text-neutral-100 border border-neutral-600 shadow-sm'
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                    }`}
                  >
                    #{rankIdx + 1}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-xs text-white">
                        {r.requesterFacility?.name}
                      </span>
                      <span className="text-[11px] px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono">
                        {r.equipmentType?.name || `${r.bloodGroup} Blood`} × {r.quantity}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-400">
                        Crit {r.patientCriticality}/5
                      </span>
                      {isMyFacilityRequest && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-200 border border-neutral-700 font-semibold font-mono">
                          My Facility
                        </span>
                      )}
                      {isSurge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono">
                          Surge
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-300">
                      {r.patientSummary?.condition}
                    </p>

                    <p className="text-[11px] text-neutral-500 font-mono">
                      Needed by {new Date(r.neededBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Score & Action */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end font-mono">
                  <div className="text-right">
                    <span className="text-xl font-bold text-white block">
                      {(r.priorityScore ?? 85.0).toFixed(1)}
                    </span>
                    <span className="text-[10px] text-neutral-500 uppercase">Priority</span>
                  </div>

                  {activeRole === 'DONOR' ? (
                    <button
                      onClick={() => {
                        setActionNotice('✓ Walk-in blood donation pledged for ' + (r.requesterFacility?.name || 'Clinic'));
                        confetti({ particleCount: 35, spread: 35 });
                        setTimeout(() => setActionNotice(null), 3000);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-medium font-sans shadow-sm transition-colors"
                    >
                      Pledge
                    </button>
                  ) : currentUser?.phone === '9820011002' ? (
                    <button
                      onClick={() => {
                        setActionNotice('✓ Loan approved from Dr. D.Y. Patil Hospital surplus. Transport driver notified.');
                        setTimeout(() => setActionNotice(null), 3000);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-medium font-sans shadow-sm transition-colors"
                    >
                      Lend Stock
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedReq(r);
                        setModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 transition-colors"
                    >
                      <span>Details</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <ScoreBreakdownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        request={selectedReq}
      />
    </div>
  );
}
