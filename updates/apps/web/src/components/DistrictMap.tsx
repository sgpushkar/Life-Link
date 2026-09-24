'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Activity,
  Battery,
  MapPin,
  Plane,
  Waves,
  AlertOctagon,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { apiRequest } from '../lib/api';
import { getClientSocket } from '../lib/socket';
import { DisasterScenarioConfig, DISASTER_SCENARIOS } from '@lifelink/shared';

interface FacilityNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  status: 'healthy' | 'moderate' | 'critical';
  ventilators: number;
  concentrators: number;
  bloodUnits: number;
}

export const DistrictMap: React.FC<{ onSelectFacility?: (fac: any) => void }> = ({ onSelectFacility }) => {
  const lowBandwidth = useAppStore((s) => s.lowBandwidth);
  const [disasterScenario, setDisasterScenario] = useState<DisasterScenarioConfig>(DISASTER_SCENARIOS.BASELINE);

  useEffect(() => {
    apiRequest('/admin/disaster-scenario')
      .then((res) => {
        if (res?.scenario) setDisasterScenario(res.scenario);
      })
      .catch(() => {});

    const socket = getClientSocket();
    if (socket) {
      socket.on('disaster:scenario_changed', (data: any) => {
        if (data?.scenario) setDisasterScenario(data.scenario);
      });
    }

    return () => {
      if (socket) {
        socket.off('disaster:scenario_changed');
      }
    };
  }, []);

  const nodes: FacilityNode[] = [
    { id: '1', name: 'KEM Hospital (Parel, Mumbai)', type: 'Tertiary Hospital', x: 20, y: 72, status: 'healthy', ventilators: 6, concentrators: 10, bloodUnits: 65 },
    { id: '2', name: 'NMMC Urban Health Centre (Nerul)', type: 'Urban Health Centre', x: 55, y: 64, status: 'critical', ventilators: 0, concentrators: 0, bloodUnits: 4 },
    { id: '3', name: 'LTMG Sion Hospital (Mumbai)', type: 'Tertiary Medical Hub', x: 28, y: 52, status: 'moderate', ventilators: 3, concentrators: 5, bloodUnits: 32 },
    { id: '4', name: 'CIDCO CHC Kharghar', type: 'Community Health Centre', x: 75, y: 60, status: 'moderate', ventilators: 1, concentrators: 2, bloodUnits: 8 },
    { id: '5', name: 'Dr. D.Y. Patil Hospital (Nerul)', type: 'Surplus Hub / Medical College', x: 60, y: 54, status: 'healthy', ventilators: 4, concentrators: 6, bloodUnits: 28 },
    { id: '6', name: 'Apollo Hospital (Belapur)', type: 'Tertiary Hospital', x: 66, y: 74, status: 'healthy', ventilators: 3, concentrators: 5, bloodUnits: 22 },
    { id: '7', name: 'Navi Mumbai Municipal Blood Centre (Vashi)', type: 'Municipal Blood Centre', x: 48, y: 38, status: 'healthy', ventilators: 0, concentrators: 0, bloodUnits: 84 },
    { id: '8', name: 'Jeevan Jyoti Blood Centre (Nerul)', type: 'Satellite Blood Bank', x: 58, y: 68, status: 'moderate', ventilators: 0, concentrators: 0, bloodUnits: 31 },
    { id: '9', name: 'NMMC General Hospital (Vashi)', type: 'Municipal Hospital', x: 50, y: 44, status: 'healthy', ventilators: 2, concentrators: 4, bloodUnits: 25 },
    { id: '10', name: 'NMMC General Hospital (Airoli)', type: 'Sub-District Hospital', x: 46, y: 22, status: 'healthy', ventilators: 1, concentrators: 3, bloodUnits: 15 },
  ];

  const [activeNode, setActiveNode] = useState<FacilityNode>(nodes[1]); // Default to Nerul UHC (Shortage)

  if (lowBandwidth) {
    return (
      <div className="p-4 rounded-lg mono-card">
        <h3 className="text-xs font-semibold text-neutral-300 mb-2 font-mono">Navi Mumbai & Mumbai Facility Inventory Registry</h3>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-500 font-mono text-[11px]">
                <th className="py-2">Facility</th>
                <th className="py-2">Tier</th>
                <th className="py-2 font-mono">Ventilators</th>
                <th className="py-2 font-mono">O2 Conc.</th>
                <th className="py-2 font-mono">Blood</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 font-mono text-xs">
              {nodes.map((n) => (
                <tr key={n.id} className="hover:bg-neutral-900">
                  <td className="py-2 font-sans font-medium text-white">{n.name}</td>
                  <td className="py-2 text-neutral-400 font-sans">{n.type}</td>
                  <td className="py-2">{n.ventilators}</td>
                  <td className="py-2">{n.concentrators}</td>
                  <td className="py-2">{n.bloodUnits}</td>
                  <td className="py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-neutral-900 border border-neutral-800 text-neutral-300">
                      {n.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const isCyclone = disasterScenario.id === 'CYCLONE_FLOOD';
  const isQuake = disasterScenario.id === 'EARTHQUAKE_74';

  return (
    <div className="relative w-full h-[410px] rounded-lg overflow-hidden mono-card">
      {/* Background Matrix Pattern */}
      <div className="absolute inset-0 bg-black bg-[radial-gradient(#222226_1px,transparent_1px)] [background-size:24px_24px]"></div>

      {/* SVG Transit Corridors */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Standard Road Corridors */}
        <line x1="60%" y1="54%" x2="55%" y2="64%" stroke={isCyclone ? '#ef4444' : '#38383e'} strokeWidth={isCyclone ? 2 : 1} strokeDasharray={isCyclone ? '4 4' : '3 3'} />
        <line x1="28%" y1="52%" x2="48%" y2="38%" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="20%" y1="72%" x2="28%" y2="52%" stroke={isQuake ? '#ef4444' : '#27272a'} strokeWidth={isQuake ? 2 : 1} strokeDasharray={isQuake ? '4 4' : '3 3'} />
        <line x1="48%" y1="38%" x2="50%" y2="44%" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="46%" y1="22%" x2="48%" y2="38%" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="60%" y1="54%" x2="75%" y2="60%" stroke={isCyclone ? '#ef4444' : '#27272a'} strokeWidth={isCyclone ? 2 : 1} strokeDasharray={isCyclone ? '4 4' : '3 3'} />

        {/* Autonomous Aero-Medical Drone Corridor (Active during floods / earthquakes) */}
        {disasterScenario.droneCorridorsActive && (
          <>
            <path
              d="M 280 200 Q 380 150 480 210"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              fill="none"
              className="animate-pulse"
            />
            {/* Flying Drone Marker */}
            <circle r="4" fill="#22d3ee">
              <animateMotion path="M 280 200 Q 380 150 480 210" dur="3s" repeatCount="indefinite" />
            </circle>
          </>
        )}

        {/* Moving Ground Delivery Packet */}
        {!isCyclone && (
          <circle r="3" fill="#ffffff">
            <animateMotion path="M 600 205 L 550 243" dur="5s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>


      {/* Nodes Overlay */}
      {nodes.map((node) => {
        const isSelected = activeNode?.id === node.id;
        const isCritical = node.status === 'critical';

        return (
          <div
            key={node.id}
            onClick={() => {
              setActiveNode(node);
              if (onSelectFacility) onSelectFacility(node);
            }}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
          >
            {isCritical && (
              <span className="absolute -inset-1.5 rounded-full border border-white/40 animate-ping opacity-40"></span>
            )}

            <div
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                isCritical
                  ? 'bg-neutral-200 text-black shadow-sm'
                  : node.status === 'moderate'
                  ? 'bg-neutral-400 text-black'
                  : 'bg-neutral-600 text-white'
              } ${isSelected ? 'ring-2 ring-neutral-400 scale-125' : 'hover:scale-110'}`}
            >
              <div className="w-1 h-1 rounded-full bg-black"></div>
            </div>

            <div
              className={`absolute left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded text-[10px] whitespace-nowrap font-medium transition-all pointer-events-none ${
                isSelected
                  ? 'bg-neutral-900 text-white border border-neutral-700 opacity-100'
                  : 'bg-black/90 text-neutral-400 opacity-0 group-hover:opacity-100'
              }`}
            >
              {node.name}
            </div>
          </div>
        );
      })}

      {/* Floating Node Details Card */}
      {activeNode && (
        <div className="absolute top-3 right-3 w-64 rounded-lg bg-neutral-950/95 border border-neutral-800 p-3.5 z-30 shadow-2xl backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase font-mono text-neutral-500">
                {activeNode.type}
              </span>
              <h4 className="text-xs font-semibold text-white leading-tight">{activeNode.name}</h4>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-neutral-900 border border-neutral-800 text-neutral-300">
              {activeNode.status}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center font-mono">
            <div className="p-1.5 rounded bg-neutral-900 border border-neutral-800">
              <span className="text-[9px] text-neutral-500 block font-sans">Vent</span>
              <span className="font-bold text-xs text-white">{activeNode.ventilators}</span>
            </div>
            <div className="p-1.5 rounded bg-neutral-900 border border-neutral-800">
              <span className="text-[9px] text-neutral-500 block font-sans">O2</span>
              <span className={`font-bold text-xs ${activeNode.concentrators === 0 ? 'text-neutral-400 underline' : 'text-white'}`}>
                {activeNode.concentrators}
              </span>
            </div>
            <div className="p-1.5 rounded bg-neutral-900 border border-neutral-800">
              <span className="text-[9px] text-neutral-500 block font-sans">Blood</span>
              <span className="font-bold text-xs text-white">{activeNode.bloodUnits}</span>
            </div>
          </div>

          {activeNode.status === 'critical' && (
            <div className="mt-2 flex items-center gap-1.5 p-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 text-[10px]">
              <ShieldAlert className="w-3 h-3 text-white flex-shrink-0" />
              <span>O2 Concentrators depleted (0 avail). Loan active.</span>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2.5 left-3 flex flex-wrap items-center gap-3 text-[10px] text-neutral-400 bg-neutral-950/90 px-2.5 py-1 rounded-lg border border-neutral-800 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neutral-600"></span>
          <span>Surplus</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neutral-400"></span>
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neutral-200"></span>
          <span>Shortage</span>
        </div>
        {disasterScenario.droneCorridorsActive && (
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Aero-Drone Corridor</span>
          </div>
        )}
        {isCyclone && (
          <div className="flex items-center gap-1.5 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>Submerged Bridge (Cut Off)</span>
          </div>
        )}
      </div>
    </div>

  );
};
