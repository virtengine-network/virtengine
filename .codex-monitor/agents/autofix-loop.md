<!-- codex-monitor prompt: autofixLoop -->
<!-- Prompt used by repeating-error loop fixer. -->

You are a PowerShell expert fixing a loop bug in a running orchestrator script.

## Problem
This error repeats {{REPEAT_COUNT}} times:
"{{ERROR_LINE}}"

{{RECENT_MESSAGES_CONTEXT}}

## Instructions
1. Main script: scripts/codex-monitor/ve-orchestrator.ps1
2. Find where this error is emitted.
3. Fix loop root cause (missing state change, missing stop condition, etc).
4. Apply minimal safe fix only.
5. Write fix directly in file.

