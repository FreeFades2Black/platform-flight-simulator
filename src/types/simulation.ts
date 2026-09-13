export type MissionId = 'mission-01' | 'mission-02' | 'mission-03' | 'mission-04';

export type PacketState = 'flowing' | 'bursting-mtu' | 'dropped-oom' | 'blocked-storage';

export interface PacketInfo {
  id: string;
  source: string;
  target: string;
  payloadBytes: number;
  encapOverhead: number;
  totalWireBytes: number;
  status: 'normal' | 'fragmentation-needed' | 'dropped';
}

export interface NodeStatus {
  id: string;
  name: string;
  role: 'sensor' | 'ingress' | 'cni-wire' | 'pod' | 'storage';
  health: 'healthy' | 'warning' | 'fatal';
  statusText: string;
  metrics: Record<string, string | number>;
}

export interface SimulationState {
  currentMission: MissionId;
  missionTitle: string;
  missionDescription: string;
  isChaosActive: boolean;
  packetState: PacketState;
  
  // Mission 01: MTU Wire Trap
  interfaceMtu: number;
  overlayEncapBytes: number;
  packetPayloadBytes: number;
  
  // Mission 02: OOM Invisible Reaper
  jvmHeapMb: number;
  nettyDirectMb: number;
  cgroupLimitMb: number;
  podRestartCount: number;
  podStatus: 'Running' | 'CrashLoopBackOff' | 'ContainerCreating' | 'Terminating';
  podExitCode: number | null;
  
  // Mission 03: Frozen Disk CSI Lock
  volumeLockedByNode: string | null;
  volumeTargetNode: string;
  isVolumeAttached: boolean;
  
  // Mission 04: Zombie Finalizer
  activeFinalizers: string[];
  isDeletionRequested: boolean;
  
  // Command logs & telemetry
  logs: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'success'; message: string }>;
  
  // Actions
  setMission: (id: MissionId) => void;
  triggerChaos: () => void;
  fixMtuClamp: (mtu: number) => void;
  tuneJvmMemory: (heapMb: number, offHeapLimitMb: number) => void;
  pruneVolumeAttachmentLock: () => void;
  stripFinalizers: () => void;
  resetMission: () => void;
  executeCommand: (cmd: string) => string;
}
