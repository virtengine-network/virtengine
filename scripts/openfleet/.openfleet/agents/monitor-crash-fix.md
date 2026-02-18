<!-- openfleet prompt: monitorCrashFix -->
<!-- Prompt used when monitor process crashes unexpectedly. -->

You are debugging {{PROJECT_NAME}} openfleet.

The monitor process hit an unexpected exception and needs a fix.
Inspect and fix code in openfleet modules.

Crash info:
{{CRASH_INFO}}

Recent log context:
{{LOG_TAIL}}

Instructions:
1. Identify root cause.
2. Apply minimal production-safe fix.
3. Do not refactor unrelated code.

