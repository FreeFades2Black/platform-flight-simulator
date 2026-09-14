# Operational Triage & Interview Cheat Sheet: Multi-Site Ingest Platform

## Core Triage Mental Model
Troubleshoot backward along the physical and logical data path:
Wire / MTU (L2/L3) -> Ingress & CNI (L4/L7) -> Linux Kernel & cgroups -> Process Memory & JVM -> Storage Substrate & Locks -> etcd Consensus

---

## 1. Pipeline 2 (Path MTU Black Hole & Overhead Math)
- **The Mechanism:** 
  - Standard physical wire MTU: 1500 bytes.
  - Telemetry batch frame: 1460B payload + 20B TCP + 20B IP = 1500B (DF bit = 1).
  - Overlay encapsulation: VXLAN / Geneve adds 50B -> Total packet = 1550 bytes.
- **The Failure:** Switch cannot fragment packets with DF=1; frames drop silently. ICMP Type 3, Code 4 messages may be blocked by firewalls.
- **Triage Commands:**
  - `tcpdump -nnvv -i eth0 'icmp or (tcp and port 9092)'` -> Look for `need to frag (mtu 1420)`.
  - `ip link show flannel.1` -> Check if overlay MTU matches physical MTU without headroom.
- **Remediation:** Clamp overlay MTU in CNI DaemonSet to 1420 bytes (reserves 80B overhead buffer).

---

## 2. Node 4 (JVM vs. Linux cgroup v2 OOM Reaper)
- **The Mechanism:** 
  - Container hard cgroup limit: 8192MB (8GiB).
  - JVM configuration: `-Xmx4096m` (4GiB Heap).
  - Native I/O (Netty): High concurrent connection volume allocates DirectByteBuffer memory off-heap directly from OS RAM.
  - Memory math: 4096MB Heap + 4350MB Off-Heap Direct Memory + Thread Stacks = 8446MB > 8192MB limit.
- **The Failure:** JVM sees heap within limits and skips GC. Linux kernel cgroup monitor trips and sends SIGKILL (Signal 9). Exit code: 128 + 9 = 137. Application logs contain zero errors.
- **Triage Commands:**
  - `dmesg -T | grep -E -i 'oom|kill|out of memory'` -> Look for `Memory cgroup out of memory: Kill process <pid> (java)`.
  - `kubectl describe pod kafka-broker-0` -> Check `Last State: Terminated`, `Exit Code: 137`, `Reason: OOMKilled`.
- **Remediation:** Add `-XX:MaxDirectMemorySize=2048m` to container environment and balance JVM heap/off-heap to leave a 25-30% system buffer under the cgroup limit.

---

## 3. Pipeline 4 (CSI Multi-Attach Lock & Storage Deadlocks)
- **The Mechanism:** 
  - Pod uses PersistentVolumeClaim backed by ReadWriteOnce block storage (AWS EBS, Ceph RBD, NVMe-oF).
  - Node A (`site22-worker-03`) crashes abruptly; kernel unmount sequence does not execute.
  - Cloud / SAN storage controller maintains exclusive SCSI-3 reservation lock assigned to Node A.
- **The Failure:** Replacement pod scheduled to Node B (`site22-worker-05`) attempts to attach disk. Storage provider rejects request to prevent multi-writer filesystem corruption. Pod hangs in `ContainerCreating` for 10+ minutes.
- **Triage Commands:**
  - `kubectl describe pod kafka-broker-2 -n lakehouse-platform` -> Look for `FailedAttachVolume: VolumeAttachment ... is already attached to node site22-worker-03`.
  - `kubectl get volumeattachments` -> Identify stale VolumeAttachment resource tied to the crashed host.
- **Manual Remediation:** Confirm Node A is offline/isolated, then prune the stale VolumeAttachment object:
  `kubectl delete volumeattachment <name> --force --grace-period=0`
- **Enterprise Automated Remediation (NHC + SNR Operator Pipeline):**
  - **Node Health Check (NHC) Operator:** Watches worker nodes. When a node stays `Ready: Unknown` or `Ready: False` for 60s, it invokes `SelfNodeRemediationTemplate`.
  - **Self-Node Remediation (SNR) Operator:** Fences the dead host via hardware watchdog (`/dev/watchdog`) and automatically applies the native taint:
    ```yaml
    spec:
      taints:
        - key: node.kubernetes.io/out-of-service
          value: "nodeshutdown"
          effect: NoExecute
    ```
  - **Control Plane Reconciliation:** The Kubernetes `attachdetach-controller` recognizes the `out-of-service` taint, terminates hung pods, and immediately deletes the blocking `VolumeAttachment` API object without requiring human SRE intervention.

---

## 4. Node 5 (Kernel Disk I/O Stall & Filesystem Remount)
- **The Mechanism:** Under heavy write pressure or SAN link latency spikes, block write acknowledgments exceed the Linux SCSI/block layer timeout threshold.
- **The Failure:** Linux kernel detects block device timeouts or orphaned inode references. To prevent filesystem metadata corruption, the kernel remounts the mount point as read-only (`ro`).
- **Triage Commands:**
  - `dmesg -T | grep -E 'EXT4-fs|XFS'` -> Look for `Remounting filesystem read-only`.
  - `mount | grep '/var/lib/kafka'` -> Verify if mount flags shifted from `rw` to `ro`.
  - `df -i /var/lib/kafka/data` -> Check for inode exhaustion (100% inode utilization causes ENOSPC even with free disk space).
- **Remediation:** Run filesystem check (`fsck`) on detached device, verify SAN path latency, and remount read-write.

---

## 5. Control Plane (Stale Leases & Finalizer Deadlocks)
- **The Mechanism:** 
  - Custom controller injects a finalizer string (`.metadata.finalizers`) into custom resources or Pods/PVCs.
  - Controller is uninstalled or crashes during an upgrade wave.
  - Administrator issues `kubectl delete pod <name> --force --grace-period=0`.
- **The Failure:** API server stamps `.metadata.deletionTimestamp`, but etcd cannot purge the object until the listed finalizer string is removed by its owning controller. The object remains frozen in `Terminating`.
- **Triage Commands:**
  - `kubectl get pod <name> -o jsonpath='{.metadata.finalizers}'` -> Check for lingering finalizer strings.
  - `etcdctl endpoint status -w table` -> Verify control plane raft term consistency and member sync.
- **Remediation:** Once underlying external resources are confirmed safe, patch the object to strip finalizers:
  `kubectl patch pod <name> --type=merge -p '{"metadata":{"finalizers":null}}'`
