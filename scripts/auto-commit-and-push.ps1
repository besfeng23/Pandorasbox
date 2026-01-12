# Auto-commit and push script for Kairos event tracking (PowerShell)
# This script commits changes and pushes to GitHub, then sends events to Kairos

$ErrorActionPreference = "Continue"

Write-Host "🔄 Auto-commit and push script" -ForegroundColor Cyan
Write-Host ""

# Check if there are changes to commit
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "⚠️  No changes to commit" -ForegroundColor Yellow
    exit 0
}

# Get the current branch
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "📍 Current branch: $branch" -ForegroundColor Cyan

# Generate commit message
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMsg = "Update: $timestamp - Production fixes and improvements"

# Check for recent file changes
$changedFiles = git diff --name-only | Select-Object -First 5
if ($changedFiles) {
    $fileList = ($changedFiles -join ", ").Substring(0, [Math]::Min(100, ($changedFiles -join ", ").Length))
    $commitMsg = "Update: $timestamp - Modified: $fileList"
}

Write-Host "📝 Commit message: $commitMsg" -ForegroundColor Cyan
Write-Host ""

# Stage all changes
Write-Host "📦 Staging changes..." -ForegroundColor Cyan
git add -A

# Commit
Write-Host "💾 Committing changes..." -ForegroundColor Cyan
try {
    git commit -m $commitMsg
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Nothing to commit or commit failed" -ForegroundColor Yellow
        exit 0
    }
} catch {
    Write-Host "⚠️  Commit failed: $_" -ForegroundColor Yellow
    exit 0
}

# Push to GitHub
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Cyan
try {
    git push origin $branch
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Push failed. Continuing to send events..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Push failed: $_" -ForegroundColor Yellow
}

Write-Host "✅ Git operations complete" -ForegroundColor Green
Write-Host ""

# Send events to Kairos
Write-Host "📡 Sending events to Kairos..." -ForegroundColor Cyan
if (Get-Command npm -ErrorAction SilentlyContinue) {
    try {
        npm run kairos:production-fixes 2>$null
    } catch {
        Write-Host "⚠️  Kairos events failed (non-critical)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  npm not found, skipping Kairos events" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ All operations complete!" -ForegroundColor Green

