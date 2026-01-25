---
id: advanced-usage
title: Advanced Log Utilization
sidebar_position: 40
---

This introduces more advanced use cases utilizing the log database.


## Checking Specific Node Details Later

Since outputs from parallel execution are mixed, you may want to check information for a specific node later.

### Check node15's GPU Information

The workflow completed successfully, but you want to check node15's GPU information in detail.

```bash
$ ./actor_iac.java log-info --db ./actor-iac-logs --node node-node15 | grep -A5 "GPU INFO"
```

Output:
```
[2026-01-15T10:00:25+09:00] INFO  [node-node15] ===== GPU INFO =====
[2026-01-15T10:00:25+09:00] INFO  [node-node15] NVIDIA GeForce RTX 4090, 24564 MiB, 545.23.08
```

You can see that node15 has an RTX 4090.

### Check What Headings are in Log Output

When you want to see a list of the types of information (headings) that the workflow outputs:

```bash
$ ./actor_iac.java log-info --db ./actor-iac-logs --session 2 | grep "=====" | sort -u
```

Output:
```
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== CPU INFO =====
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== DISK USAGE =====
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== GPU INFO =====
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== MEMORY INFO =====
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== NETWORK INFO =====
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== OS INFO =====
```

From this output, you can see the information categories the workflow is collecting:

| Heading | Content |
|---------|---------|
| `CPU INFO` | CPU model, core count, architecture |
| `DISK USAGE` | Disk usage status |
| `GPU INFO` | GPU model, VRAM, driver version |
| `MEMORY INFO` | Memory capacity and usage |
| `NETWORK INFO` | Network interface information |
| `OS INFO` | OS name, kernel version |

If you want to extract only specific information, you can filter with `grep -A` using these headings.

### Compare GPU Information Across All Nodes

```bash
$ ./actor_iac.java log-info --db ./actor-iac-logs --session 5 | grep "GPU INFO" -A1
```

Output:
```
[2026-01-15T10:00:15+09:00] INFO  [node-node13] ===== GPU INFO =====
[2026-01-15T10:00:15+09:00] INFO  [node-node13] NVIDIA GeForce RTX 3090, 24576 MiB, 525.147.05
[2026-01-15T10:00:18+09:00] INFO  [node-node14] ===== GPU INFO =====
[2026-01-15T10:00:18+09:00] INFO  [node-node14] NVIDIA GeForce RTX 3090, 24576 MiB, 525.147.05
[2026-01-15T10:00:25+09:00] INFO  [node-node15] ===== GPU INFO =====
[2026-01-15T10:00:25+09:00] INFO  [node-node15] NVIDIA GeForce RTX 4090, 24564 MiB, 545.23.08
[2026-01-15T10:00:28+09:00] INFO  [node-node23] ===== GPU INFO =====
[2026-01-15T10:00:28+09:00] INFO  [node-node23] No NVIDIA GPU detected via lspci
```

From this output, you can see:
- node13, node14: RTX 3090 (driver 525.147.05)
- node15: RTX 4090 (driver 545.23.08)
- node23: No GPU

It turns out only node23 has no GPU. For workflows requiring GPU computation, node23 needs to be excluded.


## Comparing with Past Execution Results

When collecting system information regularly, you can compare with past results to detect changes.

### Check if Memory Usage Has Increased Compared to a Week Ago

```bash
# Find sessions from a week ago
$ ./actor_iac.java log-info --db ./actor-iac-logs --since 1w --like main-collect-sysinfo
```

Output:
```
Sessions:
================================================================================
#5    main-collect-sysinfo           COMPLETED
      Started:   2026-01-15T10:00:00+09:00
--------------------------------------------------------------------------------
#3    main-collect-sysinfo           COMPLETED
      Started:   2026-01-12T10:00:00+09:00
--------------------------------------------------------------------------------
#1    main-collect-sysinfo           COMPLETED
      Started:   2026-01-08T10:00:00+09:00
--------------------------------------------------------------------------------
```

```bash
# node13's memory info from a week ago (session #1)
$ ./actor_iac.java log-info --db ./actor-iac-logs --session 1 --node node-node13 | grep -A3 "MEMORY INFO"
```

Output:
```
[2026-01-08T10:00:12+09:00] INFO  [node-node13] ===== MEMORY INFO =====
[2026-01-08T10:00:12+09:00] INFO  [node-node13]               total        used        free
[2026-01-08T10:00:12+09:00] INFO  [node-node13] Mem:           62Gi       5.1Gi        48Gi
```

```bash
# node13's memory info from today (session #5)
$ ./actor_iac.java log-info --db ./actor-iac-logs --session 5 --node node-node13 | grep -A3 "MEMORY INFO"
```

Output:
```
[2026-01-15T10:00:12+09:00] INFO  [node-node13] ===== MEMORY INFO =====
[2026-01-15T10:00:12+09:00] INFO  [node-node13]               total        used        free
[2026-01-15T10:00:12+09:00] INFO  [node-node13] Mem:           62Gi       8.2Gi        45Gi
```

Memory usage has increased from 5.1Gi to 8.2Gi over the week. Some process may be continuously consuming memory.


## Batch Check Error Logs Only

For early problem detection in large clusters, check only error logs.

```bash
$ ./actor_iac.java log-info --db ./actor-iac-logs --level ERROR --limit 1000
```

Output:
```
Logs (level >= ERROR):
================================================================================
[2026-01-15T10:00:01+09:00] ERROR [node-node21] SSH connection failed: Connection refused
[2026-01-15T10:00:31+09:00] ERROR [node-node22] SSH connection failed: Connection timed out
[2026-01-15T10:00:25+09:00] ERROR [node-node15] Command failed: nvidia-smi: command not found
================================================================================
Total: 3 lines
```

There are 3 errors. On node15, the `nvidia-smi` command was not found (possibly NVIDIA drivers not installed).

To check details for each error, specify the node and display logs:

```bash
$ ./actor_iac.java log-info --db ./actor-iac-logs --node node-node15 | grep -B5 -A5 "nvidia-smi"
```
