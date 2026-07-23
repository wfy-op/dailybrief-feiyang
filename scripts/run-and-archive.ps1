param(
  [string]$ProjectRoot = "C:\Users\feiyang\daily-brief",
  [string]$ArchiveDir = (Join-Path ([Environment]::GetFolderPath("Desktop")) ([string]([char]0x65E5) + [string]([char]0x62A5))),
  [string]$NpmCommand = "npm.cmd",
  [string]$NodeCommand = "node.exe",
  [string]$ExpectedDate = (Get-Date -Format "yyyy-MM-dd"),
  [switch]$SkipRun,
  [switch]$SkipDeploy,
  [switch]$DirectNpm,
  [switch]$CatchUp
)

$ErrorActionPreference = "Stop"
$exitCode = 0
$lockStream = $null
$manifestPath = $null
$runState = $null

function Write-ArchiveLog {
  param([string]$Message)

  try {
    $logDir = Join-Path $ProjectRoot "logs"
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -LiteralPath (Join-Path $logDir "archive.log") -Value "[$stamp] $Message" -Encoding UTF8
  } catch {
    Write-Host "[daily-control] log skipped: $($_.Exception.Message)"
  }
}

function Write-RunManifest {
  if (-not $runState -or -not $manifestPath) { return }

  $runState.updatedAt = (Get-Date).ToString("o")
  $json = $runState | ConvertTo-Json -Depth 8
  $temporary = "$manifestPath.$($runState.runId).tmp"
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($temporary, $json, $utf8)
  Move-Item -LiteralPath $temporary -Destination $manifestPath -Force
}

function Set-Phase {
  param([string]$Phase)
  $runState.phase = $Phase
  Write-RunManifest
  Write-ArchiveLog "run=$($runState.runId) phase=$Phase date=$ExpectedDate"
}

function Invoke-NodeChecked {
  param([string[]]$Arguments, [string]$Label)

  & $NodeCommand @Arguments
  $code = $LASTEXITCODE
  if ($code -ne 0) {
    throw "$Label failed with exit code $code"
  }
}

function Test-ValidatedReport {
  & $NodeCommand "scripts\validate-publish.mjs" "--date" $ExpectedDate "--stage" "report"
  return ($LASTEXITCODE -eq 0)
}

try {
  if ($ExpectedDate -notmatch "^\d{4}-\d{2}-\d{2}$") {
    throw "ExpectedDate must be YYYY-MM-DD: $ExpectedDate"
  }

  $ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
  $logDir = Join-Path $ProjectRoot "logs"
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  $manifestPath = Join-Path $logDir "last-run-manifest.json"
  $lockPath = Join-Path $logDir "daily-run.lock"

  try {
    $lockStream = [System.IO.File]::Open(
      $lockPath,
      [System.IO.FileMode]::OpenOrCreate,
      [System.IO.FileAccess]::ReadWrite,
      [System.IO.FileShare]::None
    )
  } catch [System.IO.IOException] {
    Write-Host "[daily-control] another run holds $lockPath; exiting without overlap"
    exit 0
  }

  $runState = [ordered]@{
    schemaVersion = 2
    runId = [guid]::NewGuid().ToString()
    status = "running"
    phase = "initializing"
    date = $ExpectedDate
    projectRoot = $ProjectRoot
    reportJson = ""
    reportHtml = ""
    reportArticles = ""
    archiveHtml = ""
    deploymentUrl = ""
    hashes = [ordered]@{}
    flags = [ordered]@{
      reusedExistingReport = $false
      generated = $false
      reportValidated = $false
      siteBuilt = $false
      siteValidated = $false
      archived = $false
      deployedAndVerified = $false
      skipDeploy = [bool]$SkipDeploy
    }
    error = ""
    startedAt = (Get-Date).ToString("o")
    updatedAt = (Get-Date).ToString("o")
    completedAt = ""
  }
  Write-RunManifest

  $reportDir = Join-Path (Join-Path $ProjectRoot "daily_reports") $ExpectedDate
  $reportJson = Join-Path $reportDir "$ExpectedDate.json"
  $reportHtml = Join-Path $reportDir "$ExpectedDate.html"
  $reportArticles = Join-Path $reportDir "$ExpectedDate-articles.json"
  $runState.reportJson = $reportJson
  $runState.reportHtml = $reportHtml
  $runState.reportArticles = $reportArticles

  Push-Location $ProjectRoot
  try {
    $reuse = $false
    $candidateExists =
      (Test-Path -LiteralPath $reportJson) -and
      (Test-Path -LiteralPath $reportHtml) -and
      (Test-Path -LiteralPath $reportArticles)

    if (($CatchUp -or $SkipRun) -and $candidateExists) {
      Set-Phase "checking-existing-report"
      $reuse = Test-ValidatedReport
      if ($reuse) {
        $runState.flags.reusedExistingReport = $true
        Write-RunManifest
        Write-Host "[daily-control] reusing validated report for $ExpectedDate"
      }
    }

    if ($SkipRun -and -not $reuse) {
      throw "SkipRun requested but no valid report exists for $ExpectedDate"
    }

    if (-not $reuse) {
      Set-Phase "generating"
      $env:LLM_BACKEND = "codex-cli"
      $env:SKIP_CF_DEPLOY = "true"
      $defaultCodexCli = "C:\Users\feiyang\AppData\Roaming\npm\codex.cmd"
      if (-not $env:CODEX_CLI_PATH -and (Test-Path -LiteralPath $defaultCodexCli)) {
        $env:CODEX_CLI_PATH = $defaultCodexCli
      }

      if ($DirectNpm) {
        $dailyLog = Join-Path $logDir "daily-$ExpectedDate.log"
        Add-Content -LiteralPath $dailyLog -Value "[$(Get-Date -Format 'HH:mm:ss')] running npm run daily" -Encoding UTF8
        & $NpmCommand run daily 2>&1 | Tee-Object -FilePath $dailyLog -Append
        $runCode = $LASTEXITCODE
      } else {
        & $NodeCommand "scripts\run-daily.mjs"
        $runCode = $LASTEXITCODE
      }
      if ($runCode -ne 0) {
        throw "DailyBrief generation failed with exit code $runCode"
      }
      $runState.flags.generated = $true
      Write-RunManifest
    }

    Set-Phase "validating-report"
    Invoke-NodeChecked -Arguments @(
      "scripts\validate-publish.mjs", "--date", $ExpectedDate, "--stage", "report"
    ) -Label "report validation"
    $runState.flags.reportValidated = $true
    Write-RunManifest

    Set-Phase "building-public-site"
    Invoke-NodeChecked -Arguments @(
      "scripts\build-site.mjs", "--date", $ExpectedDate
    ) -Label "public site build"
    $runState.flags.siteBuilt = $true
    Write-RunManifest

    Set-Phase "validating-public-site"
    Invoke-NodeChecked -Arguments @(
      "scripts\validate-publish.mjs", "--date", $ExpectedDate, "--stage", "site"
    ) -Label "public site validation"
    $runState.flags.siteValidated = $true
    Write-RunManifest

    Set-Phase "archiving"
    if (-not (Test-Path -LiteralPath $ArchiveDir)) {
      New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null
    }
    $ArchiveDir = (Resolve-Path -LiteralPath $ArchiveDir).Path
    $destination = Join-Path $ArchiveDir "$ExpectedDate.html"
    Copy-Item -LiteralPath $reportHtml -Destination $destination -Force
    $runState.archiveHtml = $destination
    $runState.flags.archived = $true
    Write-RunManifest

    if (-not $SkipDeploy) {
      Set-Phase "deploying-and-verifying"
      Invoke-NodeChecked -Arguments @(
        "scripts\deploy-cloudflare-pages.mjs", "--date", $ExpectedDate
      ) -Label "Cloudflare deployment and live verification"
      $runState.deploymentUrl = "https://$($env:CF_PAGES_PROJECT).pages.dev/"
      if (-not $env:CF_PAGES_PROJECT) {
        $envFile = Join-Path $ProjectRoot ".env.local"
        $projectLine = Get-Content -LiteralPath $envFile -Encoding UTF8 |
          Where-Object { $_ -match "^CF_PAGES_PROJECT=" } |
          Select-Object -First 1
        if ($projectLine) {
          $projectName = ($projectLine -split "=", 2)[1].Trim()
          $runState.deploymentUrl = "https://$projectName.pages.dev/"
        }
      }
      $runState.flags.deployedAndVerified = $true
      Write-RunManifest
    }

    Set-Phase "recording-evidence"
    $publicRoot = Join-Path $ProjectRoot "public-dist"
    $runState.hashes.reportJsonSha256 = (Get-FileHash -LiteralPath $reportJson -Algorithm SHA256).Hash.ToLowerInvariant()
    $runState.hashes.reportHtmlSha256 = (Get-FileHash -LiteralPath $reportHtml -Algorithm SHA256).Hash.ToLowerInvariant()
    $runState.hashes.publicIndexSha256 = (Get-FileHash -LiteralPath (Join-Path $publicRoot "index.html") -Algorithm SHA256).Hash.ToLowerInvariant()
    $runState.status = if ($SkipDeploy) { "local_only" } else { "ok" }
    $runState.phase = "complete"
    $runState.completedAt = (Get-Date).ToString("o")
    Write-RunManifest
    Write-ArchiveLog "run=$($runState.runId) completed status=$($runState.status) date=$ExpectedDate"
    Write-Host "[daily-control] $($runState.status): $ExpectedDate run=$($runState.runId)"
  } finally {
    Pop-Location
  }
} catch {
  $exitCode = 1
  $message = $_.Exception.Message
  if ($runState) {
    $runState.status = "failed"
    $runState.error = $message
    $runState.completedAt = (Get-Date).ToString("o")
    try { Write-RunManifest } catch { Write-Host "[daily-control] manifest write failed: $($_.Exception.Message)" }
  }
  Write-ArchiveLog "FAILED date=$ExpectedDate phase=$($runState.phase): $message"
  Write-Error "[daily-control] FAILED: $message"
} finally {
  if ($lockStream) {
    $lockStream.Dispose()
  }
}

exit $exitCode
