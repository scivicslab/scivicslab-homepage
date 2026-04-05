---
id: PluginReport_260403_oo01
sidebar_position: 50
title: "plugin-report: Workflow Execution Report Generation"
description: "A plugin that dynamically generates section-based workflow execution reports. Assembles sections including GPU information, transition history, and check results."
keywords:
  - report
  - workflow report
  - GPU summary
  - transition history
  - section builder
---

# plugin-report

A plugin that dynamically generates workflow execution reports on a section-by-section basis. In addition to built-in sections for workflow name/description, JSON state, transition history, check results, and GPU information, custom sections can also be added.

## Report Structure

Reports are generated with the following structure:

```
=== Workflow Execution Report ===

--- Workflow Name ---
deploy-all

--- Description ---
Workflow that deploys to all nodes

--- Check Results ---
[verify-repos]
  node-web1: OK (exit 0)
  node-web2: OK (exit 0)

[GPU Summary]
web1, gpu, NVIDIA A100
web1, vram, 40GB
web1, driver, 535.129.03
web1, toolkit, CUDA 12.2

Summary: 2 NVIDIA
```

## Architecture

### Two Types of Section Interfaces

| Interface | Purpose | Implementation Pattern |
|---|---|---|
| `ReportSection` | Legacy sections (direct addition) | `getTitle()` + `getContent()` |
| `SectionBuilder` | Child actor sections (dynamic generation) | `generate()` + `getTitle()` |

`SectionBuilder` is implemented as a POJO, and the corresponding Actor class is registered as a child actor of `ReportBuilderActor`.

### Report Assembly Flow

```
ReportBuilderActor
  +-- WorkflowNameSectionActor      (generate -> "deploy-workflow")
  +-- WorkflowDescriptionSectionActor (generate -> "Deploys to all...")
  +-- CheckResultsSectionActor      (generate -> "[verify-repos]...")
  +-- GpuSummarySectionActor        (generate -> "[GPU Summary]...")
  +-- TransitionHistorySectionActor (generate -> transition history)
```

When `build()` is called, the `generate` action of each child actor is invoked, and the results are concatenated in order.

## `ReportBuilderActor` `@Action` Methods

| Action | Arguments | Description |
|---|---|---|
| `addWorkflowInfo` | none | Read YAML from `nodeGroup` workflow path and add name and description sections |
| `addJsonStateSection` | `{"actor":"node-web1", "path":"optional"}` | Add specified actor's state as YAML format section |
| `report` | none | Assemble report and send to `outputMultiplexer` |

## Built-in Sections

### `WorkflowNameSection` / `WorkflowDescriptionSection`

Extracts and displays `name` and `description` from the workflow YAML.

### `WorkflowFileSection`

Displays the entire contents of the workflow YAML file as-is.

### `CheckResultsSection`

Aggregates check results (labels starting with `verify-*`) from the log database and displays pass/fail status per node.

- Searches for entries where `label` starts with `verify-` from the `logs` table in H2 database
- Checks `exit_code` for each node to determine pass/fail
- Requires session ID and `Connection`

### `TransitionHistorySection`

Displays workflow transition history chronologically. Extracts transition names and note information from log `label` and `action_name`.

### `GpuSummarySection`

Parses GPU information from logs and generates a summary.

**NVIDIA GPU (nvidia-smi CSV output)**:
```
NVIDIA A100, 40960 MiB, 535.129.03, 8.0
```
-> Extracts GPU name, VRAM, driver version, and Compute Capability

**AMD GPU (ROCm output)**:
```
AMD_GPU: detected
GPU_NAME: AMD Instinct MI250X
VRAM_BYTES: 68719476736
DRIVER_VERSION: 6.3.6
ROCM_VERSION: 5.7.0
GFX_ARCH: gfx90a
```
-> Parses each field individually

**lspci output** (fallback):
```
VGA compatible controller: Advanced Micro Devices, Inc. [AMD/ATI] ...
```

Output format:
```
[GPU Summary]
web1, gpu, NVIDIA A100
web1, vram, 40GB
web1, driver, 535.129.03
web1, toolkit, CUDA 12.2

Summary: 2 NVIDIA, 1 AMD
```

### `JsonStateSection`

Takes a snapshot of the specified actor's current state in JSON/YAML format. Used for debugging and state verification.

## Adding Custom Sections

Custom sections can be added by implementing the `SectionBuilder` interface and creating a corresponding Actor class.

```java
// POJO side
public class MyCustomSection implements SectionBuilder {
    @Override
    public String generate() {
        return "Custom content here";
    }

    @Override
    public String getTitle() {
        return "My Custom Section";
    }
}

// Actor side
public class MyCustomSectionActor extends IIActorRef<MyCustomSection> {
    // Registered as child actor of ReportBuilderActor
}
```

## Plugin Dependencies

- `plugin-log-db` (provided) - Queries from log database

## Library Dependencies

- `org.yaml:snakeyaml:2.2` - YAML parsing
- `org.json:json:20231013` - JSON parsing
