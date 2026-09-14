# Operational Triage & Interview Cheat Sheet: Multi-Site Ingest Platform

## Core Triage Mental Model
Troubleshoot backward along the physical and logical data path:
Wire / MTU (L2/L3) -> Ingress & CNI (L4/L7) -> Linux Kernel & cgroups -> Process Memory & JVM -> Storage Substrate & Locks -> etcd Consensus

Detailed 18-scenario runbook: docs/COMPLETE_FAILURE_TAXONOMY_RUNBOOK.md

---

## 1. Node 1: Edge Telemetry Forwarder
- **Scenario 1.1: Local Buffer Ring Exhaustion (`node1-buffer-exhaustion`)**
  - *Mechanism:* Stalling downstream network fills pre-allocated agent memory buffer (10,000 events).
  - *Error:* `BufferOverflowException: queue full (10000/10000 events)`.
  - *Triage:* `cat /var/log/edge-agent.log | grep BufferOverflow`
  - *Remediation:* `iot-agent flush-buffer`
- **Scenario 1.2: Serialization Schema Violation (`node1-schema-violation`)**
  - *Mechanism:* Edge payload emitted without required field `thermal_c`; Schema ID 412 missing from cache.
  - *Error:* `SchemaNotFoundException: failed to fetch schema ID 412` or `AvroTypeException`.
  - *Triage:* `curl -s http://schema-registry:8081/subjects/telemetry-value/versions/latest`
  - *Remediation:* `iot-agent reload-schema`

---

## 2. Pipeline 1: Edge to Gateway Ingress
- **Scenario 2.1: Mutual TLS Handshake & Cert Expiration (`pipe1-tls-handshake`)**
  - *Mechanism:* Perimeter root CA or intermediate leaf cert passed `notAfter` expiration timestamp.
  - *Error:* `SSLHandshakeException: PKIX path building failed: unable to find valid certification path`.
  - *Triage:* `openssl s_client -connect ingress.lakehouse.local:9092 < /dev/null | grep notAfter`
  - *Remediation:* `renew-cert` (or `kubectl renew cert lakehouse-tls -n ingress-nginx`)
- **Scenario 2.2: L4 NLB SYN Flood & Connection Throttling (`pipe1-nlb-syn-flood`)**
  - *Mechanism:* Concurrent edge gateway reconnect bursts exhaust kernel `tcp_max_syn_backlog`.
  - *Error:* `TCP: request_sock_TCP: Possible SYN flooding on port 9092. Sending cookies.`
  - *Triage:* `netstat -s | grep -i listen` and `dmesg -T | grep -i syn`
  - *Remediation:* `tune-syn-backlog` (`sysctl -w net.ipv4.tcp_max_syn_backlog=8192`)

---

## 3. Node 2: Gateway Ingress
- **Scenario 3.1: CoreDNS Internal Resolution Failure (`node2-coredns-nxdomain`)**
  - *Mechanism:* Ingress proxy cannot resolve headless Service `kafka-broker-0.kafka-headless.svc.cluster.local`.
  - *Error:* `dial tcp: lookup kafka-broker-0: no such host (NXDOMAIN)`.
  - *Triage:* `dig kafka-broker-0.kafka-headless.svc.cluster.local @10.96.0.10`
  - *Remediation:* `restart-coredns` (`kubectl rollout restart deployment/coredns -n kube-system`)
- **Scenario 3.2: Target Group Health Check Failure (`node2-target-503`)**
  - *Mechanism:* Downstream brokers fail readiness probes; Ingress drops all backends from pool.
  - *Error:* `HTTP/1.1 503 Service Temporarily Unavailable: no healthy upstream`.
  - *Triage:* `kubectl get endpoints kafka-headless -n lakehouse-platform`
  - *Remediation:* `restart-broker` (`kubectl rollout restart statefulset/kafka -n lakehouse-platform`)

---

## 4. Pipeline 2: Ingress to CNI Overlay Wire
- **Scenario 4.1: Path MTU Black Hole & Overhead Math (`pipe2-mtu-blackhole`)**
  - *Mechanism:* Physical MTU 1500B. Payload (1460B) + TCP/IP (40B) + VXLAN encap (50B) = 1550B wire size (DF=1).
  - *Error:* `ICMP 3, 4: Destination Unreachable (Fragmentation Needed and DF set)`.
  - *Triage:* `tcpdump -nnvv -i eth0 'icmp or (tcp and port 9092)'` -> Look for `need to frag (mtu 1420)`.
  - *Remediation:* `fix-mtu` (Clamp CNI overlay MTU to 1420B via `ip link set flannel.1 mtu 1420`).
- **Scenario 4.2: Zero-Trust NetworkPolicy Ingress Block (`pipe2-netpol-block`)**
  - *Mechanism:* Default-deny NetworkPolicy omits ingress permit for TCP port 9092 from Ingress namespace.
  - *Error:* `packet dropped by policy 'deny-all-ingress': TCP 9092 not permitted`.
  - *Triage:* `kubectl describe netpol deny-all-ingress -n lakehouse-platform`
  - *Remediation:* `allow-netpol` (`kubectl apply -f netpol-allow-ingress.yaml`)

---

## 5. Node 3: CNI Overlay Wire
- **Scenario 5.1: Linux Netfilter Conntrack Saturation (`node3-conntrack-saturation`)**
  - *Mechanism:* Short-lived TCP bursts saturate netfilter connection table (`nf_conntrack_max` = 262,144).
  - *Error:* `dmesg: nf_conntrack: table full, dropping packet`.
  - *Triage:* `conntrack -S` and `dmesg -T | grep -i conntrack`
  - *Remediation:* `flush-conntrack` (`sysctl -w net.netfilter.nf_conntrack_max=524288`)
- **Scenario 5.2: Socket Buffer Ring Overflow (`node3-ring-overflow`)**
  - *Mechanism:* NIC driver ring buffer overflows before SoftIRQ budget can drain packets to user-space.
  - *Error:* `flannel.1: RX dropped: 128492 (NETDEV WATCHDOG: transmit queue timed out)`.
  - *Triage:* `ethtool -S flannel.1` and `ifconfig flannel.1 | grep dropped`
  - *Remediation:* `tune-ring-buffer` (`ethtool -G flannel.1 rx 4096 tx 4096`)

---

## 6. Pipeline 3: Wire to Kafka Broker
- **Scenario 6.1: DirectByteBuffer Allocation Stall (`pipe3-direct-byte-buffer`)**
  - *Mechanism:* Netty socket receivers exhaust `-XX:MaxDirectMemorySize` allocating zero-copy buffers.
  - *Error:* `java.lang.OutOfMemoryError: Direct buffer memory (SocketChannel.read failed)`.
  - *Triage:* `jcmd 1 VM.native_memory baseline`
  - *Remediation:* `tune-direct-memory` (`-XX:MaxDirectMemorySize=2048m -XX:+UseLargePages`)
- **Scenario 6.2: Broker SSL/SASL SCRAM Auth Rejection (`pipe3-sasl-auth`)**
  - *Mechanism:* Mismatched JAAS secret credentials or expired SCRAM-SHA-512 token.
  - *Error:* `SaslAuthenticationException: Failed to configure SASL client: Client unable to authenticate`.
  - *Triage:* `kubectl get secret kafka-jaas-secret -o yaml`
  - *Remediation:* `rotate-sasl`

---

## 7. Node 4: Kafka Broker
- **Scenario 7.1: cgroup v2 Hard Ceiling Breach (`node4-cgroup-oom`)**
  - *Mechanism:* `-XX:MaxDirectMemorySize` defaults to `-Xmx` (6GB). Heap (6GB) + Direct Memory (1.8GB+) + Stacks > 8GB limit.
  - *Error:* Kernel sends uncatchable `SIGKILL (Exit Code 137)`. Zero lines in `server.log`.
  - *Triage:* `dmesg -T | grep -E -i 'oom|kill|memory cgroup'` and `kubectl describe pod kafka-broker-0`
  - *Remediation:* `resolve-oom` (`-Xms4g -Xmx4g -XX:MaxDirectMemorySize=2048m -XX:+ExitOnOutOfMemoryError`)
- **Scenario 7.2: Under-Replicated Partitions (`node4-under-replicated`)**
  - *Mechanism:* Follower replica disk lag exceeds `replica.lag.time.max.ms`. ISR drops below `min.insync.replicas=2`.
  - *Error:* `UnderReplicatedPartitions > 0: In-sync replicas (1) is less than configured minimum (2)`.
  - *Triage:* `kafka-topics --bootstrap-server localhost:9092 --describe --under-replicated-partitions`
  - *Remediation:* `reassign-partitions`

---

## 8. Pipeline 4: Broker to CSI Storage
- **Scenario 8.1: Exclusive Lock Contention / Multi-Attach (`pipe4-multi-attach-lock`)**
  - *Mechanism:* Node A crashes; cloud controller retains exclusive RWO SCSI-3 lease. Replacement pod hangs in `ContainerCreating`.
  - *Error:* `FailedAttachVolume: VolumeAttachment ... is already attached to node <node-a>`.
  - *Triage:* `kubectl get volumeattachments`
  - *Manual Remediation:* `unlock-storage` (`kubectl delete volumeattachment <name> --force --grace-period=0`)
  - *Automated Remediation:* Node Health Check + Self-Node Remediation applying `node.kubernetes.io/out-of-service=nodeshutdown:NoExecute`
- **Scenario 8.2: CSI Storage Driver gRPC Controller Timeout (`pipe4-csi-grpc-timeout`)**
  - *Mechanism:* Cloud API latency exceeds CSI `ControllerPublishVolume` 15s gRPC timeout.
  - *Error:* `rpc error: code = DeadlineExceeded desc = context deadline exceeded while awaiting headers`.
  - *Triage:* `kubectl logs -n kube-system -l app=ebs-csi-controller --tail=100`
  - *Remediation:* `restart-csi`

---

## 9. Node 5: CSI Storage Volume
- **Scenario 9.1: Kernel Disk I/O Stall & EXT4 Read-Only Remount (`node5-ro-remount`)**
  - *Mechanism:* Block write timeout aborts JBD2 journal. EXT4 safety policy (`errors=remount-ro`) emergency-remounts superblock `ro`.
  - *Error:* `EXT4-fs (device rbd0): Remounting filesystem read-only`.
  - *Triage:* `mount | grep '/var/lib/kafka'` and `dmesg -T | grep -E -i 'ext4|jbd2|remount'`
  - *Remediation:* DO NOT remount rw directly! Scale down pod, run `fsck.ext4 -fy /dev/rbd0` to replay journal, scale pod back up.
- **Scenario 9.2: Volume Quota Depletion / Zero Inodes (`node5-enospc`)**
  - *Mechanism:* Segment retention failure exhausts disk blocks or inode table slots (0 free inodes).
  - *Error:* `KafkaStorageException: No space left on device` (`ENOSPC`).
  - *Triage:* `df -h /var/lib/kafka/data` and `df -i /var/lib/kafka/data`
  - *Remediation:* `clean-log-dirs` (Prune segment files past retention threshold).
