import { create } from 'zustand';
import { SimulationState, FailureScenarioId, FailureCategory, FailureScenarioInfo } from '../types/simulation';

export const SCENARIOS: Record<FailureScenarioId, FailureScenarioInfo> = {
  nominal: {
    id: 'nominal',
    category: 'nominal',
    componentName: 'Full Pipeline',
    componentType: 'node',
    title: 'System Nominal: End-to-End Healthy Stream',
    errorSignature: 'NONE (100% Ingestion SLA Reconciled)',
    description: 'All 5 nodes and 4 interconnecting pipelines are operating within nominal thresholds. Zero packet drops, un-throttled NVMe I/O, and clean cgroup memory allocations.',
    suggestedCommands: ['tcpdump -nnvv -i eth0', 'dmesg -T', 'kubectl describe pod kafka-broker-0', 'df -h'],
    remediationCommand: 'N/A (Healthy)',
  },

  // Node 1: Edge Telemetry
  'node1-buffer-exhaustion': {
    id: 'node1-buffer-exhaustion',
    category: 'node-1',
    componentName: 'Node 1: EDGE TELEMETRY',
    componentType: 'node',
    title: 'Local Buffer Ring Exhaustion',
    errorSignature: 'BufferOverflowException: queue full (10000/10000 events)',
    description: 'The edge forwarder memory queue fills completely because downstream network dispatch is blocked. Agent drops 42,100 high-frequency sensor records due to backpressure exhaustion.',
    suggestedCommands: ['cat /var/log/edge-agent.log', 'iot-agent status', 'iot-agent flush-buffer'],
    remediationCommand: 'iot-agent flush-buffer',
  },
  'node1-schema-violation': {
    id: 'node1-schema-violation',
    category: 'node-1',
    componentName: 'Node 1: EDGE TELEMETRY',
    componentType: 'node',
    title: 'Serialization Schema Registry Violation',
    errorSignature: 'SchemaNotFoundException: failed to fetch schema ID 412',
    description: 'Forwarder attempts to serialize telemetry records that do not match the expected Schema Registry definition (AvroTypeException: Expected field "thermal_c" not found).',
    suggestedCommands: ['curl -s http://schema-registry:8081/subjects', 'iot-agent schema-check', 'iot-agent reload-schema'],
    remediationCommand: 'iot-agent reload-schema',
  },

  // Pipeline 1: Edge to Ingress
  'pipe1-tls-handshake': {
    id: 'pipe1-tls-handshake',
    category: 'pipe-1',
    componentName: 'Pipeline 1 → 2: EDGE to INGRESS',
    componentType: 'pipeline',
    title: 'Mutual TLS Handshake & Cert Expiration',
    errorSignature: 'SSLHandshakeException: PKIX path building failed: unable to find valid certification path',
    description: 'Mutual TLS (mTLS) fails between the edge collector and perimeter load balancer due to an expired root CA or untrusted intermediate cert (sslv3 alert handshake failure).',
    suggestedCommands: ['openssl s_client -connect ingress.lakehouse.local:9092', 'curl -Iv https://ingress.lakehouse.local:9092', 'renew-cert'],
    remediationCommand: 'renew-cert',
  },
  'pipe1-nlb-syn-flood': {
    id: 'pipe1-nlb-syn-flood',
    category: 'pipe-1',
    componentName: 'Pipeline 1 → 2: EDGE to INGRESS',
    componentType: 'pipeline',
    title: 'L4 NLB Connection Throttling (SYN Flood / Exhaustion)',
    errorSignature: 'TCP: request_sock_TCP: Possible SYN flooding on port 9092. Sending cookies.',
    description: 'Edge gateways generate thousands of concurrent reconnect bursts, saturating the Ingress NLB connection tracking table and triggering kernel SYN cookies and client timeouts.',
    suggestedCommands: ['netstat -s | grep -i listen', 'dmesg -T | grep -i syn', 'tune-syn-backlog'],
    remediationCommand: 'tune-syn-backlog',
  },

  // Node 2: Gateway Ingress
  'node2-coredns-nxdomain': {
    id: 'node2-coredns-nxdomain',
    category: 'node-2',
    componentName: 'Node 2: GATEWAY INGRESS',
    componentType: 'node',
    title: 'CoreDNS Internal Service Resolution Failure',
    errorSignature: 'dial tcp: lookup kafka-broker-0 on 10.96.0.10:53: no such host (NXDOMAIN)',
    description: 'The Ingress controller cannot resolve internal headless cluster Service names for downstream Kafka broker endpoints due to CoreDNS pod crash or upstream packet drops.',
    suggestedCommands: ['dig kafka-broker-0.kafka-headless.svc.cluster.local @10.96.0.10', 'kubectl logs -n kube-system -l k8s-app=kube-dns', 'restart-coredns'],
    remediationCommand: 'restart-coredns',
  },
  'node2-target-503': {
    id: 'node2-target-503',
    category: 'node-2',
    componentName: 'Node 2: GATEWAY INGRESS',
    componentType: 'node',
    title: 'Target Group Backend Health Check Failure',
    errorSignature: 'dial tcp 10.244.2.89:9092: connect: connection refused (health check probe failure)',
    description: 'The L4 Ingress controller marks downstream Kafka broker targets as unhealthy after continuous TCP connection timeouts on port 9092.',
    suggestedCommands: ['kubectl describe ingress lakehouse-ingress', 'kubectl get endpoints kafka-headless', 'restart-broker'],
    remediationCommand: 'restart-broker',
  },

  // Pipeline 2: Ingress to Overlay
  'pipe2-mtu-blackhole': {
    id: 'pipe2-mtu-blackhole',
    category: 'pipe-2',
    componentName: 'Pipeline 2 → 3: INGRESS to CNI WIRE',
    componentType: 'pipeline',
    title: 'Path MTU Black Hole (Overlay Encapsulation)',
    errorSignature: 'ICMP 3, 4: Destination Unreachable (Fragmentation Needed and DF set)',
    description: 'Physical interface is 1500B. Payload (1460B) + TCP/IP (40B) + VXLAN overlay header (50B) = 1550B total wire size with DF bit set. Packets silently drop at the bridge.',
    suggestedCommands: ['tcpdump -nnvv -i eth0', 'ip link show flannel.1', 'fix-mtu'],
    remediationCommand: 'fix-mtu',
  },
  'pipe2-netpol-block': {
    id: 'pipe2-netpol-block',
    category: 'pipe-2',
    componentName: 'Pipeline 2 → 3: INGRESS to CNI WIRE',
    componentType: 'pipeline',
    title: 'Zero-Trust NetworkPolicy Ingress Block',
    errorSignature: 'packet dropped by policy "deny-all-ingress": TCP port 9092 not permitted',
    description: 'A newly committed NetworkPolicy omitted an explicit ingress allow rule for the Kafka 9092 listener. Packets crossing the CNI veth pair are rejected with silent timeouts.',
    suggestedCommands: ['kubectl get netpol -n lakehouse-infra', 'kubectl describe netpol deny-all-ingress', 'allow-netpol'],
    remediationCommand: 'allow-netpol',
  },

  // Node 3: CNI Overlay Wire
  'node3-conntrack-saturation': {
    id: 'node3-conntrack-saturation',
    category: 'node-3',
    componentName: 'Node 3: CNI OVERLAY WIRE',
    componentType: 'node',
    title: 'Linux Netfilter Conntrack Table Saturation',
    errorSignature: 'dmesg: nf_conntrack: table full, dropping packet',
    description: 'Thousands of rapid short-lived telemetry TCP connections exhaust the Linux kernel connection tracking state table (max 262,144 entries). New connections are immediately dropped.',
    suggestedCommands: ['conntrack -S', 'dmesg -T | grep -i conntrack', 'flush-conntrack'],
    remediationCommand: 'flush-conntrack',
  },
  'node3-ring-overflow': {
    id: 'node3-ring-overflow',
    category: 'node-3',
    componentName: 'Node 3: CNI OVERLAY WIRE',
    componentType: 'node',
    title: 'Socket Buffer Ring Overflow (rx_dropped)',
    errorSignature: 'flannel.1: RX dropped: 128,492 (NETDEV WATCHDOG: transmit queue timed out)',
    description: 'Virtual network interface socket ring buffer cannot dump packets to the CPU fast enough under high burst velocity, resulting in heavy kernel RX drop counts.',
    suggestedCommands: ['ethtool -S flannel.1', 'ifconfig flannel.1', 'tune-ring-buffer'],
    remediationCommand: 'tune-ring-buffer',
  },

  // Pipeline 3: Overlay to Broker
  'pipe3-direct-byte-buffer': {
    id: 'pipe3-direct-byte-buffer',
    category: 'pipe-3',
    componentName: 'Pipeline 3 → 4: CNI WIRE to KAFKA BROKER',
    componentType: 'pipeline',
    title: 'DirectByteBuffer Native Memory Allocation Stall',
    errorSignature: 'java.lang.OutOfMemoryError: Direct buffer memory (SocketChannel.read() failed)',
    description: 'The JVM runs out of off-heap direct buffer memory when allocating incoming network socket read buffers under high connection pressure.',
    suggestedCommands: ['jcmd 1 VM.native_memory baseline', 'kubectl logs kafka-broker-0', 'tune-direct-memory'],
    remediationCommand: 'tune-direct-memory',
  },
  'pipe3-sasl-auth': {
    id: 'pipe3-sasl-auth',
    category: 'pipe-3',
    componentName: 'Pipeline 3 → 4: CNI WIRE to KAFKA BROKER',
    componentType: 'pipeline',
    title: 'Broker SSL/SASL SCRAM Authentication Rejection',
    errorSignature: 'SaslAuthenticationException: Failed to configure SASL client: Client unable to authenticate',
    description: 'The Kafka broker TLS/SASL listener rejects incoming client credentials due to mismatched SCRAM-SHA-512 secrets or expired ACL credentials.',
    suggestedCommands: ['kubectl get secret kafka-jaas-secret -o yaml', 'crictl logs kafka-broker-0', 'rotate-sasl'],
    remediationCommand: 'rotate-sasl',
  },

  // Node 4: Kafka Broker
  'node4-cgroup-oom': {
    id: 'node4-cgroup-oom',
    category: 'node-4',
    componentName: 'Node 4: KAFKA-BROKER-0',
    componentType: 'node',
    title: 'cgroup v2 Hard Ceiling Breach (The OOM Reaper)',
    errorSignature: 'dmesg: Memory cgroup out of memory: Kill process 28412 (java) score 982 -> Exit Code 137',
    description: 'Combined memory (4096MB JVM Heap + 4350MB Netty direct buffers) exceeds the 8192MB Linux cgroup hard limit. The kernel OOM-killer sends SIGKILL (Signal 9).',
    suggestedCommands: ['dmesg -T | grep -i oom', 'kubectl describe pod kafka-broker-0', 'resolve-oom'],
    remediationCommand: 'resolve-oom',
  },
  'node4-under-replicated': {
    id: 'node4-under-replicated',
    category: 'node-4',
    componentName: 'Node 4: KAFKA-BROKER-0',
    componentType: 'node',
    title: 'Under-Replicated Partitions (ISR Quorum Collapse)',
    errorSignature: 'UnderReplicatedPartitions > 0: In-sync replicas (1) is less than configured minimum (2)',
    description: 'Disk write bottlenecks cause follower broker replicas to fall behind the high-water mark, dropping out of the In-Sync Replicas (ISR) quorum and stalling partition writes.',
    suggestedCommands: ['kafka-topics --describe --under-replicated-partitions', 'kafka-consumer-groups --describe', 'reassign-partitions'],
    remediationCommand: 'reassign-partitions',
  },

  // Pipeline 4: Broker to Storage
  'pipe4-multi-attach-lock': {
    id: 'pipe4-multi-attach-lock',
    category: 'pipe-4',
    componentName: 'Pipeline 4 → 5: KAFKA BROKER to CSI VOLUME',
    componentType: 'pipeline',
    title: 'Exclusive Lock Contention (Multi-Attach Error)',
    errorSignature: 'FailedAttachVolume: VolumeAttachment is already attached to site22-worker-03',
    description: 'Worker node crashed while holding an exclusive ReadWriteOnce AWS EBS / CSI volume lock. Replacement broker pod hangs in ContainerCreating until ungraceful shutdown taint or VolumeAttachment prune.',
    suggestedCommands: ['kubectl describe pod kafka-broker-2', 'kubectl get volumeattachment', 'apply-snr-fencing', 'unlock-storage'],
    remediationCommand: 'apply-snr-fencing',
  },
  'pipe4-csi-grpc-timeout': {
    id: 'pipe4-csi-grpc-timeout',
    category: 'pipe-4',
    componentName: 'Pipeline 4 → 5: KAFKA BROKER to CSI VOLUME',
    componentType: 'pipeline',
    title: 'CSI Storage Driver gRPC Controller Timeout',
    errorSignature: 'rpc error: code = DeadlineExceeded desc = context deadline exceeded while awaiting headers',
    description: 'The CSI storage driver controller pod times out communicating with cloud storage APIs during volume attachment, stalling PVC mount operations.',
    suggestedCommands: ['kubectl logs -n kube-system -l app=ebs-csi-controller', 'kubectl get csinodes', 'restart-csi'],
    remediationCommand: 'restart-csi',
  },

  // Node 5: CSI Volume
  'node5-ro-remount': {
    id: 'node5-ro-remount',
    category: 'node-5',
    componentName: 'Node 5: CSI VOLUME',
    componentType: 'node',
    title: 'Kernel Disk I/O Stall / Device Read-Only Remount',
    errorSignature: 'EXT4-fs error (device rbd0): deleted inode referenced -> Remounting filesystem read-only',
    description: 'Storage backend latency exceeded kernel timeouts, causing EXT4 file system errors and forcing the Linux kernel to remount /var/lib/kafka/data read-only to prevent corruption.',
    suggestedCommands: ['dmesg -T | grep -E "EXT4|I/O error"', 'mount | grep rbd0', 'fsck-remount-rw'],
    remediationCommand: 'fsck-remount-rw',
  },
  'node5-enospc': {
    id: 'node5-enospc',
    category: 'node-5',
    componentName: 'Node 5: CSI VOLUME',
    componentType: 'node',
    title: 'Volume Quota Depletion (Zero Inodes / 100% Disk Usage)',
    errorSignature: 'KafkaStorageException: No space left on device (ENOSPC: write failed)',
    description: 'Persistent volume runs completely out of disk blocks or directory inodes. Kafka broker initiates emergency self-shutdown (Fatal exit: shutdown requested by storage manager).',
    suggestedCommands: ['df -h /var/lib/kafka/data', 'df -i /var/lib/kafka/data', 'clean-log-dirs'],
    remediationCommand: 'clean-log-dirs',
  },
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  activeScenario: 'pipe2-mtu-blackhole',
  selectedComponent: 'pipe-2',
  scenarioInfo: SCENARIOS['pipe2-mtu-blackhole'],

  // Node 1
  edgeBufferCapacity: 10000,
  edgeBufferUsed: 10000,
  schemaRegistryStatus: 'HEALTHY',

  // Pipeline 1
  tlsCertStatus: 'VALID',
  nlbSynFloodActive: false,

  // Node 2
  coreDnsStatus: 'RESOLVING',
  ingressTargetStatus: 'HEALTHY',

  // Pipeline 2
  interfaceMtu: 1500,
  packetPayloadBytes: 1500,
  overlayEncapBytes: 50,
  networkPolicyIngressBlocked: false,

  // Node 3
  conntrackEntries: 48120,
  conntrackMax: 262144,
  socketRxDropped: 0,

  // Pipeline 3
  directBufferAllocStalled: false,
  saslAuthenticated: true,

  // Node 4
  jvmHeapMb: 4096,
  nettyDirectMb: 2048,
  cgroupLimitMb: 8192,
  podStatus: 'Running',
  podExitCode: null,
  underReplicatedPartitions: 0,
  inSyncReplicas: 3,
  minIsrConfig: 2,

  // Pipeline 4
  volumeLockedByNode: null,
  csiGrpcDeadlineExceeded: false,

  // Node 5
  filesystemStatus: 'rw',
  diskFreeMb: 245000,
  diskTotalMb: 500000,
  inodeUsagePercent: 32,

  logs: [
    { timestamp: '16:14:02', level: 'info', message: 'Platform Flight Simulator initialized with 18-Scenario Failure Taxonomy.' },
    { timestamp: '16:14:03', level: 'warn', message: 'Active Anomaly: Path MTU Black Hole engaged on Pipeline 2 → 3.' },
  ],

  setScenario: (id: FailureScenarioId) => {
    const info = SCENARIOS[id];
    const timestamp = new Date().toLocaleTimeString();

    // Reset base baseline
    const updates: Partial<SimulationState> = {
      activeScenario: id,
      selectedComponent: info.category,
      scenarioInfo: info,
      edgeBufferUsed: 2150,
      schemaRegistryStatus: 'HEALTHY',
      tlsCertStatus: 'VALID',
      nlbSynFloodActive: false,
      coreDnsStatus: 'RESOLVING',
      ingressTargetStatus: 'HEALTHY',
      interfaceMtu: 1500,
      networkPolicyIngressBlocked: false,
      conntrackEntries: 48120,
      socketRxDropped: 0,
      directBufferAllocStalled: false,
      saslAuthenticated: true,
      jvmHeapMb: 4096,
      nettyDirectMb: 2048,
      podStatus: 'Running',
      podExitCode: null,
      underReplicatedPartitions: 0,
      inSyncReplicas: 3,
      volumeLockedByNode: null,
      csiGrpcDeadlineExceeded: false,
      filesystemStatus: 'rw',
      diskFreeMb: 245000,
      inodeUsagePercent: 32,
    };

    // Apply specific scenario anomalies
    switch (id) {
      case 'nominal':
        updates.interfaceMtu = 1420;
        break;
      case 'node1-buffer-exhaustion':
        updates.edgeBufferUsed = 10000;
        break;
      case 'node1-schema-violation':
        updates.schemaRegistryStatus = 'SCHEMA_NOT_FOUND';
        break;
      case 'pipe1-tls-handshake':
        updates.tlsCertStatus = 'EXPIRED_OR_UNTRUSTED';
        break;
      case 'pipe1-nlb-syn-flood':
        updates.nlbSynFloodActive = true;
        break;
      case 'node2-coredns-nxdomain':
        updates.coreDnsStatus = 'NXDOMAIN_ERROR';
        break;
      case 'node2-target-503':
        updates.ingressTargetStatus = 'UPSTREAM_503';
        break;
      case 'pipe2-mtu-blackhole':
        updates.interfaceMtu = 1500;
        updates.packetPayloadBytes = 1500;
        break;
      case 'pipe2-netpol-block':
        updates.networkPolicyIngressBlocked = true;
        break;
      case 'node3-conntrack-saturation':
        updates.conntrackEntries = 262144;
        break;
      case 'node3-ring-overflow':
        updates.socketRxDropped = 128492;
        break;
      case 'pipe3-direct-byte-buffer':
        updates.directBufferAllocStalled = true;
        break;
      case 'pipe3-sasl-auth':
        updates.saslAuthenticated = false;
        break;
      case 'node4-cgroup-oom':
        updates.nettyDirectMb = 4350;
        updates.podStatus = 'CrashLoopBackOff';
        updates.podExitCode = 137;
        break;
      case 'node4-under-replicated':
        updates.underReplicatedPartitions = 8;
        updates.inSyncReplicas = 1;
        updates.podStatus = 'Degraded';
        break;
      case 'pipe4-multi-attach-lock':
        updates.volumeLockedByNode = 'node-b-storage-az1';
        updates.podStatus = 'ContainerCreating';
        break;
      case 'pipe4-csi-grpc-timeout':
        updates.csiGrpcDeadlineExceeded = true;
        updates.podStatus = 'ContainerCreating';
        break;
      case 'node5-ro-remount':
        updates.filesystemStatus = 'ro';
        updates.podStatus = 'Degraded';
        break;
      case 'node5-enospc':
        updates.diskFreeMb = 0;
        updates.inodeUsagePercent = 100;
        updates.podStatus = 'CrashLoopBackOff';
        break;
    }

    set((state) => ({
      ...updates,
      logs: [
        ...state.logs,
        { timestamp, level: 'warn', message: `CHAOS INJECTED: [${info.componentName}] ${info.title}` },
        { timestamp, level: 'error', message: `Signature: ${info.errorSignature}` },
      ],
    }));
  },

  selectComponent: (cat: FailureCategory | null) => {
    set({ selectedComponent: cat });
  },

  resolveActiveFailure: () => {
    const { activeScenario, scenarioInfo } = get();
    const timestamp = new Date().toLocaleTimeString();

    set((state) => ({
      activeScenario: 'nominal',
      scenarioInfo: SCENARIOS['nominal'],
      edgeBufferUsed: 2150,
      schemaRegistryStatus: 'HEALTHY',
      tlsCertStatus: 'VALID',
      nlbSynFloodActive: false,
      coreDnsStatus: 'RESOLVING',
      ingressTargetStatus: 'HEALTHY',
      interfaceMtu: 1420,
      networkPolicyIngressBlocked: false,
      conntrackEntries: 48120,
      socketRxDropped: 0,
      directBufferAllocStalled: false,
      saslAuthenticated: true,
      jvmHeapMb: 4096,
      nettyDirectMb: 2048,
      podStatus: 'Running',
      podExitCode: null,
      underReplicatedPartitions: 0,
      inSyncReplicas: 3,
      volumeLockedByNode: null,
      csiGrpcDeadlineExceeded: false,
      filesystemStatus: 'rw',
      diskFreeMb: 245000,
      inodeUsagePercent: 32,
      logs: [
        ...state.logs,
        {
          timestamp,
          level: 'success',
          message: `REMEDIATION SUCCESS: Resolved [${scenarioInfo.title}]. All nodes and pipelines restored to nominal health.`,
        },
      ],
    }));
  },

  resetToNominal: () => {
    get().resolveActiveFailure();
  },

  executeCommand: (cmd: string): string => {
    const trimmed = cmd.trim();
    const state = get();
    const { activeScenario, scenarioInfo } = state;

    if (trimmed === 'clear') return '';
    if (trimmed === 'help') {
      return `Platform Flight Simulator Diagnostic & Triage CLI
Active Scenario: [${scenarioInfo.componentName}] ${scenarioInfo.title}
Suggested Triage Commands:
  ${scenarioInfo.suggestedCommands.map((c) => `- ${c}`).join('\n  ')}
Quick Remediation Command:
  - ${scenarioInfo.remediationCommand}
Type "nominal" to reset the entire pipeline to healthy state.`;
    }

    if (trimmed === 'nominal' || trimmed === 'reset') {
      get().resetToNominal();
      return '[+] Simulation reset: All 5 nodes and 4 pipelines restored to nominal health.';
    }

    // Node 1: Buffer Exhaustion
    if (activeScenario === 'node1-buffer-exhaustion') {
      if (trimmed.includes('edge-agent.log') || trimmed.includes('status')) {
        return `[ERROR] io.netty.buffer.BufferOverflowException: queue full (10000/10000 events)
[WARN] EdgeTelemetryAgent: Backpressure ring buffer limit exceeded.
[WARN] agent dropped 42,100 events: network bridge is blocked or stalling.`;
      }
      if (trimmed === 'iot-agent flush-buffer' || trimmed === 'flush-buffer') {
        get().resolveActiveFailure();
        return `[+] Flushed stagnant buffer queues. Edge agent ring buffer drained to 2,150/10,000 events.
Telemetry dispatch resumed!`;
      }
    }

    // Node 1: Schema Violation
    if (activeScenario === 'node1-schema-violation') {
      if (trimmed.includes('schema') || trimmed.includes('subjects')) {
        return `SchemaNotFoundException: failed to fetch schema ID 412
org.apache.avro.AvroTypeException: Expected field 'thermal_c' not found in incoming payload
Record header: { schemaId: 412, version: 3, subject: "telemetry-value" } [INVALID]`;
      }
      if (trimmed === 'iot-agent reload-schema' || trimmed === 'reload-schema') {
        get().resolveActiveFailure();
        return `[+] Synced Schema Registry client cache. Schema ID 412 validated and registered.
Payload serialization resumed!`;
      }
    }

    // Pipeline 1: TLS Handshake
    if (activeScenario === 'pipe1-tls-handshake') {
      if (trimmed.includes('openssl') || trimmed.includes('curl')) {
        return `CONNECTED(00000003)
depth=0 CN = ingress.lakehouse.local
verify error:num=10:certificate has expired
notAfter=Sep 12 18:00:00 2026 GMT
SSLHandshakeException: PKIX path building failed: unable to find valid certification path
curl: (35) error:14094410:SSL routines:ssl3_read_bytes:sslv3 alert handshake failure`;
      }
      if (trimmed === 'renew-cert' || trimmed.includes('cert-manager')) {
        get().resolveActiveFailure();
        return `[+] Root CA renewed and rotated via cert-manager. Secret lakehouse-tls refreshed.
mTLS handshake succeeded: TLSv1.3 / TLS_AES_256_GCM_SHA384!`;
      }
    }

    // Pipeline 1: NLB SYN Flood
    if (activeScenario === 'pipe1-nlb-syn-flood') {
      if (trimmed.includes('netstat') || trimmed.includes('dmesg')) {
        return `[14298.112940] TCP: request_sock_TCP: Possible SYN flooding on port 9092. Sending cookies. Check SNMP counters.
TCPListenOverflows: 48,192
TCPListenDrops: 12,402
client timeout: ETIMEDOUT: Connection timed out after 30000ms`;
      }
      if (trimmed === 'tune-syn-backlog' || trimmed.includes('tcp_max_syn_backlog')) {
        get().resolveActiveFailure();
        return `[+] sysctl net.ipv4.tcp_max_syn_backlog set to 8192. NLB target group connection queue expanded.
SYN backlog cleared. Ingress connections accepted!`;
      }
    }

    // Node 2: CoreDNS NXDOMAIN
    if (activeScenario === 'node2-coredns-nxdomain') {
      if (trimmed.includes('dig') || trimmed.includes('lookup') || trimmed.includes('logs')) {
        return `;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 48122
;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 0
;; QUESTION SECTION:
;kafka-broker-0.kafka-headless.svc.cluster.local. IN A
;; AUTHORITY SECTION:
cluster.local.		30	IN	SOA	ns.dns.cluster.local. hostmaster.cluster.local. 1726240000
dial tcp: lookup kafka-broker-0 on 10.96.0.10:53: no such host`;
      }
      if (trimmed === 'restart-coredns' || trimmed.includes('coredns')) {
        get().resolveActiveFailure();
        return `[+] CoreDNS deployment rolled out. Cluster DNS cache flushed.
Resolving kafka-broker-0.kafka-headless.svc.cluster.local -> 10.244.2.14 [OK]!`;
      }
    }

    // Node 2: Target TCP Probe Failure
    if (activeScenario === 'node2-target-503') {
      if (trimmed.includes('describe ingress') || trimmed.includes('endpoints')) {
        return `Default backend: default-tcp-backend:9092 (<none: no healthy endpoints>)
Rules:
  Host                    Port  Backends
  ingress.lakehouse.local 9092  kafka-headless:9092 (<none: 0/3 targets healthy>)
Annotations:
  service.beta.kubernetes.io/aws-load-balancer-backend-protocol: tcp
Events:
  Warning  Unhealthy  Readiness probe failed: dial tcp 10.244.2.89:9092: connect: connection refused
dial tcp 10.244.2.89:9092: connect: connection refused (health check probe failure)`;
      }
      if (trimmed === 'restart-broker' || trimmed.includes('restart')) {
        get().resolveActiveFailure();
        return `[+] Kafka broker pod probes passing. Target group marked HEALTHY (10.244.2.14:9092).
TCP probe restored. Ingress traffic forwarded!`;
      }
    }

    // Pipeline 2: MTU Black Hole
    if (activeScenario === 'pipe2-mtu-blackhole') {
      if (trimmed.includes('tcpdump')) {
        return `16:15:01.458291 IP 10.244.1.15.9092 > 10.244.2.14.9092: Flags [P.], seq 1:1460, length 1460
16:15:01.458315 IP 10.244.2.1 > 10.244.1.15: ICMP 10.244.2.14 unreachable - need to frag (mtu 1420), length 556
16:15:01.460112 IP 10.244.1.15.9092 > 10.244.2.14.9092: Flags [P.], seq 1:1460, length 1460 (RETRANSMIT, DF bit set)
flannel.1 drop counter: FRAME_TOO_LONG: 48,291`;
      }
      if (trimmed === 'fix-mtu' || trimmed.includes('1420')) {
        get().resolveActiveFailure();
        return `[+] CNI DaemonSet overlay MTU clamped to 1420B.
Path MTU (1420B payload + 50B VXLAN = 1470B < 1500B physical wire) verified clean.
Zero packet drops!`;
      }
    }

    // Pipeline 2: NetworkPolicy Block
    if (activeScenario === 'pipe2-netpol-block') {
      if (trimmed.includes('netpol')) {
        return `Name:         deny-all-ingress
Namespace:    lakehouse-infra
PodSelector:  app=kafka
Allowing ingress traffic:
  <none> (Default Deny Ingress)
packet dropped by policy 'deny-all-ingress': TCP connection timeout to 10.244.2.14:9092`;
      }
      if (trimmed === 'allow-netpol' || trimmed.includes('patch netpol')) {
        get().resolveActiveFailure();
        return `[+] NetworkPolicy patched: Ingress rule added permitting TCP port 9092 from Ingress namespace.
Packets allowed across overlay wire!`;
      }
    }

    // Node 3: Conntrack Saturation
    if (activeScenario === 'node3-conntrack-saturation') {
      if (trimmed.includes('conntrack') || trimmed.includes('dmesg')) {
        return `entries: 262144
max: 262144 (100% UTILIZATION)
dmesg: [18491.018241] nf_conntrack: table full, dropping packet
drop_count: 51,209 packets dropped by netfilter conntrack engine`;
      }
      if (trimmed === 'flush-conntrack' || trimmed.includes('conntrack_max')) {
        get().resolveActiveFailure();
        return `[+] sysctl net.netfilter.nf_conntrack_max doubled to 524288 and expired TIME_WAIT sockets flushed.
Conntrack saturation cleared!`;
      }
    }

    // Node 3: Ring Overflow
    if (activeScenario === 'node3-ring-overflow') {
      if (trimmed.includes('ethtool') || trimmed.includes('ifconfig')) {
        return `NIC statistics:
     rx_packets: 48,192,019
     rx_dropped: 128492
     rx_missed_errors: 128492
     rx_no_buffer_count: 98124
NETDEV WATCHDOG: eth0 (e1000e): transmit queue 0 timed out`;
      }
      if (trimmed === 'tune-ring-buffer' || trimmed.includes('rx 4096')) {
        get().resolveActiveFailure();
        return `[+] ethtool -G flannel.1 rx 4096 tx 4096 applied. Kernel ring buffer expanded.
rx_dropped counter halted at 0!`;
      }
    }

    // Pipeline 3: DirectByteBuffer OOM
    if (activeScenario === 'pipe3-direct-byte-buffer') {
      if (trimmed.includes('jcmd') || trimmed.includes('native_memory') || trimmed.includes('logs')) {
        return `java.lang.OutOfMemoryError: Direct buffer memory
	at java.base/java.nio.Bits.reserveMemory(Bits.java:178)
	at java.base/java.nio.DirectByteBuffer.<init>(DirectByteBuffer.java:118)
SocketChannel.read() threw java.io.IOException: Cannot allocate memory`;
      }
      if (trimmed === 'tune-direct-memory' || trimmed.includes('DirectMemory')) {
        get().resolveActiveFailure();
        return `[+] JVM options updated: -XX:MaxDirectMemorySize=4096m -XX:+UseLargePages.
Off-heap memory pool expanded. DirectByteBuffer allocation unblocked!`;
      }
    }

    // Pipeline 3: SASL Auth Failure
    if (activeScenario === 'pipe3-sasl-auth') {
      if (trimmed.includes('logs') || trimmed.includes('secret')) {
        return `[ERROR] [SocketServer listener-9092] Failed authentication with /10.244.1.15
org.apache.kafka.common.errors.SaslAuthenticationException: Failed to configure SASL client: Client unable to authenticate
javax.security.sasl.SaslException: DIGEST-MD5: authentication failed: invalid response`;
      }
      if (trimmed === 'rotate-sasl' || trimmed.includes('jaas')) {
        get().resolveActiveFailure();
        return `[+] SASL SCRAM-SHA-512 secret synchronized across client and broker JAAS configurations.
Client successfully authenticated to Kafka broker 0!`;
      }
    }

    // Node 4: cgroup OOM
    if (activeScenario === 'node4-cgroup-oom') {
      if (trimmed.includes('dmesg') || trimmed.includes('describe pod')) {
        return `[14022.184910] Memory cgroup out of memory: Kill process 28412 (java) score 982 or sacrifice child
[14022.184915] Killed process 28412 (java) total-vm:10824192kB, anon-rss:8389120kB
State: Waiting (CrashLoopBackOff)
Last State: Terminated (OOMKilled, Exit Code 137)`;
      }
      if (trimmed === 'resolve-oom' || trimmed.includes('MaxDirectMemorySize=2048')) {
        get().resolveActiveFailure();
        return `[+] JVM -XX:MaxDirectMemorySize clamped to 2048m. Total memory 6144MB <= 8192MB cgroup limit.
Container restarted into Running state!`;
      }
    }

    // Node 4: Under-Replicated Partitions
    if (activeScenario === 'node4-under-replicated') {
      if (trimmed.includes('kafka-topics') || trimmed.includes('under-replicated')) {
        return `Topic: telemetry-events	Partition: 0	Leader: 0	Replicas: 0,1,2	Isr: 0
Topic: telemetry-events	Partition: 1	Leader: 0	Replicas: 0,1,2	Isr: 0
[!] UnderReplicatedPartitions count: 8
org.apache.kafka.common.errors.NotEnoughReplicasException: Number of in-sync replicas 1 is less than configured minimum 2`;
      }
      if (trimmed === 'reassign-partitions' || trimmed.includes('reassign')) {
        get().resolveActiveFailure();
        return `[+] Triggered partition rebalance across brokers 0, 1, 2. Follower catch-up complete.
ISR restored: 3/3 in-sync. UnderReplicatedPartitions: 0!`;
      }
    }

    // Pipeline 4: Multi-Attach Lock
    if (activeScenario === 'pipe4-multi-attach-lock') {
      if (trimmed.includes('describe pod') || trimmed.includes('volumeattachment')) {
        return `Warning  FailedAttachVolume  11m (x8 over 12m)  attachdetach-controller
Multi-Attach error for volume "pvc-data-kafka-broker-2": Volume is already exclusively attached to site22-worker-03 and cannot be attached to site22-worker-05.
kubectl get volumeattachment:
csi-ebs-vol-08f12a38b19283f   site22-worker-03   true   12m`;
      }
      if (trimmed.includes('openshift-workload-availability') || trimmed.includes('get pods -n')) {
        return `NAME                                                READY   STATUS    RESTARTS   AGE
node-healthcheck-controller-manager-6b8c9d-f2x4a    1/1     Running   0          4m
self-node-remediation-controller-manager-7c4b-8m9q  1/1     Running   0          4m`;
      }
      if (trimmed.includes('jsonpath') || trimmed.includes('taints')) {
        return `[
  {
    "effect": "NoExecute",
    "key": "node.kubernetes.io/out-of-service",
    "value": "nodeshutdown"
  }
]`;
      }
      if (trimmed === 'apply-snr-fencing' || trimmed.includes('automated-node-fencing') || trimmed.includes('apply -k') || trimmed === 'auto-fence') {
        get().resolveActiveFailure();
        return `[+] Deployed NodeHealthCheck & SelfNodeRemediation Operator pipeline.
[+] NHC detected site22-worker-03 in Ready: Unknown / NotReady (T+60s).
[+] SNR Controller applied native taint: node.kubernetes.io/out-of-service=nodeshutdown:NoExecute.
[+] attachdetach-controller recognized out-of-service taint -> Stale VolumeAttachment deleted.
[+] Volume attached to site22-worker-05. kafka-broker-2 entered Running state!`;
      }
      if (trimmed === 'unlock-storage' || trimmed.includes('delete volumeattachment')) {
        get().resolveActiveFailure();
        return `[+] Stale VolumeAttachment for site22-worker-03 pruned from API server.
CSI driver attached volume to site22-worker-05. Replacement broker entered Running state!`;
      }
    }

    // Pipeline 4: CSI gRPC Timeout
    if (activeScenario === 'pipe4-csi-grpc-timeout') {
      if (trimmed.includes('logs') || trimmed.includes('csi')) {
        return `[ERROR] controller_helper.go:342] Error attaching volume: rpc error: code = DeadlineExceeded desc = context deadline exceeded while awaiting headers
grpc_status: 4 (DEADLINE_EXCEEDED)
AWS EBS API latency: 15420ms > 15000ms gRPC timeout threshold`;
      }
      if (trimmed === 'restart-csi' || trimmed.includes('csi-driver')) {
        get().resolveActiveFailure();
        return `[+] ebs-csi-controller restarted and client timeout increased to 30s.
Volume attached successfully!`;
      }
    }

    // Node 5: Read-Only Remount
    if (activeScenario === 'node5-ro-remount') {
      if (trimmed.includes('dmesg') || trimmed.includes('mount')) {
        return `[19482.019284] EXT4-fs error (device rbd0): ext4_lookup: deleted inode referenced: 104821
[19482.019310] Aborting journal on device rbd0-8.
[19482.019342] Remounting filesystem read-only.
KafkaStorageException: Disk error while writing to log file /var/lib/kafka/data/telemetry-0/0000000000.log`;
      }
      if (trimmed === 'fsck-remount-rw' || trimmed.includes('fsck')) {
        get().resolveActiveFailure();
        return `[+] Unmounted volume, executed fsck.ext4 -y /dev/rbd0 (journal replayed, 0 bad blocks), and remounted read-write.
Kafka storage manager re-initialized log directories!`;
      }
    }

    // Node 5: ENOSPC Disk Full
    if (activeScenario === 'node5-enospc') {
      if (trimmed.includes('df')) {
        return `Filesystem      Size  Used Avail Use% Mounted on
/dev/nvme0n1    500G  500G     0 100% /var/lib/kafka/data
Inodes:         100% utilized (0 free inodes)
KafkaStorageException: No space left on device
ENOSPC: write failed -> Broker initiates hard self-shutdown`;
      }
      if (trimmed === 'clean-log-dirs' || trimmed.includes('clean')) {
        get().resolveActiveFailure();
        return `[+] Pruned expired segment files past retention threshold (24h). 245GB / 500GB reclaimed.
Broker restarted with clean storage capacity!`;
      }
    }

    return `Command not recognized for active scenario: "${trimmed}". Type "help" to see valid triage commands.`;
  },
}));
