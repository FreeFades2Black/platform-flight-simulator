# 🕹️ Platform Flight Simulator | Digital Twin & Guided Sandbox

> An interactive, scenario-driven **Digital Twin** and guided platform engineering sandbox. Instead of passive documentation, engineers learn by stepping through live state machines, watching real-time packet and buffer flows, intentionally injecting chaos, and executing real Linux/Kubernetes triage commands to remediate production incidents.

---

## 🏛️ System Architecture

```
[ Frontend: Next.js 14 / TypeScript / Tailwind CSS ]
  ├── 1. Topology & Packet Flow Canvas (@xyflow/react)
  │     ├── Edge Sensor (Industrial Telemetry Generator)
  │     ├── Ingress VIP (Gateway Ingress Proxy)
  │     ├── CNI Overlay Wire (flannel.1 / VXLAN MTU Burst Zone)
  │     ├── Stateful Pod (kafka-broker-0 on Node B)
  │     └── CSI PersistentVolume (/dev/nvme0n1 Lease Lock)
  │
  ├── 2. Interactive Virtual Terminal
  │     ├── Realistic command shell (tcpdump, dmesg, ip link, kubectl)
  │     └── Live command interpreter triggering reactive state machine transitions
  │
  └── 3. Deep-Stack Layer Inspector
        ├── Network Envelope (Data + TCP + IP + VXLAN vs Interface MTU)
        ├── Linux cgroup v2 Memory Accounting (JVM Heap vs Netty Direct vs 8GiB Ceiling)
        ├── CSI VolumeAttachment Subsystem (Exclusive ReadWriteOnce Lease)
        └── etcd v3 State Store (Dangling metadata.finalizers array)
```

---

## 🎯 The Four Interactive Missions

### Mission 01: The Wire Trap (MTU Misclamp)
* **Failure Injected:** CNI overlay interface (`flannel.1`) is configured to standard MTU 1500, but VXLAN encapsulation adds 50B overhead. When high-throughput batches (1500B) traverse the overlay, total wire size hits 1550B with DF (Don't Fragment) bit set.
* **What You See in the Canvas:** Packets turn glowing red at the overlay boundary, bursting into fragmentation particles with an `ICMP 3, 4: Need to Frag (mtu 1420)` warning tooltip. Telemetry to the broker halts.
* **Triage & Remediation:** Run `tcpdump -nnvv -i eth0`, inspect path MTU, and clamp the CNI overlay MTU to 1420B (`ip link set flannel.1 mtu 1420` or `fix-mtu`). Packets immediately resume smooth green flow.

### Mission 02: The Invisible Reaper (Netty Off-Heap OOM)
* **Failure Injected:** High connection concurrency drives Netty direct memory buffers to 4350MB. Added to 4096MB JVM heap, total allocation breaches the 8192MB Linux cgroup hard limit. The kernel OOM-killer sends `SIGKILL (Signal 9)`.
* **What You See in the Canvas:** Pod abruptly vanishes from service and enters `CrashLoopBackOff` with Exit Code 137. The memory meter in the inspector turns pulsing red at 100% capacity.
* **Triage & Remediation:** Check `dmesg -T | grep -i oom` to confirm kernel invocation, check `kubectl describe pod kafka-broker-0`, and patch `-XX:MaxDirectMemorySize=2048m` (`resolve-oom`). Total memory drops within the safety envelope and the pod recovers to `Running`.

### Mission 03: The Frozen Disk (Stale CSI VolumeAttachment)
* **Failure Injected:** Node B crashes ungracefully while holding an exclusive `ReadWriteOnce` AWS EBS / CSI volume lock (`/dev/nvme0n1`). The replacement pod scheduled to Node C hangs indefinitely in `ContainerCreating`.
* **What You See in the Canvas:** Storage attachment line turns amber with an `EXCLUSIVE LOCK` badge. Pod shows `ContainerCreating` warning.
* **Triage & Remediation:** Run `kubectl describe pod` to detect `FailedAttachVolume (Multi-Attach error)`, inspect `kubectl get volumeattachment`, and prune the stale API lock (`unlock-storage`). The CSI controller binds the volume to Node C and the pod transitions to `Running`.

### Mission 04: The Zombie Finalizer (Orphaned Operator)
* **Failure Injected:** An automated teardown deleted the Kafka operator before managed stateful pods completed teardown. The pod stays stuck in `Terminating` indefinitely; `kubectl delete pod --force` fails.
* **What You See in the Canvas:** Pod displays a pulsing purple `Terminating` badge. The etcd inspector flags an active `metadata.finalizers: ["strimzi.io/kafka-broker-finalizer"]`.
* **Triage & Remediation:** Run `kubectl get pod -o yaml`, identify the dangling finalizer, and execute `kubectl patch pod kafka-broker-0 --type=merge -p '{"metadata":{"finalizers":null}}'` (`strip-finalizer`). The object is instantly reaped from etcd.

---

## ⚡ 1-Command Local Startup

Prerequisites: `node >= 18` and `npm >= 9`.

```bash
# Clone and enter the repository
cd platform-flight-simulator

# Install dependencies
npm install

# Run automated state machine tests
npm test

# Launch local interactive dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to enter the simulator!

---

## 🛠️ Tech Stack

* **Framework:** [Next.js 14](https://nextjs.org/) (App Router, Server & Client Components)
* **Interactive Canvas:** [@xyflow/react](https://reactflow.dev/) (Custom SVG nodes, bezier animated edges, packet flow particle physics)
* **State Management:** [Zustand](https://github.com/pmndrs/zustand) (Reactive state machine syncing terminal commands with canvas animations)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) with custom dark-mode cockpit palette
* **Icons:** [Lucide React](https://lucide.dev/)
