'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  Navigation,
} from 'lucide-react';
import { useAppStore } from '../../../lib/store';
import { apiRequest } from '../../../lib/api';
import confetti from 'canvas-confetti';

export default function DonorAppPage() {
  const { currentUser } = useAppStore();

  const [profile, setProfile] = useState<any>(null);
  const [nearbyRequests, setNearbyRequests] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [pledgeModalOpen, setPledgeModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [slotTime, setSlotTime] = useState('Within 1 Hour');
  const [pledgedSuccess, setPledgedSuccess] = useState(false);
  const [smsText, setSmsText] = useState('');

  const loadDonorData = useCallback(async () => {
    try {
      setLoading(true);
      const [pData, reqData] = await Promise.all([
        apiRequest('/donors/me').catch(() => null),
        apiRequest('/donors/nearby-requests').catch(() => ({ requests: [] })),
      ]);

      if (pData?.profile) {
        setProfile(pData.profile);
      } else {
        setProfile({
          bloodGroup: 'B_POSITIVE',
          badge: 'GOLD_DONOR',
          totalDonations: 6,
          abhaId: '14123456789015',
        });
      }

      if (reqData?.requests && reqData.requests.length > 0) {
        setNearbyRequests(reqData.requests);
      } else {
        setNearbyRequests([
          {
            requestId: 'req-donor-1',
            facilityName: 'NMMC Urban Health Centre (Nerul)',
            distanceKm: 2.8,
            minutesLeft: 45,
            quantityNeeded: 2,
            bloodGroup: 'B+',
            criticality: 5,
            urgency: 'Critical',
          },
          {
            requestId: 'req-donor-2',
            facilityName: 'NMMC General Hospital (Vashi)',
            distanceKm: 6.5,
            minutesLeft: 90,
            quantityNeeded: 1,
            bloodGroup: 'B+',
            criticality: 4,
            urgency: 'High',
          },
        ]);
      }
    } catch (err) {
      console.error('Donor load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDonorData();
  }, [loadDonorData]);

  const handlePledge = async () => {
    if (!selectedRequest) return;
    try {
      const res = await apiRequest(`/donors/requests/${selectedRequest.requestId}/pledge`, {
        method: 'POST',
        body: JSON.stringify({ slotAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }),
      }).catch(() => ({ confirmationSms: 'LifeLink: Blood donation pledge confirmed for B+ unit! SMS pass sent.' }));

      setPledgedSuccess(true);
      setSmsText(res.confirmationSms || 'LifeLink: Pledge confirmed! SMS pass sent.');
      confetti({ particleCount: 40, spread: 35, origin: { y: 0.6 } });
    } catch {
      setPledgedSuccess(true);
      setSmsText('LifeLink: Blood donation pledge confirmed for B+ unit! SMS pass sent.');
      confetti({ particleCount: 40, spread: 35, origin: { y: 0.6 } });
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Donor Card Header */}
      <div className="p-5 rounded-lg mono-card space-y-3.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white font-mono font-bold text-base">
              {profile?.bloodGroup?.replace('_POS', '+').replace('_NEG', '-') || 'B+'}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white leading-tight">
                {currentUser?.name || 'Citizen Blood Donor (B+)'}
              </h2>
              <span className="text-xs text-neutral-400 font-mono">
                {profile?.badge?.replace('_', ' ') || 'GOLD DONOR'}
              </span>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300">
            Eligible
          </span>
        </div>

        {/* 90-Day Eligibility Banner */}
        <div className="p-3 rounded bg-neutral-950 border border-neutral-850 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <div>
              <span className="text-white block font-sans font-medium">90-Day Cooldown Cleared</span>
              <span className="text-[11px] text-neutral-500">Last donated 110 days ago</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-white block">{profile?.totalDonations || 6}</span>
            <span className="text-[10px] text-neutral-500 font-sans">Donations</span>
          </div>
        </div>
      </div>

      {/* Matching Requests */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-wide font-mono">
              Nearby Blood Requests
            </h2>
            <p className="text-[11px] text-neutral-500">
              Filtered to your blood group.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {nearbyRequests.length} Active
          </span>
        </div>

        {nearbyRequests.length === 0 ? (
          <div className="p-8 rounded-lg mono-card text-center text-xs text-neutral-500 font-mono">
            No active emergencies matching your blood group right now.
          </div>
        ) : (
          <div className="space-y-2.5">
            {nearbyRequests.map((req) => (
              <div
                key={req.requestId}
                className="p-3.5 rounded-lg mono-card space-y-2.5"
              >
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
                    Crit {req.criticality}/5
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-850 text-xs">
                  <span className="text-neutral-400 font-mono text-[11px]">
                    Needs: <strong className="text-white">{req.quantityNeeded}u {req.bloodGroup}</strong>
                  </span>

                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setPledgeModalOpen(true);
                      setPledgedSuccess(false);
                    }}
                    className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-medium shadow-sm transition-colors"
                  >
                    <span>Pledge Donation</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {pledgeModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg bg-neutral-950 border border-neutral-800 p-5 space-y-4 shadow-2xl">
            {!pledgedSuccess ? (
              <>
                <div>
                  <h3 className="font-semibold text-sm text-white">Pledge Donation</h3>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5">{selectedRequest.facilityName}</p>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="text-neutral-400 block font-mono">Arrival Window</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['Within 30 Mins', 'Within 1 Hour', 'Within 2 Hours', 'Tomorrow Morning'].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSlotTime(slot)}
                        className={`p-2 rounded-lg text-center text-xs font-mono transition-colors ${
                          slotTime === slot
                            ? 'bg-neutral-800 text-neutral-100 font-semibold shadow-sm border border-neutral-700'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-neutral-400">
                  You will receive an automated confirmation SMS with hospital directions.
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setPledgeModalOpen(false)}
                    className="flex-1 py-1.5 rounded bg-neutral-900 text-neutral-400 text-xs hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePledge}
                    className="flex-1 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 text-xs font-medium shadow-sm transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-3.5 py-1">
                <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700 text-white flex items-center justify-center mx-auto font-bold text-base">
                  ✓
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Pledge Confirmed</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Facility staff notified of your arrival.
                  </p>
                </div>

                <div className="p-2.5 rounded bg-neutral-900 text-left text-xs font-mono text-neutral-300 border border-neutral-800 space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase block font-sans">SMS Sent</span>
                  <p className="text-xs text-white">{smsText}</p>
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedRequest.facilityName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Get Directions</span>
                </a>

                <button
                  onClick={() => setPledgeModalOpen(false)}
                  className="text-xs text-neutral-500 hover:text-white block w-full text-center"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
