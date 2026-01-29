---
id: log-file-output
title: Outputting to Log Files
sidebar_position: 15
---

:::caution Newer Version Available
This is documentation for version 2.13.0. [See the latest version](/docs/actor-iac/introduction).
:::

## Problem Definition

Console output flows by and cannot be referenced later. You want to save logs to files and search with familiar tools like grep.


## How to do it

Specify the log output destination file with the `--log-file` option.

```bash
# Output logs to file
./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml -i inventory.ini --log-file ./logs/sysinfo.log

# Suppress console output and output only to file
./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml -i inventory.ini --log-file ./logs/sysinfo.log --quiet
```

Log files are saved in the same format as console output.

```
$ cat ./logs/sysinfo.log
[cli] 2026-01-15 10:00:00 INFO Loading workflow: main-collect-sysinfo.yaml
[cli] 2026-01-15 10:00:00 INFO Created 6 node actors for group 'compute'
[node-node13] ===== HOSTNAME =====
[node-node13] node13.local
...
```

You can extract specific node output with grep.

```bash
# Extract only node13 logs
grep "^\[node-node13\]" ./logs/sysinfo.log

# Extract only errors
grep "ERROR" ./logs/sysinfo.log

# Extract GPU information
grep -A1 "GPU INFO" ./logs/sysinfo.log
```


## Under the hood

**Why file output is fast:**

| Destination | Mechanism | Speed |
|-------------|-----------|-------|
| System.out | Synchronous, no buffering | Slow |
| File | BufferedWriter, OS buffering | Fast |

System.out outputs synchronously for each line, so blocking occurs with large output. File output uses BufferedWriter and is also buffered at the OS level, minimizing I/O waiting.

**Choosing between log files and log database:**

| Method | Advantages | Disadvantages |
|--------|------------|---------------|
| Log file | Simple, searchable with grep | Difficult to integrate searches across multiple executions |
| Log database | Flexible search with SQL, session management | Setup required |

Log files are suitable for checking results of single executions, while log databases are suitable for accumulating logs in continuous operation.


## Derived Problems and Solutions

### Problem: Directory fills up with log files

If log file output is enabled by default, log files are generated every time you work with actor-IaC, and the directory fills up with log files.

### Solution: Default is OFF, specify only when needed

The `--log-file` option is OFF by default. Explicitly specify it only for executions where you want to save logs.

---

### Problem: Log file becomes bloated

If you keep specifying the same filename, the log file becomes too large.

### Solution: Use timestamped filenames

Specify different filenames for each execution.

```bash
# Include datetime in filename
./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml -i inventory.ini \
  --log-file "./logs/sysinfo-$(date +%Y%m%d-%H%M%S).log"
```

Alternatively, use log rotation tools (logrotate, etc.).
