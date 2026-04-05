---
id: ReportGeneration_260403_oo01
sidebar_position: 50
title: "Report Generation"
description: "Dynamic generation of workflow execution reports using the section plugin approach. Explains the combination of ReportBuilder and child actor SectionBuilder, examples of purpose-specific reports, and output destination configuration."
keywords:
  - Turing-workflow
  - report
  - ReportBuilder
  - SectionBuilder
  - workflow report
  - GPU summary
---

# Report Generation

## Problem Definition

### From Log Data to Human-Readable Reports

When executing a workflow with Turing-workflow, various data is recorded in logs.

- Workflow execution history (Transition)
- System information collected from each node (JsonState)
- Data accumulated using the `%` notation

We want to transform log data into human-readable reports tailored to specific purposes.

**Requirements:**

1. **Pluggable** - Compose reports by combining sections
2. **Purpose-specific reports** - Create reports according to objectives such as alert reports and system overview reports
3. **Assemble in workflow YAML** - Modify report composition without code changes


## How to do it

### Section Plugin Approach

Implement each report section as an independent actor (`SectionBuilder`). Place `SectionBuilder` as a child actor of `ReportBuilder`, and determine which sections to include in the report via workflow YAML.

```
ROOT
└── reportBuilder
    ├── wfName           ← Workflow name section
    ├── wfDesc           ← Workflow description section
    └── nodeData         ← Node data section
```

You can freely change the combination of sections included in the report through the YAML file. No Java code modifications are required.

### Creating Sections with `loader.createChild`

`SectionBuilder` is created using the `loader.createChild` method. It takes three arguments.

```yaml
- actor: loader
  method: createChild
  arguments: ["parent actor name", "child actor name", "FQCN of IIAR class"]
```

| Argument | Description | Example |
|----------|-------------|---------|
| 1st argument | Parent actor name. Specifies the parent actor where the child actor will be placed | `"reportBuilder"` |
| 2nd argument | Child actor name. The name registered in the actor tree | `"wfName"` |
| 3rd argument | Fully qualified name of the IIAR class | `"com.scivicslab.turingworkflow.plugins.report.sections.basic.WorkflowNameSectionIIAR"` |

**Placement in the Actor Tree:**

```
ROOT
├── loader
├── nodeGroup
│   └── node-* (each node)
└── reportBuilder        ← Created as a child of "ROOT"
    ├── wfName           ← Created as a child of "reportBuilder"
    ├── wfDesc           ← Created as a child of "reportBuilder"
    └── checkResults     ← Created as a child of "reportBuilder"
```

`ReportBuilder` calls child actors (`SectionBuilder`) in the order they were added to generate the report.

### Basic Workflow Example

Report generation consists of three phases.

1. **Preparation Phase**: Create `ReportBuilder` and the required `SectionBuilder` instances
2. **Data Collection Phase**: Collect system information from each node
3. **Output Phase**: Call the `report` method of `ReportBuilder` to generate the report

```yaml
name: basic-report

steps:
  # 1. Create ReportBuilder and section builders
  - states: ["0", "1"]
    note: Create ReportBuilder and sections
    actions:
      - actor: loader
        method: createChild
        arguments: ["ROOT", "reportBuilder", "com.scivicslab.turingworkflow.plugins.report.ReportBuilderIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "wfName", "com.scivicslab.turingworkflow.plugins.report.sections.basic.WorkflowNameSectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "wfDesc", "com.scivicslab.turingworkflow.plugins.report.sections.basic.WorkflowDescriptionSectionIIAR"]

  # 2. Data collection (execute sub-workflow on each node)
  - states: ["1", "2"]
    note: Collect system info
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["collect-sysinfo.yaml"]

  # 3. Report generation
  - states: ["2", "end"]
    note: Generate report
    actions:
      - actor: reportBuilder
        method: report
```

In the first step, `ReportBuilder` itself is created as a child of `ROOT`, then each `SectionBuilder` is created as a child of `reportBuilder`. Since `SectionBuilder` cannot be created without the parent `ReportBuilder` existing, the creation order is important.

### Available Section Builders

Sections are output in the order they were created with `createChild` in the workflow. All classes are included in the `com.scivicslab.turingworkflow.plugins.report.sections.basic` package.

| IIAR Class | Output Content |
|------------|----------------|
| `WorkflowNameSectionIIAR` | Workflow name (YAML `name` field) |
| `WorkflowFileSectionIIAR` | Path to the workflow file |
| `WorkflowDescriptionSectionIIAR` | Workflow description (YAML `description` field) |
| `CheckResultsSectionIIAR` | Collects lines output using `%` notation |
| `JsonStateSectionIIAR` | Outputs `JsonState` of the specified actor in YAML format |
| `TransitionHistorySectionIIAR` | Workflow state transition history |
| `GpuSummarySectionIIAR` | GPU information summary (NVIDIA/AMD) |

### Examples of Purpose-Specific Reports

By changing the combination of `SectionBuilder`, you can generate reports according to your objectives.

**Deployment Result Report:**

A report that summarizes the execution results of a deployment workflow. In addition to the workflow name and description, it collects check results using `%` notation with `CheckResultsSection` and records the state transitions of each node with `TransitionHistorySection`.

```yaml
name: deployment-report

steps:
  - states: ["0", "1"]
    note: Create ReportBuilder and sections
    actions:
      - actor: loader
        method: createChild
        arguments: ["ROOT", "reportBuilder", "...ReportBuilderIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "wfName", "...WorkflowNameSectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "wfDesc", "...WorkflowDescriptionSectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "checkResults", "...CheckResultsSectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "trans:nodeGroup:children", "...TransitionHistorySectionIIAR"]

  - states: ["1", "2"]
    note: Deploy
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["deploy.yaml"]

  - states: ["2", "end"]
    actions:
      - actor: reportBuilder
        method: report
```

The report includes results output using `%` notation during deployment (success/failure, etc.) and the history of which states each node passed through.

**System Status Report:**

A report for understanding the current state of infrastructure. It outputs system information in YAML format with `JsonStateSection` and summarizes GPU information with `GpuSummarySection`.

```yaml
name: system-status-report

steps:
  - states: ["0", "1"]
    note: Create ReportBuilder with state sections
    actions:
      - actor: loader
        method: createChild
        arguments: ["ROOT", "reportBuilder", "...ReportBuilderIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "wfName", "...WorkflowNameSectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "wfFile", "...WorkflowFileSectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "state:nodeGroup:cluster", "...JsonStateSectionIIAR"]
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "gpuSummary", "...GpuSummarySectionIIAR"]

  - states: ["1", "2"]
    note: Collect system info
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["collect-sysinfo.yaml"]

  - states: ["2", "end"]
    actions:
      - actor: reportBuilder
        method: report
```

The report includes the workflow file path, JsonState collected from each node, and a GPU information summary. Use this for periodic system audits or verification after adding new nodes.

### Output Destinations

Reports are output via `outputMultiplexer`.

| Destination | Description |
|-------------|-------------|
| Console | View in real-time |
| File | Save to file when `--file-log` option is specified |
| Database | Store structured data in H2 database |

Reports are also saved as logs, so they can be referenced later.


## Under the hood

### Separation of POJO and IIAR Design

Section builders are implemented by separating POJO (business logic) and IIAR (actor layer). This allows business logic to be tested independently from the actor system and increases code reusability.

**Design Principles:**

1. **POJO is pure POJO** - Does not implement `CallableByActionName`. Has no dependency on the actor system, making unit testing easy
2. **IIAR handles action exposure** - Exposes methods with `@Action` annotation. IIAR wraps POJO and makes it callable from workflows
3. **String argument constraint** - All action arguments and return values are String type. This is a constraint to guarantee serialization in distributed actor systems

```
WorkflowNameSection (POJO)
    - String generate()           // Business logic
    - String getTitle()

WorkflowNameSectionIIAR extends IIActorRef<WorkflowNameSection>
    - @Action("generate")         // Calls POJO method
    - @Action("getTitle")
```

The `@Action` methods in IIAR internally call the corresponding methods of POJO and wrap the results in `ActionResult` before returning.

### `SectionBuilder` Interface

All section builder POJOs implement the `SectionBuilder` interface. The `SectionBuilder` interface defines two methods.

- `generate()`: Generates and returns the section body. This is the content output to the report
- `getTitle()`: Returns the section title. Returns `null` to output the section without a title

```java
public interface SectionBuilder {
    /** Generate section content */
    String generate();

    /** Section title (null to omit) */
    default String getTitle() { return null; }
}
```

The `SectionBuilder` interface does not extend `CallableByActionName`. This is an intentional design to completely separate POJOs from the actor system.

### How `ReportBuilder` Works

The `report` action of `ReportBuilder` calls the `generate` action of child actors in the order they were added to assemble the report.

```java
// ReportBuilder.build() overview
public String build() {
    StringBuilder sb = new StringBuilder();
    sb.append("=== Workflow Execution Report ===\n");

    // Collect sections from child actors (in creation order)
    for (String childName : selfRef.getNamesOfChildren()) {
        IIActorRef<?> child = system.getIIActor(childName);

        // Call generate action
        ActionResult result = child.callByActionName("generate", "");
        if (result.isSuccess()) {
            String content = result.getResult();
            String title = getTitle(child);
            appendSection(sb, title, content);
        }
    }

    return sb.toString();
}
```

It retrieves the list of child actor names with `selfRef.getNamesOfChildren()` and calls the `generate` action of each child actor. Child actors are returned in the order they were added with `createChild`, so the section order in the report matches the order defined in the workflow. If each `SectionBuilder`'s `generate` succeeds, the content and title (if any) are added to the report. If it fails, it is skipped.
