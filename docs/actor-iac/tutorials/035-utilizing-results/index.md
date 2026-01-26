---
id: utilizing-results
title: Utilizing Workflow Result Logs
sidebar_position: 35
---

# Utilizing Workflow Result Logs

When you execute a workflow, each node's output is displayed on the console in real-time. Output lines are prefixed with `[node-name]` to identify which node generated them. Step boundaries are marked with cowsay-style ASCII art.

Logs can also be saved to files, but actor-IaC automatically saves all logs to an H2 database. The log database is automatically created in the current directory, requiring no user configuration. H2's `AUTO_SERVER` mode allows multiple terminals to execute workflows simultaneously while writing to the same database. Writing is performed via asynchronous batch processing, so it does not affect workflow execution speed.

You can query the database using the `log-info` command to display session lists, extract logs for specific nodes, filter by log level, and compare with past execution results. When some nodes fail, you can investigate the failure cause from the log database. The `db-clear` command clears the database.
