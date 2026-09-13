'use client';
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ShieldAlert, CheckCircle2, Zap } from 'lucide-react';
import { useSimulationStore } from '../../../store/useSimulationStore';

export const WireNode = memo(() => {
  const { activeScenario, conntrackEntries, conntrackMax, socketRxDropped, setScenario } = useSimulationStore();

  const isConntrackFull = activeScenario === 'node3-conntrack-saturation';
  const isRingOverflow = activeScenario === 'node3-ring-overflow';
  const hasError = isConntrackFull || isRingOverflow;

  return (
    <div
      onClick={() => setScenario(isConntrackFull ? 'node3-ring-overflow' : 'node3-conntrack-saturation')}
      className={`rounded-xl p-3.5 shadow-xl min-w-[220px] backdrop-blur-md transition-all cursor-pointer border-2 ${
        hasError
          ? 'bg-red-950/90 border-red-500 shadow-red-500/20 animate-pulse'
          : 'bg-slate-900/90 border-emerald-500/50 shadow-emerald-500/10 hover:border-emerald-400'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-emerald-400 !w-3 !h-3 !border-2 !border-slate-900" />

      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${hasError ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Node 3: CNI Overlay Wire</h4>
            <span className="text-[10px] font-mono text-slate-400">flannel.1 (VXLAN)</span>
          </div>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
          hasError
            ? 'bg-red-500/20 text-red-400 border-red-500/40'
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        }`}>
          {isConntrackFull ? 'CONNTRACK FULL' : isRingOverflow ? 'RX OVERFLOW' : 'NOMINAL'}
        </span>
      </div>

      <div className="space-y-1.5 text-[11px] font-mono">
        <div className="flex justify-between text-slate-400">
          <span>Conntrack Entries:</span>
          <span className={isConntrackFull ? 'text-red-400 font-bold' : 'text-slate-200'}>
            {conntrackEntries.toLocaleString()} / {conntrackMax.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full ${isConntrackFull ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, (conntrackEntries / conntrackMax) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-slate-400 pt-0.5">
          <span>Socket rx_dropped:</span>
          <span className={isRingOverflow ? 'text-red-400 font-bold' : 'text-emerald-400'}>
            {socketRxDropped.toLocaleString()} pkts
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Encap Protocol:</span>
          <span className="text-cyan-400">VXLAN (UDP 8472)</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-emerald-400 !w-3 !h-3 !border-2 !border-slate-900" />
    </div>
  );
});
WireNode.displayName = 'WireNode';
