# GitHub Actions Daily Publishing

The production DailyBrief job runs in `wfy-op/dailybrief-feiyang` on the
`personalized-cloud` branch. It does not depend on a Windows session, the Codex
desktop app, or the local Codex CLI.

## Schedule and idempotency

`.github/workflows/daily.yml` runs at 08:07 Asia/Shanghai, with catch-up checks
at 10:07 and 14:07. A catch-up restores the `gh-pages` branch and exits before
source fetching or model calls when that branch already contains today's dated
HTML.

The schedule is deliberately encoded in UTC in the workflow. If the desired
Asia/Shanghai times change, edit the cron entry and keep all three hours in
sync.

## Model authentication

The default cloud backend is GitHub Models using `openai/gpt-4o-mini` through
the OpenAI-compatible endpoint. GitHub Actions supplies a short-lived
`GITHUB_TOKEN`; the workflow grants only `models: read` and `contents: write`.
No long-lived OpenAI key is required.

The report pipeline remains fail-soft around model calls. Enrichment failures
preserve source metadata, trading commentary has a deterministic fallback, and
the main digest falls back to `buildDeterministicDailyReport`. Publishing still
passes the deterministic report and public-site validators before any branch
update.

## Public/private boundary

- `daily_reports/` contains private report JSON and full article sidecars. It
  exists only in the runner workspace and must never be published.
- `public-dist/` is rebuilt as the public allowlist: dated HTML, current index,
  archive, academic feeds, `.nojekyll`, and security headers.
- `peaceiris/actions-gh-pages` publishes only `public-dist/` to `gh-pages`.
- `data/academic-seen.json` is restored from and persisted to the dedicated
  `daily-state` branch so paper freshness survives ephemeral runners. Personal
  reading-list notes are never copied to that branch.

The public site is:

```text
https://wfy-op.github.io/dailybrief-feiyang/
```

The former Cloudflare URL permanently redirects to this site so existing
bookmarks and dated links continue to work.

## Operations

Manual run:

```powershell
gh workflow run daily.yml --repo wfy-op/dailybrief-feiyang --ref personalized-cloud
```

Recent runs:

```powershell
gh run list --repo wfy-op/dailybrief-feiyang --workflow daily.yml --limit 10
```

Watch a run:

```powershell
gh run watch <run-id> --repo wfy-op/dailybrief-feiyang --exit-status
```

Success requires all workflow steps through `Validate public site` and
`Publish to GitHub Pages branch` to pass. Then verify that the production title
contains today's Asia/Shanghai date.

## Failure handling

- A source failure is normally non-fatal and appears in source health.
- A GitHub Models error should degrade to source excerpts or the deterministic
  digest. If validation still fails, publishing stops and yesterday's site
  remains intact.
- A failed 08:07 run is retried at 10:07 and 14:07. If the dated report already
  reached `gh-pages`, those retries are no-ops.
- If GitHub Pages is disabled, configure the Pages source as `gh-pages` and
  `/ (root)`.

## Local fallback

The local PowerShell control plane remains available only for manual recovery:

```powershell
pwsh -NoProfile -File scripts/run-and-archive.ps1 -DirectNpm -CatchUp
```

Do not re-enable it as the primary schedule. Local project automations require
the computer and desktop app to be running and can be rejected by unattended
permission review.
