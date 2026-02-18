<!-- openfleet prompt: taskExecutorContinueHasCommits -->
<!-- Continue prompt when edits were committed but not fully finalized. -->

# {{TASK_ID}} — CONTINUE (Verify and Push)

You were working on "{{TASK_TITLE}}" and appear to have stopped.
You already made commits.

1. Run tests to verify changes.
2. If passing, push: git push origin HEAD
3. If failing, fix issues, commit, and push.
4. Task is not complete until push succeeds.

