# Cloudflare Pages DailyBrief Design

> **Superseded historical design.** GitHub Actions is now the production scheduler and publisher; see [`../../github-actions.md`](../../github-actions.md). Cloudflare only redirects legacy URLs.

## Goal

Publish the generated DailyBrief static site to a free Cloudflare Pages `pages.dev` URL so it can be opened from mobile data without relying on email delivery.

## Deployment Model

Use Cloudflare Pages Direct Upload instead of Git integration. The local scheduled DailyBrief run remains the source of truth:

1. Generate the daily report into `daily_reports/YYYY-MM-DD/`.
2. Archive the dated HTML file to `C:\Users\feiyang\Desktop\日报`.
3. Build the static site index and archive with `npm run build-site`.
4. Optionally deploy `daily_reports/` to Cloudflare Pages with Wrangler when Cloudflare credentials are configured.

This avoids creating or pushing a GitHub repository and works with the existing local Codex-based generation flow.

## Access Protection

The first milestone is a working `https://<project>.pages.dev` test site. After the site is reachable, access protection can be enabled in Cloudflare Pages settings:

- Enable the Pages access policy for preview deployments.
- Follow Cloudflare's known-issues flow to secure the main `*.pages.dev` production hostname.
- Restrict allowed users to the user's email address in Cloudflare Zero Trust.

Until Access is configured in Cloudflare, the `pages.dev` URL should be treated as public.

## Configuration

The deploy script reads these environment variables, preferably from `.env.local`:

- `CF_PAGES_PROJECT`: Cloudflare Pages project name, for example `dailybrief-feiyang`.
- `CF_PAGES_BRANCH`: deployment branch name, default `main`.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID for non-interactive deployments.
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token for non-interactive deployments.

If `CF_PAGES_PROJECT` is absent, deployment is skipped without failing the DailyBrief run. This keeps daily generation reliable while Cloudflare setup is incomplete.

## Error Handling

DailyBrief generation and local archive must remain independent from Cloudflare deployment. A Pages upload failure should be logged and reported by automation, but it should not delete or alter local reports.

## Verification

Run these checks after implementation:

- `npm run build-site`
- `npm run sources:check`
- TypeScript check
- A dry Cloudflare deploy path test that confirms missing credentials skip cleanly

When credentials are configured, run the real deploy and verify:

- `daily_reports/index.html` exists
- `daily_reports/archive.html` exists
- Cloudflare returns a `pages.dev` URL
- Mobile browser can open the URL
