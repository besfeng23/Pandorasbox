#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-setup}"
CHECK_ONLY="false"
if [[ "$MODE" == "--check" || "$MODE" == "check" ]]; then
  CHECK_ONLY="true"
fi

log() { echo "[tools] $*"; }

have() { command -v "$1" >/dev/null 2>&1; }

install_gcloud() {
  if have gcloud; then
    return 0
  fi
  if [[ "$CHECK_ONLY" == "true" ]]; then
    log "gcloud not found (check-only)."
    return 0
  fi

  log "Installing Google Cloud SDK (gcloud) via official installer..."
  if ! have curl; then
    log "ERROR: curl is required to install gcloud automatically. Install curl or install gcloud manually: https://cloud.google.com/sdk/docs/install"
    return 1
  fi

  # Official install script supports --disable-prompts for non-interactive installs.
  curl -sSL https://sdk.cloud.google.com | bash -s -- --disable-prompts

  # Best-effort PATH hint (the installer typically appends to shell rc).
  if [[ -d "$HOME/google-cloud-sdk/bin" ]]; then
    export PATH="$HOME/google-cloud-sdk/bin:$PATH"
  fi
}

install_codex() {
  if have codex; then
    return 0
  fi
  if [[ "$CHECK_ONLY" == "true" ]]; then
    log "codex not found (check-only)."
    return 0
  fi
  if ! have npm; then
    log "ERROR: npm is required to install Codex CLI. Install Node.js 18+ and npm, then re-run."
    return 1
  fi
  log "Installing Codex CLI (@openai/codex) via npm..."
  npm install -g @openai/codex
}

install_cursor_cli() {
  if have cursor; then
    # If the CLI exists, try to ensure it is installed properly.
    if [[ "$CHECK_ONLY" != "true" ]]; then
      cursor --install-cli >/dev/null 2>&1 || true
    fi
    return 0
  fi

  if [[ "$CHECK_ONLY" == "true" ]]; then
    log "cursor not found (check-only)."
    return 0
  fi

  log "Cursor CLI not detected."
  log "Install Cursor from the official installer, then (if supported) run: cursor --install-cli"
  log "Docs: https://www.cursor.com/"
}

verify() {
  log "Verifying installations..."
  if have gcloud; then
    gcloud --version | head -n 1 || true
  else
    log "WARN: gcloud not found on PATH."
  fi

  if have codex; then
    codex --version || true
  else
    log "WARN: codex not found on PATH."
  fi

  if have cursor; then
    cursor --version >/dev/null 2>&1 && cursor --version || cursor --help >/dev/null 2>&1 || true
    log "cursor OK (command found)."
  else
    log "WARN: cursor not found on PATH."
  fi
}

log "Mode: $MODE"
install_gcloud
install_codex
install_cursor_cli
verify

