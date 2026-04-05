---
id: OverlaySystem_260403_oo01
sidebar_position: 60
title: "Overlay System"
description: "The overlay system of Turing-workflow. Explains the distinction between variable-based value substitution and patch-based structural changes, support for multi-user and multi-environment scenarios, and report-only output mode."
keywords:
  - Turing-workflow
  - overlay
  - variables
  - patch
  - Kustomize
  - multi-environment
  - report-only
---

# Overlay System

The Turing-workflow overlay system is a mechanism for adapting a single workflow definition to multiple users or environments.

## Problem

When running the same workflow in different environments (development, staging, production) or with different users, copying and individually editing workflow definitions creates a significant maintenance burden. When changes are needed, all copies must be modified.

With the overlay system, you maintain the base workflow definition as-is and define only the differences for each environment or user in `overlay-conf.yaml`.

## Variables

Variables are simple value substitutions. They expand `${variableName}` placeholders in the workflow to the specified values.

### Definition

Define them in the `vars` section of `overlay-conf.yaml`:

```yaml
vars:
  targetDir: /opt/myapp
  version: 2.1.0
  backupPath: /backup/myapp
  adminEmail: admin@example.com
```

### Usage Example

Reference them as `${variableName}` within the workflow YAML:

```yaml
steps:
  - name: deploy
    command: cp release-${version}.tar.gz ${targetDir}/
  - name: notify
    command: echo "Deployed ${version}" | mail ${adminEmail}
```

## Overlays (Patches)

Overlays (patches) modify the workflow structure itself. You can add steps, delete steps, or modify existing steps.

### Applying Patches

Patches are matched using `vertexName` (vertex name = step name) as the key. Patches matching the step name in the base workflow are applied.

```yaml
patches:
  - vertexName: deploy-package
    command: scp release.tar.gz ${targetDir}/
    timeout: 300

  - vertexName: extra-validation
    action: add
    after: deploy-package
    command: curl -f http://localhost:8080/health

  - vertexName: legacy-cleanup
    action: delete
```

| Action | Description |
|--------|-------------|
| (omitted) | Modify existing step (matched by `vertexName`) |
| `add` | Add a new step |
| `delete` | Delete an existing step |

## Choosing Between Variables and Overlays

| Criteria | Variables | Overlays (Patches) |
|----------|-----------|-------------------|
| Type of change | Value substitution only | Structural changes |
| Use cases | Paths, versions, emails | Adding/deleting/modifying steps |
| Complexity | Low | High |
| Risk | Low | Medium |
| Recommendation | Consider variables first | When variables cannot handle it |

### Decision Criteria

1. **Just changing values?** -> Use variables
2. **Adding or deleting steps?** -> Use overlays (patches)
3. **Changing step order?** -> Use overlays (patches)
4. **Changing commands themselves?** -> Use overlays (patches)

## Anti-pattern: Processing Everything with Overlays

Using overlays for simple value changes is excessive.

```yaml
# NG: Using patches for value changes
patches:
  - vertexName: deploy
    command: cp release-2.1.0.tar.gz /opt/myapp/

# OK: Using variables
vars:
  version: 2.1.0
  targetDir: /opt/myapp
```

Always use variables for changes that can be handled by variables. Use patches only when modifying the workflow structure.

## Procedure for Adding a New User

1. Create an overlay directory for the user
2. Define user-specific variables in `overlay-conf.yaml`
3. Add patches as needed
4. Validate with a test run

```bash
mkdir -p overlays/user-tanaka
```

```yaml
# overlays/user-tanaka/overlay-conf.yaml
vars:
  deployUser: tanaka
  targetDir: /home/tanaka/app
  notifyEmail: tanaka@example.com
```

```bash
./turing_workflow.java run -w ./workflows/deploy -o ./overlays/user-tanaka/overlay-conf.yaml
```

## Internal Mechanism

### Kustomize Philosophy

The overlay system is based on the same philosophy as Kubernetes Kustomize:

- **Don't modify the base**: The original workflow is always maintained as-is
- **Manage only differences**: Environment-specific changes are isolated in overlay files
- **Compose for final result**: Base and overlay are composed at runtime

### Variable Expansion Mechanism

1. Load the workflow YAML
2. Load the `vars` section from `overlay-conf.yaml`
3. Scan for `${variableName}` patterns in the workflow
4. Replace with corresponding values
5. Stop with an error if undefined variables remain

### Patch Application Mechanism

1. Get the workflow after variable expansion
2. Load the `patches` section from `overlay-conf.yaml`
3. Search for steps in the base workflow using each patch's `vertexName`
4. Modify the workflow according to the action (modify/add/delete)
5. Stop with an error if no matching step is found (except for delete and add)

## Report-Only Output Mode

### `--render-to` Option

Use this when generating only a report without executing the workflow. By combining with the `-q` (`--quiet`) option, you can suppress console output while generating a report file.

```bash
# Generate report only
./turing_workflow.java run -w ./workflows/deploy -q --render-to ./report.html
```

### Comparison with `--quiet`

| Option | Console Output | Report Output | Workflow Execution |
|--------|----------------|---------------|-------------------|
| (none) | Yes | No | Yes |
| `-q` | No | No | Yes |
| `--render-to` | Yes | Yes | Yes |
| `-q --render-to` | No | Yes | Yes |

### `ConsoleAccumulator` Filter Modes

`ConsoleAccumulator` controls console output with the following three filter modes:

| Mode | Description |
|------|-------------|
| `ALL` | Output all logs (default) |
| `NONE` | Suppress all logs (when `-q` is specified) |
| `REPORT_ONLY` | Output only logs with `type: "report"` |

### Plugin Report Output

Plugins output report content by specifying `type: "report"`. In `REPORT_ONLY` mode, only this type of log is displayed on the console.

```java
// Report output from plugin
accumulator.log(LogEntry.builder()
    .type("report")
    .content(reportContent)
    .build());
```
