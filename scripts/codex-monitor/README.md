# codex-monitor (deprecated)

This package has been renamed to `@virtengine/bosun`.

You can find bosun at : https://github.com/virtengine/virtengine/tree/main/scripts/bosun

Or in NPM: http://npmjs.com/package/@virtengine/bosun

`bosun` now acts as a legacy shim that forwards all CLI commands to the
latest `@virtengine/bosun` binaries.

bosun is a contuation of the initial codex-monitor project.

## Install (recommended)

```bash
npm install -g @virtengine/bosun
```

## Legacy install

```bash
npm install -g bosun
```

This legacy install will provide these commands (forwarded to bosun):

- `bosun`
- `bosun-setup`
- `bosun-chat-id`
- `bosun-shared-workspaces`

## Notes

- Use `bosun` going forward.
- If you see deprecation warnings, they are expected and safe.
