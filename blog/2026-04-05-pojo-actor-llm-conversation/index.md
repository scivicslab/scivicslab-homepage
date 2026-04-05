---
slug: 2026-04-05-pojo-actor-llm-conversation
title: "quarkus-chat-ui (2): The Actor Design Behind LLM-to-LLM Conversation"
authors: [devteam]
tags: [java, pojo-actor, quarkus, llm, actor-model, concurrent-programming]
---

In a [previous post](https://dev.to/devteam2512/pojo-actor-v10-a-lightweight-actor-model-library-for-java-2ccd) I introduced POJO-actor — a lightweight actor-model library for Java that needs no framework, no annotation processor, and no external runtime. Just plain Java 21.

This post is about how I actually use it in [quarkus-chat-ui](https://github.com/scivicslab/quarkus-chat-ui), a Quarkus-based LLM chat UI that connects to Claude Code CLI, vLLM, and other backends. The application manages stateful LLM sessions, streams responses via SSE, handles concurrent MCP requests, and supports a `/btw` command for side questions — all without a single `synchronized` block.

The three actors that make this work are `ChatActor`, `BtwActor`, and `QueueActor`. This post focuses on the first two and the design principle behind them.

<!--truncate-->

---

## Quick POJO-actor recap

A POJO-actor actor wraps any plain Java object. Messages are lambdas dispatched through a `LinkedBlockingQueue`. The actor runs its message loop on a single virtual thread, processing one message at a time.

```java
ActorSystem system = new ActorSystem("chat-ui");
ActorRef<Counter> counter = system.actorOf("counter", new Counter());

// tell() — enqueue, return immediately
counter.tell(c -> c.increment());

// ask() — enqueue, return CompletableFuture with result
int value = counter.ask(c -> c.getValue()).join(); // = 1

// tellNow() — bypass queue, execute on a NEW virtual thread immediately
counter.tellNow(c -> c.emergencyStop());
```

The key properties:

- **`tell()` and `ask()`**: FIFO, safe by default — only one message runs at a time on the actor's virtual thread.
- **`tellNow()` and `askNow()`**: bypass the queue, run concurrently on a fresh virtual thread. The caller takes responsibility for thread safety.

This is the whole API. The class itself is a plain Java object — no annotations, no base class to extend, no interface to implement. Any POJO becomes an actor simply by passing it to `ActorSystem.actorOf()`. The object does not know it is running inside an actor.

---

## The problem: blocking I/O kills the message loop

An LLM API call can take 30–60 seconds. If `ChatActor` calls the LLM directly inside a message handler, the actor's message loop is blocked for the entire duration:

```
tell(startPrompt) → message.run() → provider.sendPrompt() ← blocks for 30s
                                                               |
tell(cancel)  ← enqueued, but not processed until sendPrompt() returns
```

The cancel button press arrives as a `tell(cancel)`, but the actor won't see it until the blocking call returns. That's useless.

The fix: delegate the blocking I/O to a separate virtual thread and return immediately.

---

## ChatActor: the state guardian

`ChatActor` holds all session state — API key, model, history, `busy` flag. It protects that state by being the single thread that reads and writes it.

```java
public class ChatActor {

    private final LlmProvider provider;
    private volatile Thread activeThread;  // written by actor thread, read by cancel()

    private boolean busy;
    private String apiKey;
    private String sessionId;
    // ... other session state

    public void startPrompt(String text, String model, Consumer<ChatEvent> emitter,
                            ActorRef<ChatActor> self, Runnable done) {
        busy = true;
        emitter.accept(ChatEvent.status(sessionId, true));

        // Delegate the blocking I/O to a virtual thread and return immediately.
        // The actor's message loop is now free to process the next message.
        activeThread = Thread.startVirtualThread(() -> {
            try {
                ProviderContext ctx = new ProviderContext(apiKey, history, false, () -> {});
                provider.sendPrompt(text, model, emitter, ctx);
            } catch (Exception e) {
                emitter.accept(ChatEvent.error(e.getMessage()));
            } finally {
                // Report completion back through the actor's queue (thread-safe)
                self.tell(a -> a.onPromptComplete(emitter));
            }
        });
        // ← returns here immediately. The actor is ready for the next message.
    }

    public void cancel() {
        provider.cancel();
        Thread t = activeThread;       // read volatile field
        if (t != null) t.interrupt(); // interrupt the I/O virtual thread
    }

    private void onPromptComplete(Consumer<ChatEvent> emitter) {
        busy = false;
        activeThread = null;
        emitter.accept(ChatEvent.status(sessionId, false));
    }
}
```

The message flow after `startPrompt()` is called:

```
tell(startPrompt) → starts I/O thread → returns immediately
                    actor loop is now idle, waiting for next message

tell(cancel)      → no queue wait → cancel() runs → I/O thread interrupted
                    I/O thread catches exception → finally → self.tell(onPromptComplete)
```

This is the core pattern. The actor is the **state guardian**; the virtual thread is the **I/O worker**. The actor never blocks. Every cancel, every MCP request, every queue tick finds the actor ready to respond.

### Why `volatile Thread activeThread`?

`activeThread` is written by the actor's virtual thread (in `startPrompt`) and read by `cancel()`. Normally both are on the same actor thread, so `volatile` is redundant — but `cancel()` is also called via `tellNow()`, which runs on a *different* virtual thread. `volatile` ensures the write to `activeThread` is visible across that thread boundary. It's a defensive declaration that costs nothing and prevents a subtle bug.

---

## Why `tellNow()` for cancel?

The REST endpoint that handles the cancel button:

```java
@POST
@Path("/cancel")
public ChatEvent cancel() {
    actorSystem.getChatActor().tellNow(ChatActor::cancel);
    return ChatEvent.info("Cancelled");
}
```

Why `tellNow()` and not `tell()`?

With `tell()`, `cancel()` would be enqueued behind whatever is currently in the queue. But `startPrompt()` delegates its I/O immediately and returns — so in practice, the actor's queue is already empty and `tell(cancel)` would be processed right away. The behavior is correct either way.

The reason to use `tellNow()` is **semantic clarity**: "cancel NOW" — not "cancel when it's your turn". It also makes the intent obvious to readers of the code. `cancel()` touches only `volatile activeThread` and `provider.cancel()`, both of which are designed for concurrent access, so bypassing the queue is safe here.

---

## BtwActor: a second independent actor

Claude Code CLI has a `/btw` command: while the LLM is processing a long task, you can type `/btw what does this mean?` and get an immediate answer from a parallel LLM call, without interrupting the main task.

quarkus-chat-ui implements the same UX. The Web UI detects the `/btw` prefix and sends the question to `POST /api/btw`. The response appears in a floating overlay in the bottom-right corner; the main chat continues uninterrupted.

The key insight: this is just a second independent actor that follows the same pattern as `ChatActor`.

```java
public class BtwActor {

    private final LlmProvider provider;
    private volatile Thread activeThread;

    public void startBtw(String question, String model, String apiKey,
                         Consumer<ChatEvent> emitter, ActorRef<BtwActor> self) {
        activeThread = Thread.startVirtualThread(() -> {
            try {
                ProviderContext ctx = new ProviderContext(apiKey, List.of(), false, () -> {});
                provider.sendPrompt(question, model, event -> {
                    // Map provider events to btw-specific SSE event types
                    if ("delta".equals(event.type()))  emitter.accept(ChatEvent.btwDelta(event.content()));
                    if ("result".equals(event.type())) emitter.accept(ChatEvent.btwResult());
                }, ctx);
            } catch (Exception e) {
                emitter.accept(ChatEvent.error("BTW error: " + e.getMessage()));
            } finally {
                self.tell(a -> a.activeThread = null);
            }
        });
    }

    public void cancel() {
        Thread t = activeThread;
        if (t != null) { provider.cancel(); t.interrupt(); }
    }

    public boolean isBusy() { return activeThread != null; }
}
```

`BtwActor` is registered alongside `ChatActor` in `LlmConsoleActorSystem`:

```java
chatActorRef = actorSystem.actorOf("chat", new ChatActor(provider, configApiKey));
btwActorRef  = actorSystem.actorOf("btw",  new BtwActor(provider));
```

The REST endpoint is three lines:

```java
@POST
@Path("/btw")
public ChatEvent btw(BtwRequest request) {
    String apiKey = actorSystem.getChatActor().ask(ChatActor::getApiKey).join();
    String model  = request.model != null ? request.model : provider.getCurrentModel();
    var btwRef    = actorSystem.getBtwActor();
    btwRef.tell(a -> a.startBtw(request.question, model, apiKey, this::emitSse, btwRef));
    return ChatEvent.info("BTW processing");
}
```

The frontend receives `btw_delta` and `btw_result` SSE events (distinct from the main chat's `delta`/`result`), streams the response into the overlay, and closes it on ESC or the × button.

### Thread safety with a shared provider

`ChatActor` and `BtwActor` share the same `LlmProvider` instance. For HTTP-based providers (Anthropic API, vLLM), each `sendPrompt()` call is an independent HTTP request — parallel calls are safe by construction.

`BtwActor` intentionally does not call `provider.setModel()` before `sendPrompt()`. Calling `setModel()` would mutate shared provider state, potentially corrupting `ChatActor`'s current model mid-stream. Instead, the model is passed directly as a parameter to `sendPrompt()`. The actors are isolated at the state level even though they share the provider.

---

## The actor system structure

```
ActorSystem "chat-ui"
  ├── ChatActor    — session state, model selection, history
  ├── BtwActor     — /btw side questions (independent)
  ├── QueueActor   — message queuing for MCP/concurrent requests
  └── WatchdogActor — stall detection (CLI providers only)
```

All four follow the same pattern: the actor is the state guardian, virtual threads handle I/O. `tell()` for normal messages, `tellNow()` for urgent bypasses that are provably safe.

---

## What I like about this approach

**No framework tax.** Each actor is a POJO. The actor model adds one concept (`tell` vs `tellNow`) on top of plain Java. Reading `ChatActor` requires no knowledge of Akka, Quarkus, or any actor framework — just Java.

**The virtual thread + actor split is explicit.** The code visually shows the boundary: `Thread.startVirtualThread(...)` inside `startPrompt()` is the handoff from "actor's domain" to "I/O worker's domain". When something goes wrong, it's immediately clear which side owns the problem.

**Adding actors is cheap.** `BtwActor` is 30 lines. Adding `/btw cancel` in the future is one `tellNow()` call. The pattern scales to new actors (WatchdogActor, QueueActor) without changing the existing ones.

**State bugs are localized.** `ChatActor` is the only place that can modify session state. If the session ID is wrong, the bug is in `ChatActor`. There is no "it could be any thread" scenario.

---

## Further reading

- quarkus-chat-ui (3): Scaling Multi-Agent Communication with MCP Gateway (coming soon)
- [POJO-actor on GitHub](https://github.com/scivicslab/pojo-actor)
- [POJO-actor v1.0 introduction on DEV.to](https://dev.to/devteam2512/pojo-actor-v10-a-lightweight-actor-model-library-for-java-2ccd)
- [quarkus-chat-ui on GitHub](https://github.com/scivicslab/quarkus-chat-ui)
