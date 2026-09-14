# 📘 Platform Flight Simulator: Complete 18-Scenario Failure Taxonomy Runbook
### Exhaustive Operational Triage, Kernel Mechanics, and Remediation Guide for Enterprise & Defense Kubernetes Ingestion Platforms

This runbook documents the complete **18-Scenario Failure Taxonomy** across the 5 nodes and 4 interconnecting pipelines of the **Platform Flight Simulator** (`platform-flight-simulator`).

```
[ NODE 1: EDGE TELEMETRY ]
           │
      ( Pipeline 1: mTLS Handshake & NLB SYN Flood )
           ▼
[ NODE 2: GATEWAY INGRESS ]
           │
      ( Pipeline 2: Path MTU 1550B & NetworkPolicy Deny )
           ▼
[ NODE 3: CNI OVERLAY WIRE (flannel.1 / VXLAN) ]
           │
      ( Pipeline 3: DirectByteBuffer & SASL SCRAM Auth )
           ▼
[ NODE 4: KAFKA-BROKER-0 ]
           │
      ( Pipeline 4: Multi-Attach Lock & CSI gRPC Timeout )
           ▼
[ NODE 5: CSI VOLUME (/dev/nvme0n1 / rbd0) ]
```

---

## Table of Contents
1. [Node 1: Edge Telemetry Forwarder](#node-1-edge-telemetry-forwarder)
   - [Scenario 1.1: Local Buffer Ring Exhaustion](#scenario-11-local-buffer-ring-exhaustion)
   - [Scenario 1.2: Serialization Schema Registry Violation](#scenario-12-serialization-schema-registry-violation)
2. [Pipeline 1 → 2: Edge to Gateway Ingress](#pipeline-1--2-edge-to-gateway-ingress)
   - [Scenario 2.1: Mutual TLS Handshake & Root CA Expiration](#scenario-21-mutual-tls-handshake--root-ca-expiration)
   - [Scenario 2.2: L4 NLB Connection Throttling & SYN Flood](#scenario-22-l4-nlb-connection-throttling--syn-flood)
3. [Node 2: Gateway Ingress](#node-2-gateway-ingress)
   - [Scenario 3.1: CoreDNS Internal Service Resolution Failure](#scenario-31-coredns-internal-service-resolution-failure)
   - [Scenario 3.2: Target Group Backend Health Check Failure](#scenario-32-target-group-backend-health-check-failure)
4. [Pipeline 2 → 3: Gateway Ingress to CNI Overlay Wire](#pipeline-2--3-gateway-ingress-to-cni-overlay-wire)
   - [Scenario 4.1: Path MTU Black Hole (Overlay Encapsulation)](#scenario-41-path-mtu-black-hole-overlay-encapsulation)
   - [Scenario 4.2: Zero-Trust NetworkPolicy Ingress Block](#scenario-42-zero-trust-networkpolicy-ingress-block)
5. [Node 3: CNI Overlay Wire](#node-3-cni-overlay-wire)
   - [Scenario 5.1: Linux Netfilter Conntrack Table Saturation](#scenario-51-linux-netfilter-conntrack-table-saturation)
   - [Scenario 5.2: Socket Buffer Ring Overflow (rx_dropped)](#scenario-52-socket-buffer-ring-overflow-rx_dropped)
6. [Pipeline 3 → 4: CNI Overlay to Kafka Broker](#pipeline-3--4-cni-overlay-to-kafka-broker)
   - [Scenario 6.1: DirectByteBuffer Native Memory Allocation Stall](#scenario-61-directbytebuffer-native-memory-allocation-stall)
   - [Scenario 6.2: Broker SSL/SASL SCRAM Authentication Rejection](#scenario-62-broker-sslsasl-scram-authentication-rejection)
7. [Node 4: Kafka Broker](#node-4-kafka-broker)
   - [Scenario 7.1: cgroup v2 Hard Ceiling Breach (The OOM Reaper)](#scenario-71-cgroup-v2-hard-ceiling-breach-the-oom-reaper)
   - [Scenario 7.2: Under-Replicated Partitions (ISR Quorum Collapse)](#scenario-72-under-replicated-partitions-isr-quorum-collapse)
8. [Pipeline 4 → 5: Kafka Broker to CSI Storage](#pipeline-4--5-kafka-broker-to-csi-storage)
   - [Scenario 8.1: Exclusive Lock Contention (Multi-Attach Error)](#scenario-81-exclusive-lock-contention-multi-attach-error)
   - [Scenario 8.2: CSI Storage Driver gRPC Controller Timeout](#scenario-82-csi-storage-driver-grpc-controller-timeout)
9. [Node 5: CSI Storage Volume](#node-5-csi-storage-volume)
   - [Scenario 9.1: Kernel Disk I/O Stall & EXT4 Read-Only Remount](#scenario-91-kernel-disk-io-stall--ext4-read-only-remount)
   - [Scenario 9.2: Volume Quota Depletion (Zero Inodes / ENOSPC)](#scenario-92-volume-quota-depletion-zero-inodes--enospc)

---

## Node 1: Edge Telemetry Forwarder

### Scenario 1.1: Local Buffer Ring Exhaustion
* **Scenario ID:** `node1-buffer-exhaustion`
* **Failure Domain:** Industrial Edge Agent / Forwarder Memory Ring Buffer
* **The Failure Physics:**
  When downstream ingestion networks flap or stall, edge forwarder agents (Fluentbit, Vector, custom C/Rust collectors) buffer high-frequency sensor records in RAM. Once the pre-allocated ring buffer limit (10,000 events) is breached, backpressure threshold triggers immediate message dropping to prevent OS-level OOM panics on edge gateways.
* **Error Signatures:**
  ```text
  [ERROR] io.netty.buffer.BufferOverflowException: queue full (10000/10000 events)
  [WARN] EdgeTelemetryAgent: Backpressure ring buffer limit exceeded.
  [WARN] agent dropped 42,100 events: network bridge is blocked or stalling.
  ```
* **Triage Commands:**
  ```bash
  cat /var/log/edge-agent.log | grep -E 'BufferOverflow|dropped'
  iot-agent status --metrics
  ```
* **Deterministic Remediation:**
  ```bash
  iot-agent flush-buffer
  ```
* **Post-Remediation Verification:** Buffer drained to nominal capacity (2,150/10,000), drop counters halt, and transmission recovers.

---

### Scenario 1.2: Serialization Schema Registry Violation
* **Scenario ID:** `node1-schema-violation`
* **Failure Domain:** Serialization Protocol / Schema Registry Contract
* **The Failure Physics:**
  An edge firmware upgrade emits telemetry payloads with an altered Avro or Protobuf schema (e.g., missing required field `thermal_c` or referencing undeclared Schema ID 412). The forwarder's local serialization serializer fails validation against the central Schema Registry, dropping messages at the source.
* **Error Signatures:**
  ```text
  SchemaNotFoundException: failed to fetch schema ID 412
  org.apache.avro.AvroTypeException: Expected field 'thermal_c' not found in incoming payload
  Record header: { schemaId: 412, version: 3, subject: "telemetry-value" } [INVALID]
  ```
* **Triage Commands:**
  ```bash
  curl -s http://schema-registry.lakehouse.local:8081/subjects/telemetry-value/versions/latest
  iot-agent schema-check --payload /var/log/sample-telemetry.json
  ```
* **Deterministic Remediation:**
  ```bash
  iot-agent reload-schema
  ```
* **Post-Remediation Verification:** Schema ID 412 registered and cached in local registry memory; payload serialization resumed without rejection.

---

## Pipeline 1 → 2: Edge to Gateway Ingress

### Scenario 2.1: Mutual TLS Handshake & Root CA Expiration
* **Scenario ID:** `pipe1-tls-handshake`
* **Failure Domain:** Perimeter Cryptographic Ingress & Public Key Infrastructure
* **The Failure Physics:**
  Mutual TLS (mTLS) enforcement between edge gateways and the perimeter ingress controller fails because the cluster internal Root CA or intermediate signing certificate expired past its validity timestamp (`notAfter`), causing the client or proxy SSL engine to abort the handshake.
* **Error Signatures:**
  ```text
  CONNECTED(00000003)
  depth=0 CN = ingress.lakehouse.local
  verify error:num=10:certificate has expired
  notAfter=Sep 12 18:00:00 2026 GMT
  SSLHandshakeException: PKIX path building failed: unable to find valid certification path
  curl: (35) error:14094410:SSL routines:ssl3_read_bytes:sslv3 alert handshake failure
  ```
* **Triage Commands:**
  ```bash
  openssl s_client -connect ingress.lakehouse.local:9092 -servername ingress.lakehouse.local < /dev/null | grep -E 'verify error|notAfter'
  kubectl get cert lakehouse-tls -n ingress-nginx
  ```
* **Deterministic Remediation:**
  ```bash
  renew-cert
  # Or via cert-manager:
  # kubectl renew cert lakehouse-tls -n ingress-nginx
  ```
* **Post-Remediation Verification:** mTLS handshake succeeds over TLSv1.3 (`TLS_AES_256_GCM_SHA384`) with renewed certificate validity.

---

### Scenario 2.2: L4 NLB Connection Throttling & SYN Flood
* **Scenario ID:** `pipe1-nlb-syn-flood`
* **Failure Domain:** L4 Network Load Balancer / TCP Connection Tracking Backlog
* **The Failure Physics:**
  During site reconnect waves, thousands of edge forwarders send concurrent TCP SYN packets to port 9092. The Ingress NLB / Linux kernel connection queue exceeds `net.ipv4.tcp_max_syn_backlog`, forcing the kernel to send SYN cookies and drop client connections with `ETIMEDOUT`.
* **Error Signatures:**
  ```text
  [14298.112940] TCP: request_sock_TCP: Possible SYN flooding on port 9092. Sending cookies. Check SNMP counters.
  TCPListenOverflows: 48,192
  TCPListenDrops: 12,402
  client timeout: ETIMEDOUT: Connection timed out after 30000ms
  ```
* **Triage Commands:**
  ```bash
  netstat -s | grep -i listen
  dmesg -T | grep -i syn
  ```
* **Deterministic Remediation:**
  ```bash
  tune-syn-backlog
  # Applied sysctl: sysctl -w net.ipv4.tcp_max_syn_backlog=8192 net.core.somaxconn=8192
  ```
* **Post-Remediation Verification:** `TCPListenDrops` ceases incrementing, SYN backlog expands, and client connection latency stabilizes < 12ms.

---

## Node 2: Gateway Ingress

### Scenario 3.1: CoreDNS Internal Service Resolution Failure
* **Scenario ID:** `node2-coredns-nxdomain`
* **Failure Domain:** Kubernetes Cluster DNS Subsystem (`kube-dns` / CoreDNS)
* **The Failure Physics:**
  The Ingress proxy cannot resolve headless cluster Service endpoints (`kafka-broker-0.kafka-headless.svc.cluster.local`) because CoreDNS pods crashed or upstream forward timeouts caused `NXDOMAIN` answers. The proxy cannot populate upstream routing tables.
* **Error Signatures:**
  ```text
  ;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 48122
  ;; flags: qr rd ra; QUERY: 1, ANSWER: 0, AUTHORITY: 1, ADDITIONAL: 0
  ;; QUESTION SECTION:
  ;kafka-broker-0.kafka-headless.svc.cluster.local. IN A
  dial tcp: lookup kafka-broker-0 on 10.96.0.10:53: no such host
  ```
* **Triage Commands:**
  ```bash
  dig kafka-broker-0.kafka-headless.svc.cluster.local @10.96.0.10
  kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
  ```
* **Deterministic Remediation:**
  ```bash
  restart-coredns
  # Applied: kubectl rollout restart deployment/coredns -n kube-system
  ```
* **Post-Remediation Verification:** CoreDNS resolves `kafka-broker-0.kafka-headless.svc.cluster.local` to `10.244.2.14` in 1.4ms with `NOERROR`.

---

### Scenario 3.2: Target Group Backend Health Check Failure
* **Scenario ID:** `node2-target-503`
* **Failure Domain:** Ingress Target Group / Downstream Broker Readiness Probes
* **The Failure Physics:**
  The Ingress controller marks downstream broker targets as dead after readiness probe timeouts. With zero healthy backends registered in the load balancer target pool, the ingress immediately returns HTTP 503 to incoming forwarders.
* **Error Signatures:**
  ```text
  Default backend: default-http-backend:80 (<error: endpoints not found>)
  Rules:
    Host                    Path  Backends
    ingress.lakehouse.local /     kafka-headless:9092 (<none: no healthy endpoints>)
  Events:
    Warning  Unhealthy  Readiness probe failed: HTTP probe failed with statuscode: 500
  HTTP/1.1 503 Service Temporarily Unavailable: no healthy upstream
  ```
* **Triage Commands:**
  ```bash
  kubectl describe ingress lakehouse-ingress -n lakehouse-platform
  kubectl get endpoints kafka-headless -n lakehouse-platform
  ```
* **Deterministic Remediation:**
  ```bash
  restart-broker
  # Applied: kubectl rollout restart statefulset/kafka -n lakehouse-platform
  ```
* **Post-Remediation Verification:** Kafka broker endpoints registered as healthy in Ingress pool; TCP connection refused errors clear.

---

## Pipeline 2 → 3: Gateway Ingress to CNI Overlay Wire

### Scenario 4.1: Path MTU Black Hole (Overlay Encapsulation)
* **Scenario ID:** `pipe2-mtu-blackhole`
* **Failure Domain:** L2/L3 Wire MTU, VXLAN Encapsulation, & ICMP Type 3 Code 4 Filtering
* **The Failure Physics:**
  Physical ethernet interfaces use standard MTU 1500. Line-rate telemetry packets carry 1460B payload + 40B TCP/IP = 1500B with Don't Fragment (`DF=1`). Flannel VXLAN adds a 50B encapsulation header, pushing total wire size to **1550 Bytes**. The Linux bridge drops the oversized frame. If middleboxes block `ICMP 3, 4 (Need to Frag)`, connections hang silently in a Path MTU black hole.
* **Error Signatures:**
  ```text
  16:15:01.458291 IP 10.244.1.15.9092 > 10.244.2.14.9092: Flags [P.], seq 1:1460, length 1460
  16:15:01.458315 IP 10.244.2.1 > 10.244.1.15: ICMP unreachable - need to frag (mtu 1420), length 556
  16:15:01.460112 IP 10.244.1.15.9092 > 10.244.2.14.9092: Flags [P.], seq 1:1460, length 1460 (DF set)
  flannel.1 drop counter: FRAME_TOO_LONG: 48,291
  ```
* **Triage Commands:**
  ```bash
  tcpdump -nnvv -i eth0 -s0 'tcp port 9092 or icmp'
  ip link show flannel.1
  ```
* **Deterministic Remediation:**
  ```bash
  fix-mtu
  # Clamps CNI overlay interface MTU to 1420 bytes:
  # ip link set flannel.1 mtu 1420
  ```
* **Post-Remediation Verification:** Total wire frame = 1420B + 50B VXLAN = 1470B < 1500B physical wire; packets transit cleanly with zero drops.

---

### Scenario 4.2: Zero-Trust NetworkPolicy Ingress Block
* **Scenario ID:** `pipe2-netpol-block`
* **Failure Domain:** CNI eBPF / iptables NetworkPolicy Filtering
* **The Failure Physics:**
  A GitOps commit enforced a default-deny NetworkPolicy (`deny-all-ingress`) across the platform namespace without an explicit allow rule for port 9092 from Ingress proxy pods. Packets crossing the CNI veth pair are silently dropped by kernel netfilter rules.
* **Error Signatures:**
  ```text
  Name:         deny-all-ingress
  Namespace:    lakehouse-platform
  PodSelector:  app=kafka
  Allowing ingress traffic:
    <none> (Default Deny Ingress)
  packet dropped by policy 'deny-all-ingress': TCP port 9092 not permitted from 10.244.1.15
  ```
* **Triage Commands:**
  ```bash
  kubectl get netpol -n lakehouse-platform
  kubectl describe netpol deny-all-ingress -n lakehouse-platform
  ```
* **Deterministic Remediation:**
  ```bash
  allow-netpol
  # Patches NetworkPolicy to permit port 9092 ingress from namespace: ingress-nginx
  ```
* **Post-Remediation Verification:** Packets traverse CNI veth bridge; TCP handshake completes cleanly.

---

## Node 3: CNI Overlay Wire

### Scenario 5.1: Linux Netfilter Conntrack Table Saturation
* **Scenario ID:** `node3-conntrack-saturation`
* **Failure Domain:** Linux Kernel `nf_conntrack` State Table
* **The Failure Physics:**
  Thousands of short-lived telemetry TCP connections saturate the Linux kernel connection tracking table (`nf_conntrack_max` = 262,144). When the table is 100% full, the kernel drops incoming SYN packets at the netfilter PREROUTING hook.
* **Error Signatures:**
  ```text
  entries: 262144
  max: 262144 (100% UTILIZATION)
  dmesg: [18491.018241] nf_conntrack: table full, dropping packet
  drop_count: 51,209 packets dropped by netfilter conntrack engine
  ```
* **Triage Commands:**
  ```bash
  conntrack -S
  dmesg -T | grep -i conntrack
  ```
* **Deterministic Remediation:**
  ```bash
  flush-conntrack
  # Applied: sysctl -w net.netfilter.nf_conntrack_max=524288
  # conntrack -F
  ```
* **Post-Remediation Verification:** Conntrack utilization drops to < 20%; new connections accepted without packet drops.

---

### Scenario 5.2: Socket Buffer Ring Overflow (rx_dropped)
* **Scenario ID:** `node3-ring-overflow`
* **Failure Domain:** Network Interface Card (NIC) Driver Ring Buffer & NAPI SoftIRQ
* **The Failure Physics:**
  Under high packet velocity, the virtual network interface socket ring buffer (`rx` = 256) overflows before the kernel SoftIRQ budget can drain packets to user-space. Packets drop in the driver ring with `NETDEV WATCHDOG` timeouts.
* **Error Signatures:**
  ```text
  NIC statistics:
       rx_packets: 48,192,019
       rx_dropped: 128492
       rx_missed_errors: 128492
       rx_no_buffer_count: 98124
  NETDEV WATCHDOG: eth0 (e1000e): transmit queue 0 timed out
  ```
* **Triage Commands:**
  ```bash
  ethtool -S flannel.1
  ifconfig flannel.1 | grep -i dropped
  ```
* **Deterministic Remediation:**
  ```bash
  tune-ring-buffer
  # Applied: ethtool -G flannel.1 rx 4096 tx 4096
  ```
* **Post-Remediation Verification:** Socket ring expanded to 4096 descriptors; `rx_dropped` counter halts at 0.

---

## Pipeline 3 → 4: CNI Overlay to Kafka Broker

### Scenario 6.1: DirectByteBuffer Native Memory Allocation Stall
* **Scenario ID:** `pipe3-direct-byte-buffer`
* **Failure Domain:** JVM Off-Heap Direct Memory Allocation (Java NIO / Netty)
* **The Failure Physics:**
  Kafka socket receivers allocate off-heap direct byte buffers via `ByteBuffer.allocateDirect()` for zero-copy I/O. When concurrent allocations exhaust configured `-XX:MaxDirectMemorySize`, `SocketChannel.read()` throws native OOM and stalls incoming network reads.
* **Error Signatures:**
  ```text
  java.lang.OutOfMemoryError: Direct buffer memory
  	at java.base/java.nio.Bits.reserveMemory(Bits.java:178)
  	at java.base/java.nio.DirectByteBuffer.<init>(DirectByteBuffer.java:118)
  SocketChannel.read() threw java.io.IOException: Cannot allocate memory
  ```
* **Triage Commands:**
  ```bash
  jcmd 1 VM.native_memory baseline
  kubectl logs kafka-broker-0 -n lakehouse-platform | grep -i 'direct buffer'
  ```
* **Deterministic Remediation:**
  ```bash
  tune-direct-memory
  # Applied JVM flags: -XX:MaxDirectMemorySize=2048m -XX:+UseLargePages
  ```
* **Post-Remediation Verification:** Direct memory allocation unblocked; zero-copy socket reads resume without exception.

---

### Scenario 6.2: Broker SSL/SASL SCRAM Authentication Rejection
* **Scenario ID:** `pipe3-sasl-auth`
* **Failure Domain:** SASL SCRAM-SHA-512 Authentication & JAAS Configuration
* **The Failure Physics:**
  Incoming client connection requests fail authentication because the client's JAAS secret credentials do not match the broker's ZooKeeper/KRaft SCRAM-SHA-512 credential database or the ACL token expired.
* **Error Signatures:**
  ```text
  [ERROR] [SocketServer listener-9092] Failed authentication with /10.244.1.15
  org.apache.kafka.common.errors.SaslAuthenticationException: Failed to configure SASL client: Client unable to authenticate
  javax.security.sasl.SaslException: DIGEST-MD5: authentication failed: invalid response
  ```
* **Triage Commands:**
  ```bash
  kubectl get secret kafka-jaas-secret -n lakehouse-platform -o yaml
  kubectl logs kafka-broker-0 -n lakehouse-platform | grep -i sasl
  ```
* **Deterministic Remediation:**
  ```bash
  rotate-sasl
  # Re-synchronizes client and broker JAAS configurations with renewed SCRAM secret
  ```
* **Post-Remediation Verification:** Client authenticates cleanly via SASL SCRAM-SHA-512; producer authorization granted.

---

## Node 4: Kafka Broker

### Scenario 7.1: cgroup v2 Hard Ceiling Breach (The OOM Reaper)
* **Scenario ID:** `node4-cgroup-oom`
* **Failure Domain:** Linux Kernel cgroup v2 Memory Accounting & OOM Killer
* **The Failure Physics:**
  Total container memory consumption (`Heap 4096MB + Netty DirectMemory 4350MB + Stacks 300MB = 8746MB`) breaches the 8192MB container cgroup hard limit. The Linux kernel fires an uncatchable `SIGKILL (Signal 9, Exit Code 137)`, instantly assassinating the process without application log traces.
* **Error Signatures:**
  ```text
  [14022.184910] Memory cgroup out of memory: Kill process 28412 (java) score 982 or sacrifice child
  [14022.184915] Killed process 28412 (java) total-vm:10824192kB, anon-rss:8389120kB
  State: Waiting (CrashLoopBackOff)
  Last State: Terminated (OOMKilled, Exit Code 137)
  ```
* **Triage Commands:**
  ```bash
  kubectl describe pod kafka-broker-0 -n lakehouse-platform | grep -A 5 'Last State'
  dmesg -T | grep -E -i 'oom|kill|memory cgroup'
  ```
* **Deterministic Remediation:**
  ```bash
  resolve-oom
  # Enforces balanced allocation:
  # -Xms4g -Xmx4g -XX:MaxDirectMemorySize=2048m -XX:+ExitOnOutOfMemoryError
  ```
* **Post-Remediation Verification:** Total RSS stabilized at ~6.7 GB (< 8.0 GB cgroup limit); pod enters stable `Running` state without crashloops.

---

### Scenario 7.2: Under-Replicated Partitions (ISR Quorum Collapse)
* **Scenario ID:** `node4-under-replicated`
* **Failure Domain:** Kafka Replication Layer & High-Water Mark Lag
* **The Failure Physics:**
  Slow disk I/O on follower replicas causes replica fetch threads to lag beyond `replica.lag.time.max.ms`. The controller drops the lagging broker from the In-Sync Replicas (ISR) pool. When active ISR falls below `min.insync.replicas=2`, all produce requests with `acks=all` stall with `NotEnoughReplicasException`.
* **Error Signatures:**
  ```text
  Topic: telemetry-events	Partition: 0	Leader: 0	Replicas: 0,1,2	Isr: 0
  Topic: telemetry-events	Partition: 1	Leader: 0	Replicas: 0,1,2	Isr: 0
  [!] UnderReplicatedPartitions count: 8
  org.apache.kafka.common.errors.NotEnoughReplicasException: Number of in-sync replicas 1 is less than configured minimum 2
  ```
* **Triage Commands:**
  ```bash
  kafka-topics --bootstrap-server localhost:9092 --describe --under-replicated-partitions
  kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group lakehouse-ingest
  ```
* **Deterministic Remediation:**
  ```bash
  reassign-partitions
  # Re-balances partition replicas and forces follower catch-up
  ```
* **Post-Remediation Verification:** Replicas catch up to partition high-water marks; ISR returns to 3/3; `UnderReplicatedPartitions` drops to 0.

---

## Pipeline 4 → 5: Kafka Broker to CSI Storage

### Scenario 8.1: Exclusive Lock Contention (Multi-Attach Error)
* **Scenario ID:** `pipe4-multi-attach-lock`
* **Failure Domain:** Kubernetes `attachdetach-controller` & Storage SCSI-3 Reservation
* **The Failure Physics:**
  Node B crashes or loses heartbeats while holding an exclusive `ReadWriteOnce` AWS EBS / Ceph block volume attachment. When the scheduler places the replacement broker pod onto Node C, the `attachdetach-controller` blocks attachment because the API server and SAN still register the volume attached to Node B.
* **Error Signatures:**
  ```text
  Warning  FailedAttachVolume  Multi-Attach error for volume "pvc-telemetry-0"
  Volume is already exclusively attached to one node (node-b-storage-az1) and cannot be attached to node-c-compute-az1.
  kubectl get volumeattachment:
  csi-ebs-vol-08f12a38b19283f   node-b-storage-az1   true   12m
  ```
* **Triage Commands:**
  ```bash
  kubectl describe pod kafka-broker-0 -n lakehouse-platform
  kubectl get volumeattachments | grep -E 'node-b|node-c'
  ```
* **Deterministic Remediation:**
  ```bash
  # Manual:
  unlock-storage # (kubectl delete volumeattachment <name> --force --grace-period=0)
  
  # Automated Enterprise Architecture (NHC + SNR Operator):
  apply-snr-fencing
  # Applies native taint: node.kubernetes.io/out-of-service=nodeshutdown:NoExecute
  ```
* **Post-Remediation Verification:** Stale VolumeAttachment released; storage driver attaches PVC to Node C; replacement pod enters `Running`.

---

### Scenario 8.2: CSI Storage Driver gRPC Controller Timeout
* **Scenario ID:** `pipe4-csi-grpc-timeout`
* **Failure Domain:** Container Storage Interface (CSI) Controller gRPC Client
* **The Failure Physics:**
  High cloud API latency or network packet loss between the Kubernetes control plane and the cloud storage controller causes CSI `ControllerPublishVolume` gRPC calls to exceed the default 15-second client timeout (`DeadlineExceeded`), leaving PVC attachments in a permanent pending loop.
* **Error Signatures:**
  ```text
  [ERROR] controller_helper.go:342] Error attaching volume: rpc error: code = DeadlineExceeded desc = context deadline exceeded while awaiting headers
  grpc_status: 4 (DEADLINE_EXCEEDED)
  AWS EBS API latency: 15420ms > 15000ms gRPC timeout threshold
  ```
* **Triage Commands:**
  ```bash
  kubectl logs -n kube-system -l app=ebs-csi-controller --tail=100
  kubectl get csinodes
  ```
* **Deterministic Remediation:**
  ```bash
  restart-csi
  # Restarts CSI controller and bumps gRPC client timeout to 30s
  ```
* **Post-Remediation Verification:** CSI gRPC calls succeed (`status: OK`); volume attaches in < 4s.

---

## Node 5: CSI Storage Volume

### Scenario 9.1: Kernel Disk I/O Stall & EXT4 Read-Only Remount
* **Scenario ID:** `node5-ro-remount`
* **Failure Domain:** Linux Kernel Block Layer, JBD2 Journaling, & EXT4 Superblock
* **The Failure Physics:**
  Storage link latency exceeds kernel SCSI timeout thresholds (`blk_update_request: I/O error`). The EXT4 Journaling Block Device (JBD2) aborts the transaction journal. The kernel safety policy (**`errors=remount-ro`**) triggers immediately, remounting the filesystem read-only to prevent silent metadata corruption.
* **Error Signatures:**
  ```text
  [19482.019284] EXT4-fs error (device rbd0): ext4_lookup: deleted inode referenced: 104821
  [19482.019310] Aborting journal on device rbd0-8.
  [19482.019342] Remounting filesystem read-only.
  KafkaStorageException: Disk error while writing to log file: Read-only file system (EROFS)
  ```
* **Triage Commands:**
  ```bash
  mount | grep '/var/lib/kafka'
  dmesg -T | grep -E -i 'ext4|jbd2|remount|i/o error'
  ```
* **Deterministic Remediation:**
  ```bash
  fsck-remount-rw
  # 1. Scale down StatefulSet to release file handles
  # 2. Replay journal & fix bitmaps: fsck.ext4 -fy /dev/rbd0
  # 3. Scale StatefulSet back up
  ```
* **Post-Remediation Verification:** Volume re-mounted with `rw,noatime`; Kafka replays segment indices and resumes writes.

---

### Scenario 9.2: Volume Quota Depletion (Zero Inodes / ENOSPC)
* **Scenario ID:** `node5-enospc`
* **Failure Domain:** Linux Inode Table Satiation & Disk Block Quota
* **The Failure Physics:**
  Segment retention policy failure causes disk blocks or inode table slots to reach 100% saturation. When 0 free inodes remain, even zero-byte metadata creation syscalls fail with `ENOSPC`. Kafka initiates an emergency self-shutdown (`Fatal exit requested by storage manager`).
* **Error Signatures:**
  ```text
  Filesystem      Size  Used Avail Use% Mounted on
  /dev/nvme0n1    500G  500G     0 100% /var/lib/kafka/data
  Inodes:         100% utilized (0 free inodes)
  KafkaStorageException: No space left on device
  ENOSPC: write failed -> Broker initiates hard self-shutdown
  ```
* **Triage Commands:**
  ```bash
  df -h /var/lib/kafka/data
  df -i /var/lib/kafka/data
  ```
* **Deterministic Remediation:**
  ```bash
  clean-log-dirs
  # Prunes expired segment files past retention threshold (24h), reclaiming blocks & inodes
  ```
* **Post-Remediation Verification:** Inode utilization drops to 32%; 245GB of free space reclaimed; broker starts cleanly.
