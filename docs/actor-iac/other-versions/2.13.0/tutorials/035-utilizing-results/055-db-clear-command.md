---
id: db-clear-command
title: Clearing the Log Database
sidebar_position: 55
---

:::caution Newer Version Available
This is documentation for version 2.13.0. [See the latest version](/docs/actor-iac/introduction).
:::

# Clearing the Log Database

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
- `./actor-iac-logs.lock.db` - Lock file (if it exists)


## db-clear Command Options

| Option | Description |
|--------|-------------|
| `--db` | Path to the database file to delete (specify without `.mv.db` extension, required) |
