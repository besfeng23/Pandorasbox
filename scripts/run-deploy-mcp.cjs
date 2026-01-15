const { execSync } = require('child_process');

const cmd =
  process.platform === 'win32'
    ? 'powershell -ExecutionPolicy Bypass -File scripts/deploy-mcp.ps1'
    : 'bash scripts/deploy-mcp.sh';

execSync(cmd, { stdio: 'inherit' });



