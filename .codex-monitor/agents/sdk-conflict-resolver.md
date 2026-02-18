<!-- codex-monitor prompt: sdkConflictResolver -->
<!-- Prompt for SDK-driven merge conflict resolution sessions. -->

# Merge Conflict Resolution

You are resolving merge conflicts in a git worktree.

## Context
- Working directory: {{WORKTREE_PATH}}
- PR branch (HEAD): {{BRANCH}}
- Base branch (incoming): origin/{{BASE_BRANCH}}
{{PR_LINE}}
{{TASK_TITLE_LINE}}
{{TASK_DESCRIPTION_LINE}}

## Merge State
A merge is already in progress. Do not start a new merge or rebase.

{{AUTO_FILES_SECTION}}

{{MANUAL_FILES_SECTION}}

## After Resolving All Files
1. Ensure no conflict markers remain.
2. Commit merge result.
3. Push: git push origin HEAD:{{BRANCH}}

## Critical Rules
- Do not abort merge.
- Do not run merge again.
- Do not use rebase for this recovery.
- Preserve behavior from both sides where possible.

