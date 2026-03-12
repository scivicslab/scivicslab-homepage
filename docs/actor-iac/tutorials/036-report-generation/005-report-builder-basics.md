---
id: report-builder-basics
title: ReportBuilder Basics
sidebar_position: 5
---

# ReportBuilder Basics

## Problem Definition

### Formatting Workflow Execution Results

After executing a workflow, you want to output the results in a human-readable format. For example:

- Workflow name and description
- System information collected from each node
- Check results generated during execution

Manually formatting these every time is tedious. You want to automate report generation as part of the workflow.

### Flexible Output Content

Different purposes require different information.

- **Deployment result report**: Workflow name, check results, state transition history
- **System audit report**: Workflow name, JsonState, GPU information

Instead of a fixed format, you want to compose reports by combining the sections you need.

---

## How to do it

### Actors Involved

Three types of actors are involved in report generation.

| Actor | Role |
|-------|------|
| `loader` | Dynamically creates new actors |
| `ReportBuilder` | Calls child actors (SectionBuilders) in order to assemble the report |
| `SectionBuilder` | Generates one section of the report (multiple types available) |

### Minimal Workflow

Create a minimal report that outputs only the workflow name.

```yaml
name: minimal-report
description: Minimal example of ReportBuilder usage

steps:
  # Step 1: Create ReportBuilder
  - states: ["0", "1"]
    note: Create ReportBuilder
    actions:
      - actor: loader
        method: createChild
        arguments: ["ROOT", "reportBuilder", "com.scivicslab.actoriac.report.ReportBuilderIIAR"]

  # Step 2: Add SectionBuilder
  - states: ["1", "2"]
    note: Add WorkflowNameSection
    actions:
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "wfName", "com.scivicslab.actoriac.report.sections.basic.WorkflowNameSectionIIAR"]

  # Step 3: Output report
  - states: ["2", "end"]
    note: Generate report
    actions:
      - actor: reportBuilder
        method: report
```

This workflow consists of three steps. First, create the ReportBuilder, then add a SectionBuilder, and finally output the report.

### Step 1: Create ReportBuilder

```yaml
- actor: loader
  method: createChild
  arguments: ["ROOT", "reportBuilder", "com.scivicslab.actoriac.report.ReportBuilderIIAR"]
```

Create a ReportBuilder actor using the `loader.createChild` method. There are three arguments.

| Argument | Value | Description |
|----------|-------|-------------|
| 1st argument | `"ROOT"` | Parent actor name. Create as a child of ROOT |
| 2nd argument | `"reportBuilder"` | Name of the actor to create. Referenced by this name later |
| 3rd argument | `"...ReportBuilderIIAR"` | Class name (FQCN) of the actor to create |

After this step executes, the actor tree looks like this:

```
ROOT
├── loader
├── nodeGroup
└── reportBuilder    ← Newly created
```

### Step 2: Add SectionBuilder

```yaml
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "wfName", "com.scivicslab.actoriac.report.sections.basic.WorkflowNameSectionIIAR"]
```

Create a SectionBuilder as a child of ReportBuilder.

| Argument | Value | Description |
|----------|-------|-------------|
| 1st argument | `"reportBuilder"` | Parent actor name. Create as a child of reportBuilder |
| 2nd argument | `"wfName"` | Name of the actor to create |
| 3rd argument | `"...WorkflowNameSectionIIAR"` | SectionBuilder that outputs the workflow name |

After this step executes, the actor tree looks like this:

```
ROOT
├── loader
├── nodeGroup
└── reportBuilder
    └── wfName       ← Created as a child of reportBuilder
```

**Important:** The 2nd argument `"wfName"` is an actor name, not a method name. You can use any name you like.

### Step 3: Output Report

```yaml
- actor: reportBuilder
  method: report
```

When `reportBuilder.report` is called, ReportBuilder calls the `generate` method of child actors (SectionBuilders) in the order they were added, concatenating the results for output.

Output example:

```
=== Workflow Execution Report ===

[Workflow Name]
minimal-report

===================================
```

### Adding Multiple Sections

When multiple SectionBuilders are added, they are output in the order they were added.

```yaml
steps:
  - states: ["0", "1"]
    note: Create ReportBuilder and sections
    actions:
      # ReportBuilder itself
      - actor: loader
        method: createChild
        arguments: ["ROOT", "reportBuilder", "com.scivicslab.actoriac.report.ReportBuilderIIAR"]
      # Section 1: Workflow name
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "sec1", "com.scivicslab.actoriac.report.sections.basic.WorkflowNameSectionIIAR"]
      # Section 2: Workflow description
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "sec2", "com.scivicslab.actoriac.report.sections.basic.WorkflowDescriptionSectionIIAR"]
      # Section 3: Workflow file path
      - actor: loader
        method: createChild
        arguments: ["reportBuilder", "sec3", "com.scivicslab.actoriac.report.sections.basic.WorkflowFileSectionIIAR"]

  - states: ["1", "end"]
    actions:
      - actor: reportBuilder
        method: report
```

The actor tree looks like this:

```
ROOT
└── reportBuilder
    ├── sec1    ← WorkflowNameSection (output 1st)
    ├── sec2    ← WorkflowDescriptionSection (output 2nd)
    └── sec3    ← WorkflowFileSection (output 3rd)
```

Output example:

```
=== Workflow Execution Report ===

[Workflow Name]
my-workflow

[Description]
This workflow does ~.

[Workflow File]
/path/to/my-workflow.yaml

===================================
```

### Available SectionBuilders

List of standard SectionBuilders included in actor-IaC. All are in the `com.scivicslab.actoriac.report.sections.basic` package.

| Class Name | Output Content |
|------------|----------------|
| `WorkflowNameSectionIIAR` | Workflow name |
| `WorkflowDescriptionSectionIIAR` | Workflow description |
| `WorkflowFileSectionIIAR` | Workflow file path |
| `CheckResultsSectionIIAR` | Results output with % notation |
| `JsonStateSectionIIAR` | JsonState in YAML format |
| `TransitionHistorySectionIIAR` | State transition history |
| `GpuSummarySectionIIAR` | GPU information summary |

See the subsequent documents for details on each SectionBuilder.

---

## Under the hood

### How loader.createChild Works

`loader.createChild` uses reflection to instantiate actors. It calls the `(String actorName, IIActorSystem system)` constructor of the class specified in the 3rd argument.

```java
// Overview of DynamicActorLoaderActor.createChild()
actorRef = (IIActorRef<?>) clazz
    .getDeclaredConstructor(String.class, IIActorSystem.class)
    .newInstance(actorName, system);
```

The created actor is registered as a child of the parent actor specified in the 1st argument.

### How ReportBuilder.report Works

The `report` method gets the list of child actors and calls the `generate` action on each child actor.

```java
// Overview of ReportBuilder.report()
for (String childName : selfRef.getNamesOfChildren()) {
    IIActorRef<?> child = system.getIIActor(childName);
    ActionResult result = child.callByActionName("generate", "");
    if (result.isSuccess()) {
        appendSection(sb, result.getResult());
    }
}
```

Child actors are returned in the order they were added with `createChild`, so the order defined in the workflow becomes the section order in the report.

### Actor Name Flexibility

The actor name in the 2nd argument is arbitrary. All of the following are valid:

```yaml
# Pattern 1: Short name
arguments: ["reportBuilder", "wfName", "...WorkflowNameSectionIIAR"]

# Pattern 2: Descriptive name
arguments: ["reportBuilder", "workflowNameSection", "...WorkflowNameSectionIIAR"]

# Pattern 3: Sequential numbering
arguments: ["reportBuilder", "section01", "...WorkflowNameSectionIIAR"]
```

However, actor names must be unique within the same ActorSystem. The same name cannot be used even under different parents.

### Summary

1. Create ReportBuilder as a child of `ROOT` with `loader.createChild`
2. Create SectionBuilders as children of ReportBuilder with `loader.createChild` (multiple allowed)
3. Output the report with `reportBuilder.report`

SectionBuilders are output in the order they were added, so the order of `createChild` calls in the workflow determines the section order in the report.
