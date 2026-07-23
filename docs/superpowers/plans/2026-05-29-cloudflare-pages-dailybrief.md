# Cloudflare Pages DailyBrief Implementation Plan

> **Superseded historical plan.** Do not implement these steps. GitHub Actions is now the production scheduler and publisher; see [`../../github-actions.md`](../../github-actions.md). Cloudflare only redirects legacy URLs.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the existing DailyBrief static output to Cloudflare Pages Direct Upload so the latest report is available at a free `pages.dev` URL.

**Architecture:** Keep the DailyBrief generator local and static. Add a focused Cloudflare deploy script that builds `daily_reports/index.html` and `daily_reports/archive.html`, then uploads `daily_reports/` with Wrangler when Cloudflare environment variables are configured. The local archive and report generation remain successful even if Cloudflare deploy is not configured yet.

**Tech Stack:** Node.js scripts, npm scripts, PowerShell wrapper, Cloudflare Wrangler Direct Upload, `.env.local`.

---

## File Structure

- Modify `package.json`: add npm scripts for Cloudflare Pages build/deploy.
- Create `scripts/deploy-cloudflare-pages.mjs`: load `.env.local`, run `build-site.mjs`, and deploy `daily_reports/` with `npx wrangler pages deploy`.
- Modify `scripts/run-and-archive.ps1`: run `node scripts/build-site.mjs` after successful local archive; optionally run Cloudflare deploy when enabled.
- Modify `.env.example`: document Cloudflare Pages variables.
- Create `docs/cloudflare-pages.md`: step-by-step setup and Access protection notes.

---

### Task 1: Add Cloudflare deploy script

**Files:**
- Create: `scripts/deploy-cloudflare-pages.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create deploy script**

Create `scripts/deploy-cloudflare-pages.mjs` with this behavior:

```js
#!/usr/bin/env node
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const outputDir = process.env.CF_PAGES_OUTPUT_DIR || "daily_reports";
const project = process.env.CF_PAGES_PROJECT;
const branch = process.env.CF_PAGES_BRANCH || "main";

if (!fs.existsSync(path.join(root, outputDir))) {
  console.error(`[cf-pages] output directory missing: ${outputDir}`);
  process.exit(1);
}

const build = spawnSync(process.execPath, ["scripts/build-site.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});
if (build.status !== 0) {
  console.error(`[cf-pages] build-site failed with exit ${build.status}`);
  process.exit(build.status || 1);
}

if (!project) {
  console.log("[cf-pages] CF_PAGES_PROJECT not set; skipping Cloudflare Pages deploy");
  process.exit(0);
}

const args = [
  "--yes",
  "wrangler@latest",
  "pages",
  "deploy",
  outputDir,
  `--project-name=${project}`,
  `--branch=${branch}`,
  "--commit-dirty=true",
];

const deploy = spawnSync("npx.cmd", args, {
  cwd: root,
  stdio: "inherit",
  shell: false,
  env: process.env,
});

if (deploy.status !== 0) {
  console.error(`[cf-pages] wrangler deploy failed with exit ${deploy.status}`);
  process.exit(deploy.status || 1);
}

console.log(`[cf-pages] deployed ${outputDir}/ to https://${project}.pages.dev/`);
```

- [ ] **Step 2: Add npm scripts**

Update `package.json` scripts:

```json
"site:build": "node scripts/build-site.mjs",
"deploy:cf-pages": "node scripts/deploy-cloudflare-pages.mjs"
```

- [ ] **Step 3: Verify missing project skips cleanly**

Run:

```powershell
npm.cmd run deploy:cf-pages
```

Expected: `build-site` succeeds and the script prints that `CF_PAGES_PROJECT` is not set, then exits `0`.

---

### Task 2: Build static site during daily archive

**Files:**
- Modify: `scripts/run-and-archive.ps1`

- [ ] **Step 1: Add build-site after local archive**

After `Copy-Item` succeeds and before writing the manifest, run:

```powershell
$buildSite = Join-Path $ProjectRoot "scripts\build-site.mjs"
if (Test-Path -LiteralPath $buildSite) {
  Push-Location $ProjectRoot
  try {
    & node.exe $buildSite
    $buildCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }
  if ($buildCode -ne 0) {
    Write-ArchiveLog "build-site failed with exit code $buildCode"
  } else {
    Write-ArchiveLog "build-site completed"
  }
}
```

- [ ] **Step 2: Keep local archive success independent**

Do not make a `build-site` failure fail the report manifest. The manifest should still report `status = ok` if the DailyBrief report and local archive are valid.

- [ ] **Step 3: Smoke test archive path**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Users\feiyang\daily-brief\scripts\run-and-archive.ps1 -SkipRun
```

Expected:

- Exit code `0`
- `daily_reports/index.html` exists
- `daily_reports/archive.html` exists
- `logs/last-run-manifest.json` has `status = ok`

---

### Task 3: Document Cloudflare setup

**Files:**
- Modify: `.env.example`
- Create: `docs/cloudflare-pages.md`

- [ ] **Step 1: Add env documentation**

Add commented Cloudflare variables to `.env.example`:

```dotenv
# Cloudflare Pages Direct Upload, optional.
# CF_PAGES_PROJECT=dailybrief-feiyang
# CF_PAGES_BRANCH=main
# CF_PAGES_OUTPUT_DIR=daily_reports
# CLOUDFLARE_ACCOUNT_ID=
# CLOUDFLARE_API_TOKEN=
```

- [ ] **Step 2: Add setup guide**

Create `docs/cloudflare-pages.md` explaining:

```markdown
# Cloudflare Pages Deployment

This setup publishes `daily_reports/` to a free `https://<project>.pages.dev/` URL using Cloudflare Pages Direct Upload.

## First-time setup

1. Create or log in to a Cloudflare account.
2. From `C:\Users\feiyang\daily-brief`, run:
   `npx wrangler pages project create dailybrief-feiyang --production-branch=main`
3. Create a Cloudflare API token with Pages edit permissions.
4. Add values to `.env.local`:
   `CF_PAGES_PROJECT=dailybrief-feiyang`
   `CF_PAGES_BRANCH=main`
   `CLOUDFLARE_ACCOUNT_ID=<account-id>`
   `CLOUDFLARE_API_TOKEN=<token>`
5. Run:
   `npm run deploy:cf-pages`

## Access protection

The site is public until Cloudflare Access is enabled. In Cloudflare Pages, enable an access policy, then follow Cloudflare's known-issues steps to secure the main `*.pages.dev` production hostname. Allow only the user's email address.
```

---

### Task 4: Update Codex automation prompt

**Files:**
- Codex automation `dailybrief-email-brief`

- [ ] **Step 1: Replace email delivery workflow**

Update the automation prompt so the daily heartbeat:

1. Runs `run-and-archive.ps1`.
2. Validates `last-run-manifest.json`.
3. Runs `npm.cmd run deploy:cf-pages`.
4. Reports generation, local archive, site build, and Cloudflare deployment status.
5. Does not check Gmail or send email.

- [ ] **Step 2: Keep schedule unchanged**

Keep the automation active at daily `08:00` Asia/Shanghai:

```text
FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU;BYHOUR=8;BYMINUTE=0;BYSECOND=0
```

---

### Task 5: Verification

**Files:**
- No new files

- [ ] **Step 1: Run static checks**

Run:

```powershell
npm.cmd run sources:check
npm.cmd exec tsc -- --noEmit
npm.cmd run deploy:cf-pages
```

Expected:

- Sources schema check passes.
- TypeScript check passes.
- Cloudflare deploy script exits `0`; if no Cloudflare env is set, it skips deployment cleanly.

- [ ] **Step 2: Real deploy after credentials**

After Cloudflare credentials are configured, run:

```powershell
npm.cmd run deploy:cf-pages
```

Expected output includes:

```text
[cf-pages] deployed daily_reports/ to https://<project>.pages.dev/
```

Open the URL on desktop and mobile data.
