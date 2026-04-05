---
id: PluginLogOutput_260403_oo01
sidebar_position: 40
title: "plugin-log-output: Console, File, and Multiplexer Output"
description: "A plugin that delivers workflow execution output to console, files, and multiplexers. Also provides cowsay display and JUL bridge functionality."
keywords:
  - console output
  - file logging
  - multiplexer
  - cowsay
  - accumulator
  - JUL handler
---

# plugin-log-output

A plugin that delivers workflow execution output to console, files, and multiplexers. It provides unified output management through the `Accumulator` interface and visual workflow progress display using cowsay ASCII art.

## Output Architecture

```
NodeActor / NodeGroupActor
        |
  MultiplexerAccumulator  (actor name: "outputMultiplexer")
        |
   +----+----+-----------+
   v         v            v
Console    File    DatabaseAccumulator
Accumulator Accumulator  (plugin-log-db)
```

`MultiplexerAccumulator` functions as a fan-out hub, simultaneously delivering a single output message to multiple targets.

## `ConsoleAccumulator`

Outputs to console (standard output/standard error).

```java
ConsoleAccumulator console = new ConsoleAccumulator();

// Custom output destination
ConsoleAccumulator console = new ConsoleAccumulator(System.out, System.err);

// Suppress output (only record count)
console.setQuiet(true);

// Output
console.add("node-web1", "stdout", "Deployment complete");
// Displays: [node-web1] Deployment complete

// stderr type outputs to System.err
console.add("node-web1", "stderr", "Warning: deprecated API");

// Summary
String summary = console.getSummary();
int count = console.getCount();
```

The output format is `[source] data`, with multi-line data having the prefix added to each line.

## `FileAccumulator`

Outputs to a text file.

```java
FileAccumulator file = new FileAccumulator(Path.of("./output.log"));

file.add("node-web1", "stdout", "Started");
// Immediately flushed to file

Path path = file.getFilePath();
int count = file.getCount();

// Close after use
file.close();
```

- Thread-safe (`synchronized`)
- Overwrites existing files
- Auto-flush after each output

## `MultiplexerAccumulator`

Performs fan-out delivery to multiple targets.

```java
MultiplexerAccumulator mux = new MultiplexerAccumulator();

// Add targets
mux.addTarget(consoleAccumulator);
mux.addTarget(fileAccumulator);
mux.addTarget(databaseAccumulator);

// Output (simultaneously delivered to all targets)
mux.add("node-web1", "stdout", "Deploy OK");

// Remove target
mux.removeTarget(fileAccumulator);

// Target count
int targets = mux.getTargetCount();

// Summary (combines summaries from all targets)
String summary = mux.getSummary();
```

Even if an exception occurs in one target, delivery to other targets continues.

## `MultiplexerAccumulatorActor`

Registered within the actor system under the actor name `"outputMultiplexer"`, allowing other actors to perform output via message sending.

### `@Action` Methods

| Action | Arguments (JSON) | Description |
|---|---|---|
| `add` | `{source, type, data}` | Deliver output message to all targets |
| `getSummary` | none | Get summary from all targets |
| `getCount` | none | Get cumulative output count |
| `clear` | none | Reset counter |

## `MultiplexerLogHandler`

A handler that forwards `java.util.logging` (JUL) logs to the multiplexer.

```java
MultiplexerLogHandler handler = new MultiplexerLogHandler(actorSystem);
Logger.getLogger("").addHandler(handler);
```

Sends JUL log records to the multiplexer in the following format:

- **Format**: `"timestamp LEVEL message"`
- **Type**: `"log-INFO"`, `"log-WARNING"`, `"log-SEVERE"`, etc.
- **Source name mapping**:
  - `com.scivicslab.turingworkflow.*` -> `"turing-workflow"`
  - `com.scivicslab.pojoactor.*` -> `"pojo-actor"`
  - Others -> simple class name

## `WorkflowStreamingAccumulator`

A `StreamingAccumulator` that provides cowsay ASCII art display during workflow transitions.

```java
WorkflowStreamingAccumulator acc = new WorkflowStreamingAccumulator();

// Set cowfile (optional)
acc.setCowfile("tux");       // tux penguin
acc.setCowfile("dragon");    // dragon
acc.setCowfile(null);        // default cow

// Render cowsay
String cowsay = acc.renderCowsay("deploy-workflow", "step: deploy\naction: kubectl apply");
```

Output example:
```
 ________________________________
/ [deploy-workflow]              \
| step: deploy                   |
\ action: kubectl apply          /
 --------------------------------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||
```

List available cowfiles:
```java
String[] cowfiles = WorkflowStreamingAccumulator.listCowfiles();
```

## Dependencies

- `org.json:json:20231013` - JSON parsing
- `com.github.ricksbrown:cowsay:1.1.0` - cowsay ASCII art
- No dependencies on other plugins
