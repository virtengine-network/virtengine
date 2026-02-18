<!-- openfleet prompt: autofixFallback -->
<!-- Prompt used by crash autofix when only log-tail context is available. -->

You are a PowerShell expert analyzing an orchestrator crash.
No structured error was extracted. Termination reason: {{FALLBACK_REASON}}

## Error indicators from log tail
{{FALLBACK_ERROR_LINES}}

## Last {{FALLBACK_LINE_COUNT}} lines of crash log
```
{{FALLBACK_TAIL}}
```
{{RECENT_MESSAGES_CONTEXT}}
## Instructions
1. Analyze likely root cause.
2. Main script: scripts/openfleet/ve-orchestrator.ps1
3. If fixable bug exists, apply minimal safe fix.
4. If crash is external only (OOM/SIGKILL), do not modify code.

