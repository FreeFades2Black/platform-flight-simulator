# 🛡️ Automated Node Fencing & Volume Detachment Pipeline
### Node Health Check (NHC) + Self-Node Remediation (SNR) with Native `out-of-service` Taint

This directory contains the production GitOps pipeline to automate node failure detection, hardware fencing, and persistent volume detachment for stateful workloads (Kafka, Ceph RBD, AWS EBS).

---

## 1. The Operational Problem: Ungraceful Node Shutdown
When a Kubernetes worker node panics or loses power abruptly:
1. The local `kubelet` dies without running pod teardown or CSI unmount hooks.
2. The storage controller (EBS, SAN, Ceph) enforces an exclusive `ReadWriteOnce` (RWO) reservation to prevent split-brain filesystem corruption.
3. The scheduler reschedules the stateful pod (e.g. `kafka-broker-2`) to an operational node, but the pod hangs in `ContainerCreating` indefinitely with `FailedAttachVolume: Multi-Attach error`.
4. Manual triage requires human intervention to verify the node is dead and force-prune the `VolumeAttachment` API object.

---

## 2. The Solution: Automated NHC + SNR Pipeline
By pairing **Node Health Check (NHC)** with **Self-Node Remediation (SNR)** using `remediationStrategy: OutOfServiceTaint`:

```
[ Worker Node Crashes / Heartbeats Lost ]
                  │
                  ▼ (T + 60s)
[ NodeHealthCheck Watchdog Trips ] ──► Spawns SelfNodeRemediation CR
                  │
                  ▼
[ SNR Controller Fences Host & Applies Native Taint ]:
      node.kubernetes.io/out-of-service=nodeshutdown:NoExecute
                  │
                  ▼
[ Kubernetes attachdetach-controller Reconciles ]:
      Deletes blocking VolumeAttachment API resource
                  │
                  ▼
[ Replacement Pod Attaches Disk & Enters Running State ]
```

---

## 3. Deployment Instructions

### Option A: Apply via Kustomize / Kubectl
```bash
kubectl apply -k manifests/automated-node-fencing/
```

### Option B: Deploy via ArgoCD / GitOps
Reference this directory in your root ApplicationSet:
```yaml
spec:
  source:
    repoURL: https://github.com/FreeFades2Black/platform-flight-simulator.git
    targetRevision: main
    path: manifests/automated-node-fencing
  destination:
    server: https://kubernetes.default.svc
    namespace: openshift-workload-availability
```

---

## 4. Verification Commands

```bash
# 1. Verify operator controller-manager pods are Running
kubectl get pods -n openshift-workload-availability

# 2. Inspect NodeHealthCheck status
kubectl get nodehealthcheck -n openshift-workload-availability

# 3. Simulate node failure and observe automated out-of-service taint application
kubectl get node <failing-node> -o jsonpath='{.spec.taints}' | jq

# Expected output shows automated taint:
# [
#   {
#     "effect": "NoExecute",
#     "key": "node.kubernetes.io/out-of-service",
#     "value": "nodeshutdown"
#   }
# ]

# 4. Confirm stuck VolumeAttachment is automatically cleared
kubectl get volumeattachments
```
