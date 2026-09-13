'use client';
import React from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { MissionId } from '../../types/simulation';
import { Compass, ShieldAlert, Cpu, HardDrive, Skull } from 'lucide-react';

const MISSIONS: Array<{ id: MissionId; label: string; icon: React.ReactNode }> = [
  { id: 'mission-01', label: '01: The Wire Trap (MTU)', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  { id: 'mission-02', label: '02: The Invisible Reaper (OOM)', icon: <Cpu className="w-3.5 h-3.5" /> },
  { id: 'mission-03', label: '03: The Frozen Disk (CSI)', icon: <HardDrive className="w-3.5 h-3.5" /> },
  { id: 'mission-04', label: '04: Zombie Finalizer (etcd)', icon: <Skull className="w-3.5 h-3.5" /> },
];

export const MissionNav: React.FC = () => {
  const { currentMission, setMission, missionTitle, missionDescription } = useSimulationStore();

  return (
    <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 shadow-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 rounded bg-cyan-500/20 text-cyan-400">
              <Compass className="w-4 h-4" />
            </div>
            <h1 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono">
              Platform Flight Simulator <span className="text-cyan-400 font-normal">| Digital Twin Sandbox</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-sans max-w-2xl">{missionDescription}</p>
        </div>

        {/* Mission Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {MISSIONS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMission(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                currentMission === m.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
