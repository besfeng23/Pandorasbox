#!/usr/bin/env tsx
/**
 * Auto-execute after changes
 * This script runs automatically after file changes are made
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const GIT_DIR = process.cwd();

function runCommand(cmd: string, description: string, silent = false): boolean {
  try {
    if (!silent) console.log(`📦 ${description}...`);
    execSync(cmd, { cwd: GIT_DIR, stdio: silent ? 'pipe' : 'inherit' });
    return true;
  } catch (error: any) {
    if (!silent) console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

function getChangedFiles(): string[] {
  try {
    const output = execSync('git diff --name-only', { cwd: GIT_DIR, encoding: 'utf-8' });
    const staged = execSync('git diff --cached --name-only', { cwd: GIT_DIR, encoding: 'utf-8' });
    const untracked = execSync('git ls-files --others --exclude-standard', { cwd: GIT_DIR, encoding: 'utf-8' });
    const all = new Set(
      [...output.trim().split('\n'), ...staged.trim().split('\n'), ...untracked.trim().split('\n')].filter(Boolean)
    );
    return Array.from(all);
  } catch {
    return [];
  }
}

function getPackageRunner(): string {
  const ua = (process.env.npm_config_user_agent || '').toLowerCase();
  if (ua.includes('pnpm')) return 'pnpm -s';
  if (ua.includes('yarn')) return 'yarn -s';
  return 'npm';
}

async function autoCommitAndPush() {
  // Check if we're in a git repo
  if (!existsSync(join(GIT_DIR, '.git'))) {
    return;
  }

  // Check if there are changes
  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    return;
  }

  // Get current branch
  let branch = 'main';
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: GIT_DIR, encoding: 'utf-8' }).trim();
  } catch {
    branch = 'main';
  }

  // Generate commit message
  const timestamp = new Date().toISOString();
  const fileList = changedFiles.slice(0, 3).join(', ');
  const commitMsg = `Auto-commit: ${timestamp} - ${fileList}${changedFiles.length > 3 ? '...' : ''}`;

  // Stage all changes
  runCommand('git add -A', 'Staging', true);

  // Commit
  runCommand(`git commit -m "${commitMsg}"`, 'Committing', true);

  // Push to GitHub
  runCommand(`git push origin ${branch}`, 'Pushing', true);

  // Send events to Kairos (non-blocking)
  try {
    const runner = getPackageRunner();
    execSync(`${runner} run kairos:production-fixes`, { cwd: GIT_DIR, stdio: 'pipe' });
  } catch {
    // Silent fail for events
  }
}

// Run automatically
autoCommitAndPush().catch(() => {
  // Silent fail
});

