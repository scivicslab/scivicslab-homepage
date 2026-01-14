---
sidebar_position: 3
title: describe
---

# describe

The `describe` command displays the description and structure of a workflow. This helps you understand what a workflow does before running it.

## Synopsis

```bash
actor-iac describe -d <directory> -w <workflow> [options]
```

## Description

The `describe` command loads a workflow file and displays its description and optionally the descriptions of each step. If an overlay is specified, the command shows the merged workflow with all patches and variable substitutions applied.

Workflows can include a top-level `description` field and per-step `description` fields that document what each part of the workflow does. This command extracts and displays that documentation.

## Required Options

| Option | Description |
|--------|-------------|
| `-d, --dir <directory>` | Directory containing workflow files. |
| `-w, --workflow <name>` | Name of the workflow to describe. |

## Optional Options

| Option | Description |
|--------|-------------|
| `-o, --overlay <directory>` | Overlay directory to apply. The merged workflow is described after patches and variable substitutions. |
| `--steps` | Also display descriptions for each step in the workflow. |

## Output Format

The command displays:

1. **Workflow name** and file path
2. **Overlay** (if specified)
3. **Workflow description** from the top-level `description` field
4. **Step descriptions** (if `--steps` is specified), showing the state transition, step name, and description for each step

## Examples

### Basic Description

View the workflow description:

```bash
./actor_iac.java describe -d ./workflows -w deploy
```

Example output:

```
Workflow: deployment-workflow
File: /home/user/project/workflows/deploy.yaml

Description:
  Deploys the application to target servers with pre-deployment
  validation and post-deployment health checks.
```

### With Step Descriptions

Include step-level documentation:

```bash
./actor_iac.java describe -d ./workflows -w deploy --steps
```

Example output:

```
Workflow: deployment-workflow
File: /home/user/project/workflows/deploy.yaml

Description:
  Deploys the application to target servers with pre-deployment
  validation and post-deployment health checks.

Steps:

  [0 -> 1] validate
    Verify that all prerequisites are met before starting deployment.
    Checks disk space, required services, and configuration files.

  [1 -> 2] backup
    Create a backup of the current application state for rollback.

  [2 -> 3] deploy
    Stop the service, copy new files, and restart the service.

  [3 -> end] verify
    Run health checks to confirm the deployment was successful.
```

### With Overlay

View the merged workflow with production settings:

```bash
./actor_iac.java describe -d ./workflows -w deploy -o ./overlays/production --steps
```

Example output:

```
Workflow: production-deployment-workflow
File: /home/user/project/workflows/deploy.yaml
Overlay: /home/user/project/overlays/production

Description:
  Deploys the application to production servers with extended
  validation and monitoring.

Steps:

  [0 -> 1] validate
    Verify that all prerequisites are met before starting deployment.
    Production mode includes additional security checks.

  [1 -> 1.5] notify
    (no description)

  [1.5 -> 2] backup
    Create a backup of the current application state for rollback.
    Production backups are stored for 30 days.
...
```

Notice that the overlay can add new steps (like `notify`) and modify descriptions.

## Writing Good Descriptions

When creating workflows, include descriptions to make them self-documenting:

```yaml
name: deployment-workflow
description: |
  Deploys the application to target servers with pre-deployment
  validation and post-deployment health checks.

  Prerequisites:
    - SSH access to all target nodes
    - Application package available in /tmp/releases
    - Sufficient disk space (at least 1GB free)

steps:
  - states: ["0", "1"]
    label: validate
    description: |
      Verify that all prerequisites are met before starting deployment.
      Checks disk space, required services, and configuration files.
    actions:
      - actor: this
        method: validate
```

The `description` field supports multi-line text using YAML's literal block scalar (`|`), making it easy to include detailed documentation.

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Workflow not found or failed to load |

## See Also

- [list](./list) - List available workflows
- [run](./run) - Execute a workflow
