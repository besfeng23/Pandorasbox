param(
  [Parameter(Mandatory=$true)][string]$GcpProject,
  [Parameter(Mandatory=$true)][string]$Region,
  [Parameter(Mandatory=$true)][string]$ServiceName,
  [Parameter(Mandatory=$true)][string]$KairosBaseUrl,
  [Parameter(Mandatory=$true)][string]$GithubWebhookSecret,
  [string]$KairosIngestSecret = "",
  [string]$AllowedRepos = ""
)

$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RootDir

$envVars = @(
  "KAIROS_BASE_URL=$KairosBaseUrl",
  "GITHUB_WEBHOOK_SECRET=$GithubWebhookSecret"
)

if ($KairosIngestSecret.Trim().Length -gt 0) {
  $envVars += "KAIROS_INGEST_SECRET=$KairosIngestSecret"
}
if ($AllowedRepos.Trim().Length -gt 0) {
  $envVars += "ALLOWED_REPOS=$AllowedRepos"
}

$envVarsJoined = ($envVars -join ",")

gcloud config set project $GcpProject | Out-Host

gcloud run deploy $ServiceName `
  --region $Region `
  --source . `
  --allow-unauthenticated `
  --set-env-vars $envVarsJoined | Out-Host

Write-Host ""
Write-Host "Deployed. Configure GitHub webhook to:"
Write-Host "  https://<cloud-run-url>/webhooks/github"


