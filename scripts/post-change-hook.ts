#!/usr/bin/env tsx
/**
 * Post-Change Hook
 * Automatically commits, pushes to GitHub, and sends events to Kairos
 * Run this after making changes: npm run post-change
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const GIT_DIR = process.cwd();

function runCommand(cmd: string, description: string): boolean {
  try {
    console.log(`📦 ${description}...`);
    execSync(cmd, { cwd: GIT_DIR, stdio: 'inherit' });
    return true;
  } catch (error: any) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

function getChangedFiles(): string[] {
  try {
    const output = execSync('git diff --name-only', { cwd: GIT_DIR, encoding: 'utf-8' });
    const staged = execSync('git diff --cached --name-only', { cwd: GIT_DIR, encoding: 'utf-8' });
    const all = new Set([...output.trim().split('\n'), ...staged.trim().split('\n')].filter(Boolean));
    return Array.from(all);
  } catch {
    return [];
  }
}

async function main() {
  console.log('🔄 Post-Change Hook: Auto-commit, push, and send events');
  console.log('');

  // Check if we're in a git repo
  if (!existsSync(join(GIT_DIR, '.git'))) {
    console.error('❌ Not a git repository');
    process.exit(1);
  }

  // Check if there are changes
  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    console.log('✅ No changes to commit');
    process.exit(0);
  }

  console.log(`📝 Changed files: ${changedFiles.length}`);
  changedFiles.slice(0, 5).forEach(f => console.log(`   - ${f}`));
  if (changedFiles.length > 5) {
    console.log(`   ... and ${changedFiles.length - 5} more`);
  }
  console.log('');

  // Get current branch
  let branch = 'main';
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: GIT_DIR, encoding: 'utf-8' }).trim();
  } catch {
    console.warn('⚠️  Could not determine branch, using "main"');
  }

  // Generate commit message
  const timestamp = new Date().toISOString();
  const fileList = changedFiles.slice(0, 3).join(', ');
  const commitMsg = `Update: ${timestamp} - ${fileList}${changedFiles.length > 3 ? '...' : ''}`;

  // Stage all changes
  if (!runCommand('git add -A', 'Staging changes')) {
    process.exit(1);
  }

  // Commit
  if (!runCommand(`git commit -m "${commitMsg}"`, 'Committing changes')) {
    console.log('⚠️  Commit failed or nothing to commit');
  }

  // Push to GitHub
  if (!runCommand(`git push origin ${branch}`, 'Pushing to GitHub')) {
    console.warn('⚠️  Push failed, but continuing...');
  }

  // Send events to Kairos
  console.log('');
  console.log('📡 Sending events to Kairos...');
  try {
    execSync('npm run kairos:production-fixes', { cwd: GIT_DIR, stdio: 'inherit' });
  } catch (error: any) {
    console.warn('⚠️  Kairos events failed (non-critical):', error.message);
  }

  console.log('');
  console.log('✅ Post-change hook complete!');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

