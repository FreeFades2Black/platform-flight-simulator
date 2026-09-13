'use client';
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Radio, Activity } from 'lucide-react';
import { useSimulationStore } from '../../../store/useSimulationStore';

export const SensorNode = memo(() => {
  const { isChaosActive, currentMission, packetPayloadBytes } = useSimulationStore();

  return (
    <div className="bg-slate-900/90 border-2 border-cyan-500/50 rounded-xl p-4 shadow-xl shadow-cyan-500/10 min-w-[210px] backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Edge Telemetry</h4>
            <span className="text-[10px] font-mono text-slate-400">bmw-spartanburg-gw01</span>
          </div>
        </div>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          LIVE
        </span>
      </div>

      <div className="space-y-1.5 text-[11px] font-mono">
        <div className="flex justify-between text-slate-400">
          <span>Payload Size:</span>
          <span className="text-slate-200 font-bold">{packetPayloadBytes} Bytes</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>DF Bit (Don't Frag):</span>
          <span className="text-amber-400 font-bold">1 (SET)</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Throughput:</span>
          <span className="text-cyan-400">14.2 MB/s</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-cyan-400 !w-3 !h-3 !border-2 !border-slate-900" />
    </div>
  );
});
SensorNode.displayName = 'SensorNode';
