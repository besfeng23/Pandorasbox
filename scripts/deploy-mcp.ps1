param(
  [string]$Region = $env:CLOUD_RUN_REGION,
  [string]$AllowUnauth = $env:CLOUD_RUN_ALLOW_UNAUTH,
  [string]$Repo = $env:CLOUD_RUN_ARTIFACT_REPO
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Region)) { $Region = "asia-southeast1" }
if ([string]::IsNullOrWhiteSpace($AllowUnauth)) { $AllowUnauth = "false" }
if ([string]::IsNullOrWhiteSpace($Repo)) { $Repo = "pandora" }

$ServiceName = "pandora-mcp"

function Write-Log($msg) { Write-Host "[deploy-mcp] $msg" }

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw "gcloud CLI not found. Run: npm run tools:setup"
}

$ProjectId = (gcloud config get-value project 2>$null).Trim()
if ([string]::IsNullOrWhiteSpace($ProjectId)) {
  throw "gcloud project not set. Run: gcloud config set project <PROJECT_ID>"
}

Write-Log "Project: $ProjectId"
Write-Log "Region: $Region"
Write-Log "Service: $ServiceName"

gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com --quiet | Out-Null

Write-Log "Ensuring Artifact Registry repo '$Repo' exists..."
try {
  gcloud artifacts repositories describe $Repo --location $Region --project $ProjectId | Out-Null
} catch {
  gcloud artifacts repositories create $Repo --repository-format=docker --location $Region --project $ProjectId --quiet | Out-Null
}

$ImageTag = "$Region-docker.pkg.dev/$ProjectId/$Repo/$ServiceName`:latest"

Write-Log "Building & pushing image: $ImageTag"
gcloud builds submit --tag $ImageTag "services/$ServiceName"

$authFlag = "--no-allow-unauthenticated"
if ($AllowUnauth -eq "true") { $authFlag = "--allow-unauthenticated" }

$appEnv = if ($env:APP_ENV) { $env:APP_ENV } else { "dev" }
$baseUrl = if ($env:CLOUDRUN_SECRETS_BASE_URL) { $env:CLOUDRUN_SECRETS_BASE_URL } else { "" }
$envVars = "APP_ENV=$appEnv,CLOUDRUN_SECRETS_BASE_URL=$baseUrl"
if ($env:CLOUDRUN_SECRETS_BEARER) { $envVars = "$envVars,CLOUDRUN_SECRETS_BEARER=$($env:CLOUDRUN_SECRETS_BEARER)" }

Write-Log "Deploying to Cloud Run..."
gcloud run deploy $ServiceName `
  --image $ImageTag `
  --region $Region `
  $authFlag `
  --set-env-vars $envVars `
  --platform managed `
  --quiet

$url = gcloud run services describe $ServiceName --region $Region --format="value(status.url)"
Write-Log "Deployed URL: $url"



