---
id: check-results-section
title: CheckResultsSection
sidebar_position: 4
---

# CheckResultsSection

A section builder that collects and displays output with % prefix (check results).

## What is % Notation?

When you output a line starting with `%` in a workflow, that line is collected into the report. This is a mechanism to distinguish debug output and intermediate results from results you want to display in the final report.

```bash
# Shell script within workflow
if command -v node > /dev/null; then
  echo "%[OK] Node.js: $(node --version)"   # ← Collected into report
else
  echo "%[ERROR] Node.js: not found"        # ← Collected into report
fi
echo "Debug: checking next..."              # ← Not collected (no %)
```

## Output Example

```
[Check Results]
[ERROR] Maven: not found
[OK] Node.js: v18.0.0
[OK] yarn: 1.22.19
```

Collected lines are deduplicated and sorted before output.

## Usage

```yaml
- actor: loader
  method: createChild
  arguments: ["reportBuilder", "checkResults", "com.scivicslab.actoriac.report.sections.basic.CheckResultsSectionIIAR"]
```

## Behavior

1. Gets DB connection from `DistributedLogStore`
2. Gets current session ID from `nodeGroup`
3. Collects lines starting with `%` from the log table
4. Removes duplicates, sorts, and outputs

## Display Order

`order: 300` (displayed after workflow information sections)

## Classes

| Type | Class Name |
|------|------------|
| POJO | `CheckResultsSection` |
| IIAR | `CheckResultsSectionIIAR` |

## Practical Example with ReportBuilder

Workflow that generates a report by combining multiple SectionBuilders:

```yaml
name: system-check-report
description: Check system environment and generate report

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
        arguments: ["reportBuilder", "checkResults", "com.scivicslab.actoriac.report.sections.basic.CheckResultsSectionIIAR"]

  - states: ["1", "2"]
    note: Run environment checks
    actions:
      - actor: nodeGroup
        method: apply
        arguments:
          actor: "node-*"
          method: runWorkflow
          arguments: ["check-environment.yaml"]

  - states: ["2", "end"]
    note: Generate report
    actions:
      - actor: reportBuilder
        method: report
```

**check-environment.yaml (executed on each node):**

```yaml
name: check-environment

steps:
  - states: ["0", "end"]
    note: Check installed tools
    actions:
      - actor: this
        method: executeCommand
        arguments:
          - |
            HOSTNAME=$(hostname -s)

            # Node.js
            if command -v node > /dev/null; then
              echo "%$HOSTNAME: [OK] Node.js $(node --version)"
            else
              echo "%$HOSTNAME: [ERROR] Node.js not found"
            fi

            # Java
            if command -v java > /dev/null; then
              echo "%$HOSTNAME: [OK] Java $(java -version 2>&1 | head -1)"
            else
              echo "%$HOSTNAME: [ERROR] Java not found"
            fi
```

**Output example:**

```
================================================================================
                              WORKFLOW REPORT
================================================================================

[Workflow Name]
system-check-report

[Description]
  Check system environment and generate report

[Check Results]
server1: [ERROR] Java not found
server1: [OK] Node.js v18.0.0
server2: [OK] Java openjdk version "17.0.1"
server2: [OK] Node.js v20.0.0

================================================================================
```

Each SectionBuilder handles a simple function, but by having ReportBuilder arrange child actors in `order` sequence, a formatted report is generated.
