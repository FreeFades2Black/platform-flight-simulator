'use client';
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Network } from 'lucide-react';

export const IngressNode = memo(() => {
  return (
    <div className="bg-slate-900/90 border-2 border-indigo-500/50 rounded-xl p-4 shadow-xl shadow-indigo-500/10 min-w-[200px] backdrop-blur-md">
      <Handle type="target" position={Position.Left} className="!bg-indigo-400 !w-3 !h-3 !border-2 !border-slate-900" />

      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Gateway Ingress</h4>
            <span className="text-[10px] font-mono text-slate-400">LoadBalancer VIP</span>
          </div>
        </div>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          10.240.0.10
        </span>
      </div>

      <div className="space-y-1.5 text-[11px] font-mono">
        <div className="flex justify-between text-slate-400">
          <span>Target Port:</span>
          <span className="text-slate-200">9092 (Kafka TLS)</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Node A Bridge:</span>
          <span className="text-emerald-400">cbr0 &bull; Ready</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-indigo-400 !w-3 !h-3 !border-2 !border-slate-900" />
    </div>
  );
});
IngressNode.displayName = 'IngressNode';
