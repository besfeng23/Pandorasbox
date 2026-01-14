param(
  [switch]$Check
)

$ErrorActionPreference = "Stop"

function Write-Log($msg) {
  Write-Host "[tools] $msg"
}

function Have-Cmd($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  return $null -ne $cmd
}

function Install-GCloud {
  if (Have-Cmd "gcloud") { return }
  if ($Check) {
    Write-Log "gcloud not found (check-only)."
    return
  }

  if (Have-Cmd "winget") {
    Write-Log "Installing Google Cloud SDK via winget..."
    try {
      winget install -e --id Google.CloudSDK --accept-source-agreements --accept-package-agreements
      return
    } catch {
      Write-Log "winget install failed; falling back to installer download."
    }
  }

  Write-Log "Downloading Google Cloud SDK installer..."
  $installer = Join-Path $env:TEMP "GoogleCloudSDKInstaller.exe"
  Invoke-WebRequest -Uri "https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe" -OutFile $installer
  Write-Log "Launching installer (you may need to complete UI prompts)."
  Start-Process -FilePath $installer -Wait
}

function Install-Codex {
  if (Have-Cmd "codex") { return }
  if ($Check) {
    Write-Log "codex not found (check-only)."
    return
  }
  if (-not (Have-Cmd "npm")) {
    throw "npm is required to install Codex CLI. Install Node.js 18+ and npm, then re-run."
  }
  Write-Log "Installing Codex CLI (@openai/codex) via npm..."
  npm install -g @openai/codex
}

function Install-Cursor {
  if (Have-Cmd "cursor") {
    if (-not $Check) {
      try { cursor --install-cli | Out-Null } catch { }
    }
    return
  }

  if ($Check) {
    Write-Log "cursor not found (check-only)."
    return
  }

  if (Have-Cmd "winget") {
    Write-Log "Installing Cursor via winget..."
    try {
      winget install -e --id Cursor.Cursor --accept-source-agreements --accept-package-agreements
      return
    } catch {
      Write-Log "winget install Cursor failed; please install Cursor manually."
    }
  } else {
    Write-Log "winget not found; please install Cursor manually."
  }

  Write-Log "After installing Cursor, ensure CLI is enabled (if supported): cursor --install-cli"
}

function Verify-Tools {
  Write-Log "Verifying installations..."

  if (Have-Cmd "gcloud") {
    try { gcloud --version | Select-Object -First 1 } catch { }
  } else {
    Write-Log "WARN: gcloud not found on PATH."
  }

  if (Have-Cmd "codex") {
    try { codex --version } catch { }
  } else {
    Write-Log "WARN: codex not found on PATH."
  }

  if (Have-Cmd "cursor") {
    try { cursor --version | Out-Null; Write-Log "cursor OK (command found)." } catch { Write-Log "cursor OK (command found)." }
  } else {
    Write-Log "WARN: cursor not found on PATH."
  }

  if (-not $Check) {
    Write-Log "NOTE: You may need to restart your terminal for PATH updates to take effect."
  }
}

if ($Check) {
  Write-Log "Mode: check"
} else {
  Write-Log "Mode: setup"
}

Install-GCloud
Install-Codex
Install-Cursor
Verify-Tools


