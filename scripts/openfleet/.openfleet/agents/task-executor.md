<!-- openfleet prompt: taskExecutor -->
<!-- Task execution prompt used for actual implementation runs. -->

# {{TASK_ID}} — {{TASK_TITLE}}

## Description
{{TASK_DESCRIPTION}}

## Environment
- Working Directory: {{WORKTREE_PATH}}
- Branch: {{BRANCH}}
- Repository: {{REPO_SLUG}}

## Instructions
1. Read task requirements carefully.
2. Implement required code changes.
3. Run relevant tests/lint/build checks.
4. Commit with conventional commit format.
5. Push branch updates.

## Critical Rules
- Do not ask for manual confirmation.
- No placeholders/stubs/TODO-only output.
- Keep behavior stable and production-safe.

## Agent Status Endpoint
- URL: http://127.0.0.1:{{ENDPOINT_PORT}}/api/tasks/{{TASK_ID}}
- POST /status {"status":"inreview"} after PR-ready push
- POST /heartbeat {} while running
- POST /error {"error":"..."} on fatal failure
- POST /complete {"hasCommits":true} when done

## Task Reference
{{TASK_URL_LINE}}

## Repository Context
{{REPO_CONTEXT}}

