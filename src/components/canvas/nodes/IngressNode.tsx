'use client';
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Network, AlertTriangle } from 'lucide-react';
import { useSimulationStore } from '../../../store/useSimulationStore';

export const IngressNode = memo(() => {
  const { activeScenario, coreDnsStatus, ingressTargetStatus, setScenario } = useSimulationStore();

  const isDnsError = activeScenario === 'node2-coredns-nxdomain';
  const isTarget503 = activeScenario === 'node2-target-503';
  const hasError = isDnsError || isTarget503;

  return (
    <div
      onClick={() => setScenario(isDnsError ? 'node2-target-503' : 'node2-coredns-nxdomain')}
      className={`rounded-xl p-3.5 shadow-xl min-w-[210px] backdrop-blur-md transition-all cursor-pointer border-2 ${
        hasError
          ? 'bg-red-950/90 border-red-500 shadow-red-500/20 animate-pulse'
          : 'bg-slate-900/90 border-indigo-500/50 shadow-indigo-500/10 hover:border-indigo-400'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-indigo-400 !w-3 !h-3 !border-2 !border-slate-900" />

      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${hasError ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Node 2: Gateway Ingress</h4>
            <span className="text-[10px] font-mono text-slate-400">NLB VIP: 10.240.0.10</span>
          </div>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
          hasError
            ? 'bg-red-500/20 text-red-400 border-red-500/40'
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        }`}>
          {isDnsError ? 'NXDOMAIN' : isTarget503 ? '503 UNHEALTHY' : 'READY'}
        </span>
      </div>

      <div className="space-y-1.5 text-[11px] font-mono">
        <div className="flex justify-between text-slate-400">
          <span>CoreDNS Resolution:</span>
          <span className={isDnsError ? 'text-red-400 font-bold' : 'text-emerald-400'}>
            {coreDnsStatus}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Target Group Backend:</span>
          <span className={isTarget503 ? 'text-red-400 font-bold' : 'text-indigo-300'}>
            {ingressTargetStatus}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Ingress Port:</span>
          <span className="text-slate-200">9092 (Kafka TLS)</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-indigo-400 !w-3 !h-3 !border-2 !border-slate-900" />
    </div>
  );
});
IngressNode.displayName = 'IngressNode';
