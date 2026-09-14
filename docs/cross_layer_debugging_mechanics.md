# Where Standard Telemetry Lies: Cross-Layer Debugging Across CNI, JVM Off-Heap, and CSI Storage

In enterprise Kubernetes architectures hosting distributed stateful data streams—such as Apache Kafka ingesting line-rate telemetry into an Apache Iceberg lakehouse—failures rarely occur within isolated components. They occur at the seams: where physical network constraints collide with virtual overlays, where user-space runtime runtimes bypass kernel memory monitors, and where cloud storage controllers clash with distributed orchestrators.

When complex outages strike, standard dashboards and high-level platform telemetry often misdiagnose the failure. Unit tests pass, synthetic health probes return healthy status codes, and application logs show zero error traces while production traffic quietly grinds to a halt.

Diagnosing these failures requires understanding the physical mechanics of the entire path: from the wire frame to the Linux kernel, the process memory model, and the underlying storage block controller.

---

## 1. Network & Overlay Layer: The Path MTU Encapsulation Black Hole

### The Architecture
To route traffic securely between nodes in a multi-tenant Kubernetes cluster, modern Container Network Interfaces (CNIs) encapsulate pod-to-pod Layer 3 IP packets inside Layer 4 UDP or Geneve/VXLAN overlay packets. 

A high-throughput edge agent streams batched binary records over TCP into a regional Ingress Gateway. To maximize network throughput and minimize packet overhead, the producer sizes its TCP payloads to saturate the standard physical Ethernet Maximum Transmission Unit (MTU) of **1500 bytes**.

### The Failure Dynamics
The TCP stack on the client structures the frame:
* Payload: **1460 Bytes**
* TCP Header: **20 Bytes**
* IP Header: **20 Bytes**
* Total Wire Frame: **1500 Bytes** (with the Don't Fragment bit set: `DF=1`)

The packet enters Node A via an Ingress Controller and must traverse the cluster overlay to reach a Kafka broker pod running on Node B. 

As the packet exits the virtual interface, the CNI overlay driver slaps an encapsulation header onto the frame:
$$\text{Base Frame (1500B)} + \text{VXLAN Header (50B)} = \text{1550 Bytes}$$

The physical network switch across the data center fabric operates on a hard MTU ceiling of **1500 bytes**. When the 1550-byte packet hits the physical switch port with `DF=1`:
1. The switch cannot forward the frame because it exceeds 1500 bytes.
2. The switch cannot fragment the packet because the `DF` bit explicitly forbids fragmentation.
3. The switch drops the packet onto the floor and generates an `ICMP Type 3, Code 4 (Fragmentation Needed and DF set)` notification.

```
[Edge Producer: 1500B Frame (DF=1)]
         │
         ▼
[Node A: CNI Adds 50B VXLAN Encap] ──► Total Frame: 1550B
         │
         ▼
[Physical Switch: MTU 1500B] ──► SILENT DROP
         │
         └──► ICMP 3, 4 (Blocked by Firewall) = Zero TCP RST/FIN (Black Hole)
```

### Why Dashboards Hide It
Synthetic ping checks pass without issue because an ICMP echo request is small (typically 64 to 84 bytes). Test HTTP curl calls pass because small JSON payloads fall well below 1400 bytes. 

However, line-rate ingestion freezes instantly. If network intermediate firewalls or middleboxes block outbound ICMP traffic—a standard enterprise security posture—the sender never receives the `Need to Frag` warning. The client TCP stack simply observes that packets are never acknowledged, retransmits until timeouts exhaust socket buffers, and black-holes without ever receiving a `TCP RST` or `FIN`.

### Diagnostic Commands & Ground Truth
Inspect the physical and virtual interfaces using packet capture directly on the host interface:

```bash
# Capture dropped frame signals and ICMP type 3 code 4 notifications
tcpdump -nnvv -i eth0 'icmp or (tcp and port 9092)'

# Check host and virtual overlay MTU settings
ip link show eth0
ip link show flannel.1

# Inspect driver drop counters
ethtool -S eth0 | grep -E 'drop|too_long|error'
```

### Remediation
Clamp the overlay MTU in the CNI DaemonSet to account for the encapsulation budget:
$$\text{Physical Wire (1500B)} - \text{Overlay Encap (50B)} - \text{Safety Buffer (30B)} = \text{1420 Bytes}$$

Configuring the CNI MTU to 1420 bytes forces the client TCP Maximum Segment Size (MSS) negotiation to cap payloads at 1340 bytes, ensuring the fully encapsulated frame never exceeds the 1500-byte wire ceiling.

---

## 2. Kernel & Runtime Layer: The JVM Off-Heap vs. cgroup v2 OOM Reaper

### The Architecture
Kafka is deployed on Kubernetes inside an isolated container with strict resource constraints:

```yaml
resources:
  limits:
    memory: 8Gi
  requests:
    memory: 8Gi
```

Inside the container, the operator assigns the Java Virtual Machine (JVM) a managed heap allocation:

```bash
-Xms4g -Xmx4g
```

The assumption is that reserving a 4GB heap inside an 8GB container leaves 4GB of safety buffer for the operating system and container overhead.

### The Failure Dynamics
Kafka does not rely solely on JVM heap objects to process line-rate network streams. To maximize I/O performance and avoid CPU-intensive user-space memory copies, Kafka uses Netty and Java NIO DirectByteBuffer allocations (`ByteBuffer.allocateDirect()`).

Direct byte buffers allocate native memory outside the JVM heap directly from the host operating system’s RAM via `malloc`/`mmap`.

```
Linux cgroup v2 Hard Ceiling: 8192 MB (8 GiB)
┌──────────────────────────────────────────┬─────────────────────────────┐
│ JVM Heap (-Xmx4g): 4096 MB               │ DirectByteBuffer: 3800 MB   │ ──► [cgroup ceiling breached]
│ (Monitored by JVM GC - Within limit)     │ + Metaspace + Stacks: 600 MB│     KERNEL SENDS SIGKILL (137)
└──────────────────────────────────────────┴─────────────────────────────┘
```

The underlying failure mechanism stems from a JVM default: in OpenJDK, if `-XX:MaxDirectMemorySize` is not explicitly declared, it defaults to `-Xmx`.

If `-Xmx` is set to 4GB, the JVM believes it is legally allowed to consume:
$$\text{4GB (Managed Heap)} + \text{4GB (Direct Memory)} = \text{8GB Total}$$

When metaspace (256MB), native thread stacks (1MB per thread across hundreds of threads), and internal C-library allocations are added, total Resident Set Size (RSS) hits:
$$\text{4096MB (Heap)} + \text{3800MB (Direct)} + \text{256MB (Metaspace)} + \text{300MB (Threads)} = \text{8452 MB} > \text{8192 MB (cgroup ceiling)}$$

### Why Application Logs Show Nothing
When RSS crosses the 8192MB cgroup ceiling, the Linux kernel’s out-of-memory subsystem executes:
1. The kernel cgroup controller invokes `mem_cgroup_out_of_memory()`.
2. The kernel selects the process with the highest `oom_score` (PID 28412 - `java`).
3. The kernel fires an uncatchable `SIGKILL` (Signal 9) directly into the process.

Because `SIGKILL` cannot be caught or handled in user-space, the JVM cannot trigger shutdown hooks, cannot write a final entry to `server.log`, and cannot generate a heap dump. The container abruptly vanishes, and Kubernetes reports:
$$\text{Exit Code } 137 = 128 + 9 \text{ (SIGKILL)}$$

Engineers searching `server.log` for `OutOfMemoryError: Java heap space` will find a clean log file right up to the second the process stopped, leading to false assumptions of disk corruption or application bugs.

### Diagnostic Commands & Ground Truth
To verify this failure, bypass application logs and query the Linux host kernel ring buffer:

```bash
# Check container exit code
kubectl describe pod kafka-broker-0 -n lakehouse-platform | grep -E 'Last State|Reason|Exit Code'

# Check host-level kernel cgroup termination logs
dmesg -T | grep -E -i 'oom|kill|cgroup'

# Inspect current cgroup v2 memory consumption on the host
cat /sys/fs/cgroup/system.slice/docker-<container-id>.scope/memory.current
cat /sys/fs/cgroup/system.slice/docker-<container-id>.scope/memory.events
```

Look for explicit confirmation in `dmesg`:
```plaintext
[Mon Sep 14 04:19:54 2026] Memory cgroup out of memory: Kill process 28412 (java) score 982 or sacrifice child
[Mon Sep 14 04:19:54 2026] Killed process 28412 (java) total-vm:10824192kB, anon-rss:8389120kB, file-rss:0kB
```

### Remediation
Explicitly balance the memory budget, hard-clamp direct off-heap memory, and enforce exit-on-OOM flags:

```yaml
env:
  - name: KAFKA_HEAP_OPTS
    value: "-Xms4g -Xmx4g -XX:+UseG1GC"
  - name: KAFKA_JVM_PERFORMANCE_OPTS
    value: >-
      -XX:MaxDirectMemorySize=2048m
      -XX:MetaspaceSize=128m
      -XX:MaxMetaspaceSize=256m
      -XX:+ExitOnOutOfMemoryError
```

$$\text{4096MB (Heap)} + \text{2048MB (Direct Memory)} + \text{256MB (Metaspace)} + \text{300MB (Stacks)} = \text{6700MB} \le \text{8192MB Budget}$$

This maintains an operational headroom of 1.49GB (18%), preventing off-heap Netty connection spikes from triggering the kernel's cgroup executioner.

---

## 3. Storage & Substrate Layer: The CSI Multi-Attach Deadlock & Filesystem Protection

### The Architecture
Stateful Kafka brokers persist transaction segment logs to block storage volumes (e.g., AWS EBS, Ceph RBD, NVMe-oF) mapped into containers via a PersistentVolumeClaim (PVC) formatted with `ext4` or `XFS` using access mode `ReadWriteOnce` (RWO).

### The Failure Dynamics (Two-Stage Storage Failure)

#### Phase A: The CSI Multi-Attach Lock
If a physical worker node crashes ungracefully (kernel panic, hardware fault, power drop), the local kubelet and CSI node plugins terminate instantly. They cannot unmount filesystems (`umount`) or execute volume detach calls to the storage fabric.

The Kubernetes scheduler detects the missing node after lease expiration and spins up a replacement broker on a healthy node. However, the cloud or SAN storage controller still holds an exclusive SCSI-3 Persistent Reservation lock registered to the dead node.

```
[ Worker Node 03 Crashes ] ──( Kernel Panic )──► Kubelet Dies Unceremoniously
                                                        │
                                                        ├──► SCSI-3 Reservation Remains Held
                                                        │
[ Worker Node 05 ] ◄──( Scheduler Places Pod ) ─────────┴──► STUCK: ContainerCreating
                                                              FailedAttachVolume: Multi-Attach Error
```

When the Kubernetes `attachdetach-controller` attempts to attach the disk to the new node, the storage controller rejects the operation:
```plaintext
FailedAttachVolume: Volume "pvc-data-kafka-broker-2" is already exclusively attached to node site22-worker-03
```

Kubernetes deliberately refuses to force attachment to prevent a split-brain disaster where two servers mount the same raw block device simultaneously, overwriting block allocation maps and corrupting the filesystem.

If an operator runs `kubectl delete pod kafka-broker-2 --force`, the API server marks the object with a `deletionTimestamp`, but the pod freezes in `Terminating` because volume cleanup finalizers (`kubernetes.io/pvc-protection`) cannot complete.

#### Phase B: Kernel JBD2 Journal Abort (errors=remount-ro)
Even when volumes mount successfully, high burst write pressure can trigger storage link latency.

If storage fabric latency exceeds the Linux SCSI block device timeout:
1. The kernel block driver reports `blk_update_request: I/O error`.
2. The journaling layer of ext4 (JBD2) times out while committing transaction metadata.
3. JBD2 marks the journal dirty and aborts the journal ring buffer.
4. The kernel invokes its filesystem safety policy: `errors=remount-ro`.
5. The kernel instantly flips the superblock mount flags from `rw` to `ro` (read-only) to prevent silent metadata corruption.

```
[ Ingest Burst Writes ] ──► [ Storage Latency Exceeds Block Timeout ]
                                      │
                                      ▼
                        [ JBD2 Aborts Journal Commit ]
                                      │
                                      ▼
                   [ Kernel Flips Superblock to READ-ONLY (ro) ]
                                      │
                                      ▼
      [ Pod Still "Running" (TCP Probe Passes) ──► Produces Fail with EROFS ]
```

The pod status remains green and reports `Running` because basic TCP readiness probes on port 9092 continue to succeed. However, any write operation fails immediately with `EROFS: Read-only file system` (`KafkaStorageException`).

### Diagnostic Commands & Ground Truth

```bash
# Check for stale volume attachment locks
kubectl get volumeattachments | grep -E 'site22-worker-03|site22-worker-05'

# Check active mount flags inside the container
kubectl exec -it kafka-broker-1 -n lakehouse-platform -- mount | grep '/var/lib/kafka'

# Check the host kernel for journal abort cascades
dmesg -T | grep -E -i 'ext4|jbd2|remount|i/o error|rbd'
```

Look for the kernel journal abort trace:
```plaintext
blk_update_request: I/O error, dev rbd0, sector 10485760 op 0x1:(WRITE)
JBD2: Detected aborted journal
EXT4-fs (device rbd0): Remounting filesystem read-only
```

### Remediation & Architectural Hardening

#### 1. Recovering a Read-Only Filesystem
* Never attempt `mount -o remount,rw` on an aborted journal; writing over a damaged journal can destroy the filesystem structure.
* Cordon the node: `kubectl cordon site41-worker-02`.
* Scale down the StatefulSet to 0 or delete the pod to release open file descriptors.
* Execute `fsck.ext4 -fy /dev/rbd0` on the host to replay the journal and verify inode integrity.
* Scale the StatefulSet back up.

#### 2. Automating Node Fencing (Eliminating 2:00 AM Manual Attachments)
To automate recovery across large clusters, deploy the Node Health Check (NHC) and Self-Node Remediation (SNR) operators.

When a node experiences a kernel panic:
* NHC detects a `Ready: Unknown` state lasting > 60 seconds.
* SNR isolates the dead host using hardware watchdogs (`/dev/watchdog`) or out-of-band IPMI fencing.
* SNR applies the native Kubernetes taint:
  ```bash
  node.kubernetes.io/out-of-service=nodeshutdown:NoExecute
  ```
The `attachdetach-controller` recognizes the taint, purges the stale `VolumeAttachment` API object, and allows the replacement pod on the healthy node to mount the disk automatically within 90 seconds.

#### 3. Storage-Aware Readiness Probes
Update pod health checks to verify actual disk write capabilities rather than superficial network socket handshakes:

```yaml
readinessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - "touch /var/lib/kafka/data/.healthz && rm -f /var/lib/kafka/data/.healthz"
  initialDelaySeconds: 30
  periodSeconds: 10
```

If the underlying storage flips to `ro`, the probe fails immediately, removing the broker from the Service endpoint and preventing producer write failures from backing up the edge pipeline.

---

## Conclusion: The Cross-Layer Operational Mental Model

Resilient platform engineering requires looking past high-level abstractions:

| Failure | High-Level Symptom | Ground Truth Layer | Diagnostic Command |
| :--- | :--- | :--- | :--- |
| **Path MTU Drop** | High-throughput ingest hangs; ping works. | CNI Overlay / Switch Wire | `tcpdump -nnvv -i eth0 'icmp'` |
| **Silent Broker Death** | `CrashLoopBackOff`; zero application logs. | Kernel cgroup / Off-Heap Memory | `dmesg -T \| grep -i oom` |
| **Stuck ContainerCreating** | Pod fails to start after host failure. | Cloud Storage SCSI-3 Lock | `kubectl get volumeattachments` |
| **EROFS Write Errors** | Pod reports `Running`; producers fail. | Block Layer / JBD2 Journal | `dmesg -T \| grep -i jbd2` |

Reliability at scale is achieved by treating network bytes, process allocations, block structures, and cluster consensus as a single, contiguous physical path. When failures occur, trace the mechanics backward from the wire to the disk.
