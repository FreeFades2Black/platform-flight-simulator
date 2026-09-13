'use client';
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Cpu, Server, Skull, AlertOctagon } from 'lucide-react';
import { useSimulationStore } from '../../../store/useSimulationStore';

export const PodNode = memo(() => {
  const { currentMission, podStatus, podRestartCount, jvmHeapMb, nettyDirectMb, cgroupLimitMb } = useSimulationStore();
  const totalMemory = jvmHeapMb + nettyDirectMb;
  const isOom = currentMission === 'mission-02' && totalMemory > cgroupLimitMb;

  const getStatusBadge = () => {
    switch (podStatus) {
      case 'Running':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Running</span>;
      case 'CrashLoopBackOff':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">CrashLoop (137)</span>;
      case 'ContainerCreating':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">ContainerCreating</span>;
      case 'Terminating':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse">Terminating</span>;
    }
  };

  return (
    <div className={`rounded-xl p-4 shadow-xl min-w-[260px] backdrop-blur-md transition-all duration-300 border-2 ${
      podStatus !== 'Running'
        ? 'bg-slate-900/95 border-red-500/80 shadow-red-500/20'
        : 'bg-slate-900/90 border-cyan-500/50 shadow-cyan-500/10'
    }`}>
      <Handle type="target" position={Position.Left} className="!bg-cyan-400 !w-3 !h-3 !border-2 !border-slate-900" />

      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${podStatus === 'Running' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400'}`}>
            {podStatus === 'CrashLoopBackOff' ? <Skull className="w-4 h-4" /> : <Server className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">kafka-broker-0</h4>
            <span className="text-[10px] font-mono text-slate-400">Node: node-b-storage-az1</span>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div className="space-y-2 text-[11px] font-mono">
        <div>
          <div className="flex justify-between text-slate-400 mb-1">
            <span>Memory (cgroup v2):</span>
            <span className={totalMemory > cgroupLimitMb ? 'text-red-400 font-bold' : 'text-slate-200'}>
              {totalMemory}MB / {cgroupLimitMb}MB
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
            <div
              className="bg-cyan-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, (jvmHeapMb / cgroupLimitMb) * 100)}%` }}
              title={`JVM Heap: ${jvmHeapMb}MB`}
            />
            <div
              className={`h-full transition-all duration-500 ${totalMemory > cgroupLimitMb ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`}
              style={{ width: `${Math.min(100, (nettyDirectMb / cgroupLimitMb) * 100)}%` }}
              title={`Netty Direct: ${nettyDirectMb}MB`}
            />
          </div>
        </div>

        <div className="flex justify-between text-slate-400 pt-1">
          <span>JVM Heap (-Xmx):</span>
          <span className="text-slate-200">{jvmHeapMb}MB</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Netty Direct Buffers:</span>
          <span className={totalMemory > cgroupLimitMb ? 'text-red-400 font-bold' : 'text-indigo-300'}>
            {nettyDirectMb}MB
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Restarts:</span>
          <span className="text-amber-400 font-bold">{podRestartCount}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-cyan-400 !w-3 !h-3 !border-2 !border-slate-900" />
    </div>
  );
});
PodNode.displayName = 'PodNode';
