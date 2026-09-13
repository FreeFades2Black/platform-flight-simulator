'use client';
import React, { memo } from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';
import { useSimulationStore } from '../../../store/useSimulationStore';

export const PacketFlowEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { packetState, currentMission, interfaceMtu, packetPayloadBytes, overlayEncapBytes } = useSimulationStore();
  const totalWireBytes = packetPayloadBytes + overlayEncapBytes;
  const isMtuDrop = currentMission === 'mission-01' && totalWireBytes > interfaceMtu;
  const isOomDrop = currentMission === 'mission-02' && packetState === 'dropped-oom';
  const isStorageBlocked = currentMission === 'mission-03' && packetState === 'blocked-storage';

  // Determine if this specific edge is the wire edge
  const isWireEdge = id === 'e-ingress-wire' || id === 'e-wire-pod';

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: isMtuDrop && isWireEdge ? '#ef4444' : isOomDrop ? '#f59e0b' : '#00e5ff',
          strokeWidth: 2.5,
          strokeDasharray: isMtuDrop && isWireEdge ? '4 4' : undefined,
        }}
      />

      {/* Animated SVG Particle */}
      {!(isMtuDrop && id === 'e-wire-pod') && !(isStorageBlocked && id === 'e-pod-storage') && (
        <circle r="4" fill={isMtuDrop && isWireEdge ? '#ef4444' : '#00e5ff'} className="filter drop-shadow">
          <animateMotion dur={isMtuDrop ? '1.2s' : '1.8s'} repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* Secondary trail particle */}
      {!(isMtuDrop && id === 'e-wire-pod') && (
        <circle r="2.5" fill={isMtuDrop && isWireEdge ? '#f87171' : '#a5f3fc'} opacity="0.7">
          <animateMotion dur={isMtuDrop ? '1.2s' : '1.8s'} begin="0.3s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
});
PacketFlowEdge.displayName = 'PacketFlowEdge';
