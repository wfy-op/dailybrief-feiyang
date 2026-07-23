#!/usr/bin/env node
/**
 * Build the static site that gets published to GitHub Pages (or any static
 * host). Run AFTER `npm run daily` has produced today's report.
 *
 * Reads private source artifacts from daily_reports/ and writes an allowlisted
 * public bundle into public-dist/:
 *   - index.html      copy of the latest <date>/<date>.html
 *   - archive.html    table of every <date>/<date>.html, newest first
 *
 * The public bundle is rebuilt from scratch. Idempotent — safe to re-run.
 *
 * Usage:
 *   node scripts/build-site.mjs --date YYYY-MM-DD
 */

import fs from "node:fs";
import path from "node:path";
import { writeAcademicFeeds } from "./academic-feed.mjs";

const SOURCE_ROOT = "daily_reports";
const PUBLIC_ROOT = "public-dist";

function parseArgs(argv) {
  let date = "";
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--date") date = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("--date YYYY-MM-DD is required");
  }
  return { date };
}

let requestedDate;
try {
  ({ date: requestedDate } = parseArgs(process.argv.slice(2)));
} catch (error) {
  console.error(`[build-site] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

if (!fs.existsSync(SOURCE_ROOT)) {
  console.error(`[build-site] ${SOURCE_ROOT}/ doesn't exist — run \`npm run daily\` first.`);
  process.exit(1);
}

const resolvedPublicRoot = path.resolve(PUBLIC_ROOT);
const expectedPublicRoot = path.join(process.cwd(), PUBLIC_ROOT);
if (resolvedPublicRoot !== expectedPublicRoot || path.basename(resolvedPublicRoot) !== PUBLIC_ROOT) {
  console.error(`[build-site] unsafe public output path: ${resolvedPublicRoot}`);
  process.exit(1);
}
fs.rmSync(resolvedPublicRoot, { recursive: true, force: true });
fs.mkdirSync(resolvedPublicRoot, { recursive: true });

// Pick up every <YYYY-MM-DD>/<YYYY-MM-DD>.html, newest first.
const dates = fs
  .readdirSync(SOURCE_ROOT)
  .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  .filter((d) => fs.existsSync(path.join(SOURCE_ROOT, d, `${d}.html`)))
  .sort((a, b) => b.localeCompare(a));

if (dates.length === 0) {
  console.error(`[build-site] no <YYYY-MM-DD>/<YYYY-MM-DD>.html found in ${SOURCE_ROOT}/`);
  process.exit(1);
}

if (!dates.includes(requestedDate)) {
  console.error(`[build-site] validated report is missing for ${requestedDate}`);
  process.exit(1);
}

for (const date of dates) {
  const targetDir = path.join(PUBLIC_ROOT, date);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(
    path.join(SOURCE_ROOT, date, `${date}.html`),
    path.join(targetDir, `${date}.html`),
  );
}

// --- index.html = latest report ---
const latest = requestedDate;
const latestPath = path.join(PUBLIC_ROOT, latest, `${latest}.html`);
fs.copyFileSync(latestPath, path.join(PUBLIC_ROOT, "index.html"));
console.log(`[build-site] index.html  ← ${latest}/${latest}.html`);

// --- archive.html = list of all reports ---
const rows = dates
  .map((d) => {
    const size = (fs.statSync(path.join(PUBLIC_ROOT, d, `${d}.html`)).size / 1024).toFixed(0);
    return `      <li><a href="./${d}/${d}.html">${d}</a> <span class="size">${size} KB</span></li>`;
  })
  .join("\n");

const archiveHtml = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>daily-brief — archive</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {
    color-scheme: light;
    --ink: #16251f;
    --muted: #6d766f;
    --paper: #f3efe6;
    --card: rgba(255, 255, 255, 0.82);
    --line: rgba(19, 75, 64, 0.14);
    --teal: #0b493f;
    --orange: #ef8b4b;
  }
  * { box-sizing: border-box; }
  body {
    font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    max-width: 860px;
    margin: 0 auto;
    padding: clamp(1.2rem, 4vw, 3.5rem) 1.25rem 4rem;
    line-height: 1.5;
    color: var(--ink);
    background:
      radial-gradient(circle at 90% 0%, rgba(76, 139, 110, 0.16), transparent 28rem),
      radial-gradient(circle at 0% 18%, rgba(239, 139, 75, 0.12), transparent 25rem),
      var(--paper);
    min-height: 100vh;
  }
  h1 { margin: 0 0 0.45rem; font-size: clamp(2.2rem, 7vw, 4.5rem); line-height: 1; letter-spacing: -0.055em; }
  .meta { color: rgba(255,255,255,0.7); font-size: 0.88rem; margin: 0 0 2rem; }
  ul { list-style: none; padding: 0; margin: 1rem 0 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.7rem; }
  li {
    padding: 1rem 1.1rem;
    border: 1px solid var(--line);
    border-radius: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--card);
    box-shadow: 0 7px 22px rgba(26, 55, 47, 0.05);
    transition: transform 160ms ease, box-shadow 160ms ease;
  }
  li:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(26, 55, 47, 0.1); }
  li a { color: var(--teal); font-weight: 750; text-decoration: none; }
  li a:hover { color: #086b5a; }
  .size { color: var(--muted); font-size: 0.78rem; }
  .top {
    position: relative;
    overflow: hidden;
    margin-bottom: 1.2rem;
    padding: clamp(2rem, 6vw, 4rem);
    background: linear-gradient(135deg, #07382f, #105e50);
    border-radius: 24px;
    color: white;
    box-shadow: 0 20px 50px rgba(9, 58, 49, 0.18);
  }
  .top::after { content: ""; position: absolute; width: 15rem; height: 15rem; border-radius: 50%; right: -4rem; top: -8rem; background: rgba(239,139,75,0.18); }
  .top a { position: relative; z-index: 1; color: white; font-weight: 750; text-decoration: none; }
  .top a:hover { text-decoration: underline; text-underline-offset: 4px; }
  @media (max-width: 620px) { ul { grid-template-columns: 1fr; } .top { border-radius: 20px; } }
  @media (prefers-color-scheme: dark) {
    :root { color-scheme: dark; --ink: #eef4ef; --muted: #9eaaa2; --paper: #0d1714; --card: rgba(24, 42, 36, 0.9); --line: rgba(171, 214, 195, 0.15); --teal: #8ed3bd; }
    body { background: radial-gradient(circle at 90% 0%, rgba(44, 102, 85, 0.28), transparent 28rem), var(--paper); }
  }
</style>
</head>
<body>
  <div class="top">
    <h1>往期简报</h1>
    <p class="meta">共 ${dates.length} 期 · 按日期从新到旧 · 更新于 ${new Date().toISOString().slice(0, 10)}</p>
    <a href="./index.html">返回今日简报 · ${latest} →</a>
  </div>
  <ul>
${rows}
  </ul>
</body>
</html>
`;
fs.writeFileSync(path.join(PUBLIC_ROOT, "archive.html"), archiveHtml, "utf8");
console.log(`[build-site] archive.html (${dates.length} dates)`);

// .nojekyll prevents GitHub Pages from running Jekyll, which would otherwise
// strip directories whose names start with "_". We don't have any today but
// it's cheap insurance and standard practice for static-site GH Pages.
fs.writeFileSync(path.join(PUBLIC_ROOT, ".nojekyll"), "", "utf8");
console.log(`[build-site] .nojekyll`);

fs.writeFileSync(
  path.join(PUBLIC_ROOT, "_headers"),
  `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`,
  "utf8",
);
console.log(`[build-site] _headers`);

writeAcademicFeeds(SOURCE_ROOT, undefined, PUBLIC_ROOT);
