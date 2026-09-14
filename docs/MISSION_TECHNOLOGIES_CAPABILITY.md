# 🛡️ Mission Capability: High-Reliability Data Fabric for All-Domain Dominance
### Tactical Edge Survivability, Contested Ingest Pipelines, and Zero-Data-Loss Ingestion

---

## 1. Operational Overview & Strategic Context

Modern multi-domain defense operations—spanning un-crewed surface and undersea vehicles (USVs/UUVs), distributed electronic warfare (EW) sensors, airborne ISR pods, and forward radar installations—demand resilient, line-rate data ingestion into analytics and command clusters. 

Commercial cloud tooling assumes reliable low-latency backhaul, abundant compute cushions, and orderly pod terminations. In contested tactical-edge and air-gapped mission environments, these assumptions fail:
* **Tactical WAN Degradation:** Network frames drop silently over encrypted overlay tunnels when MTUs mismatch across tactical radio/SATCOM bridges.
* **Burst Sensor Saturation:** High-frequency EW/RF signal bursts saturate user-space memory, triggering kernel cgroup reapers that terminate ingestion processes without warning.
* **Contested Host Survivability:** Battle-damaged or power-starved tactical edge nodes crash abruptly, leaving exclusive SCSI-3 storage locks that deadlock stateful recovery pods.

The **Tactical Edge Platform Flight Simulator** serves as an interactive digital twin and chaos verification testbed designed to stress-test, diagnose, and automate recovery across edge-to-core ingestion pipelines under degraded and hostile conditions.

---

## 2. All-Domain Ingest Architecture & Topology

```
[ UN-CREWED SYSTEMS & EW SENSORS ]
  (USVs, UUVs, Tactical Radar, RF Intercepts)
                    │
                    ▼  (Pipeline 1: mTLS Handshake & Tactical NLB Bursts)
[ TACTICAL INGRESS GATEWAY (Node 2) ]
                    │
                    ▼  (Pipeline 2: Encrypted Overlay Tunnel / MTU 1550B Boundary)
[ ENCRYPTED CNI OVERLAY WIRE (Node 3) ]
                    │
                    ▼  (Pipeline 3: Zero-Copy Direct Memory / SASL SCRAM)
[ AIR-GAPPED KAFKA BROKER (Node 4) ]
                    │
                    ▼  (Pipeline 4: Multi-Attach Lock / CSI Storage Bus)
[ RUGGEDIZED BLOCK STORAGE (Node 5) ]
  (NVMe-oF / Encrypted SAN / Ceph RBD)
```

---

## 3. Mapping Core Scenarios to Defense Operational Domains

| Core Simulation Scenario | Technical Mechanism | Defense & Operational Mission Context |
| :--- | :--- | :--- |
| **01: The Wire Trap** | CNI overlay MTU 1550B vs. 1500B physical wire with `DF=1` | **Tactical WAN & Cross-Domain Comms:** Forward-deployed sensor forwarders push encrypted batch bursts over tactical SATCOM/radio bridges. Miscalculated encapsulation headers drop intelligence feeds without TCP RST notifications. |
| **02: The Invisible Reaper** | Netty off-heap DirectByteBuffer breaching cgroup v2 ($137$) | **High-Density Sensor Telemetry:** Real-time EW/RF signal processing pods ingest multi-gigabit bursts. Off-heap native memory bypasses runtime garbage collection, triggering kernel termination without application logs. |
| **03: The Frozen Disk** | Ungraceful node panic leaving SCSI-3 volume locks | **Contested Edge Node Survivability:** A tactical server node suffers sudden power disruption or battle damage. Automated fencing (NHC/SNR) with native out-of-service taints forces storage detachment and reschedules processing in <90 seconds. |
| **04: Storage Stall & RO Mount** | JBD2 journal abort & filesystem remount read-only | **Ruggedized Edge Storage Integrity:** SAN/NVMe latency spikes during write-heavy surveillance recording cause the kernel to remount storage read-only, requiring storage-aware readiness health checks. |

---

## 4. Operational Deep-Dive: Tactical Edge Failure Mechanics

### Domain 1: Tactical WAN Encapsulation & The MTU Black Hole
* **Contested Condition:** Forward tactical units transmit compressed sensor streams across crypto-tunnel overlays (VXLAN/IPsec/WireGuard).
* **Failure Physics:** Payloads sized for standard 1500-byte MTU gain 50+ bytes of encapsulation overhead ($1550\text{B}$). Satellite modems and tactical routers with `DF=1` set drop the frames. Outbound ICMP 3, 4 error messages are dropped by tactical boundary firewalls.
* **Mission Impact:** Sensor streams freeze. Telemetry pipelines report healthy TCP sockets because small heartbeats pass, but all mission data packets are black-holed.
* **Remediation:** Automate CNI overlay MTU clamping to 1420B via DaemonSet configuration, forcing TCP MSS negotiation to 1340B and guaranteeing zero drops across tactical crypto-boundaries.

### Domain 2: High-Density EW Signal Processing & Kernel OOM
* **Contested Condition:** Electronic Warfare (EW) intercept pods ingest multi-gigabit RF bursts into distributed streaming brokers.
* **Failure Physics:** To achieve line rate, streaming brokers utilize native off-heap memory (`DirectByteBuffer`). OpenJDK defaults `-XX:MaxDirectMemorySize` to `-Xmx`, causing native memory to expand beyond the container limit. The Linux kernel cgroup controller issues an uncatchable `SIGKILL 137`.
* **Mission Impact:** The streaming broker vanishes with zero application logs, crashing ingestion pods right during critical intelligence bursts.
* **Remediation:** Hard-clamp JVM off-heap memory to 2048m inside an 8GiB cgroup envelope, ensuring a 1.49GiB operating cushion that prevents kernel terminations.

### Domain 3: Contested Edge Node Survivability & Automated Fencing
* **Contested Condition:** A compute module in a ruggedized tactical vehicle or surface craft suffers physical power disruption, hardware stall, or hostile kinetic impact.
* **Failure Physics:** The node dies unceremoniously. Cloud/SAN block storage controllers retain exclusive SCSI-3 Persistent Reservation locks. When the scheduler reschedules stateful pods to a surviving node, pods deadlock in `ContainerCreating` with `FailedAttachVolume: Multi-Attach error`.
* **Mission Impact:** Mission-critical tracking and analytics state is locked on dead hardware. Manual triage commands cannot be executed in air-gapped or lights-out environments.
* **Remediation:** Deploy the **Node Health Check (NHC)** and **Self-Node Remediation (SNR)** operator pipeline (`manifests/automated-node-fencing/`). NHC detects dead heartbeats within 60s, triggers hardware watchdog isolation, and applies the native Kubernetes taint:
  ```bash
  node.kubernetes.io/out-of-service=nodeshutdown:NoExecute
  ```
  The storage controller automatically tears down stale `VolumeAttachment` objects, mounting volumes onto healthy nodes in under 90 seconds.

### Domain 4: Ruggedized Edge Storage Integrity & Journal Aborts
* **Contested Condition:** High-rate sensor ingestion during vibration, power fluctuations, or heavy bus contention creates storage latency spikes exceeding block timeouts.
* **Failure Physics:** The Linux kernel block driver throws `blk_update_request: I/O error`. The EXT4 journaling engine (JBD2) detects an aborted journal commit and triggers `errors=remount-ro`, flipping the mount to read-only.
* **Mission Impact:** Broker pods pass basic TCP readiness probes because the process is alive in memory, but all produce requests fail with `EROFS` (Read-only file system).
* **Remediation:** Implement storage-aware readiness probes (`touch /data/.healthz && rm -f /data/.healthz`) to drop unhealthy brokers from Service endpoints instantly, and execute automated node cordon with `fsck.ext4 -fy` journal replay.

---

## 5. Enterprise & Defense Reliability Standards Matrix

| Defense Reliability Requirement | Digital Twin Validation Mechanism | Verification Benchmark |
| :--- | :--- | :--- |
| **All-Domain Cross-Layer Fault Isolation** | Models physical wire MTU, Netfilter conntrack saturation (262k entries), socket ring buffers, and off-heap memory bounds. | Isolates failure root-causes across physical wire, kernel, and container runtime layers. |
| **Air-Gapped Operational Playbooks** | Complete terminal-accessible triage playbooks executable via offline CLI (`docs/OPERATIONAL_TRIAGE_CHEAT_SHEET.md`). | Replaces internet-dependent troubleshooting with deterministic local diagnostic procedures. |
| **Automated Contested Node Remediation** | Pre-configured GitOps manifests for NHC + SNR operator deployment (`manifests/automated-node-fencing/`). | Validates hands-off volume detachment and rapid pod rescheduling during abrupt hardware failures. |
| **Zero-Data-Loss Telemetry Ingestion** | Storage-aware health probes and buffer management playbooks that prevent silent data black holes. | Protects mission sensor streams from unmonitored EROFS stalls and overlay drops. |

---

## 6. Technical Briefing & Executive Summary

* **Target Application:** High-reliability tactical edge computing, distributed un-crewed systems telemetry, electronic warfare sensor networks, and multi-cluster defense fabrics.
* **Digital Twin URL:** [https://freefades2black.github.io/platform-flight-simulator/](https://freefades2black.github.io/platform-flight-simulator/)
* **Code Repository:** [https://github.com/FreeFades2Black/platform-flight-simulator](https://github.com/FreeFades2Black/platform-flight-simulator)
