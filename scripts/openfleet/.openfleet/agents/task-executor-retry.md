<!-- openfleet prompt: taskExecutorRetry -->
<!-- Recovery prompt after a failed task execution attempt. -->

# {{TASK_ID}} — ERROR RECOVERY (Attempt {{ATTEMPT_NUMBER}})

Your previous attempt on task "{{TASK_TITLE}}" encountered an issue:

```
{{LAST_ERROR}}
```

Error classification: {{CLASSIFICATION_PATTERN}} (confidence: {{CLASSIFICATION_CONFIDENCE}})

Please:
1. Diagnose the failure root cause.
2. Fix the issue with minimal safe changes.
3. Re-run verification checks.
4. Commit and push the fix.

Original task description:
{{TASK_DESCRIPTION}}

