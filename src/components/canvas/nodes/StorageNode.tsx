'use client';
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Database, Lock, Unlock } from 'lucide-react';
import { useSimulationStore } from '../../../store/useSimulationStore';

export const StorageNode = memo(() => {
  const { currentMission, volumeLockedByNode, isVolumeAttached } = useSimulationStore();
  const isLocked = Boolean(volumeLockedByNode);

  return (
    <div className={`rounded-xl p-4 shadow-xl min-w-[230px] backdrop-blur-md transition-all duration-300 border-2 ${
      isLocked && currentMission === 'mission-03'
        ? 'bg-amber-950/90 border-amber-500/80 shadow-amber-500/20'
        : 'bg-slate-900/90 border-purple-500/50 shadow-purple-500/10'
    }`}>
      <Handle type="target" position={Position.Left} className="!bg-purple-400 !w-3 !h-3 !border-2 !border-slate-900" />

      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isLocked ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}`}>
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">CSI Volume</h4>
            <span className="text-[10px] font-mono text-slate-400">pvc-telemetry-0</span>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
          isLocked ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        }`}>
          {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          {isLocked ? 'EXCLUSIVE LOCK' : 'ATTACHED'}
        </span>
      </div>

      <div className="space-y-1.5 text-[11px] font-mono">
        <div className="flex justify-between text-slate-400">
          <span>Device Path:</span>
          <span className="text-slate-200">/dev/nvme0n1</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>StorageClass:</span>
          <span className="text-purple-300">gp3-high-iops</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Lease Owner:</span>
          <span className={isLocked ? 'text-amber-400 font-bold truncate max-w-[120px]' : 'text-emerald-400'}>
            {volumeLockedByNode || 'node-c-compute-az1'}
          </span>
        </div>
      </div>
    </div>
  );
});
StorageNode.displayName = 'StorageNode';
