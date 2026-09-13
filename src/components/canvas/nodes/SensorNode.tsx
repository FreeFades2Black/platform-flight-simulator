'use client';
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Radio, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSimulationStore } from '../../../store/useSimulationStore';

export const SensorNode = memo(() => {
  const { activeScenario, edgeBufferUsed, edgeBufferCapacity, schemaRegistryStatus, setScenario } = useSimulationStore();

  const isBufferOverflow = activeScenario === 'node1-buffer-exhaustion';
  const isSchemaError = activeScenario === 'node1-schema-violation';
  const hasError = isBufferOverflow || isSchemaError;

  return (
    <div
      onClick={() => setScenario(isBufferOverflow ? 'node1-schema-violation' : 'node1-buffer-exhaustion')}
      className={`rounded-xl p-3.5 shadow-xl min-w-[220px] backdrop-blur-md transition-all cursor-pointer border-2 ${
        hasError
          ? 'bg-amber-950/90 border-amber-500 shadow-amber-500/20 animate-pulse'
          : 'bg-slate-900/90 border-cyan-500/50 shadow-cyan-500/10 hover:border-cyan-400'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${hasError ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Node 1: Edge Telemetry</h4>
            <span className="text-[10px] font-mono text-slate-400">bmw-spartanburg-gw01</span>
          </div>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
          hasError
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        }`}>
          {isBufferOverflow ? 'QUEUE FULL' : isSchemaError ? 'SCHEMA FAIL' : 'NOMINAL'}
        </span>
      </div>

      <div className="space-y-1.5 text-[11px] font-mono">
        <div className="flex justify-between text-slate-400">
          <span>Ring Buffer:</span>
          <span className={isBufferOverflow ? 'text-red-400 font-bold' : 'text-slate-200'}>
            {edgeBufferUsed} / {edgeBufferCapacity}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full ${isBufferOverflow ? 'bg-red-500 animate-pulse' : 'bg-cyan-500'}`}
            style={{ width: `${(edgeBufferUsed / edgeBufferCapacity) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-slate-400 pt-0.5">
          <span>Schema Registry:</span>
          <span className={isSchemaError ? 'text-red-400 font-bold' : 'text-emerald-400'}>
            {schemaRegistryStatus}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Throughput:</span>
          <span className={hasError ? 'text-amber-400 font-bold' : 'text-cyan-400'}>
            {hasError ? 'STALLED (0 B/s)' : '14.2 MB/s'}
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-cyan-400 !w-3 !h-3 !border-2 !border-slate-900" />
    </div>
  );
});
SensorNode.displayName = 'SensorNode';
