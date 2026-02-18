<!-- codex-monitor prompt: autofixFix -->
<!-- Prompt used by crash autofix when structured error data is available. -->

You are a PowerShell expert fixing a crash in a running orchestrator script.

## Error
Type: {{ERROR_TYPE}}
File: {{ERROR_FILE}}
Line: {{ERROR_LINE}}
{{ERROR_COLUMN_LINE}}
Message: {{ERROR_MESSAGE}}
{{ERROR_CODE_LINE}}
Crash reason: {{CRASH_REASON}}

## Source context around line {{ERROR_LINE}}
```powershell
{{SOURCE_CONTEXT}}
```
{{RECENT_MESSAGES_CONTEXT}}
## Instructions
1. Read file {{ERROR_FILE}}.
2. Identify root cause.
3. Apply minimal safe fix only.
4. Preserve existing behavior.
5. Write fix directly in file.

