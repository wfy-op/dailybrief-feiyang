import assert from "node:assert/strict";

import { buildCodexCliArgs } from "../lib/ai/backends/codex-cli";

const args = buildCodexCliArgs("default");

assert.deepEqual(
  args.slice(0, 7),
  [
    "exec",
    "-c",
    "model_reasoning_effort='low'",
    "-c",
    "service_tier='fast'",
    "--skip-git-repo-check",
    "--ephemeral",
  ],
);

console.log("PASS codex cli args");
