---
sidebar_position: 2
title: list
---

# list

The `list` command displays all workflow files discovered in a directory. This helps you see which workflows are available before running them.

## Synopsis

```bash
actor-iac list -d <directory>
```

## Description

The `list` command recursively scans the specified directory for workflow files (YAML, JSON, and XML). For each file found, it displays the file name that can be used with the `-w` option of the `run` command, the relative path within the directory, and the workflow name as defined in the file itself.

The workflow name is extracted from the `name` field at the top of the YAML or JSON file. This name appears in log entries and session records, making it useful for identifying workflows when querying logs.

## Required Options

| Option | Description |
|--------|-------------|
| `-d, --dir <directory>` | Directory to scan for workflow files. The scan is recursive, so workflows in subdirectories are also discovered. |

## Output Format

The command produces a table with four columns:

| Column | Description |
|--------|-------------|
| # | Sequential number for reference |
| File (-w) | Base file name that can be used with the `-w` option |
| Path | Relative path from the scan directory |
| Workflow Name (in logs) | The `name` field from the workflow file, or "(no name)" if not defined |

## Examples

### List Workflows in a Directory

```bash
./actor_iac.java list -d ./workflows
```

Example output:

```
Available workflows (directory: /home/user/project/workflows)
------------------------------------------------------------------------------------------
#    File (-w)                 Path                                Workflow Name (in logs)
------------------------------------------------------------------------------------------
 1.  collect-info              collect-info.yaml                   system-info-collector
 2.  deploy                    deploy.yaml                         deployment-workflow
 3.  health-check              health/health-check.yaml            health-check
 4.  maintenance               maintenance/cleanup.yaml            weekly-maintenance
------------------------------------------------------------------------------------------
Use 'actor-iac run -d ./workflows -w <File>' to execute a workflow.
```

### Scanning a Subdirectory

You can point to any directory that contains workflow files:

```bash
./actor_iac.java list -d ./config/workflows/production
```

## Notes

The file name shown in the "File (-w)" column is the base name without extension. When using the `run` command, you can specify either the base name or the full file name:

```bash
# Both of these work:
./actor_iac.java run -d ./workflows -w deploy
./actor_iac.java run -d ./workflows -w deploy.yaml
```

If multiple files have the same base name but different extensions (e.g., `deploy.yaml` and `deploy.json`), the first one discovered is used when specifying just the base name.

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success (even if no workflows found) |
| 1 | Directory does not exist or is not readable |

## See Also

- [run](./run) - Execute a workflow
- [describe](./describe) - Display detailed workflow information
