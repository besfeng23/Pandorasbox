const { execSync } = require('child_process');

const mode = (process.argv[2] || 'setup').toLowerCase();
const isCheck = mode === 'check' || mode === '--check';

const cmd =
  process.platform === 'win32'
    ? `powershell -ExecutionPolicy Bypass -File scripts/setup-tools.ps1 ${isCheck ? '-Check' : ''}`
    : `bash scripts/setup-tools.sh ${isCheck ? '--check' : ''}`;

execSync(cmd, { stdio: 'inherit' });


