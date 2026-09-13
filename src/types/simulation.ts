export type FailureScenarioId =
  | 'nominal'
  // Node 1: Edge Telemetry
  | 'node1-buffer-exhaustion'
  | 'node1-schema-violation'
  // Pipeline 1 -> 2: Edge to Gateway Ingress
  | 'pipe1-tls-handshake'
  | 'pipe1-nlb-syn-flood'
  // Node 2: Gateway Ingress
  | 'node2-coredns-nxdomain'
  | 'node2-target-503'
  // Pipeline 2 -> 3: Gateway Ingress to CNI Wire
  | 'pipe2-mtu-blackhole'
  | 'pipe2-netpol-block'
  // Node 3: CNI Overlay Wire
  | 'node3-conntrack-saturation'
  | 'node3-ring-overflow'
  // Pipeline 3 -> 4: CNI Wire to Kafka Broker
  | 'pipe3-direct-byte-buffer'
  | 'pipe3-sasl-auth'
  // Node 4: Kafka Broker
  | 'node4-cgroup-oom'
  | 'node4-under-replicated'
  // Pipeline 4 -> 5: Kafka Broker to CSI Volume
  | 'pipe4-multi-attach-lock'
  | 'pipe4-csi-grpc-timeout'
  // Node 5: CSI Volume
  | 'node5-ro-remount'
  | 'node5-enospc';

export type FailureCategory =
  | 'node-1'
  | 'pipe-1'
  | 'node-2'
  | 'pipe-2'
  | 'node-3'
  | 'pipe-3'
  | 'node-4'
  | 'pipe-4'
  | 'node-5'
  | 'nominal';

export interface FailureScenarioInfo {
  id: FailureScenarioId;
  category: FailureCategory;
  componentName: string;
  componentType: 'node' | 'pipeline';
  title: string;
  errorSignature: string;
  description: string;
  suggestedCommands: string[];
  remediationCommand: string;
}

export interface SimulationState {
  activeScenario: FailureScenarioId;
  selectedComponent: FailureCategory | null;
  scenarioInfo: FailureScenarioInfo;
  
  // Dynamic component telemetry states
  // Node 1: Edge Telemetry
  edgeBufferCapacity: number;
  edgeBufferUsed: number;
  schemaRegistryStatus: 'HEALTHY' | 'SCHEMA_NOT_FOUND';
  
  // Pipeline 1: Edge to Ingress
  tlsCertStatus: 'VALID' | 'EXPIRED_OR_UNTRUSTED';
  nlbSynFloodActive: boolean;
  
  // Node 2: Gateway Ingress
  coreDnsStatus: 'RESOLVING' | 'NXDOMAIN_ERROR';
  ingressTargetStatus: 'HEALTHY' | 'UPSTREAM_503';
  
  // Pipeline 2: Ingress to Overlay
  interfaceMtu: number;
  packetPayloadBytes: number;
  overlayEncapBytes: number;
  networkPolicyIngressBlocked: boolean;
  
  // Node 3: CNI Wire
  conntrackEntries: number;
  conntrackMax: number;
  socketRxDropped: number;
  
  // Pipeline 3: Overlay to Broker
  directBufferAllocStalled: boolean;
  saslAuthenticated: boolean;
  
  // Node 4: Kafka Broker
  jvmHeapMb: number;
  nettyDirectMb: number;
  cgroupLimitMb: number;
  podStatus: 'Running' | 'CrashLoopBackOff' | 'ContainerCreating' | 'Terminating' | 'Degraded';
  podExitCode: number | null;
  underReplicatedPartitions: number;
  inSyncReplicas: number;
  minIsrConfig: number;
  
  // Pipeline 4: Broker to Storage
  volumeLockedByNode: string | null;
  csiGrpcDeadlineExceeded: boolean;
  
  // Node 5: CSI Volume
  filesystemStatus: 'rw' | 'ro';
  diskFreeMb: number;
  diskTotalMb: number;
  inodeUsagePercent: number;

  // Logs
  logs: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'success'; message: string }>;

  // Actions
  setScenario: (id: FailureScenarioId) => void;
  selectComponent: (cat: FailureCategory | null) => void;
  resolveActiveFailure: () => void;
  executeCommand: (cmd: string) => string;
  resetToNominal: () => void;
}
