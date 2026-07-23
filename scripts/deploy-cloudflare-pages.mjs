#!/usr/bin/env node
/**
 * Build and deploy the allowlisted public-dist/ bundle to Cloudflare Pages.
 *
 * Optional configuration in .env.local:
 *   CF_PAGES_PROJECT=dailybrief-feiyang
 *   CF_PAGES_BRANCH=main
 *   CF_PAGES_OUTPUT_DIR=public-dist
 *   CLOUDFLARE_ACCOUNT_ID=...
 *   CLOUDFLARE_API_TOKEN=...
 *
 * Publishing is fail-closed: validation, credentials, upload, and live
 * production verification must all succeed.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const outputDir = "public-dist";
let expectedDate = "";
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === "--date") expectedDate = process.argv[++i];
  else {
    console.error(`[cf-pages] unknown argument: ${process.argv[i]}`);
    process.exit(1);
  }
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDate)) {
  console.error("[cf-pages] --date YYYY-MM-DD is required");
  process.exit(1);
}
if (
  process.env.CF_PAGES_OUTPUT_DIR &&
  path.normalize(process.env.CF_PAGES_OUTPUT_DIR) !== outputDir
) {
  console.error("[cf-pages] CF_PAGES_OUTPUT_DIR is no longer configurable; use public-dist");
  process.exit(1);
}
const project = process.env.CF_PAGES_PROJECT;
const branch = process.env.CF_PAGES_BRANCH || "main";

const outputPath = path.join(root, outputDir);
const build = spawnSync(process.execPath, ["scripts/build-site.mjs", "--date", expectedDate], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});

if (build.status !== 0) {
  console.error(`[cf-pages] build-site failed with exit ${build.status}`);
  process.exit(build.status || 1);
}

if (!fs.existsSync(path.join(outputPath, expectedDate, `${expectedDate}.html`))) {
  console.error(`[cf-pages] public report is missing for ${expectedDate}`);
  process.exit(1);
}

const validation = spawnSync(
  process.execPath,
  ["scripts/validate-publish.mjs", "--date", expectedDate, "--stage", "site"],
  { cwd: root, stdio: "inherit", shell: false, env: process.env },
);
if (validation.status !== 0) {
  console.error(`[cf-pages] publish validation failed with exit ${validation.status}`);
  process.exit(validation.status || 1);
}

if (!project) {
  console.error("[cf-pages] CF_PAGES_PROJECT is required for deployment");
  process.exit(1);
}

const wranglerBin = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "wrangler.cmd" : "wrangler",
);
if (!fs.existsSync(wranglerBin)) {
  console.error(
    "[cf-pages] local Wrangler is missing; run `npm install` before deploying",
  );
  process.exit(1);
}

const args = [
  "pages",
  "deploy",
  outputDir,
  `--project-name=${project}`,
  `--branch=${branch}`,
  "--commit-dirty=true",
];

const command = process.platform === "win32" ? "cmd.exe" : wranglerBin;
const commandArgs =
  process.platform === "win32"
    ? ["/d", "/s", "/c", wranglerBin, ...args]
    : args;

const deploy = spawnSync(command, commandArgs, {
  cwd: root,
  stdio: "inherit",
  shell: false,
  env: process.env,
});

if (deploy.error) {
  console.error(`[cf-pages] failed to start wrangler: ${deploy.error.message}`);
  process.exit(1);
}

if (deploy.status !== 0) {
  console.error(`[cf-pages] wrangler deploy failed with exit ${deploy.status}`);
  process.exit(deploy.status || 1);
}

const productionUrl = `https://${project}.pages.dev`;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function fetchLive(url, localFile) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const separator = url.includes("?") ? "&" : "?";
    const response = await fetch(`${url}${separator}check=${Date.now()}`, {
      headers: { "Cache-Control": "no-cache" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const remoteBytes = Buffer.from(await response.arrayBuffer());
    const localBytes = fs.readFileSync(localFile);
    if (sha256(remoteBytes) !== sha256(localBytes)) {
      throw new Error(`content hash mismatch: ${url}`);
    }
    return remoteBytes;
  } finally {
    clearTimeout(timer);
  }
}

async function verifyProduction() {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const homepage = await fetchLive(
        `${productionUrl}/`,
        path.join(outputPath, "index.html"),
      );
      await fetchLive(
        `${productionUrl}/${expectedDate}/${expectedDate}.html`,
        path.join(outputPath, expectedDate, `${expectedDate}.html`),
      );
      const feedBytes = await fetchLive(
        `${productionUrl}/academic-feed.json`,
        path.join(outputPath, "academic-feed.json"),
      );
      // Cloudflare Pages may serve index.html as its fallback for removed
      // paths. Verify legacy private artifact URLs no longer expose JSON.
      await fetchLive(
        `${productionUrl}/${expectedDate}/${expectedDate}.json`,
        path.join(outputPath, "index.html"),
      );
      await fetchLive(
        `${productionUrl}/${expectedDate}/${expectedDate}-articles.json`,
        path.join(outputPath, "index.html"),
      );
      const feed = JSON.parse(feedBytes.toString("utf8"));
      if (!Array.isArray(feed.items)) throw new Error("live feed items are missing");
      for (const marker of ["今日必读", "金融分析", "学术雷达"]) {
        if (!homepage.toString("utf8").includes(marker)) {
          throw new Error(`homepage missing ${marker}`);
        }
      }
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
  throw lastError;
}

try {
  await verifyProduction();
} catch (error) {
  console.error(
    `[cf-pages] upload completed but live verification failed: ${
      error instanceof Error ? error.message : error
    }`,
  );
  process.exit(1);
}

console.log(
  `[cf-pages] deployed and verified ${outputDir}/ at ${productionUrl}/ (${expectedDate})`,
);
