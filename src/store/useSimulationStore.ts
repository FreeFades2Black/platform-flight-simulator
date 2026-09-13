import { create } from 'zustand';
import { SimulationState, MissionId } from '../types/simulation';

const MISSION_METADATA: Record<MissionId, { title: string; desc: string }> = {
  'mission-01': {
    title: 'Mission 01: The Wire Trap (MTU Misclamp)',
    desc: 'CNI overlay MTU is set to 1500, but VXLAN adds 50B encapsulation. High-throughput telemetry batches exceed the path MTU and freeze at the bridge with DF (Don\'t Fragment) set.',
  },
  'mission-02': {
    title: 'Mission 02: The Invisible Reaper (Netty Off-Heap OOM)',
    desc: 'High connection concurrency drives Netty direct memory buffers beyond the 8GiB Linux cgroup hard ceiling. The kernel OOM-killer terminates the pod with Exit Code 137.',
  },
  'mission-03': {
    title: 'Mission 03: The Frozen Disk (Stale CSI VolumeAttachment)',
    desc: 'Node B crashes ungracefully while holding an exclusive cloud disk lock. The replacement pod on Node C hangs indefinitely in ContainerCreating with Multi-Attach error.',
  },
  'mission-04': {
    title: 'Mission 04: The Zombie Finalizer (Orphaned Operator)',
    desc: 'The operator CRD was removed before the managed Kafka cluster finished teardown. The pod stays locked in Terminating forever due to dangling metadata.finalizers.',
  },
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  currentMission: 'mission-01',
  missionTitle: MISSION_METADATA['mission-01'].title,
  missionDescription: MISSION_METADATA['mission-01'].desc,
  isChaosActive: true,
  packetState: 'bursting-mtu',

  // Mission 01 defaults (Chaos: 1500B payload + 50B encap = 1550B > 1500B MTU)
  interfaceMtu: 1500,
  overlayEncapBytes: 50,
  packetPayloadBytes: 1500,

  // Mission 02 defaults
  jvmHeapMb: 4096,
  nettyDirectMb: 4350,
  cgroupLimitMb: 8192,
  podRestartCount: 4,
  podStatus: 'Running',
  podExitCode: null,

  // Mission 03 defaults
  volumeLockedByNode: 'node-b-storage-az1',
  volumeTargetNode: 'node-c-compute-az1',
  isVolumeAttached: false,

  // Mission 04 defaults
  activeFinalizers: ['strimzi.io/kafka-broker-finalizer'],
  isDeletionRequested: false,

  logs: [
    { timestamp: '14:02:11', level: 'info', message: 'Platform Flight Simulator initialized in Guided Sandbox mode.' },
    { timestamp: '14:02:12', level: 'warn', message: 'ACTIVE ANOMALY: Telemetry stream dropping frames at flannel.1 overlay interface.' },
  ],

  setMission: (id: MissionId) => {
    const meta = MISSION_METADATA[id];
    let packetState: SimulationState['packetState'] = 'flowing';
    let podStatus: SimulationState['podStatus'] = 'Running';

    if (id === 'mission-01') packetState = 'bursting-mtu';
    if (id === 'mission-02') {
      packetState = 'dropped-oom';
      podStatus = 'CrashLoopBackOff';
    }
    if (id === 'mission-03') {
      packetState = 'blocked-storage';
      podStatus = 'ContainerCreating';
    }
    if (id === 'mission-04') {
      podStatus = 'Terminating';
    }

    set({
      currentMission: id,
      missionTitle: meta.title,
      missionDescription: meta.desc,
      isChaosActive: true,
      packetState,
      podStatus,
      interfaceMtu: id === 'mission-01' ? 1500 : 1420,
      volumeLockedByNode: id === 'mission-03' ? 'node-b-storage-az1' : null,
      isVolumeAttached: id !== 'mission-03',
      activeFinalizers: id === 'mission-04' ? ['strimzi.io/kafka-broker-finalizer'] : [],
      isDeletionRequested: id === 'mission-04',
      logs: [
        { timestamp: new Date().toLocaleTimeString(), level: 'info', message: `Switched to ${meta.title}` },
        { timestamp: new Date().toLocaleTimeString(), level: 'warn', message: 'Failure scenario engaged. Inspect topology and triage via terminal.' },
      ],
    });
  },

  triggerChaos: () => {
    const { currentMission } = get();
    get().setMission(currentMission);
  },

  fixMtuClamp: (mtu: number) => {
    set((state) => ({
      interfaceMtu: mtu,
      isChaosActive: false,
      packetState: 'flowing',
      logs: [
        ...state.logs,
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `REMEDIATION APPLIED: CNI overlay MTU clamped to ${mtu}B. Path MTU (1420B + 50B encap = 1470B < 1500B) verified clean!`,
        },
      ],
    }));
  },

  tuneJvmMemory: (heapMb: number, offHeapLimitMb: number) => {
    set((state) => ({
      jvmHeapMb: heapMb,
      nettyDirectMb: offHeapLimitMb,
      podStatus: 'Running',
      podExitCode: null,
      isChaosActive: false,
      packetState: 'flowing',
      logs: [
        ...state.logs,
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: `REMEDIATION APPLIED: JVM MaxDirectMemorySize tuned to ${offHeapLimitMb}MB. Total memory (Heap + Direct = ${heapMb + offHeapLimitMb}MB < ${state.cgroupLimitMb}MB cgroup) within safety envelope!`,
        },
      ],
    }));
  },

  pruneVolumeAttachmentLock: () => {
    set((state) => ({
      volumeLockedByNode: null,
      isVolumeAttached: true,
      podStatus: 'Running',
      isChaosActive: false,
      packetState: 'flowing',
      logs: [
        ...state.logs,
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: 'REMEDIATION APPLIED: Stale VolumeAttachment lock deleted. CSI controller attached volume to node-c successfully.',
        },
      ],
    }));
  },

  stripFinalizers: () => {
    set((state) => ({
      activeFinalizers: [],
      isDeletionRequested: false,
      podStatus: 'Running',
      isChaosActive: false,
      logs: [
        ...state.logs,
        {
          timestamp: new Date().toLocaleTimeString(),
          level: 'success',
          message: 'REMEDIATION APPLIED: Orphan finalizer removed via merge patch. Object successfully reaped from etcd.',
        },
      ],
    }));
  },

  resetMission: () => {
    const { currentMission } = get();
    get().setMission(currentMission);
  },

  executeCommand: (cmd: string): string => {
    const trimmed = cmd.trim();
    const state = get();
    const { currentMission, isChaosActive, interfaceMtu } = state;

    if (trimmed === 'clear') {
      return '';
    }

    if (trimmed === 'help') {
      return `Available Triage Commands:
  - tcpdump -nnvv -i eth0 / flannel.1
  - ip link show / ip link set mtu <val>
  - kubectl describe pod kafka-broker-0
  - dmesg -T | grep -i oom
  - kubectl get volumeattachment,pvc,pv
  - kubectl patch volumeattachment ... --dry-run
  - kubectl edit daemonset -n kube-system cni-vxlan
  - kubectl patch pod kafka-broker-0 --type=merge -p '{"metadata":{"finalizers":null}}'
  - fix-mtu / resolve-oom / unlock-storage / strip-finalizer (quick fixes)`;
    }

    // Mission 01: MTU
    if (currentMission === 'mission-01') {
      if (trimmed.includes('tcpdump')) {
        if (isChaosActive) {
          return `14:03:01.458291 IP 10.244.1.15.9092 > 10.244.2.40.9092: Flags [P.], seq 1:1460, ack 1, length 1460
14:03:01.458315 IP 10.244.2.1 > 10.244.1.15: ICMP 10.244.2.40 unreachable - need to frag (mtu 1420), length 556
14:03:01.460112 IP 10.244.1.15.9092 > 10.244.2.40.9092: Flags [P.], seq 1:1460, ack 1 (RETRANSMIT, DF bit set)
[!] Packet size (1500B + 50B VXLAN) > Interface MTU (1500B). Packets dropped by kernel!`;
        } else {
          return `14:03:15.112901 IP 10.244.1.15.9092 > 10.244.2.40.9092: Flags [.], ack 1420, win 65535, length 0
14:03:15.113042 IP 10.244.1.15.9092 > 10.244.2.40.9092: Flags [P.], seq 1:1420, length 1420 (Path MTU 1470B < 1500B OK)
[+] Bidirectional telemetry flow verified. Zero packet drops observed.`;
        }
      }

      if (trimmed.includes('ip link') || trimmed.includes('ifconfig')) {
        return `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP
3: flannel.1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu ${interfaceMtu} state UP
   vxlan id 1 local 172.31.20.10 dev eth0 dstport 8472`;
      }

      if (trimmed.includes('1420') || trimmed === 'fix-mtu') {
        get().fixMtuClamp(1420);
        return `[+] CNI DaemonSet config updated: overlay MTU clamped to 1420B.
Restarting cni-node pods... Done.
Verifying interface flannel.1 MTU... [ 1420 / 1420 ] PASS!
Packet flow restored across overlay bridge!`;
      }
    }

    // Mission 02: OOM
    if (currentMission === 'mission-02') {
      if (trimmed.includes('dmesg') || trimmed.includes('oom')) {
        return `[14022.184910] Memory cgroup out of memory: Kill process 89124 (java) score 982 or sacrifice child
[14022.184915] Killed process 89124 (java) total-vm:10824192kB, anon-rss:8389120kB, file-rss:4120kB
[14022.185012] oom_reaper: reaped process 89124 (java), now anon-rss:0kB, file-rss:0kB
Kernel Signal: SIGKILL (Signal 9) -> Container exit code 137`;
      }

      if (trimmed.includes('describe pod')) {
        return `Name:         kafka-broker-0
Namespace:    lakehouse-infra
State:        Waiting
  Reason:     CrashLoopBackOff
Last State:   Terminated
  Reason:     OOMKilled
  Exit Code:  137
Limits:
  memory:     8Gi
Requests:
  memory:     8Gi
Environment:
  KAFKA_JVM_PERFORMANCE_OPTS: -XX:MaxDirectMemorySize=5120m -Xmx4096m
Events:
  Warning  BackOff   2s (x4 over 3m)  kubelet  Back-off restarting failed container`;
      }

      if (trimmed.includes('resolve-oom') || trimmed.includes('MaxDirectMemorySize=2048') || trimmed.includes('DirectMemory')) {
        get().tuneJvmMemory(4096, 2048);
        return `[+] Manifest patched: -XX:MaxDirectMemorySize clamped to 2048m.
Total container memory allocation: 4096m (Heap) + 2048m (Direct) + 512m (Metaspace/Stack) = 6656m <= 8192m cgroup limit.
Pod kafka-broker-0 restarted and reached Running state!`;
      }
    }

    // Mission 03: CSI Lock
    if (currentMission === 'mission-03') {
      if (trimmed.includes('describe pod')) {
        return `Name:         kafka-broker-0-replacement
Node:         node-c-compute-az1
Status:       Pending
Containers:
  kafka:
    State:    Waiting
      Reason: ContainerCreating
Events:
  Warning  FailedAttachVolume  8s (x12 over 6m)  attachdetach-controller
           Multi-Attach error for volume "pvc-telemetry-0" Volume is already exclusively attached to one node (node-b-storage-az1) and can't be attached to another`;
      }

      if (trimmed.includes('volumeattachment') || trimmed.includes('get va')) {
        return `NAME                                                                 ATTACHED   NODE                 AGE
csi-ebs-vol-08f12a38b19283f                                          true       node-b-storage-az1   48m
csi-ebs-vol-08f12a38b19283f-pending                                  false      node-c-compute-az1   6m`;
      }

      if (trimmed.includes('unlock-storage') || trimmed.includes('delete volumeattachment') || trimmed.includes('prune')) {
        get().pruneVolumeAttachmentLock();
        return `[+] Stale VolumeAttachment csi-ebs-vol-08f12a38b19283f pruned from API server.
Node B lease released.
attachdetach-controller successfully attached volume to node-c-compute-az1.
Pod kafka-broker-0-replacement entered Running status!`;
      }
    }

    // Mission 04: Zombie Finalizer
    if (currentMission === 'mission-04') {
      if (trimmed.includes('get pod') || trimmed.includes('describe pod')) {
        return `NAME             READY   STATUS        RESTARTS   AGE
kafka-broker-0   1/1     Terminating   0          18d

metadata:
  deletionTimestamp: "2026-09-13T14:01:00Z"
  finalizers:
  - strimzi.io/kafka-broker-finalizer
Status: Stuck in Terminating (controller deleted; finalizer cannot be processed)`;
      }

      if (trimmed.includes('strip-finalizer') || trimmed.includes('finalizers":null') || trimmed.includes('metadata.finalizers')) {
        get().stripFinalizers();
        return `[+] kubectl patch: metadata.finalizers removed from kafka-broker-0.
Object removed from etcd state store.
Namespace is clean!`;
      }
    }

    return `Command not recognized: "${trimmed}". Type "help" to view triage playbooks.`;
  },
}));
