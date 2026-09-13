'use client';
import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SensorNode } from './nodes/SensorNode';
import { IngressNode } from './nodes/IngressNode';
import { WireNode } from './nodes/WireNode';
import { PodNode } from './nodes/PodNode';
import { StorageNode } from './nodes/StorageNode';
import { PacketFlowEdge } from './edges/PacketFlowEdge';
import { useSimulationStore } from '../../store/useSimulationStore';
import { Flame, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

const initialNodes: Node[] = [
  {
    id: 'node-sensor',
    type: 'sensor',
    position: { x: 30, y: 130 },
    data: {},
  },
  {
    id: 'node-ingress',
    type: 'ingress',
    position: { x: 280, y: 130 },
    data: {},
  },
  {
    id: 'node-wire',
    type: 'wire',
    position: { x: 530, y: 120 },
    data: {},
  },
  {
    id: 'node-pod',
    type: 'pod',
    position: { x: 820, y: 110 },
    data: {},
  },
  {
    id: 'node-storage',
    type: 'storage',
    position: { x: 1130, y: 130 },
    data: {},
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e-sensor-ingress',
    source: 'node-sensor',
    target: 'node-ingress',
    type: 'packetFlow',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#00e5ff' },
  },
  {
    id: 'e-ingress-wire',
    source: 'node-ingress',
    target: 'node-wire',
    type: 'packetFlow',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#00e5ff' },
  },
  {
    id: 'e-wire-pod',
    source: 'node-wire',
    target: 'node-pod',
    type: 'packetFlow',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#00e5ff' },
  },
  {
    id: 'e-pod-storage',
    source: 'node-pod',
    target: 'node-storage',
    type: 'packetFlow',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#00e5ff' },
  },
];

export const TopologyCanvas: React.FC = () => {
  const { currentMission, isChaosActive, triggerChaos, resetMission, fixMtuClamp, tuneJvmMemory, pruneVolumeAttachmentLock, stripFinalizers } = useSimulationStore();

  const nodeTypes = useMemo(
    () => ({
      sensor: SensorNode,
      ingress: IngressNode,
      wire: WireNode,
      pod: PodNode,
      storage: StorageNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      packetFlow: PacketFlowEdge,
    }),
    []
  );

  return (
    <div className="relative w-full h-full min-h-[460px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Banner with Quick Chaos Controls */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 pointer-events-auto shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono font-bold text-slate-200">Packet & Buffer Flow Topology</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {isChaosActive ? 'CHAOS INJECTED' : 'SYSTEM NOMINAL'}
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {isChaosActive ? (
            <button
              onClick={() => {
                if (currentMission === 'mission-01') fixMtuClamp(1420);
                if (currentMission === 'mission-02') tuneJvmMemory(4096, 2048);
                if (currentMission === 'mission-03') pruneVolumeAttachmentLock();
                if (currentMission === 'mission-04') stripFinalizers();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-emerald-50 text-xs font-mono font-bold shadow-lg transition-colors border border-emerald-400/40"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Apply Quick Triage Fix
            </button>
          ) : (
            <button
              onClick={triggerChaos}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-red-50 text-xs font-mono font-bold shadow-lg transition-colors border border-red-400/40"
            >
              <Flame className="w-3.5 h-3.5" />
              Re-Inject Chaos
            </button>
          )}

          <button
            onClick={resetMission}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shadow-lg"
            title="Reset Scenario"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.5}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={20} size={1.5} />
        <Controls className="!bg-slate-900 !border-slate-700 !fill-slate-200" />
        <MiniMap
          className="!bg-slate-900 !border-slate-800"
          nodeColor={(n) => {
            if (n.type === 'wire') return '#f59e0b';
            if (n.type === 'pod') return '#00e5ff';
            if (n.type === 'storage') return '#a855f7';
            return '#64748b';
          }}
        />
      </ReactFlow>
    </div>
  );
};
