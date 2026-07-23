$ErrorActionPreference = "Stop"

$wrapper = Join-Path $PSScriptRoot "run-and-archive.ps1"
$root = Join-Path ([System.IO.Path]::GetTempPath()) ("dailybrief-control-test-" + [guid]::NewGuid().ToString("N"))
$project = Join-Path $root "project"
$archive = Join-Path $root "archive"
$scripts = Join-Path $project "scripts"
$date = "2026-05-23"
$dateDir = Join-Path $project "daily_reports\$date"

New-Item -ItemType Directory -Force -Path $dateDir, $archive, $scripts | Out-Null
Set-Content -LiteralPath (Join-Path $dateDir "$date.html") -Value "<html>$date</html>" -NoNewline -Encoding UTF8
Set-Content -LiteralPath (Join-Path $dateDir "$date.json") -Value '{"ok":true}' -NoNewline -Encoding UTF8
Set-Content -LiteralPath (Join-Path $dateDir "$date-articles.json") -Value '{"articles":[]}' -NoNewline -Encoding UTF8

Set-Content -LiteralPath (Join-Path $scripts "validate-publish.mjs") -Value 'process.exit(0);' -Encoding UTF8
Set-Content -LiteralPath (Join-Path $scripts "build-site.mjs") -Value @'
import fs from "node:fs";
import path from "node:path";
const date = process.argv[process.argv.indexOf("--date") + 1];
fs.mkdirSync("public-dist", { recursive: true });
fs.copyFileSync(path.join("daily_reports", date, `${date}.html`), path.join("public-dist", "index.html"));
'@ -Encoding UTF8
Set-Content -LiteralPath (Join-Path $scripts "deploy-cloudflare-pages.mjs") -Value @'
if (process.env.TEST_DEPLOY_FAIL === "true") process.exit(13);
process.exit(0);
'@ -Encoding UTF8

& pwsh -NoProfile -File $wrapper `
  -ProjectRoot $project `
  -ArchiveDir $archive `
  -ExpectedDate $date `
  -SkipRun `
  -SkipDeploy

if ($LASTEXITCODE -ne 0) { throw "local-only wrapper exited $LASTEXITCODE" }
$manifestPath = Join-Path $project "logs\last-run-manifest.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($manifest.schemaVersion -ne 2 -or $manifest.status -ne "local_only" -or $manifest.phase -ne "complete") {
  throw "unexpected success manifest: $($manifest | ConvertTo-Json -Compress)"
}
if (-not $manifest.flags.reportValidated -or -not $manifest.flags.siteValidated -or -not $manifest.flags.archived) {
  throw "success manifest flags are incomplete"
}
if (-not $manifest.hashes.reportHtmlSha256 -or -not $manifest.hashes.publicIndexSha256) {
  throw "success manifest hashes are missing"
}
if (-not (Test-Path -LiteralPath (Join-Path $archive "$date.html"))) {
  throw "dated archive is missing"
}

$originalRunId = $manifest.runId
$lockPath = Join-Path $project "logs\daily-run.lock"
$heldLock = [System.IO.File]::Open(
  $lockPath,
  [System.IO.FileMode]::OpenOrCreate,
  [System.IO.FileAccess]::ReadWrite,
  [System.IO.FileShare]::None
)
try {
  & pwsh -NoProfile -File $wrapper `
    -ProjectRoot $project `
    -ArchiveDir $archive `
    -ExpectedDate $date `
    -SkipRun `
    -SkipDeploy
  if ($LASTEXITCODE -ne 0) { throw "overlap guard exited $LASTEXITCODE" }
} finally {
  $heldLock.Dispose()
}
$afterOverlap = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($afterOverlap.runId -ne $originalRunId) {
  throw "overlapping run replaced the active run manifest"
}

$env:TEST_DEPLOY_FAIL = "true"
try {
  & pwsh -NoProfile -File $wrapper `
    -ProjectRoot $project `
    -ArchiveDir $archive `
    -ExpectedDate $date `
    -SkipRun
  if ($LASTEXITCODE -eq 0) { throw "deploy failure was incorrectly reported as success" }
} finally {
  Remove-Item Env:TEST_DEPLOY_FAIL -ErrorAction SilentlyContinue
}
$failed = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($failed.status -ne "failed" -or $failed.phase -ne "deploying-and-verifying") {
  throw "deploy failure manifest is incorrect: $($failed | ConvertTo-Json -Compress)"
}
if ($failed.flags.deployedAndVerified) { throw "failed deployment was marked verified" }

Write-Host "PASS run-and-archive fail-closed manifest and exact-date orchestration"
