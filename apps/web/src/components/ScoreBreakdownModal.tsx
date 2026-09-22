'use client';

import React from 'react';
import { X, ShieldAlert, Clock, MapPin, AlertCircle, Hourglass } from 'lucide-react';

interface ScoreBreakdownProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    id: string;
    priorityScore: number;
    patientCriticality: number;
    neededBy: string;
    scoreBreakdown?: {
      criticalityScore?: number;
      timeScore?: number;
      distanceScore?: number;
      scarcityScore?: number;
      ageBonus?: number;
      finalScore?: number;
      weights?: {
        criticality: number;
        time: number;
        distance: number;
        scarcity: number;
        ageBonus: number;
      };
    };
    patientSummary?: any;
    requesterFacility?: any;
    equipmentType?: any;
  } | null;
}

export const ScoreBreakdownModal: React.FC<ScoreBreakdownProps> = ({ isOpen, onClose, request }) => {
  if (!isOpen || !request) return null;

  const b = request.scoreBreakdown || {
    criticalityScore: (request.patientCriticality / 5) * 100,
    timeScore: 80,
    distanceScore: 75,
    scarcityScore: 90,
    ageBonus: 10,
    weights: { criticality: 0.45, time: 0.25, distance: 0.10, scarcity: 0.10, ageBonus: 0.10 },
  };

  const weights = b.weights || { criticality: 0.45, time: 0.25, distance: 0.10, scarcity: 0.10, ageBonus: 0.10 };

  const components = [
    {
      title: 'Clinical Criticality',
      icon: ShieldAlert,
      weight: weights.criticality * 100,
      score: b.criticalityScore ?? (request.patientCriticality / 5) * 100,
      description: `Patient triage level ${request.patientCriticality}/5`,
    },
    {
      title: 'Time Sensitivity',
      icon: Clock,
      weight: weights.time * 100,
      score: b.timeScore ?? 80,
      description: `Target on-site by ${new Date(request.neededBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    },
    {
      title: 'Proximity',
      icon: MapPin,
      weight: weights.distance * 100,
      score: b.distanceScore ?? 75,
      description: 'Road travel distance from matched surplus facility',
    },
    {
      title: 'Resource Scarcity',
      icon: AlertCircle,
      weight: weights.scarcity * 100,
      score: b.scarcityScore ?? 90,
      description: 'District-wide supply versus competing requests',
    },
    {
      title: 'Queue Wait Time',
      icon: Hourglass,
      weight: weights.ageBonus * 100,
      score: b.ageBonus ?? 10,
      description: 'Elapsed wait time adjustment',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-lg bg-neutral-950 border border-neutral-800 p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
          <div>
            <span className="text-[11px] uppercase text-neutral-400 font-mono block">
              Score Breakdown
            </span>
            <h3 className="text-base font-bold text-white mt-0.5 font-mono">
              {(request.priorityScore ?? 85.0).toFixed(1)} / 100
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5 Components */}
        <div className="mt-3.5 space-y-2.5">
          {components.map((c) => {
            const Icon = c.icon;
            const weightedContribution = ((c.score * c.weight) / 100).toFixed(1);
            return (
              <div key={c.title} className="p-2.5 rounded bg-neutral-900/60 border border-neutral-850">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="font-medium text-white">{c.title}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">({c.weight}%)</span>
                  </div>
                  <div className="font-mono text-right">
                    <span className="text-white font-bold">{c.score.toFixed(1)}</span>
                    <span className="text-[10px] text-neutral-500"> (+{weightedContribution})</span>
                  </div>
                </div>

                <div className="w-full bg-neutral-800 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-neutral-400 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(5, c.score))}%` }}
                  ></div>
                </div>

                <p className="text-[10px] text-neutral-400 mt-1">{c.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-mono"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
