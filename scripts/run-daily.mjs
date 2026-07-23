#!/usr/bin/env node
/**
 * Scheduler wrapper for `npm run daily`. Runs the pipeline, tees stdout+stderr
 * to logs/daily-<YYYY-MM-DD>.log, and triggers `npm run open` on success so
 * the report pops up in Chrome (on the user's interactive session).
 *
 * Returns non-zero exit code on pipeline failure so the OS scheduler marks
 * the run as errored.
 *
 * Invoked by:
 *   - Windows Task Scheduler  →  node.exe scripts\run-daily.mjs
 *   - macOS launchd            →  node scripts/run-daily.mjs
 *   - Linux cron / systemd     →  node scripts/run-daily.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Mirror deploy stdout/stderr into the daily log instead of the parent
// stdio (which the scheduler swallowed anyway). Returns the spawnSync result.
function spawnSyncShim(cmd, args, opts) {
  const r = spawnSync(cmd, args, { ...opts, stdio: "pipe", shell: false });
  const out = (r.stdout?.toString("utf8") ?? "") + (r.stderr?.toString("utf8") ?? "");
  if (out) fs.appendFileSync(logFile, out);
  return r;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
process.chdir(projectRoot);

function npmInvocation(args) {
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
  ].filter(Boolean);
  const npmCli = candidates.find((candidate) => fs.existsSync(candidate));
  if (npmCli) {
    return { command: process.execPath, args: [npmCli, ...args] };
  }
  return { command: "npm", args };
}

const skipCloudflareDeploy = /^(1|true|yes)$/i.test(
  process.env.SKIP_CF_DEPLOY?.trim() ?? "",
);

const today = (() => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
})();

const now = () =>
  new Date().toTimeString().slice(0, 8); // HH:MM:SS

const logDir = path.join(projectRoot, "logs");
fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, `daily-${today}.log`);

fs.appendFileSync(logFile, `[${now()}] running npm run daily\n`);

const dailyNpm = npmInvocation(["run", "daily"]);
const child = spawn(dailyNpm.command, dailyNpm.args, {
  cwd: projectRoot,
  shell: false,
  stdio: ["ignore", "pipe", "pipe"],
});

const logStream = fs.createWriteStream(logFile, { flags: "a" });
child.stdout.pipe(logStream);
child.stderr.pipe(logStream);

child.on("close", (code) => {
  if (code === 0) {
    fs.appendFileSync(logFile, `\n[${now()}] OK\n`);

    if (skipCloudflareDeploy) {
      fs.appendFileSync(logFile, `[${now()}] deploy skipped (SKIP_CF_DEPLOY)\n`);
    } else {
      // Deploy to Cloudflare Pages. A scheduled run is not successful until
      // the exact dated bundle is live and byte-for-byte verified.
      fs.appendFileSync(logFile, `[${now()}] deploying…\n`);
      const deployResult = spawnSyncShim(
        process.execPath,
        ["scripts/deploy-cloudflare-pages.mjs", "--date", today],
        { cwd: projectRoot },
      );
      if (deployResult.status === 0) {
        fs.appendFileSync(logFile, `[${now()}] deploy OK\n`);
      } else {
        fs.appendFileSync(
          logFile,
          `[${now()}] deploy FAILED (exit ${deployResult.status})\n`,
        );
        process.exit(1);
      }
    }

    // Detached so we don't block on Chrome's lifetime. Errors here are
    // cosmetic — the report exists on disk regardless.
    const openNpm = npmInvocation(["run", "open"]);
    const opener = spawn(openNpm.command, openNpm.args, {
      cwd: projectRoot,
      shell: false,
      detached: true,
      stdio: "ignore",
    });
    opener.unref();
    process.exit(0);
  } else {
    fs.appendFileSync(logFile, `\n[${now()}] FAILED: npm run daily exited ${code}\n`);
    process.exit(1);
  }
});

child.on("error", (err) => {
  fs.appendFileSync(logFile, `\n[${now()}] FAILED to spawn: ${err.message}\n`);
  process.exit(1);
});
