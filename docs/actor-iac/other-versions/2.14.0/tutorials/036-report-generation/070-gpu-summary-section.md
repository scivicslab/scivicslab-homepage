---
id: gpu-summary-section
title: GpuSummarySection
sidebar_position: 7
---

# GpuSummarySection

A section builder that extracts and aggregates GPU information from workflow execution logs.

## Feature Overview

- **NVIDIA GPU**: Parses `nvidia-smi` CSV output
- **AMD GPU**: Parses ROCm format output
- **lspci output**: Fallback for VGA controller information

## Output Example

```
[GPU Summary]
192.168.5.13, gpu, NVIDIA GeForce RTX 4080
192.168.5.13, vram, 16GB
192.168.5.13, driver, 550.54.14
192.168.5.13, toolkit, CUDA 12.4
192.168.5.13, arch, 8.9
192.168.5.14, gpu, AMD Radeon RX 7900 XTX
192.168.5.14, vram, 24GB
192.168.5.14, driver, 6.3.6
192.168.5.14, toolkit, ROCm 6.0
192.168.5.14, arch, gfx1100

Summary: 1 NVIDIA, 1 AMD
```

## Usage

```yaml
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "gpuSummary", "com.scivicslab.actoriac.report.sections.basic.GpuSummarySectionIIAR"]
```

## Prerequisites

To collect GPU information, a sub-workflow that collects GPU information must be executed on target nodes beforehand. It's assumed that logs containing the `GPU INFO` marker are recorded.

### NVIDIA GPU Information Collection Example

```yaml
name: collect-gpu-info
description: Collect GPU information from nodes

steps:
  - states: ["0", "1"]
    note: Collect NVIDIA GPU info
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runShell
          arguments: ["echo 'GPU INFO:' && nvidia-smi --query-gpu=name,memory.total,driver_version,compute_cap --format=csv,noheader && echo 'CUDA_VERSION:' $(cat /usr/local/cuda/version.txt 2>/dev/null | cut -d' ' -f3 || echo 'N/A')"]
```

### AMD GPU Information Collection Example

```yaml
- actor: nodeGroup
  method: apply
  arguments:
    actor: "node-*"
    method: runShell
    arguments: ["echo 'GPU INFO:' && echo 'AMD_GPU:' && rocm-smi --showproductname | grep -oP 'Card series:\\s*\\K.*' | head -1 | xargs -I{} echo 'GPU_NAME: {}' && rocm-smi --showmeminfo vram | grep 'Total Memory' | awk '{print \"VRAM_BYTES:\", $4}' | head -1 && cat /sys/module/amdgpu/version 2>/dev/null | xargs -I{} echo 'DRIVER_VERSION: {}' && cat /opt/rocm/.info/version 2>/dev/null | xargs -I{} echo 'ROCM_VERSION: {}' && rocminfo | grep 'gfx' | head -1 | awk '{print \"GFX_ARCH:\", $2}'"]
```

## Parseable Log Formats

### NVIDIA (nvidia-smi CSV format)

```
GPU INFO:
NVIDIA GeForce RTX 4080, 16376 MiB, 550.54.14, 8.9
CUDA_VERSION: 12.4
```

### AMD (ROCm format)

```
GPU INFO:
AMD_GPU:
GPU_NAME: AMD Radeon RX 7900 XTX
VRAM_BYTES: 25769803776
DRIVER_VERSION: 6.3.6
ROCM_VERSION: 6.0.0
GFX_ARCH: gfx1100
```

## Behavior

1. Gets DB connection from `DistributedLogStore`
2. Gets current session ID from `nodeGroup`
3. Extracts logs containing `GPU INFO` and related messages from the log table
4. Parses NVIDIA/AMD/lspci format logs
5. Formats GPU information per node (name, VRAM, driver, toolkit, architecture)
6. Outputs summary (NVIDIA count, AMD count, other count)

## Display Order

`order: 600` (displayed after TransitionHistory section)

## Classes

| Type | Class Name |
|------|------------|
| POJO | `GpuSummarySection` |
| IIAR | `GpuSummarySectionIIAR` |

## Practical Example with ReportBuilder

Workflow that reports GPU cluster status by combining multiple SectionBuilders:

```yaml
name: gpu-cluster-report
description: Report GPU cluster status

steps:
  - states: ["0", "1"]
    note: Create ReportBuilder with sections
    actions:
      - actor: loader
        method: createChild
        arguments: ["ROOT", "reportBuilder", "com.scivicslab.actoriac.report.ReportBuilderIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "wfName", "com.scivicslab.actoriac.report.sections.basic.WorkflowNameSectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "wfDesc", "com.scivicslab.actoriac.report.sections.basic.WorkflowDescriptionSectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "gpuSummary", "com.scivicslab.actoriac.report.sections.basic.GpuSummarySectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "checkResults", "com.scivicslab.actoriac.report.sections.basic.CheckResultsSectionIIAR"]

  - states: ["1", "2"]
    note: Collect GPU information from all nodes
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runShell
          arguments: ["echo 'GPU INFO:' && nvidia-smi --query-gpu=name,memory.total,driver_version,compute_cap --format=csv,noheader 2>/dev/null && echo 'CUDA_VERSION:' $(cat /usr/local/cuda/version.txt 2>/dev/null | cut -d' ' -f3 || echo 'N/A') || echo 'No NVIDIA GPU'"]

  - states: ["2", "3"]
    note: Run GPU health check
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runShell
          arguments: ["nvidia-smi -q | grep -q 'GPU Current Temp' && echo '%gpu-node-'$(hostname -I | awk '{print $1}')', [OK] GPU healthy' || echo '%gpu-node-'$(hostname -I | awk '{print $1}')', [WARN] GPU check failed'"]

  - states: ["3", "end"]
    note: Generate report
    actions:
      - actor: reportBuilder
        method: report
```

**Output example:**

```
================================================================================
                              WORKFLOW REPORT
================================================================================

[Workflow Name]
gpu-cluster-report

[Description]
  Report GPU cluster status

[GPU Summary]
192.168.5.13, gpu, NVIDIA GeForce RTX 4080
192.168.5.13, vram, 16GB
192.168.5.13, driver, 550.54.14
192.168.5.13, toolkit, CUDA 12.4
192.168.5.13, arch, 8.9
192.168.5.14, gpu, NVIDIA GeForce RTX 4080
192.168.5.14, vram, 16GB
192.168.5.14, driver, 550.54.14
192.168.5.14, toolkit, CUDA 12.4
192.168.5.14, arch, 8.9
192.168.5.15, gpu, NVIDIA A100-SXM4-80GB
192.168.5.15, vram, 80GB
192.168.5.15, driver, 550.54.14
192.168.5.15, toolkit, CUDA 12.4
192.168.5.15, arch, 8.0

Summary: 3 NVIDIA

[Check Results]
gpu-node-192.168.5.13: [OK] GPU healthy
gpu-node-192.168.5.14: [OK] GPU healthy
gpu-node-192.168.5.15: [OK] GPU healthy

[Transition History: nodeGroup (with children)]

  [nodeGroup]
  o [2026-01-30 10:00:00] 0 -> 1 [Create ReportBuilder]
  o [2026-01-30 10:00:01] 1 -> 2 [Collect GPU information]
  o [2026-01-30 10:00:10] 2 -> 3 [Run GPU health check]
  o [2026-01-30 10:00:15] 3 -> end [Generate report]

  [node-192.168.5.13]
  o [2026-01-30 10:00:02] 0 -> 1 [Run nvidia-smi]
  o [2026-01-30 10:00:11] 1 -> end [Health check]

  [node-192.168.5.14]
  o [2026-01-30 10:00:03] 0 -> 1 [Run nvidia-smi]
  o [2026-01-30 10:00:12] 1 -> end [Health check]

  [node-192.168.5.15]
  o [2026-01-30 10:00:04] 0 -> 1 [Run nvidia-smi]
  o [2026-01-30 10:00:13] 1 -> end [Health check]

Summary: 12 transitions, 12 succeeded, 0 failed

================================================================================
```

By combining GPU information collection and health checks, a report listing the GPU status of the entire cluster is generated.
