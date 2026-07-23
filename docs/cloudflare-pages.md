# Cloudflare Pages Redirect and Local Fallback

Cloudflare Pages is no longer the production generator host. The project
`dailybrief-feiyang` serves one permanent redirect:

```text
https://dailybrief-feiyang.pages.dev/*
  → https://wfy-op.github.io/dailybrief-feiyang/:splat
```

This preserves existing bookmarks while GitHub Actions and GitHub Pages own the
daily generation and publication lifecycle. See [`github-actions.md`](github-actions.md)
for the production runbook.

## Redirect source

The deployable redirect bundle is `cloudflare-redirect/`:

- `_redirects` preserves the matched path with `:splat` and returns HTTP 301.
- `index.html` is a fallback migration notice.

Deploy it manually only when the destination changes:

```powershell
.\node_modules\.bin\wrangler.cmd pages deploy .\cloudflare-redirect `
  --project-name=dailybrief-feiyang `
  --branch=main `
  --commit-dirty=true
```

Verify both the root and a dated path without following redirects:

```powershell
curl.exe -sS -I https://dailybrief-feiyang.pages.dev/
curl.exe -sS -I https://dailybrief-feiyang.pages.dev/YYYY-MM-DD/YYYY-MM-DD.html
```

Both responses must be `301 Moved Permanently` with a GitHub Pages `Location`.

## Emergency local publication

`scripts/run-and-archive.ps1` and `scripts/deploy-cloudflare-pages.mjs` remain
available for manual incident recovery. They generate and validate an
allowlisted `public-dist/` bundle before upload and verify live bytes by hash.
They are not scheduled and must not replace the GitHub Actions primary path.

Private artifacts remain under `daily_reports/`; never upload that directory.
