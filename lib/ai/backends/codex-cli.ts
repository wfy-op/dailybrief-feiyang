import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { classifyError, logLlmCall } from "../log";
import type { LlmRunOptions, LlmRunResult } from "../llm";

export const CODEX_MODEL = process.env.CODEX_MODEL?.trim() || "default";

function resolveCliPath(): string {
  const override = process.env.CODEX_CLI_PATH?.trim();
  if (override) return override;
  const appdata = process.env.APPDATA;
  if (appdata) return path.join(appdata, "npm", "codex.cmd");
  return "codex";
}

export function buildCodexCliArgs(model: string): string[] {
  const args = [
    "exec",
    "-c",
    "model_reasoning_effort='low'",
    "-c",
    "service_tier='fast'",
    "--skip-git-repo-check",
    "--ephemeral",
    "--sandbox",
    "read-only",
  ];
  if (process.env.CODEX_MODEL?.trim()) {
    args.push("--model", model);
  }
  return args;
}

export function runCodexCli({
  systemPrompt,
  userPrompt,
  timeoutMs = 180_000,
}: LlmRunOptions): Promise<LlmRunResult> {
  const cli = resolveCliPath();
  const outputPath = path.join(os.tmpdir(), `daily-brief-codex-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`);
  const args = buildCodexCliArgs(CODEX_MODEL);
  args.push("--output-last-message", outputPath);
  args.push("-");
  const prompt = [
    "You are being used as a non-interactive text-generation backend.",
    "Do not browse, edit files, run commands, or explain your process.",
    "Return only the content requested by the user prompt.",
    "",
    "<system>",
    systemPrompt,
    "</system>",
    "",
    "<user>",
    userPrompt,
    "</user>",
  ].join("\n");
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const child = spawn(cli, args, {
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (err: Error | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const durationMs = Date.now() - started;
      const success = err === null;
      let text = "";
      if (success) {
        try {
          text = fs.readFileSync(outputPath, "utf8").trim();
          if (!text) {
            err = new Error("codex CLI produced empty output");
          }
        } catch (readErr) {
          err = readErr instanceof Error ? readErr : new Error(String(readErr));
        }
      }
      try {
        fs.rmSync(outputPath, { force: true });
      } catch {}
      logLlmCall({
        ts: new Date(started).toISOString(),
        backend: "codex-cli",
        model: CODEX_MODEL,
        durationMs,
        success: err === null,
        inputChars: systemPrompt.length + userPrompt.length,
        outputChars: text.length || stdout.length,
        errorCategory: err === null ? null : classifyError(`${stderr}\n${err.message}`),
        errorSnippet: err !== null && stderr.trim() ? stderr.trim().slice(0, 200) : null,
      });
      if (err) reject(err);
      else resolve({ text, durationMs });
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(new Error(`codex CLI timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (err) => finish(err));
    child.on("close", (code) => {
      if (code !== 0 && stderr.trim()) {
        console.warn(`[codex-cli] stderr (non-fatal): ${stderr.trim()}`);
      }
      if (code !== 0) {
        finish(new Error(`codex CLI exited ${code}`));
        return;
      }
      finish(null);
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}
