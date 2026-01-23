import { execSync } from 'child_process';

function run(command: string, options: any = {}) {
  try {
    execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    if (options.ignoreError) return;
    throw error;
  }
}

function autoCommit() {
  try {
    console.log('🔄 Starting auto-commit process...');

    // 1. Stage all changes
    run('git add -A');

    // 2. Check status
    const status = execSync('git status --porcelain').toString();

    if (status.trim()) {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const commitMsg = `Auto-commit: ${timestamp}`;
      console.log(`📦 Committing changes: ${commitMsg}`);
      run(`git commit -m "${commitMsg}"`);
    } else {
      console.log('✨ No changes to commit.');
    }

    // 3. Push to upstream
    try {
      // Try to get configured upstream
      const upstream = execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', { stdio: 'pipe' }).toString().trim();
      // upstream is like "origin/production"
      if (upstream) {
        const [remote, branch] = upstream.split('/');
        console.log(`🚀 Pushing to configured upstream: ${remote}/${branch}`);
        run(`git push ${remote} HEAD:${branch}`);
      } else {
        throw new Error('No upstream');
      }
    } catch (e) {
      // Fallback to origin HEAD
      console.log('⚠️ No upstream configured or check failed. Pushing to origin HEAD...');
      run('git push origin HEAD');
    }

    console.log('✅ Auto-commit completed successfully.');

  } catch (error) {
    console.error('❌ Auto-commit failed:', error);
    process.exit(1);
  }
}

autoCommit();

