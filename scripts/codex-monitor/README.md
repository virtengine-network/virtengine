# codex-monitor (deprecated)

This package has been renamed to `@virtengine/openfleet`.

`codex-monitor` now acts as a legacy shim that forwards all CLI commands to the
latest `@virtengine/openfleet` binaries.

## Install (recommended)

```bash
npm install -g @virtengine/openfleet
```

## Legacy install

```bash
npm install -g codex-monitor
```

This legacy install will provide these commands (forwarded to openfleet):

- `codex-monitor`
- `codex-monitor-setup`
- `codex-monitor-chat-id`
- `codex-monitor-shared-workspaces`

## Notes

- Use `openfleet` going forward.
- If you see deprecation warnings, they are expected and safe.
