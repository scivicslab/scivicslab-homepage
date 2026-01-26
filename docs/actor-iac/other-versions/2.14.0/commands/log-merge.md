---
sidebar_position: 6
title: log-merge
---

# log-merge

The `log-merge` command consolidates multiple log databases into a single database. This is useful for combining logs from scattered workflow executions into one queryable database.

## Synopsis

```bash
actor-iac log-merge --target <path> [--scan <directory>] [sources...]
```

## Description

Before the log server feature was introduced, each workflow execution created its own embedded H2 database file. Over time, this results in many scattered database files across different workflow directories. The `log-merge` command consolidates these scattered logs into a single database.

The command reads sessions, logs, and node results from source databases and inserts them into the target database. It detects duplicate sessions (based on workflow name and start time) and skips them by default, so you can safely run the merge multiple times without creating duplicate entries.

## Required Options

| Option | Description |
|--------|-------------|
| `--target <path>` | Target database file path (without `.mv.db` extension). The database is created if it does not exist. |

## Optional Options

### Source Selection

| Option | Description |
|--------|-------------|
| `--scan <directory>` | Directory to scan recursively for `.mv.db` files. All discovered databases are added to the merge sources. |
| `[sources...]` | Explicit list of source database paths (without `.mv.db` extension). These are merged in addition to any files found by `--scan`. |

### Behavior

| Option | Description |
|--------|-------------|
| `--dry-run` | Show what would be merged without actually modifying any databases. Useful for previewing the merge. |
| `--skip-duplicates` | Skip sessions that already exist in the target database. Enabled by default. |
| `-v, --verbose` | Enable verbose output showing details for each merged session. |

## Examples

### Scan and Merge

Scan a directory for databases and merge them:

```bash
./actor_iac.java log-merge --scan ./workflows --target ./logs/merged
```

Example output:

```
============================================================
Log Database Merge
============================================================
Target: /home/user/project/logs/merged.mv.db
Sources: 5 database(s)
------------------------------------------------------------
Merging: workflow-a-logs.mv.db
Merging: workflow-b-logs.mv.db
Merging: deploy-logs.mv.db
Merging: health-check-logs.mv.db
Merging: maintenance-logs.mv.db
------------------------------------------------------------
Merge completed:
  Sessions merged:     23
  Sessions skipped:    0 (duplicates)
  Log entries merged:  1547
  Node results merged: 69
============================================================
```

### Merge Specific Databases

Merge explicitly named databases:

```bash
./actor_iac.java log-merge --target ./logs/merged ./project-a/actor-iac-logs ./project-b/actor-iac-logs
```

### Dry Run

Preview what would be merged without making changes:

```bash
./actor_iac.java log-merge --scan ./workflows --target ./logs/merged --dry-run
```

Example output:

```
============================================================
Log Database Merge
============================================================
Target: /home/user/project/logs/merged.mv.db
Sources: 5 database(s)
------------------------------------------------------------
[DRY-RUN MODE - No changes will be made]

workflow-a-logs                                    sessions:    5  logs:    312  node_results:   15
workflow-b-logs                                    sessions:    3  logs:    187  node_results:    9
deploy-logs                                        sessions:    8  logs:    623  node_results:   24
health-check-logs                                  sessions:    4  logs:    289  node_results:   12
maintenance-logs                                   sessions:    3  logs:    136  node_results:    9
------------------------------------------------------------
TOTAL                                              sessions:   23  logs:   1547  node_results:   69
============================================================
```

### Verbose Mode

Show details for each session being merged:

```bash
./actor_iac.java log-merge --scan ./workflows --target ./logs/merged -v
```

Example output:

```
Merging: deploy-logs.mv.db
  Session 1 -> 24: deployment-workflow (312 logs, 12 node_results)
  Session 2 -> 25: deployment-workflow (287 logs, 12 node_results)
  Skipping duplicate session: deployment-workflow at 2026-01-10T10:00:00
...
```

## How Duplicate Detection Works

Sessions are considered duplicates if they have the same workflow name and started_at timestamp. When a duplicate is detected:

1. The session is skipped (not merged into the target)
2. All associated logs and node results are also skipped
3. The skip is counted and reported in the summary

This behavior ensures that running `log-merge` multiple times is safe. You can incrementally merge new databases without worrying about duplicating existing data.

To disable duplicate detection (merge everything regardless of duplicates), use:

```bash
./actor_iac.java log-merge --scan ./workflows --target ./logs/merged --skip-duplicates=false
```

## Source Database Tracking

When merging, the command adds a `source_db` column to the target database's sessions table. This column records which source database each session came from, making it possible to trace the origin of merged data.

## Database Files

H2 databases consist of multiple files:
- `database.mv.db` - Main data file
- `database.trace.db` - Trace log (optional)

The `--target` and source paths should be specified without the `.mv.db` extension. The command automatically handles the file extension.

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Merge completed successfully |
| 1 | No source databases found or database error |

## Use Cases

### Consolidating Legacy Logs

If you have been using actor-IaC without the log server, you likely have databases scattered in each workflow directory:

```
workflows/
├── deploy/
│   └── actor-iac-logs.mv.db
├── health-check/
│   └── actor-iac-logs.mv.db
└── maintenance/
    └── actor-iac-logs.mv.db
```

Use `log-merge` to consolidate them:

```bash
./actor_iac.java log-merge --scan ./workflows --target ./logs/all
```

### Periodic Consolidation

You can set up a cron job to periodically merge logs from multiple projects:

```bash
0 0 * * * /path/to/actor_iac.java log-merge --scan /home/user/projects --target /var/log/actor-iac/consolidated
```

Since duplicate detection is enabled by default, this is safe to run repeatedly.

## See Also

- [log-search](./log-search) - Query the merged database
- [log-serve](./log-serve) - Avoid scattered databases by using a central log server
- [run](./run) - Execute workflows (creates log entries)
