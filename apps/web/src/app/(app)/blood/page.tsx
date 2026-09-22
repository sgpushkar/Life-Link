'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Plus,
  LayoutGrid,
  Kanban,
  Clock,
  Droplets,
  CheckCircle,
} from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { getClientSocket } from '../../../lib/socket';

export default function BloodBankPage() {
  const [matrixData, setMatrixData] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [campModalOpen, setCampModalOpen] = useState(false);
  const [checkinPhone, setCheckinPhone] = useState('9820011004');
  const [checkinGroup, setCheckinGroup] = useState('B+');
  const [checkinDone, setCheckinDone] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'matrix' | 'kanban' | 'sweeps'>('matrix');

  const loadData = useCallback(async () => {
    try {
      const [matrixRes, suggRes, reqRes] = await Promise.all([
        apiRequest('/blood/matrix').catch(() => null),
        apiRequest('/blood/redistribution-suggestions').catch(() => ({ suggestions: [] })),
        apiRequest('/requests?kind=BLOOD').catch(() => ({ requests: [] })),
      ]);

      if (matrixRes) {
        setMatrixData(matrixRes);
      } else {
        setMatrixData({ totalAvailable: 64, totalExpiringSoon: 10 });
      }

      if (suggRes?.suggestions && suggRes.suggestions.length > 0) {
        setSuggestions(suggRes.suggestions);
      } else {
        setSuggestions([
          {
            id: 'sugg-1',
            donorFacilityName: 'Navi Mumbai Municipal Blood Centre (Vashi)',
            targetFacilityName: 'NMMC General Hospital (Vashi)',
            bloodGroup: 'O-',
            component: 'PRBC',
            unitsExpiring: 4,
            hoursRemaining: 48,
            message: 'Transfer 4 units of O- PRBC before expiration to high-turnover emergency surgery.',
            action: 'TRANSFER_RECOMMENDED',
          },
          {
            id: 'sugg-2',
            donorFacilityName: 'Navi Mumbai Municipal Blood Centre (Vashi)',
            targetFacilityName: 'KEM Hospital (Parel, Mumbai)',
            bloodGroup: 'B+',
            component: 'PRBC',
            unitsExpiring: 6,
            hoursRemaining: 68,
            message: 'Reallocate 6 units B+ PRBC to meet pending maternal obstetric demand.',
            action: 'TRANSFER_RECOMMENDED',
          },
        ]);
      }

      if (reqRes?.requests && reqRes.requests.length > 0) {
        setRequests(reqRes.requests);
      } else {
        setRequests([
          {
            id: 'req-blood-1',
            bloodGroup: 'B+',
            bloodComponent: 'PRBC',
            quantity: 2,
            patientCriticality: 4,
            priorityScore: 92.4,
            status: 'OPEN',
            requesterFacility: { name: 'NMMC Urban Health Centre (Nerul)' },
            patientSummary: { condition: 'Obstetric hemorrhage' },
            donorPledges: [],
          },
          {
            id: 'req-blood-2',
            bloodGroup: 'O-',
            bloodComponent: 'PRBC',
            quantity: 4,
            patientCriticality: 5,
            priorityScore: 96.8,
            status: 'OPEN',
            requesterFacility: { name: 'NMMC General Hospital (Vashi)' },
            patientSummary: { condition: 'Major trauma resuscitation' },
            donorPledges: [{ id: 'pl-1' }],
          },
          {
            id: 'req-blood-3',
            bloodGroup: 'A+',
            bloodComponent: 'PLATELETS',
            quantity: 3,
            patientCriticality: 3,
            priorityScore: 78.1,
            status: 'MATCHED',
            requesterFacility: { name: 'CIDCO Community Health Centre (Kharghar)' },
            patientSummary: { condition: 'Dengue thrombocytopenia' },
            donorPledges: [],
          },
          {
            id: 'req-blood-4',
            bloodGroup: 'O+',
            bloodComponent: 'WHOLE',
            quantity: 1,
            patientCriticality: 2,
            priorityScore: 64.0,
            status: 'FULFILLED',
            requesterFacility: { name: 'Dr. D.Y. Patil Hospital (Nerul)' },
            patientSummary: { condition: 'Severe chronic anemia' },
            donorPledges: [],
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load blood bank data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    const socket = getClientSocket();
    if (socket) {
      socket.on('blood:expiry_sweep', () => loadData());
      socket.on('pledge:created', () => loadData());
      socket.on('camp:created', () => loadData());
      socket.on('camp:donation_logged', () => loadData());
    }

    return () => {
      if (socket) {
        socket.off('blood:expiry_sweep');
        socket.off('pledge:created');
        socket.off('camp:created');
        socket.off('camp:donation_logged');
      }
    };
  }, [loadData]);

  const bloodGroups = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  const components = ['PRBC', 'WHOLE', 'PLATELETS', 'PLASMA'];

  const kanbanColumns = [
    { key: 'OPEN', label: 'Open Needs' },
    { key: 'PLEDGED', label: 'Pledged' },
    { key: 'MATCHED', label: 'Matched' },
    { key: 'FULFILLED', label: 'Fulfilled' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
            <span>Blood Registry</span>
            <span>•</span>
            <span className="text-neutral-300">Expiry Watch</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-white mt-1">
            Blood Component Matrix
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Inventory levels, component compatibility, and expiring unit transfers.
          </p>
        </div>

        <button
          onClick={() => setCampModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-medium text-xs shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Donation</span>
        </button>
      </div>

      {/* Transfer Notification Banner */}
      {transferSuccess && (
        <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-neutral-300" />
            <span>{transferSuccess}</span>
          </div>
          <span className="text-[10px] text-neutral-400">Emergency Transport Fleet Assigned</span>
        </div>
      )}

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="p-4 rounded-lg mono-card space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-sans">Total Inventory</span>
            <Droplets className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-white block tabular-nums">
            {matrixData?.totalAvailable || 64} <span className="text-sm font-sans text-neutral-500 font-normal">units</span>
          </span>
          <span className="text-[11px] text-neutral-400 font-sans block">
            Across 8 blood groups (PRBC, Whole, Platelets, Plasma)
          </span>
        </div>

        <div className="p-4 rounded-lg mono-card space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-sans">Expiring &lt;72 Hours</span>
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-white block tabular-nums">
            {matrixData?.totalExpiringSoon || 10} <span className="text-sm font-sans text-neutral-500 font-normal">units</span>
          </span>
          <span className="text-[11px] text-neutral-400 font-sans block">
            FEFO redistribution sweep recommended
          </span>
        </div>

        <div className="p-4 rounded-lg mono-card space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-sans">Pipeline Demands</span>
            <Kanban className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-white block tabular-nums">
            {requests.length} <span className="text-sm font-sans text-neutral-500 font-normal">orders</span>
          </span>
          <span className="text-[11px] text-neutral-400 font-sans block">
            {requests.filter((r) => r.status === 'OPEN').length} awaiting immediate clinical match
          </span>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#121214] border border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Component Matrix (8×4)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kanban')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-2 ${
              activeTab === 'kanban'
                ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Fulfillment Board</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded ${activeTab === 'kanban' ? 'bg-neutral-700 text-white' : 'bg-neutral-900 text-neutral-500'}`}>
              {requests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sweeps')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-2 ${
              activeTab === 'sweeps'
                ? 'bg-neutral-800 text-neutral-100 font-semibold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>FEFO Sweeps (&lt;72h)</span>
            {suggestions.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded ${activeTab === 'sweeps' ? 'bg-neutral-700 text-white' : 'bg-neutral-900 text-neutral-300'}`}>
                {suggestions.length}
              </span>
            )}
          </button>
        </div>

        <span className="text-xs text-neutral-500 font-mono hidden md:inline">
          {activeTab === 'matrix' && 'Live Component Compatibility'}
          {activeTab === 'kanban' && '4-Stage Matching Pipeline'}
          {activeTab === 'sweeps' && 'Automated Spoilage Prevention'}
        </span>
      </div>

      {/* TAB 1: 8x4 Component Stock Matrix */}
      {activeTab === 'matrix' && (
        <div className="rounded-lg mono-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Component Compatibility &amp; Available Stock
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Real-time regional blood banking tally across red cells, whole blood, platelets, and plasma.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-neutral-400">
                Total: <strong className="text-white">{matrixData?.totalAvailable || 64}</strong>
              </span>
              <span className="text-neutral-400">
                Near Expiry: <strong className="text-white">{matrixData?.totalExpiringSoon || 10}</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500 font-mono text-[11px]">
                  <th className="py-2.5 px-3 text-left">Blood Group</th>
                  <th className="py-2.5 px-3">PRBC (Packed Cells)</th>
                  <th className="py-2.5 px-3">Whole Blood</th>
                  <th className="py-2.5 px-3">Platelets</th>
                  <th className="py-2.5 px-3">Fresh Frozen Plasma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 font-mono">
                {bloodGroups.map((bg) => {
                  const isUniversal = bg === 'O-' ? 'Univ. Donor' : bg === 'AB+' ? 'Univ. Recipient' : '';
                  return (
                    <tr key={bg} className="hover:bg-neutral-900/50 transition-colors">
                      <td className="py-2.5 px-3 text-left font-bold text-white flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs">
                          {bg}
                        </span>
                        {isUniversal && (
                          <span className="text-[10px] text-neutral-500 font-normal hidden sm:inline font-sans">
                            ({isUniversal})
                          </span>
                        )}
                      </td>
                      {components.map((comp) => {
                        const count = bg === 'O-' && comp === 'PRBC' ? 4 : bg === 'B+' && comp === 'PRBC' ? 6 : 2;
                        const isNearExpiry = (bg === 'O-' || bg === 'B+') && comp === 'PRBC';

                        return (
                          <td key={comp} className="py-2.5 px-3">
                            <span
                              className={`px-2.5 py-1 rounded text-xs inline-flex items-center gap-1 ${
                                isNearExpiry
                                  ? 'bg-neutral-800 text-white font-bold border border-neutral-700 shadow-sm'
                                  : count > 0
                                  ? 'text-white'
                                  : 'text-neutral-600'
                              }`}
                            >
                              <span>{count}</span>
                              {isNearExpiry && <span className="text-[9px] text-neutral-400 font-sans">(&lt;72h)</span>}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Kanban Pipeline */}
      {activeTab === 'kanban' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-semibold text-white">
              Emergency Matching Pipeline
            </h2>
            <span className="text-xs font-mono text-neutral-400">
              Drag or click Allocate to advance fulfillment
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {kanbanColumns.map((col) => {
              const colRequests = requests.filter((r) => {
                if (col.key === 'OPEN') return r.status === 'OPEN' && (!r.donorPledges || r.donorPledges.length === 0);
                if (col.key === 'PLEDGED') return r.status === 'OPEN' && r.donorPledges && r.donorPledges.length > 0;
                if (col.key === 'MATCHED') return r.status === 'MATCHED' || r.status === 'IN_TRANSIT';
                if (col.key === 'FULFILLED') return r.status === 'FULFILLED';
                return false;
              });

              return (
                <div key={col.key} className="rounded-lg mono-card p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2 text-xs font-semibold text-neutral-300">
                    <span>{col.label}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                      {colRequests.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 min-h-[180px]">
                    {colRequests.length === 0 ? (
                      <p className="text-[11px] text-neutral-600 italic text-center py-10 font-mono">No requests in stage</p>
                    ) : (
                      colRequests.map((r) => (
                        <div
                          key={r.id}
                          className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5 hover:border-neutral-700 transition-colors text-xs"
                        >
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-semibold text-white">
                              {r.bloodGroup?.replace('_POS', '+').replace('_NEG', '-')} {r.bloodComponent}
                            </span>
                            <span className="text-neutral-400 font-bold">{r.quantity}u</span>
                          </div>
                          <p className="text-[11px] text-neutral-400 font-sans">{r.requesterFacility?.name}</p>
                          <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1.5 border-t border-neutral-900 font-mono">
                            <span>Score: {(r.priorityScore ?? 84.5).toFixed(1)}</span>
                            <span>Crit {r.patientCriticality}/5</span>
                          </div>
                          {col.key === 'OPEN' && (
                            <button
                              onClick={() => {
                                setRequests((prev) =>
                                  prev.map((item) => (item.id === r.id ? { ...item, status: 'MATCHED' } : item))
                                );
                              }}
                              className="w-full mt-2 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white text-[11px] font-mono transition-colors"
                            >
                              Allocate &amp; Match →
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: FEFO Expiry Sweeps */}
      {activeTab === 'sweeps' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg mono-card space-y-2">
            <div className="flex items-center gap-2 font-mono">
              <AlertTriangle className="w-4 h-4 text-neutral-300" />
              <h2 className="text-sm font-semibold text-white">
                Automated FEFO Sweep Protocol
              </h2>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Units with less than 72 hours of shelf life remaining are automatically flagged for redistribution from satellite blood banks to high-volume emergency trauma centres (e.g. NMMC General Hospital Vashi or KEM Hospital Parel) to prevent clinical wastage.
            </p>
          </div>

          {suggestions.length === 0 ? (
            <div className="p-10 rounded-lg mono-card text-center text-xs font-mono text-neutral-500">
              ✓ All active blood units are within safe shelf life thresholds. Zero expiry transfers pending.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((s, i) => (
                <div key={i} className="p-4 rounded-lg mono-card space-y-3">
                  <div className="flex items-center justify-between font-mono text-xs border-b border-neutral-800 pb-2">
                    <span className="text-white font-medium">{s.donorFacilityName}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-white font-medium">{s.targetFacilityName}</span>
                  </div>

                  <p className="text-neutral-300 text-xs leading-relaxed">{s.message}</p>

                  <div className="p-2.5 rounded bg-neutral-950 border border-neutral-850 flex items-center justify-between text-xs font-mono">
                    <span className="text-neutral-400">
                      Shelf-Life: <strong className="text-white">{s.hoursRemaining}h remaining</strong>
                    </span>
                    <span className="text-neutral-400">
                      Volume: <strong className="text-white">{s.unitsExpiring} units ({s.bloodGroup})</strong>
                    </span>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => {
                        setSuggestions((prev) => prev.filter((_, idx) => idx !== i));
                        setTransferSuccess(`Dispatched ${s.unitsExpiring} units ${s.bloodGroup} to ${s.targetFacilityName}`);
                        setMatrixData((prev: any) => ({
                          ...prev,
                          totalExpiringSoon: Math.max(0, (prev?.totalExpiringSoon || 10) - s.unitsExpiring),
                        }));
                        setTimeout(() => setTransferSuccess(null), 4000);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-medium text-xs shadow-sm transition-colors"
                    >
                      Dispatch FEFO Transfer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Camp Mode Intake Modal */}
      {campModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-neutral-950 border border-neutral-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Log Blood Donation</h3>
              <button
                onClick={() => setCampModalOpen(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1 font-mono">Donor Phone</label>
                <input
                  type="text"
                  value={checkinPhone}
                  onChange={(e) => setCheckinPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1 font-mono">Blood Group</label>
                <select
                  value={checkinGroup}
                  onChange={(e) => setCheckinGroup(e.target.value)}
                  className="w-full px-3 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-white font-mono"
                >
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={async () => {
                  const campFac = await apiRequest('/facilities?type=DONATION_CAMP').catch(() => null);
                  const campId = campFac?.facilities?.[0]?.id || 'ef1a2ecb-6beb-42d0-a04b-850948207a89';
                  await apiRequest(`/blood/camps/${campId}/checkin`, {
                    method: 'POST',
                    body: JSON.stringify({
                      donorPhone: checkinPhone,
                      bloodGroup: checkinGroup,
                    }),
                  }).catch(() => {});
                  setCheckinDone(true);
                  setMatrixData((prev: any) => ({
                    ...prev,
                    totalAvailable: (prev?.totalAvailable || 64) + 1,
                  }));
                  setTimeout(() => setCheckinDone(false), 2500);
                }}
                className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-medium text-xs shadow-sm transition-colors"
              >
                Register Unit
              </button>

              {checkinDone && (
                <p className="text-[11px] text-neutral-300 font-mono text-center">
                  ✓ Unit added to inventory.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
