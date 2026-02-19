#!/usr/bin/env node

import { spawn } from "node:child_process";
import { basename, dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const COMMAND_MAP = new Map([
  ["openfleet", "cli.mjs"],
  ["openfleet-setup", "setup.mjs"],
  ["openfleet-chat-id", "get-telegram-chat-id.mjs"],
  ["openfleet-shared-workspaces", "shared-workspace-cli.mjs"],
]);

function resolveOpenfleetDir() {
  try {
    const monitorPath = require.resolve("@virtengine/openfleet");
    return dirname(monitorPath);
  } catch (err) {
    const message = err && typeof err.message === "string" ? err.message : String(err);
    console.error(
      "[openfleet] Failed to locate @virtengine/openfleet. " +
      "Install it with: npm install -g @virtengine/openfleet\n" +
      `Details: ${message}`,
    );
    process.exit(1);
  }
}

const invoked = basename(process.argv[1] || "openfleet");
const scriptName = COMMAND_MAP.get(invoked) || "cli.mjs";
const openfleetDir = resolveOpenfleetDir();
const scriptPath = resolve(openfleetDir, scriptName);

const child = spawn(process.execPath, [scriptPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});

child.on("error", (err) => {
  console.error(`[openfleet] Failed to launch openfleet: ${err.message}`);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
