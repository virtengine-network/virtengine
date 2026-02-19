#!/usr/bin/env node

import { spawn } from "node:child_process";
import { basename, dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const COMMAND_MAP = new Map([
  ["bosun", "cli.mjs"],
  ["bosun-setup", "setup.mjs"],
  ["bosun-chat-id", "get-telegram-chat-id.mjs"],
  ["bosun-shared-workspaces", "shared-workspace-cli.mjs"],
]);

function resolveBosunDir() {
  try {
    const monitorPath = require.resolve("@virtengine/bosun");
    return dirname(monitorPath);
  } catch (err) {
    const message = err && typeof err.message === "string" ? err.message : String(err);
    console.error(
      "[bosun] Failed to locate @virtengine/bosun. " +
      "Install it with: npm install -g @virtengine/bosun\n" +
      `Details: ${message}`,
    );
    process.exit(1);
  }
}

const invoked = basename(process.argv[1] || "bosun");
const scriptName = COMMAND_MAP.get(invoked) || "cli.mjs";
const bosunDir = resolveBosunDir();
const scriptPath = resolve(bosunDir, scriptName);

const child = spawn(process.execPath, [scriptPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});

child.on("error", (err) => {
  console.error(`[bosun] Failed to launch bosun: ${err.message}`);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
