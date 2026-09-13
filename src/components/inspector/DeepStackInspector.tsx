'use client';
import React, { useState } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import {
  Layers,
  Radio,
  Network,
  Cpu,
  Database,
  Server,
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';

export const DeepStackInspector: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'edge' | 'network' | 'ingress' | 'cni' | 'memory' | 'storage'>('network');
  const {
    activeScenario,
    edgeBufferCapacity,
    edgeBufferUsed,
    schemaRegistryStatus,
    tlsCertStatus,
    nlbSynFloodActive,
    coreDnsStatus,
    ingressTargetStatus,
    interfaceMtu,
    packetPayloadBytes,
    overlayEncapBytes,
    networkPolicyIngressBlocked,
    conntrackEntries,
    conntrackMax,
    socketRxDropped,
    directBufferAllocStalled,
    saslAuthenticated,
    jvmHeapMb,
    nettyDirectMb,
    cgroupLimitMb,
    podStatus,
    podExitCode,
    underReplicatedPartitions,
    inSyncReplicas,
    volumeLockedByNode,
    csiGrpcDeadlineExceeded,
    filesystemStatus,
    diskFreeMb,
    diskTotalMb,
    inodeUsagePercent,
  } = useSimulationStore();

  const totalWireBytes = packetPayloadBytes + overlayEncapBytes;
  const isMtuExceeded = totalWireBytes > interfaceMtu;
  const totalMemory = jvmHeapMb + nettyDirectMb;
  const isOom = totalMemory > cgroupLimitMb;

  return (
    <div className="w-full h-full bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
      {/* Tab Navigation Header */}
      <div className="bg-slate-950 px-3 py-2 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">Deep-Stack Inspector</h3>
        </div>

        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setActiveTab('edge')}
            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
              activeTab === 'edge' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Node 1 (Edge)
          </button>
          <button
            onClick={() => setActiveTab('ingress')}
            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
              activeTab === 'ingress' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Node 2 (Ingress)
          </button>
          <button
            onClick={() => setActiveTab('cni')}
            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
              activeTab === 'cni' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Node 3 (CNI)
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
              activeTab === 'memory' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Node 4 (Kafka)
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
              activeTab === 'storage' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Node 5 (CSI)
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
              activeTab === 'network' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pipes (Wire)
          </button>
        </div>
      </div>

      {/* Inspector Tab Content */}
      <div className="p-4 flex-1 overflow-y-auto font-mono text-xs text-slate-300 space-y-4">
        {/* Node 1: Edge Telemetry */}
        {activeTab === 'edge' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Node 1: Edge Collector Daemon</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                edgeBufferUsed >= edgeBufferCapacity || schemaRegistryStatus !== 'HEALTHY'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {edgeBufferUsed >= edgeBufferCapacity ? 'BUFFER OVERFLOW' : schemaRegistryStatus !== 'HEALTHY' ? 'SCHEMA REJECT' : 'NOMINAL INGEST'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Memory Ring Buffer:</span>
                <span className={edgeBufferUsed >= edgeBufferCapacity ? 'text-red-400 font-bold' : 'text-slate-200'}>
                  {edgeBufferUsed.toLocaleString()} / {edgeBufferCapacity.toLocaleString()} events
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${edgeBufferUsed >= edgeBufferCapacity ? 'bg-red-500 animate-pulse' : 'bg-cyan-500'}`}
                  style={{ width: `${(edgeBufferUsed / edgeBufferCapacity) * 100}%` }}
                />
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Schema Registry Status:</span>
                  <span className={schemaRegistryStatus === 'HEALTHY' ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                    {schemaRegistryStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Schema Target Subject:</span>
                  <span className="text-slate-200">telemetry-events-value (ID: 412)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sensor Drop Counter:</span>
                  <span className={edgeBufferUsed >= edgeBufferCapacity ? 'text-red-400 font-bold' : 'text-slate-200'}>
                    {edgeBufferUsed >= edgeBufferCapacity ? '42,100 events (dropped)' : '0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Node 2: Gateway Ingress */}
        {activeTab === 'ingress' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Node 2: Perimeter Ingress Controller</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                coreDnsStatus !== 'RESOLVING' || ingressTargetStatus !== 'HEALTHY'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {coreDnsStatus !== 'RESOLVING' ? 'DNS RESOLUTION FAIL' : ingressTargetStatus !== 'HEALTHY' ? '503 BACKEND DOWN' : 'READY'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">CoreDNS Status:</span>
                <span className={coreDnsStatus === 'RESOLVING' ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                  {coreDnsStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Group Status:</span>
                <span className={ingressTargetStatus === 'HEALTHY' ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                  {ingressTargetStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ingress Target Host:</span>
                <span className="text-slate-200">kafka-broker-0.kafka-headless.svc.cluster.local:9092</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">HTTP Probe Status:</span>
                <span className={ingressTargetStatus === 'HEALTHY' ? 'text-slate-200' : 'text-red-400 font-bold'}>
                  {ingressTargetStatus === 'HEALTHY' ? 'HTTP 200 OK (/healthz)' : 'HTTP 503 Service Unavailable'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Node 3: CNI Wire */}
        {activeTab === 'cni' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Node 3: Linux Kernel Netfilter & Socket Subsystem</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                conntrackEntries >= conntrackMax || socketRxDropped > 0
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {conntrackEntries >= conntrackMax ? 'CONNTRACK FULL' : socketRxDropped > 0 ? 'RX DROPS DETECTED' : 'NOMINAL'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Conntrack Table Entries:</span>
                <span className={conntrackEntries >= conntrackMax ? 'text-red-400 font-bold' : 'text-slate-200'}>
                  {conntrackEntries.toLocaleString()} / {conntrackMax.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${conntrackEntries >= conntrackMax ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (conntrackEntries / conntrackMax) * 100)}%` }}
                />
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Socket Ring rx_dropped:</span>
                  <span className={socketRxDropped > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                    {socketRxDropped.toLocaleString()} pkts
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Driver Queue Status:</span>
                  <span className="text-slate-200">flannel.1 (e1000e ring tx 256 / rx 256)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Node 4: Kafka Broker */}
        {activeTab === 'memory' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Node 4: cgroup v2 & Kafka Broker Health</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isOom || podStatus !== 'Running' || underReplicatedPartitions > 0
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isOom ? 'SIGKILL OOM REAPED' : podStatus !== 'Running' ? podStatus : underReplicatedPartitions > 0 ? 'ISR DEGRADED' : 'RUNNING HEALTHY'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">cgroup v2 Memory Accounting:</span>
                <span className={isOom ? 'text-red-400 font-bold' : 'text-slate-200'}>
                  {totalMemory}MB / {cgroupLimitMb}MB
                </span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden flex">
                <div className="bg-cyan-500 h-full" style={{ width: `${(jvmHeapMb / cgroupLimitMb) * 100}%` }} />
                <div className={`h-full ${isOom ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`} style={{ width: `${(nettyDirectMb / cgroupLimitMb) * 100}%` }} />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                <span>JVM Heap: {jvmHeapMb}MB</span>
                <span>Netty Direct: {nettyDirectMb}MB</span>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pod Status / ExitCode:</span>
                  <span className={podStatus === 'Running' ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                    {podStatus} {podExitCode ? `(Exit ${podExitCode})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Under-Replicated Partitions:</span>
                  <span className={underReplicatedPartitions > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                    {underReplicatedPartitions}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">In-Sync Replicas (ISR):</span>
                  <span className={inSyncReplicas < 2 ? 'text-red-400 font-bold' : 'text-slate-200'}>
                    {inSyncReplicas}/3 (min.isr=2)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Node 5: Storage & CSI */}
        {activeTab === 'storage' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Node 5: CSI Volume & Kernel Disk Mount</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                filesystemStatus === 'ro' || diskFreeMb === 0 || volumeLockedByNode
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {filesystemStatus === 'ro' ? 'EXT4 READ-ONLY' : diskFreeMb === 0 ? 'ENOSPC (0 B FREE)' : volumeLockedByNode ? 'ATTACH LOCKED' : 'RW MOUNTED'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Filesystem Mode:</span>
                <span className={filesystemStatus === 'ro' ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {filesystemStatus === 'ro' ? 'ro (errors=remount-ro)' : 'rw,noatime,data=ordered'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Disk Capacity:</span>
                <span className={diskFreeMb === 0 ? 'text-red-400 font-bold' : 'text-slate-200'}>
                  {Math.round(diskFreeMb / 1000)}GB free / {Math.round(diskTotalMb / 1000)}GB total
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full ${diskFreeMb === 0 ? 'bg-red-500 animate-pulse' : 'bg-purple-500'}`}
                  style={{ width: `${((diskTotalMb - diskFreeMb) / diskTotalMb) * 100}%` }}
                />
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Inode Utilization:</span>
                <span className={inodeUsagePercent === 100 ? 'text-red-400 font-bold' : 'text-purple-300'}>
                  {inodeUsagePercent}% ({inodeUsagePercent === 100 ? '0 free inodes' : 'healthy'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Exclusive Volume Lock:</span>
                <span className={volumeLockedByNode ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {volumeLockedByNode || 'Unlocked (Clean)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">CSI gRPC Status:</span>
                <span className={csiGrpcDeadlineExceeded ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {csiGrpcDeadlineExceeded ? 'DEADLINE_EXCEEDED (15s)' : 'OK'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Pipelines 1-4 Inspector */}
        {activeTab === 'network' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Interconnecting Pipelines (1 → 4)</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isMtuExceeded || networkPolicyIngressBlocked || tlsCertStatus !== 'VALID' || !saslAuthenticated
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isMtuExceeded ? 'MTU CLAMP VIOLATION' : networkPolicyIngressBlocked ? 'NETPOL DROP' : tlsCertStatus !== 'VALID' ? 'mTLS CERT EXPIRED' : 'PIPELINES NOMINAL'}
              </span>
            </div>

            {/* Wire Breakdown */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="text-[11px] text-slate-400">Pipeline 2 → 3: Wire Encapsulation Budget:</div>
              <div className="flex rounded overflow-hidden h-6 border border-slate-700 text-[9px] font-bold">
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
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Pipe 1 (mTLS Cert):</span>
                <span className={tlsCertStatus === 'VALID' ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                  {tlsCertStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pipe 1 (NLB SYN Flood):</span>
                <span className={nlbSynFloodActive ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {nlbSynFloodActive ? 'SYN COOKIES ACTIVE' : 'NOMINAL'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pipe 2 (NetworkPolicy):</span>
                <span className={networkPolicyIngressBlocked ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {networkPolicyIngressBlocked ? 'DENY-ALL INGRESS (DROPPED)' : 'PERMITTED'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pipe 3 (DirectByteBuffer):</span>
                <span className={directBufferAllocStalled ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {directBufferAllocStalled ? 'OOM ALLOC STALL' : 'HEALTHY'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pipe 3 (Broker SASL):</span>
                <span className={saslAuthenticated ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                  {saslAuthenticated ? 'SCRAM-SHA-512 AUTHENTICATED' : 'AUTH REJECTED'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
