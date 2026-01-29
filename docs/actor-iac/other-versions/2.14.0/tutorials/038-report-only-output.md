---
id: report-only-output
title: Displaying Only the Report on Console
sidebar_position: 38
---

# Displaying Only the Report on Console

## Problem Definition

**Goal:** Suppress log output during workflow execution while displaying only the final report on the console.

When executing a workflow, a large amount of logs are displayed, including output from each node and cowsay displays. When you just want to check the results or when calling from a script, it is convenient to have only the report displayed cleanly.

actor-IaC provides three console output modes:

| Option | Behavior |
|--------|----------|
| (none) | Output all logs to console |
| `--quiet` | Suppress all logs (report also hidden) |
| `--report-only` | Suppress execution logs, display only final report |


## How to do it

### Using the --report-only Option

Simply adding the `--report-only` option displays only the report.

```bash
./actor_iac.java run -w main-collect-and-report.yaml -i inventory.ini -g compute --report-only
```

Output example:

```
[report-builder] === Workflow Execution Report ===
[report-builder]
[report-builder] --- Workflow Info ---
[report-builder] Path: main-collect-and-report.yaml
[report-builder] Name: main-collect-and-report
[report-builder]
[report-builder] --- Node States ---
[report-builder] node-stonefly514:
[report-builder]   hostname: stonefly514
[report-builder]   os: Ubuntu 24.04.3 LTS
[report-builder]   cpu: AMD Ryzen 7 7700 8-Core Processor (16 cores)
[report-builder]   memory: 62Gi
[report-builder]   gpu: NVIDIA GeForce RTX 4080 (NVIDIA)
```

All the large amount of logs from normal execution (cowsay, INFO messages, output from each node, etc.) are suppressed, and only `ReportBuilder` output is displayed.


### Logs Are Saved to Database

Even when `--report-only` is specified, all logs are saved to the database. You can check details later with the `logs` command.

```bash
# Display session list
./actor_iac.java logs

# Display logs for a specific session
./actor_iac.java logs -s 4
```


### Comparison of Output Modes

```bash
# Normal execution: all logs are displayed
./actor_iac.java run -w workflow.yaml -i inventory.ini -g all

# report-only: only report is displayed
./actor_iac.java run -w workflow.yaml -i inventory.ini -g all --report-only

# quiet: nothing is displayed
./actor_iac.java run -w workflow.yaml -i inventory.ini -g all --quiet
```


### Using in Scripts

`--report-only` is optimal for calling from scripts.

```bash
#!/bin/bash
# Collect system information and get report

REPORT=$(./actor_iac.java run -w sysinfo/main-collect-and-report.yaml \
    -i inventory.ini -g compute --report-only 2>&1)

# Save report to file
echo "$REPORT" > system-report.txt

# Or extract specific information
echo "$REPORT" | grep "GPU:"
```


### How It Works

`--report-only` operates as follows:

1. **Suppress java.util.logging console output** - INFO and WARNING messages are hidden
2. **Suppress log server connection messages** - Status messages at startup are hidden
3. **Set ConsoleAccumulator filter mode to REPORT_ONLY** - Only messages with `type: report` are output

`ReportBuilder` specifies `type: "report"` when outputting, so it is displayed even in `--report-only` mode.


## Under the hood

### Output Flow

In actor-IaC, all console output goes through the `outputMultiplexer` actor.

```
Workflow execution
    ↓
outputMultiplexer (output distribution)
    ├── ConsoleAccumulator → Console display
    ├── DatabaseAccumulator → H2 database
    └── FileAccumulator → Log file (optional)
```

Each output is assigned `source` (output source), `type` (category), and `data` (content). In `--report-only` mode, ConsoleAccumulator displays only messages with `type: "report"`.


### ConsoleAccumulator Filter Modes

ConsoleAccumulator has three filter modes:

```java
public enum FilterMode {
    ALL,          // Output all (default)
    NONE,         // Output nothing (--quiet)
    REPORT_ONLY   // Output only type="report" (--report-only)
}
```

When `--report-only` is specified, RunCLI does the following:

1. Remove java.util.logging ConsoleHandler (suppress INFO messages)
2. Set ConsoleAccumulator filter mode to REPORT_ONLY


### Report Output from Plugins

For plugins to output reports that are displayed in `--report-only` mode, specify `type: "report"` to outputMultiplexer.

```java
// Get system via ActorSystemAware interface
private IIActorSystem system;

@Override
public void setActorSystem(IIActorSystem system) {
    this.system = system;
}

// Report output
private void reportToMultiplexer(String data) {
    IIActorRef<?> multiplexer = system.getIIActor("outputMultiplexer");

    JSONObject arg = new JSONObject();
    arg.put("source", "my-plugin");
    arg.put("type", "report");  // Displayed with --report-only
    arg.put("data", data);
    multiplexer.callByActionName("add", arg.toString());
}
```

### Choosing Output Types

| type | --report-only | Purpose |
|------|---------------|---------|
| `report` | Displayed | Final reports, aggregation results |
| `stdout` | Hidden | Standard output from commands |
| `stderr` | Hidden | Error output from commands |
| `cowsay` | Hidden | Cowsay for step display |
| Other | Hidden | Debug information, etc. |

Plugins choose the type according to purpose. Aggregation plugins (like SystemInfoAggregator) use `type: "report"`, while intermediate results and debug information use different types.
