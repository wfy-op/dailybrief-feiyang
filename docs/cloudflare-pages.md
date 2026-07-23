# Cloudflare Pages Deployment

This publishes the allowlisted `public-dist/` bundle to a free `https://<project>.pages.dev/` URL with Cloudflare Pages Direct Upload. Private dated JSON and full article sidecars remain local under `daily_reports/`.

The local DailyBrief flow still writes dated archives to `C:\Users\feiyang\Desktop\日报`. Cloudflare deployment is an extra publishing step.

## First-Time Setup

1. Create or log in to a Cloudflare account.
2. From `C:\Users\feiyang\daily-brief`, create a Pages project:

```powershell
npx wrangler pages project create dailybrief-feiyang --production-branch=main
```

3. Complete the browser OAuth login if Wrangler asks for it.
4. Add these values to `.env.local`:

```dotenv
CF_PAGES_PROJECT=dailybrief-feiyang
CF_PAGES_BRANCH=main
CF_PAGES_OUTPUT_DIR=public-dist
```

5. Deploy:

```powershell
npm run deploy:cf-pages -- --date YYYY-MM-DD
```

For an unattended machine without a Wrangler OAuth session, create a Cloudflare
API token with Pages edit permissions and also set:

```dotenv
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
CLOUDFLARE_API_TOKEN=<your-token>
```

The latest report will be available at:

```text
https://dailybrief-feiyang.pages.dev/
```

Use the actual project name if you choose a different one.

## Access Protection

Until Access is configured, the `pages.dev` URL is public.

To protect the site:

1. Open Cloudflare dashboard > Workers & Pages.
2. Select the DailyBrief Pages project.
3. Go to Settings > General > Enable access policy.
4. Open the created Access application.
5. In Access > Applications > Configure, remove the wildcard from the public hostname so the main `<project>.pages.dev` hostname is protected.
6. Re-enable the Pages access policy if you also want preview deployments protected.
7. In Cloudflare Zero Trust, restrict allowed users to your email address.

Cloudflare documents this as the known-issues flow for enabling Access on the main `*.pages.dev` domain.

## Daily Automation

The scheduled Codex automation runs one fail-closed control command:

```powershell
pwsh -NoProfile -File C:\Users\feiyang\daily-brief\scripts\run-and-archive.ps1 -DirectNpm -CatchUp
```

The control script owns the lock, exact report date, deterministic validation, archive copy, public allowlist build, Cloudflare upload, live byte-hash verification, and atomic run manifest. Missing credentials or a failed upload returns non-zero and the manifest remains `failed`.

## Useful Files

- Private report JSON/HTML and article sidecars: `daily_reports/YYYY-MM-DD/`
- Public deployment bundle: `public-dist/`
- Latest public report: `public-dist/index.html`
- Public archive list: `public-dist/archive.html`
- Dated local HTML archive: `C:\Users\feiyang\Desktop\日报\YYYY-MM-DD.html`
- Deployment script: `scripts/deploy-cloudflare-pages.mjs`
- Deterministic gate: `scripts/validate-publish.mjs`
- Atomic run evidence: `logs/last-run-manifest.json`
