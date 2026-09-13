'use client';
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Database, Lock, AlertOctagon } from 'lucide-react';
import { useSimulationStore } from '../../../store/useSimulationStore';

export const StorageNode = memo(() => {
  const { activeScenario, filesystemStatus, diskFreeMb, diskTotalMb, inodeUsagePercent, setScenario } = useSimulationStore();

  const isRo = activeScenario === 'node5-ro-remount';
  const isEnospc = activeScenario === 'node5-enospc';
  const hasError = isRo || isEnospc;

  return (
    <div
      onClick={() => setScenario(isRo ? 'node5-enospc' : 'node5-ro-remount')}
      className={`rounded-xl p-3.5 shadow-xl min-w-[210px] backdrop-blur-md transition-all cursor-pointer border-2 ${
        hasError
          ? 'bg-red-950/90 border-red-500 shadow-red-500/20 animate-pulse'
          : 'bg-slate-900/90 border-purple-500/50 shadow-purple-500/10 hover:border-purple-400'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-purple-400 !w-3 !h-3 !border-2 !border-slate-900" />

      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${hasError ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'}`}>
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Node 5: CSI VOLUME</h4>
            <span className="text-[10px] font-mono text-slate-400">/dev/nvme0n1 (rbd0)</span>
          </div>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
          hasError
            ? 'bg-red-500/20 text-red-400 border-red-500/40'
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        }`}>
          {isRo ? 'READ-ONLY' : isEnospc ? 'ENOSPC 100%' : 'RW HEALTHY'}
        </span>
      </div>

      <div className="space-y-1.5 text-[11px] font-mono">
        <div className="flex justify-between text-slate-400">
          <span>Mount Flags:</span>
          <span className={filesystemStatus === 'ro' ? 'text-red-400 font-bold' : 'text-emerald-400'}>
            {filesystemStatus === 'ro' ? 'ro,relatime,errors=remount-ro' : 'rw,noatime,data=ordered'}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Capacity Free:</span>
          <span className={isEnospc ? 'text-red-400 font-bold' : 'text-slate-200'}>
            {Math.round(diskFreeMb / 1000)}GB / {Math.round(diskTotalMb / 1000)}GB
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full ${isEnospc ? 'bg-red-500 animate-pulse' : 'bg-purple-500'}`}
            style={{ width: `${((diskTotalMb - diskFreeMb) / diskTotalMb) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-slate-400 pt-0.5">
          <span>Inode Usage:</span>
          <span className={inodeUsagePercent === 100 ? 'text-red-400 font-bold' : 'text-purple-300'}>
            {inodeUsagePercent}% ({inodeUsagePercent === 100 ? '0 free' : 'nominal'})
          </span>
        </div>
      </div>
    </div>
  );
});
StorageNode.displayName = 'StorageNode';
