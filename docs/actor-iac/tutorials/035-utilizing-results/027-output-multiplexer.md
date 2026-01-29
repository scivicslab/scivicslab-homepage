---
id: output-multiplexer
title: Output Multiplexing
sidebar_position: 27
---

# Output Multiplexing (Multiplexer)

When executing workflows with actor-IaC, output is generated simultaneously from multiple nodes. This output is aggregated by the `outputMultiplexer` actor and delivered to multiple destinations simultaneously.

## Multiplexer Pattern

Previously, each component called `System.out.println()` individually, which made it impossible to change the output destination or send to multiple destinations simultaneously.

**Previous Problem:**
```
NodeInterpreter ──→ System.out
NodeGroupInterpreter ──→ System.out
Plugin ──→ System.out
                        ↓
                  Cannot change output destination
```

**Solution (Multiplexer Pattern):**
```
NodeInterpreter ─────────┐
NodeGroupInterpreter ────┼──→ MultiplexerAccumulator ─┬──→ Console
Plugin ──────────────────┘                            ├──→ File
                                                      └──→ Database
```

## Automatic Configuration via CLI Options

When actor-IaC starts, `MultiplexerAccumulator` is automatically configured based on CLI options. Users don't need to configure it explicitly within workflows.

```bash
# Basic execution (console output only)
./actor_iac.java run -w workflow.yaml -i inventory.ini

# Add file logging
./actor_iac.java run -w workflow.yaml -i inventory.ini --file-log ./output.log

# Suppress console output (file/DB only)
./actor_iac.java run -w workflow.yaml -i inventory.ini --quiet --file-log ./output.log
```

The following Accumulators are registered with `outputMultiplexer` based on CLI options:

| Option | Accumulator | Output Destination |
|--------|-------------|-------------------|
| (default) | `ConsoleAccumulator` | `System.out` |
| `--quiet` | Excludes ConsoleAccumulator | - |
| `--file-log <path>` | `FileAccumulator` | Specified file |
| (When H2 DB enabled) | `DatabaseAccumulator` | H2 database |

## Output Format

`ConsoleAccumulator` prefixes each line with `[source]`:

```
[nodeGroup       ]  _______________________________________
[nodeGroup       ] / main-collect                          \
[nodeGroup       ] | steps:                                 |
[nodeGroup       ] \   - name: collect-info                 /
[nodeGroup       ]  ---------------------------------------
[node-stonefly513] CPU: AMD Ryzen 7 7700 (16 cores)
[node-stonefly513] Memory: 62Gi
[node-stonefly514] CPU: AMD Ryzen 7 7700 (16 cores)
[node-stonefly514] Memory: 62Gi
```

Multi-line output (such as cowsay ASCII art) also has a prefix on each line, making it always clear which source the output came from.

## Output from Plugins

Plugins can send data to all output destinations simultaneously by sending messages to the `outputMultiplexer` actor.

```java
private void outputToMultiplexer(String data) {
    if (system == null) return;

    IIActorRef<?> multiplexer = system.getIIActor("outputMultiplexer");
    if (multiplexer == null) return;

    JSONObject arg = new JSONObject();
    arg.put("source", "my-plugin");      // Output source identifier
    arg.put("type", "plugin-result");    // Output type
    arg.put("data", data);               // Output content
    multiplexer.callByActionName("add", arg.toString());
}
```

Even if `outputMultiplexer` is not registered, plugins operate normally (output is just skipped). This allows swapping in mocks during testing or running without output.

## MultiplexerAccumulatorIIAR Actions

`MultiplexerAccumulatorIIAR` is registered with the actor name `outputMultiplexer` and receives messages from other actors.

| Action | Description |
|--------|-------------|
| `add` | Receives JSON argument `{source, type, data}` and delivers to all targets |
| `getSummary` | Returns combined summary from each target |
| `getCount` | Returns number of entries delivered |
| `clear` | Clears all targets |

## Under the hood

### MultiplexerAccumulator Structure

`MultiplexerAccumulator` has a fan-out structure that delivers data to multiple downstream Accumulators.

```
                         MultiplexerAccumulator
                                  │
           ┌──────────────────────┼──────────────────────┐
           │                      │                      │
           ▼                      ▼                      ▼
   ConsoleAccumulator     FileAccumulator      DatabaseAccumulator
           │                      │                      │
           ▼                      ▼                      ▼
       System.out            log file              H2 Database
```

```java
// MultiplexerAccumulator.java
public class MultiplexerAccumulator implements Accumulator {

    private final List<Accumulator> targets = new ArrayList<>();

    public void addTarget(Accumulator target) {
        if (target != null) {
            targets.add(target);
        }
    }

    @Override
    public void add(String source, String type, String data) {
        for (Accumulator target : targets) {
            try {
                target.add(source, type, data);
            } catch (Exception e) {
                // Continue with others even if one target fails
                System.err.println("Warning: Failed to write to accumulator target: " + e.getMessage());
            }
        }
    }
}
```

### Initialization in CLI

`MultiplexerAccumulator` is configured when executing workflows in `RunCLI`.

```java
// RunCLI.java
MultiplexerAccumulator multiplexer = new MultiplexerAccumulator();

// Add ConsoleAccumulator if --quiet is not specified
if (!quiet) {
    multiplexer.addTarget(new ConsoleAccumulator());
}

// Add FileAccumulator if --file-log is specified
if (logFile != null) {
    multiplexer.addTarget(new FileAccumulator(logFile.toPath()));
}

// Add DatabaseAccumulator if H2 DB is enabled
if (logStoreActor != null && sessionId >= 0) {
    multiplexer.addTarget(new DatabaseAccumulator(logStoreActor, dbExecutor, sessionId));
}

// Register with actor system
MultiplexerAccumulatorIIAR multiplexerActor = new MultiplexerAccumulatorIIAR(
    "outputMultiplexer", multiplexer, system);
system.addIIActor(multiplexerActor);
```
