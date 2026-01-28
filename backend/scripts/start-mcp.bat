@echo off
cd /d "%~dp0.."
call npx -y tsx src/mcp/index.ts
