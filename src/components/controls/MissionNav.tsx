'use client';
import React from 'react';
import { useSimulationStore, SCENARIOS } from '../../store/useSimulationStore';
import { FailureScenarioId } from '../../types/simulation';
import {
  Compass,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  Layers,
  Flame,
} from 'lucide-react';

interface ScenarioGroup {
  label: string;
  items: Array<{ id: FailureScenarioId; title: string }>;
}

const SCENARIO_GROUPS: ScenarioGroup[] = [
  {
    label: 'Nominal Baseline',
    items: [{ id: 'nominal', title: 'System Nominal (All Healthy)' }],
  },
  {
    label: 'Node 1: Edge Telemetry Forwarder',
    items: [
      { id: 'node1-buffer-exhaustion', title: 'Local Buffer Ring Exhaustion' },
      { id: 'node1-schema-violation', title: 'Serialization Schema Violation' },
    ],
  },
  {
    label: 'Pipeline 1 → 2: Edge to Ingress',
    items: [
      { id: 'pipe1-tls-handshake', title: 'mTLS Handshake & Cert Expiration' },
      { id: 'pipe1-nlb-syn-flood', title: 'L4 NLB Connection Throttling (SYN Flood)' },
    ],
  },
  {
    label: 'Node 2: Gateway Ingress',
    items: [
      { id: 'node2-coredns-nxdomain', title: 'CoreDNS Internal Service Resolution Failure' },
      { id: 'node2-target-503', title: 'Target Group Backend Health Check Failure' },
    ],
  },
  {
    label: 'Pipeline 2 → 3: Ingress to CNI Wire',
    items: [
      { id: 'pipe2-mtu-blackhole', title: 'Path MTU Black Hole (VXLAN Encap)' },
      { id: 'pipe2-netpol-block', title: 'Zero-Trust NetworkPolicy Ingress Block' },
    ],
  },
  {
    label: 'Node 3: CNI Overlay Wire',
    items: [
      { id: 'node3-conntrack-saturation', title: 'Netfilter Conntrack Table Saturation' },
      { id: 'node3-ring-overflow', title: 'Socket Buffer Ring Overflow (rx_dropped)' },
    ],
  },
  {
    label: 'Pipeline 3 → 4: CNI Wire to Kafka',
    items: [
      { id: 'pipe3-direct-byte-buffer', title: 'DirectByteBuffer Memory Allocation Stall' },
      { id: 'pipe3-sasl-auth', title: 'Broker SSL/SASL SCRAM Auth Rejection' },
    ],
  },
  {
    label: 'Node 4: Kafka Broker',
    items: [
      { id: 'node4-cgroup-oom', title: 'cgroup v2 Hard Ceiling Breach (OOM Reaper)' },
      { id: 'node4-under-replicated', title: 'Under-Replicated Partitions (ISR Collapse)' },
    ],
  },
  {
    label: 'Pipeline 4 → 5: Kafka to CSI Storage',
    items: [
      { id: 'pipe4-multi-attach-lock', title: 'Exclusive Lock Contention (Multi-Attach)' },
      { id: 'pipe4-csi-grpc-timeout', title: 'CSI Storage Driver gRPC Timeout' },
    ],
  },
  {
    label: 'Node 5: CSI Volume',
    items: [
      { id: 'node5-ro-remount', title: 'Kernel Disk I/O Stall (Read-Only Remount)' },
      { id: 'node5-enospc', title: 'Volume Quota Depletion (Zero Inodes / ENOSPC)' },
    ],
  },
];

export const MissionNav: React.FC = () => {
  const { activeScenario, scenarioInfo, setScenario, resolveActiveFailure, resetToNominal } =
    useSimulationStore();

  const isNominal = activeScenario === 'nominal';

  return (
    <header className="bg-slate-950 border-b border-slate-800 shadow-md">
      {/* Top Navbar Row */}
      <div className="px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono">
                Platform Flight Simulator
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                v1.4 DIGITAL TWIN
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Tactical Edge & Multi-Domain Data Fabric (5 Nodes · 4 Pipelines · 18 Scenarios)
            </p>
          </div>
        </div>

        {/* Dropdown Selector & Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <select
              value={activeScenario}
              onChange={(e) => setScenario(e.target.value as FailureScenarioId)}
              className="appearance-none bg-slate-900 text-slate-200 text-xs font-mono font-semibold py-1.5 pl-3 pr-8 rounded-lg border border-slate-700 hover:border-slate-500 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer shadow-md"
            >
              {SCENARIO_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label} className="bg-slate-950 text-slate-400 font-bold">
                  {group.items.map((item) => (
                    <option key={item.id} value={item.id} className="bg-slate-900 text-slate-200">
                      {item.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {!isNominal ? (
            <button
              onClick={resolveActiveFailure}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-emerald-50 text-xs font-mono font-bold shadow-lg shadow-emerald-950/50 transition-colors border border-emerald-400/40"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Remediate Failure</span>
            </button>
          ) : (
            <button
              onClick={() => setScenario('pipe2-mtu-blackhole')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-red-50 text-xs font-mono font-bold shadow-lg shadow-red-950/50 transition-colors border border-red-400/40"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Inject Chaos</span>
            </button>
          )}

          <button
            onClick={resetToNominal}
            title="Reset to System Nominal"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Scenario Banner */}
      <div className="px-4 py-2 bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              isNominal
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
            }`}
          >
            {isNominal ? 'STREAM HEALTHY' : 'CHAOS ACTIVE'}
          </span>
          <span className="text-slate-400">Target:</span>
          <span className="text-cyan-300 font-bold bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
            {scenarioInfo.componentName}
          </span>
          <span className="text-slate-400">Anomaly:</span>
          <span className="text-slate-100 font-semibold">{scenarioInfo.title}</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="text-slate-500 hidden sm:inline">Signature:</span>
          <span className="text-red-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-red-900/40 truncate max-w-md">
            {scenarioInfo.errorSignature}
          </span>
        </div>
      </div>
    </header>
  );
};
