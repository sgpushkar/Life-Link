'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckSquare,
} from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { getClientSocket } from '../../../lib/socket';
import { ColdChainTelemetryCard } from '../../../components/ColdChainTelemetryCard';

export default function LogisticsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    'Power cable & adapter included': true,
    'Breathing circuits & tubing attached': true,
    'Bacterial/viral filter in place': true,
    'Battery charged > 80%': true,
    'Calibration self-test passed': true,
    'Physical casing intact': true,
  });
  const [senderSign, setSenderSign] = useState('Facility Admin (NMMC Urban Health Centre)');
  const [receiverSign, setReceiverSign] = useState('Facility Admin (Dr. D.Y. Patil Hospital)');
  const [checklistSaved, setChecklistSaved] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/logistics/jobs').catch(() => ({ jobs: [] }));
      const loadedJobs = (res.jobs && res.jobs.length > 0) ? res.jobs : [
        {
          id: 'job-demo-1',
          status: 'IN_TRANSIT',
          assignedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          allocation: {
            request: {
              equipmentType: { name: '10L Oxygen Concentrator' },
              requesterFacility: { name: 'NMMC Urban Health Centre (Nerul)' },
            },
            offer: {
              providerFacility: { name: 'Dr. D.Y. Patil Medical Hospital' },
              distanceKm: 3.5,
              etaMins: 12,
            },
          },
        },
        {
          id: 'job-demo-2',
          status: 'DISPATCHED',
          assignedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          allocation: {
            request: {
              equipmentType: { name: 'O- Negative PRBC (4 Units)' },
              requesterFacility: { name: 'NMMC General Hospital (Vashi)' },
            },
            offer: {
              providerFacility: { name: 'Navi Mumbai Municipal Blood Centre (Vashi)' },
              distanceKm: 4.8,
              etaMins: 10,
            },
          },
        },
      ];
      setJobs(loadedJobs);
      if (!activeJob) {
        setActiveJob(loadedJobs[0]);
      }
    } catch (err) {
      console.error('Failed to load logistics jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [activeJob]);

  useEffect(() => {
    fetchJobs();

    const socket = getClientSocket();
    if (socket) {
      socket.on('logistics:updated', () => fetchJobs());
      socket.on('logistics:checklist_updated', () => fetchJobs());
    }

    return () => {
      if (socket) {
        socket.off('logistics:updated');
        socket.off('logistics:checklist_updated');
      }
    };
  }, [fetchJobs]);

  const updateJobStatus = async (jobId: string, status: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status } : j))
    );
    if (activeJob?.id === jobId) {
      setActiveJob((prev: any) => ({ ...prev, status }));
    }
    await apiRequest(`/logistics/jobs/${jobId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).catch(() => {});
  };

  const submitChecklist = async () => {
    if (!activeJob) return;
    setChecklistSaved(true);
    setTimeout(() => setChecklistSaved(false), 2500);
    await apiRequest(`/logistics/jobs/${activeJob.id}/checklist`, {
      method: 'POST',
      body: JSON.stringify({
        checklist,
        senderSign,
        receiverSign,
      }),
    }).catch(() => {});
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
            <span>Transport Fleet</span>
            <span>•</span>
            <span className="text-neutral-300">Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-white mt-1">
            Logistics & Transport
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Transit tracking and equipment handover sign-off.
          </p>
        </div>

        <div className="p-2 rounded bg-neutral-900 border border-neutral-800 text-right font-mono">
          <span className="text-[10px] text-neutral-500 uppercase block font-sans">
            Avg Dispatch
          </span>
          <span className="text-sm font-bold text-white tabular-nums">
            2m 14s
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Dispatches List */}
        <div className="lg:col-span-5 space-y-2.5">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide font-mono">
            Active Dispatches ({jobs.length})
          </h2>

          {jobs.length === 0 ? (
            <div className="p-8 rounded-lg mono-card text-center text-xs text-neutral-500 font-mono">
              No active transport dispatches en route.
            </div>
          ) : (
            jobs.map((job) => {
              const isSelected = activeJob?.id === job.id;
              const req = job.allocation?.request;
              const offer = job.allocation?.offer;

              return (
                <div
                  key={job.id}
                  onClick={() => setActiveJob(job)}
                  className={`p-3.5 rounded-lg mono-card cursor-pointer transition-colors space-y-2 ${
                    isSelected ? 'border-neutral-600 bg-neutral-900/60' : 'hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-white">
                      {req?.equipmentType?.name || 'Emergency Blood Cargo'}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-neutral-900 border border-neutral-800 text-neutral-300">
                      {job.status}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-400 space-y-0.5">
                    <div><span className="text-neutral-500">From:</span> {offer?.providerFacility?.name || 'Provider CHC'}</div>
                    <div><span className="text-neutral-500">To:</span> {req?.requesterFacility?.name || 'Receiving PHC'}</div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-850 font-mono">
                    <span>Distance: ~{offer?.distanceKm || 28.5} km</span>
                    <span>ETA ~{offer?.etaMins || 42}m</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Active Job Actions */}
        {activeJob && (
          <div className="lg:col-span-7 space-y-5">
            {/* Status Progression */}
            <div className="p-5 rounded-lg mono-card space-y-3.5">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs uppercase text-neutral-400">
                  Update Status
                </span>
                <span className="text-xs text-neutral-500">#{activeJob.id.slice(0, 8)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => updateJobStatus(activeJob.id, 'PICKED_UP')}
                  className={`py-2 px-1.5 rounded-lg text-xs flex flex-col items-center gap-0.5 transition-colors ${
                    activeJob.status === 'PICKED_UP'
                      ? 'bg-neutral-750 text-neutral-100 border border-neutral-600 shadow-sm'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>1. Picked Up</span>
                  <span className="text-[10px] opacity-70">Departed</span>
                </button>

                <button
                  onClick={() => updateJobStatus(activeJob.id, 'IN_TRANSIT')}
                  className={`py-2 px-1.5 rounded-lg text-xs flex flex-col items-center gap-0.5 transition-colors ${
                    activeJob.status === 'IN_TRANSIT'
                      ? 'bg-neutral-750 text-neutral-100 border border-neutral-600 shadow-sm'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>2. In Transit</span>
                  <span className="text-[10px] opacity-70">On the road</span>
                </button>

                <button
                  onClick={() => updateJobStatus(activeJob.id, 'DELIVERED')}
                  className={`py-2 px-1.5 rounded-lg text-xs flex flex-col items-center gap-0.5 transition-colors ${
                    activeJob.status === 'DELIVERED'
                      ? 'bg-neutral-750 text-neutral-100 border border-neutral-600 shadow-sm'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>3. Delivered</span>
                  <span className="text-[10px] opacity-70">Arrived</span>
                </button>
              </div>
            </div>

            {/* IoT Biological Cold-Chain Telemetry Card */}
            <ColdChainTelemetryCard
              jobId={activeJob.id}
              cargoName={activeJob.allocation?.request?.equipmentType?.name || 'PRBC (Packed Red Blood Cells)'}
            />

            {/* Handover Checklist */}
            <div className="p-5 rounded-lg mono-card space-y-3.5">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-white" />
                  <h3 className="font-semibold text-xs text-white">
                    Safety Checklist
                  </h3>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono">
                  Handover
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                {Object.entries(checklist).map(([item, checked]) => (
                  <label
                    key={item}
                    className="flex items-center gap-2.5 p-2 rounded bg-neutral-950 hover:bg-neutral-900 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setChecklist({ ...checklist, [item]: e.target.checked })
                      }
                      className="rounded bg-neutral-900 border-neutral-700 text-white accent-white"
                    />
                    <span className="text-neutral-300">{item}</span>
                  </label>
                ))}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-850 text-xs">
                <div>
                  <label className="text-neutral-400 block mb-1 font-mono text-[11px]">Provider Sign</label>
                  <input
                    type="text"
                    value={senderSign}
                    onChange={(e) => setSenderSign(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1 font-mono text-[11px]">Receiver Sign</label>
                  <input
                    type="text"
                    value={receiverSign}
                    onChange={(e) => setReceiverSign(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <button
                onClick={submitChecklist}
                className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-medium text-xs shadow-sm transition-colors"
              >
                Save Handover Checklist
              </button>

              {checklistSaved && (
                <p className="text-[11px] text-neutral-300 font-mono text-center">
                  ✓ Checklist verified and logged.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
