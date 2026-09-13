'use client';
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ShieldAlert, CheckCircle2, Zap } from 'lucide-react';
import { useSimulationStore } from '../../../store/useSimulationStore';

export const WireNode = memo(() => {
  const { currentMission, interfaceMtu, overlayEncapBytes, packetPayloadBytes, isChaosActive } = useSimulationStore();
  const totalWireBytes = packetPayloadBytes + overlayEncapBytes;
  const isMtuExceeded = currentMission === 'mission-01' && totalWireBytes > interfaceMtu;

  return (
    <div className={`rounded-xl p-4 shadow-xl min-w-[240px] backdrop-blur-md transition-all duration-300 border-2 ${
      isMtuExceeded
        ? 'bg-red-950/90 border-red-500 shadow-red-500/20 animate-pulse'
        : 'bg-slate-900/90 border-emerald-500/50 shadow-emerald-500/10'
    }`}>
      <Handle type="target" position={Position.Left} className="!bg-amber-400 !w-3 !h-3 !border-2 !border-slate-900" />

      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isMtuExceeded ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {isMtuExceeded ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">CNI Overlay Wire</h4>
            <span className="text-[10px] font-mono text-slate-400">flannel.1 (VXLAN)</span>
          </div>
        </div>
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
          isMtuExceeded ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        }`}>
          {isMtuExceeded ? 'MTU MISMATCH' : 'CLAMPED OK'}
        </span>
      </div>

      <div className="space-y-2 text-[11px] font-mono">
        <div className="flex justify-between text-slate-400">
          <span>Interface MTU:</span>
          <span className="text-slate-100 font-bold">{interfaceMtu} Bytes</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>VXLAN Encap:</span>
          <span className="text-amber-400">+{overlayEncapBytes} Bytes</span>
        </div>
        <div className="flex justify-between text-slate-400 border-t border-slate-800/80 pt-1.5">
          <span>Total Wire Packet:</span>
          <span className={`font-bold ${isMtuExceeded ? 'text-red-400' : 'text-emerald-400'}`}>
            {totalWireBytes} Bytes
          </span>
        </div>

        {isMtuExceeded && (
          <div className="mt-2 p-2 rounded bg-red-900/60 border border-red-500/50 text-[10px] text-red-200 font-sans flex items-start gap-1.5">
            <Zap className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-red-100 font-mono">ICMP 3, 4: Need to Frag</strong>
              Packet exceeds MTU with DF bit set. Batch dropped at overlay bridge!
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-amber-400 !w-3 !h-3 !border-2 !border-slate-900" />
    </div>
  );
});
WireNode.displayName = 'WireNode';
