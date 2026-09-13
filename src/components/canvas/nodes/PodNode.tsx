'use client';
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Server, Skull, AlertOctagon } from 'lucide-react';
import { useSimulationStore } from '../../../store/useSimulationStore';

export const PodNode = memo(() => {
  const { activeScenario, podStatus, podExitCode, jvmHeapMb, nettyDirectMb, cgroupLimitMb, underReplicatedPartitions, inSyncReplicas, setScenario } = useSimulationStore();
  const totalMemory = jvmHeapMb + nettyDirectMb;

  const isOom = activeScenario === 'node4-cgroup-oom';
  const isUnderReplicated = activeScenario === 'node4-under-replicated';
  const hasError = isOom || isUnderReplicated || podStatus !== 'Running';

  return (
    <div
      onClick={() => setScenario(isOom ? 'node4-under-replicated' : 'node4-cgroup-oom')}
      className={`rounded-xl p-3.5 shadow-xl min-w-[240px] backdrop-blur-md transition-all cursor-pointer border-2 ${
        hasError
          ? 'bg-slate-900/95 border-red-500/80 shadow-red-500/20'
          : 'bg-slate-900/90 border-cyan-500/50 shadow-cyan-500/10 hover:border-cyan-400'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-cyan-400 !w-3 !h-3 !border-2 !border-slate-900" />

      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${hasError ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
            {isOom ? <Skull className="w-4 h-4" /> : <Server className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Node 4: KAFKA-BROKER-0</h4>
            <span className="text-[10px] font-mono text-slate-400">node-b-storage-az1</span>
          </div>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
          podStatus === 'Running'
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : podStatus === 'CrashLoopBackOff'
            ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        }`}>
          {podStatus} {podExitCode ? `(${podExitCode})` : ''}
        </span>
      </div>

      <div className="space-y-1.5 text-[11px] font-mono">
        <div className="flex justify-between text-slate-400">
          <span>cgroup v2 Memory:</span>
          <span className={totalMemory > cgroupLimitMb ? 'text-red-400 font-bold' : 'text-slate-200'}>
            {totalMemory}MB / {cgroupLimitMb}MB
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
          <div className="bg-cyan-500 h-full" style={{ width: `${(jvmHeapMb / cgroupLimitMb) * 100}%` }} />
          <div className={`h-full ${totalMemory > cgroupLimitMb ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`} style={{ width: `${(nettyDirectMb / cgroupLimitMb) * 100}%` }} />
        </div>
        <div className="flex justify-between text-slate-400 pt-0.5">
          <span>Under-Replicated:</span>
          <span className={isUnderReplicated ? 'text-red-400 font-bold' : 'text-emerald-400'}>
            {underReplicatedPartitions} partitions
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>In-Sync Replicas (ISR):</span>
          <span className={isUnderReplicated ? 'text-amber-400 font-bold' : 'text-slate-200'}>
            {inSyncReplicas}/3 (min 2)
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-cyan-400 !w-3 !h-3 !border-2 !border-slate-900" />
    </div>
  );
});
PodNode.displayName = 'PodNode';
