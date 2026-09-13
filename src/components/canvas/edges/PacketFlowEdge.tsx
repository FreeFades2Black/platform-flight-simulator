'use client';
import React, { memo } from 'react';
import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { activeScenario, setScenario } = useSimulationStore();

  // Determine pipeline errors
  const isPipe1Tls = id === 'e-sensor-ingress' && activeScenario === 'pipe1-tls-handshake';
  const isPipe1Syn = id === 'e-sensor-ingress' && activeScenario === 'pipe1-nlb-syn-flood';
  const isPipe1Error = isPipe1Tls || isPipe1Syn;

  const isPipe2Mtu = id === 'e-ingress-wire' && activeScenario === 'pipe2-mtu-blackhole';
  const isPipe2Netpol = id === 'e-ingress-wire' && activeScenario === 'pipe2-netpol-block';
  const isPipe2Error = isPipe2Mtu || isPipe2Netpol;

  const isPipe3DirectBuf = id === 'e-wire-pod' && activeScenario === 'pipe3-direct-byte-buffer';
  const isPipe3Sasl = id === 'e-wire-pod' && activeScenario === 'pipe3-sasl-auth';
  const isPipe3Error = isPipe3DirectBuf || isPipe3Sasl;

  const isPipe4Lock = id === 'e-pod-storage' && activeScenario === 'pipe4-multi-attach-lock';
  const isPipe4Timeout = id === 'e-pod-storage' && activeScenario === 'pipe4-csi-grpc-timeout';
  const isPipe4Error = isPipe4Lock || isPipe4Timeout;

  const isCurrentEdgeError = isPipe1Error || isPipe2Error || isPipe3Error || isPipe4Error;

  const getEdgeLabel = () => {
    if (isPipe1Tls) return 'mTLS Handshake Failed (PKIX Expired)';
    if (isPipe1Syn) return 'NLB SYN Flood (ETIMEDOUT)';
    if (isPipe2Mtu) return 'ICMP 3, 4: Need to Frag (1550B > 1500B)';
    if (isPipe2Netpol) return 'NetworkPolicy: Deny-All Ingress';
    if (isPipe3DirectBuf) return 'DirectByteBuffer OOM Stall';
    if (isPipe3Sasl) return 'SASL Auth Rejection';
    if (isPipe4Lock) return 'Multi-Attach Exclusive Lock';
    if (isPipe4Timeout) return 'CSI gRPC DeadlineExceeded';
    return null;
  };

  const label = getEdgeLabel();

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: isCurrentEdgeError ? '#ef4444' : '#00e5ff',
          strokeWidth: isCurrentEdgeError ? 3 : 2.5,
          strokeDasharray: isCurrentEdgeError ? '5 5' : undefined,
        }}
      />

      {/* Interactive label renderer for failure badge */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-2 py-0.5 rounded bg-red-950/90 border border-red-500/80 text-[10px] font-mono text-red-300 font-bold shadow-lg shadow-red-950/80 animate-pulse whitespace-nowrap"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Animated SVG Particle */}
      {!isCurrentEdgeError && (
        <circle r="4" fill="#00e5ff" className="filter drop-shadow">
          <animateMotion dur="1.6s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* Trailing particle */}
      {!isCurrentEdgeError && (
        <circle r="2.5" fill="#a5f3fc" opacity="0.6">
          <animateMotion dur="1.6s" begin="0.3s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
});
PacketFlowEdge.displayName = 'PacketFlowEdge';
