---
id: report-generation
title: Generating Reports from Logs
sidebar_position: 0
---

# Generating Reports from Logs

## Problem Definition

### From Log Data to Human-Readable Reports

When executing workflows with actor-IaC, various data is recorded in logs:

- Workflow execution history (Transitions)
- System information collected from each node (JsonState)
- Data accumulated with % notation

We want to convert this log data into human-readable reports suited for specific purposes.

**Requirements:**

1. **Pluggable** - Compose reports by combining sections
2. **Purpose-specific reports** - Alert reports, system overview reports, etc.
3. **Assembled in workflow YAML** - Change report composition without code changes

### Limitations of "Built-in" Design

Traditional ReportBuilder had a fixed design:

```java
reportBuilder.addWorkflowInfo()     // Fixed format
reportBuilder.addJsonStateSection() // Fixed format
reportBuilder.report()              // Fixed output
```

To change the output format, you had to modify ReportBuilder itself or create a separate class.

---

## How to do it

### Section Plugin Approach

Place section builders as child actors of ReportBuilder, and determine the combination in workflow YAML.

```
ROOT
└── reportBuilder
    ├── wfName           ← Workflow name
    ├── wfDesc           ← Workflow description
    └── nodeData         ← Node data
```

### Basic Usage

**Workflow example:**

```yaml
name: basic-report

steps:
  # 1. Create ReportBuilder and section builders
  - states: ["0", "1"]
    note: Create ReportBuilder and sections
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

  # 3. Generate report
  - states: ["2", "end"]
    note: Generate report
    actions:
      - actor: reportBuilder
        method: report
```

### Available Section Builders

**Standard sections included in actor-IaC (core):**

Sections are output in the order they were `createChild`'d.

| IIAR Class | What it outputs |
|-----------|-----------------|
| `WorkflowNameSectionIIAR` | Workflow name (YAML `name` field) |
| `WorkflowFileSectionIIAR` | Workflow file path |
| `WorkflowDescriptionSectionIIAR` | Workflow description (YAML `description` field) |
| `CheckResultsSectionIIAR` | Collects lines output with % notation |
| `JsonStateSectionIIAR` | Outputs specified actor's `JsonState` in YAML format |
| `TransitionHistorySectionIIAR` | Workflow state transition history |
| `GpuSummarySectionIIAR` | GPU information summary (NVIDIA/AMD) |

All classes are in the `com.scivicslab.actoriac.report.sections.basic` package.

**actor-IaC-plugins (optional):**

Currently, no SectionBuilder plugins are provided. For creating custom sections, refer to [Plugin Development](../plugin-development/).

### Purpose-Specific Report Examples

**Deployment result report:**

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

**System status report:**

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

### Output Destinations

Reports are output via `outputMultiplexer`. That means:

- **Console** - Real-time viewing
- **File** - When `--file-log` option is specified
- **Database** - Structured storage in H2 DB

Reports themselves are also saved as logs, so they can be referenced later.

---

## Under the hood

### POJO and IIActorRef Separation Design

Section builders are implemented with separation of POJO (business logic) and IIAR (actor layer).

**Design principles:**

1. **POJO is pure POJO** - Does not implement `CallableByActionName`
2. **IIAR handles action exposure** - Exposes methods with `@Action` annotation
3. **String argument constraint** - Ensures messaging in distributed actor systems

**Class structure example:**

```
WorkflowNameSection (POJO)
    - String generate()           // Business logic
    - String getTitle()

WorkflowNameSectionIIAR extends IIActorRef<WorkflowNameSection>
    - @Action("generate")         // Calls POJO method
    - @Action("getTitle")
```

### SectionBuilder Interface (POJO)

```java
/**
 * POJO interface for section builders.
 * Does not inherit CallableByActionName.
 */
public interface SectionBuilder {

    /** Generate section content */
    String generate();

    /** Section title (null to omit) */
    default String getTitle() { return null; }
}
```

### ReportBuilder Operation

The `report` action of `ReportBuilder` calls the `generate` action of child actors in order of addition.

```java
// Overview of ReportBuilder.build()
public String build() {
    StringBuilder sb = new StringBuilder();
    sb.append("=== Workflow Execution Report ===\n");

    // Collect sections from child actors (in order of addition)
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

## Related Documents

This section contains detailed documentation for ReportBuilder and each SectionBuilder:

| Document | Description |
|----------|-------------|
| [ReportBuilder Basics](./005-report-builder-basics) | Basic usage of loader, ReportBuilder, and SectionBuilder |
| [WorkflowNameSection](./010-workflow-name-section) | Outputs workflow name |
| [WorkflowDescriptionSection](./020-workflow-description-section) | Outputs workflow description |
| [WorkflowFileSection](./030-workflow-file-section) | Outputs workflow file path |
| [CheckResultsSection](./040-check-results-section) | Collects % notation output |
| [JsonStateSection](./050-json-state-section) | Outputs JsonState in YAML format |
| [TransitionHistorySection](./060-transition-history-section) | Outputs state transition history |
| [GpuSummarySection](./070-gpu-summary-section) | Summarizes GPU information |
| [Actor Tree in Report](./080-actor-tree-in-report) | Including actor tree in reports |
