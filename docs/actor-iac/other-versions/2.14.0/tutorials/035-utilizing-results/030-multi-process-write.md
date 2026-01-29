---
id: multi-process-write
title: Simultaneous Writes from Multiple Processes
sidebar_position: 30
---

# Simultaneous Writes from Multiple Processes

## Problem Definition

**Goal:** When running actor-IaC simultaneously from multiple terminals on the same management host, logs should be correctly recorded in the same database.

In cluster management, you may run different workflows in parallel. For example, you might execute system information collection in one terminal while running software updates in another. If both logs are recorded in the same database, you can search and analyze them together later.

```
Running from multiple terminals on management host:
Terminal 1: ./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml ...
Terminal 2: ./actor_iac.java run -w update/main-update-packages.yaml ...
```

However, with regular file-based databases, simultaneous writes from multiple processes cause lock contention or data corruption.


## How to do it

With actor-IaC, simultaneous writes from multiple processes are possible without special configuration.

When you start actor-IaC, H2 database's TCP server is automatically started. All actor-IaC processes connect to this TCP server over the network to write logs. The TCP server continues running as long as there are connections, and automatically shuts down after a certain time (default 30 seconds) once all connections are closed.

With this mechanism, simply starting multiple actor-IaC processes from the same current directory records all logs in the same database.

```bash
# Terminal 1
cd ~/works/testcluster-iac
./actor_iac.java run -w sysinfo/main-collect-sysinfo.yaml -i inventory.ini -g compute

# Terminal 2 (from the same directory)
cd ~/works/testcluster-iac
./actor_iac.java run -w update/main-update-packages.yaml -i inventory.ini -g compute
```

Both workflow logs are recorded in `actor-iac-logs.mv.db`. You can view both sessions with the `log-info` command.

```bash
./actor_iac.java log-info --db ./actor-iac-logs
```

Output example:
```
Sessions:
================================================================================
#6    main-update-packages            COMPLETED
      Started:   2026-01-26T14:05:00+09:00
--------------------------------------------------------------------------------
#5    main-collect-sysinfo            COMPLETED
      Started:   2026-01-26T14:00:00+09:00
--------------------------------------------------------------------------------
```


## Under the hood

### H2's AUTO_SERVER Mode

This behavior is achieved through H2 database's `AUTO_SERVER` mode.

```java
// H2LogStore.java:83
String url = "jdbc:h2:" + dbPath.toAbsolutePath().toString() + ";AUTO_SERVER=TRUE";
```

With `AUTO_SERVER=TRUE` specified, H2 behaves as follows:

1. **First process**: Starts a TCP server when opening the database
2. **Subsequent processes**: Connect to the running TCP server
3. **While connections exist**: TCP server continues running
4. **After all connections close**: TCP server automatically shuts down after about 30 seconds

```
                    H2 TCP Server
                    (auto-start/auto-stop)
                          ▲
          ┌───────────────┼───────────────┐
          │ TCP           │ TCP           │ TCP
          │               │               │
     Process 1       Process 2       Process 3
     (actor-IaC)     (actor-IaC)     (actor-IaC)
```

All actor-IaC processes run on the management host and connect to the TCP server within the same machine. This aggregates logs from multiple parallel workflows into the same database.

### Database File Identification

`AUTO_SERVER` mode identifies servers by the **absolute path** of the database file.

```bash
# Written to the same database
cd ~/works/testcluster-iac && ./actor_iac.java run ...
cd ~/works/testcluster-iac && ./actor_iac.java run ...

# Written to different databases (different current directory)
cd ~/works/testcluster-iac && ./actor_iac.java run ...
cd ~/works/another-project && ./actor_iac.java run ...
```

To explicitly write to the same database, specify an absolute path with the `--log-db` option:

```bash
# Write to same DB from different directories
cd ~/works/project-A && ./actor_iac.java run -w workflow.yaml --log-db ~/logs/shared-logs
cd ~/works/project-B && ./actor_iac.java run -w workflow.yaml --log-db ~/logs/shared-logs
```

### Automatic TCP Port Selection

In `AUTO_SERVER` mode, the TCP server port is automatically selected. actor-IaC does not specify a port number, leaving it to H2's default behavior.

```java
// H2LogStore.java:83 - No port specified
String url = "jdbc:h2:" + dbPath.toAbsolutePath().toString() + ";AUTO_SERVER=TRUE";
```

#### Port Selection Mechanism

When the first process opens the database, H2 uses the OS's ephemeral port (dynamic port). The ephemeral port range varies by OS, but on Linux it is typically 32768-60999. When H2 binds a socket to port 0 with the OS, the OS automatically assigns an available port from this range.

The selected port number is recorded in the lock file (`.lock.db`).

```
~/works/testcluster-iac/
├── actor-iac-logs.mv.db       ← Database file
└── actor-iac-logs.lock.db     ← Lock file (contains port number)
```

The lock file contains the following information:
- TCP server IP address
- TCP server port number (ephemeral port assigned by OS)
- Random key (for verifying connection to correct DB)

Subsequent processes read this lock file when opening the database and connect to the specified IP address and port.

#### Multiple Databases Case

When using different databases simultaneously, separate TCP servers start for each database, and the OS assigns different ephemeral ports to each.

```
~/works/project-A/
├── actor-iac-logs.mv.db       ← DB-A
└── actor-iac-logs.lock.db     ← Port 54321 (OS assigned)

~/works/project-B/
├── actor-iac-logs.mv.db       ← DB-B
└── actor-iac-logs.lock.db     ← Port 54322 (OS assigned)
```

Different port numbers are recorded in each database's lock file, so no conflicts occur when using multiple databases simultaneously.

#### Explicit Port Specification

If needed, you can fix the port number by specifying the `AUTO_SERVER_PORT` parameter in the JDBC URL. However, actor-IaC does not use this and always relies on automatic selection.

```
jdbc:h2:/path/to/db;AUTO_SERVER=TRUE;AUTO_SERVER_PORT=9090
```

Users do not need to be aware of port numbers.


### Notes

#### NFS and Network Drives

If you place database files on NFS or network drives, the lock mechanism may not work properly. It is recommended to place log databases on local disks.
