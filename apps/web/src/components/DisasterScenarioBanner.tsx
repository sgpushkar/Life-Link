'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Waves,
  Activity,
  Biohazard,
  RotateCcw,
  Plane,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { DisasterScenarioId, DisasterScenarioConfig, DISASTER_SCENARIOS } from '@lifelink/shared';
import { apiRequest } from '../lib/api';
import { getClientSocket } from '../lib/socket';

export const DisasterScenarioBanner: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<DisasterScenarioConfig>(DISASTER_SCENARIOS.BASELINE);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchScenario = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/disaster-scenario');
      if (res?.scenario) {
        setActiveScenario(res.scenario);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    fetchScenario();

    const socket = getClientSocket();
    if (socket) {
      socket.on('disaster:scenario_changed', (data: any) => {
        if (data.scenario) {
          setActiveScenario(data.scenario);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('disaster:scenario_changed');
      }
    };
  }, [fetchScenario]);

  const handleSelectScenario = async (id: DisasterScenarioId) => {
    setLoading(true);
    setFeedback(`Activating ${DISASTER_SCENARIOS[id].title}...`);
    try {
      const res = await apiRequest('/admin/disaster-scenario', {
        method: 'POST',
        body: JSON.stringify({ scenarioId: id }),
      });
      if (res?.scenario) {
        setActiveScenario(res.scenario);
      }
    } catch {
      // Local fallback
      setActiveScenario(DISASTER_SCENARIOS[id]);
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const isCrisisActive = activeScenario.id !== 'BASELINE';

  return (
    <div className={`p-4 rounded-lg border transition-all ${
      isCrisisActive
        ? activeScenario.defconLevel === 1
          ? 'bg-red-950/30 border-red-500/70 shadow-xl shadow-red-950/20'
          : 'bg-amber-950/30 border-amber-500/70 shadow-lg shadow-amber-950/20'
        : 'bg-neutral-950/80 border-neutral-800'
    }`}>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Status info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
              activeScenario.defconLevel === 1
                ? 'bg-red-900 border-red-600 text-red-100 animate-pulse'
                : activeScenario.defconLevel === 2
                ? 'bg-amber-900 border-amber-600 text-amber-100'
                : 'bg-neutral-900 border-neutral-700 text-neutral-300'
            }`}>
              WHO EMT DEFCON {activeScenario.defconLevel}
            </span>
            <span className="text-xs font-semibold text-white font-mono">
              {activeScenario.title}
            </span>
          </div>
          <p className="text-xs text-neutral-300 font-sans max-w-2xl leading-relaxed">
            {activeScenario.description}
          </p>

          {isCrisisActive && (
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-neutral-400">
              <span className="flex items-center gap-1 text-white">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Hazards: <strong className="text-amber-300">{activeScenario.activeHazardsCount} active</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-white">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                Power Grid: <strong className="text-blue-300">{activeScenario.powerGridOperationalPercent}%</strong>
              </span>
              <span>•</span>
              {activeScenario.droneCorridorsActive && (
                <span className="flex items-center gap-1 text-cyan-300 font-bold animate-pulse">
                  <Plane className="w-3.5 h-3.5 text-cyan-400" />
                  Autonomous Drone Corridors Active
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Presets Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-end">
          <button
            onClick={() => handleSelectScenario('CYCLONE_FLOOD')}
            disabled={loading}
            className={`px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-1.5 transition-colors ${
              activeScenario.id === 'CYCLONE_FLOOD'
                ? 'bg-blue-900 text-blue-100 border border-blue-600 shadow-sm font-semibold'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            <Waves className="w-3.5 h-3.5 text-blue-400" />
            <span>Cyclone Flood</span>
          </button>

          <button
            onClick={() => handleSelectScenario('EARTHQUAKE_74')}
            disabled={loading}
            className={`px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-1.5 transition-colors ${
              activeScenario.id === 'EARTHQUAKE_74'
                ? 'bg-red-900 text-red-100 border border-red-600 shadow-sm font-semibold'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-red-400" />
            <span>7.4M Quake</span>
          </button>

          <button
            onClick={() => handleSelectScenario('EPIDEMIC_REFUGEE')}
            disabled={loading}
            className={`px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-1.5 transition-colors ${
              activeScenario.id === 'EPIDEMIC_REFUGEE'
                ? 'bg-amber-900 text-amber-100 border border-amber-600 shadow-sm font-semibold'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            <Biohazard className="w-3.5 h-3.5 text-amber-400" />
            <span>Epidemic</span>
          </button>

          {isCrisisActive && (
            <button
              onClick={() => handleSelectScenario('BASELINE')}
              disabled={loading}
              className="px-2.5 py-1.5 rounded-md text-xs font-mono flex items-center gap-1 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Reset to peacetime baseline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <p className="mt-2 text-[11px] text-neutral-400 font-mono text-center animate-pulse">
          {feedback}
        </p>
      )}
    </div>
  );
};
