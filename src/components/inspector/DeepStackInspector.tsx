'use client';
import React, { useState } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { Layers, Network, HardDrive, Cpu, Terminal, ShieldAlert, CheckCircle } from 'lucide-react';

export const DeepStackInspector: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'network' | 'memory' | 'storage' | 'consensus'>('network');
  const { currentMission, interfaceMtu, overlayEncapBytes, packetPayloadBytes, jvmHeapMb, nettyDirectMb, cgroupLimitMb, volumeLockedByNode, activeFinalizers } = useSimulationStore();

  const totalWireBytes = packetPayloadBytes + overlayEncapBytes;
  const isMtuExceeded = totalWireBytes > interfaceMtu;
  const totalMemory = jvmHeapMb + nettyDirectMb;
  const isOom = totalMemory > cgroupLimitMb;

  return (
    <div className="w-full h-full bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
      {/* Header with Tab Navigation */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Deep-Stack Inspector</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('network')}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
              activeTab === 'network' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Network
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
              activeTab === 'memory' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Memory
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
              activeTab === 'storage' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Storage
          </button>
          <button
            onClick={() => setActiveTab('consensus')}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
              activeTab === 'consensus' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            etcd
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 flex-1 overflow-y-auto font-mono text-xs text-slate-300 space-y-4">
        {activeTab === 'network' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Layer 3/4 Wire Envelope</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isMtuExceeded ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                {isMtuExceeded ? 'PATH MTU VIOLATION' : 'ENVELOPE PASS'}
              </span>
            </div>

            {/* Visual Breakdown of Wire Bytes */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="text-[11px] text-slate-400">Wire Packet Composition:</div>
              <div className="flex rounded overflow-hidden h-7 border border-slate-700 text-[10px] font-bold">
                <div className="bg-cyan-600 flex items-center justify-center text-white" style={{ width: '60%' }}>
                  Payload (1460B)
                </div>
                <div className="bg-indigo-600 flex items-center justify-center text-white" style={{ width: '15%' }}>
                  TCP (20B)
                </div>
                <div className="bg-blue-600 flex items-center justify-center text-white" style={{ width: '10%' }}>
                  IP (20B)
                </div>
                <div className="bg-amber-600 flex items-center justify-center text-white" style={{ width: '15%' }}>
                  VXLAN (+50B)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400">Total Wire Size:</span>{' '}
                  <strong className={isMtuExceeded ? 'text-red-400' : 'text-emerald-400'}>{totalWireBytes} Bytes</strong>
                </div>
                <div>
                  <span className="text-slate-400">Overlay MTU:</span>{' '}
                  <strong className="text-slate-200">{interfaceMtu} Bytes</strong>
                </div>
                <div>
                  <span className="text-slate-400">DF Bit (Don't Frag):</span>{' '}
                  <strong className="text-amber-400">1 (Enabled)</strong>
                </div>
                <div>
                  <span className="text-slate-400">Kernel Action:</span>{' '}
                  <strong className={isMtuExceeded ? 'text-red-400' : 'text-emerald-400'}>
                    {isMtuExceeded ? 'DROP (Need Frag)' : 'FORWARD'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] space-y-1">
              <div className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Driver Counter (flannel.1)</div>
              <div className="flex justify-between">
                <span>rx_packets:</span> <span className="text-slate-200">1,489,102</span>
              </div>
              <div className="flex justify-between">
                <span>tx_dropped:</span>{' '}
                <span className={isMtuExceeded ? 'text-red-400 font-bold' : 'text-slate-200'}>
                  {isMtuExceeded ? '48,291 (FRAME_TOO_LONG)' : '0'}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Linux cgroup v2 Memory Accounting</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isOom ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                {isOom ? 'SIGKILL CEILING REACHED' : 'WITHIN CEILING'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Total Consumption:</span>
                <span className={isOom ? 'text-red-400 font-bold' : 'text-slate-200'}>{totalMemory}MB / {cgroupLimitMb}MB</span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden flex">
                <div className="bg-cyan-500 h-full" style={{ width: `${(jvmHeapMb / cgroupLimitMb) * 100}%` }} />
                <div className={`h-full ${isOom ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`} style={{ width: `${(nettyDirectMb / cgroupLimitMb) * 100}%` }} />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-cyan-500 inline-block"></span> JVM Heap ({jvmHeapMb}MB)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-indigo-500 inline-block"></span> Netty Direct ({nettyDirectMb}MB)</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] space-y-1">
              <div className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Kernel Signal Status</div>
              <div className="flex justify-between">
                <span>cgroup.memory.max:</span> <span className="text-slate-200">8,589,934,592 Bytes</span>
              </div>
              <div className="flex justify-between">
                <span>oom_kill count:</span>{' '}
                <span className={isOom ? 'text-red-400 font-bold' : 'text-slate-200'}>
                  {isOom ? '4 (Process 89124 reaped)' : '0'}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">CSI VolumeAttachment Subsystem</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${volumeLockedByNode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                {volumeLockedByNode ? 'MULTI-ATTACH CONFLICT' : 'VOLUME MOUNTED'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">PersistentVolume:</span>
                <span className="text-slate-200">pvc-telemetry-data-0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AccessMode:</span>
                <span className="text-purple-300 font-bold">ReadWriteOnce (RWO)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Lock Holder:</span>
                <span className={volumeLockedByNode ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {volumeLockedByNode || 'None (Unlocked)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Node (Pending):</span>
                <span className="text-slate-200">node-c-compute-az1</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'consensus' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">etcd v3 & Finalizer State</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${activeFinalizers.length > 0 ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                {activeFinalizers.length > 0 ? 'ZOMBIE FINALIZER DETECTED' : 'STATE CLEAN'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-[11px]">
              <div>
                <span className="text-slate-400 block mb-1">metadata.finalizers:</span>
                {activeFinalizers.length > 0 ? (
                  activeFinalizers.map((f, i) => (
                    <span key={i} className="inline-block px-2 py-0.5 rounded bg-red-950 border border-red-500/40 text-red-300 font-bold">
                      &quot;{f}&quot;
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 italic">[] (Empty - Object reaped)</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
