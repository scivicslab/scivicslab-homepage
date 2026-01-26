---
id: db-clear-command
title: Clearing the Log Database
sidebar_position: 50
---

When the log database becomes too large or you want to clean up after testing, you can delete the database file with the `db-clear` command.

```bash
# Delete the log database
./actor_iac.java db-clear --db ./actor-iac-logs
```

Output example:
```
Deleted: /home/devteam/works/testcluster-iac/actor-iac-logs.mv.db
Deleted: /home/devteam/works/testcluster-iac/actor-iac-logs.trace.db
Database cleared successfully.
```

For the `--db` option, specify the database file path without the `.mv.db` extension. When you specify `--db ./actor-iac-logs`, the following files are deleted:

- `./actor-iac-logs.mv.db` - Main database file
- `./actor-iac-logs.trace.db` - Trace file (if it exists)

:::warning
Before running the `db-clear` command, make sure the `log-server` is not running. If the log server is running, the following error is displayed:

```
Error: Log server is running on HTTP port 29091
Please stop the log server first, or use --force to skip this check.
```

Stop the log server first, or you can force delete with the `--force` option (not recommended).
:::


## db-clear Command Options

| Option | Description |
|--------|-------------|
| `--db` | Path to the database file to delete (specify without `.mv.db` extension, required) |
| `-f, --force` | Force delete even if log server is running |
| `--http-port` | HTTP port of the log server (default: 29091) |
