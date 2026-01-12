#!/bin/bash

# Auto-commit and push script for Kairos event tracking
# This script commits changes and pushes to GitHub, then sends events to Kairos

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Auto-commit and push script${NC}"
echo ""

# Check if there are changes to commit
if [ -z "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}⚠️  No changes to commit${NC}"
  exit 0
fi

# Get the current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${BLUE}📍 Current branch: ${BRANCH}${NC}"

# Generate commit message from recent changes
COMMIT_MSG="Update: $(date '+%Y-%m-%d %H:%M:%S') - Production fixes and improvements"

# Check if we have a more descriptive message from git diff
if git diff --cached --quiet; then
  # No staged changes, check unstaged
  RECENT_FILES=$(git diff --name-only | head -5 | tr '\n' ' ')
  if [ ! -z "$RECENT_FILES" ]; then
    COMMIT_MSG="Update: $(date '+%Y-%m-%d %H:%M:%S') - Modified: ${RECENT_FILES}"
  fi
else
  # Has staged changes
  STAGED_FILES=$(git diff --cached --name-only | head -5 | tr '\n' ' ')
  COMMIT_MSG="Update: $(date '+%Y-%m-%d %H:%M:%S') - Staged: ${STAGED_FILES}"
fi

echo -e "${BLUE}📝 Commit message: ${COMMIT_MSG}${NC}"
echo ""

# Stage all changes
echo -e "${BLUE}📦 Staging changes...${NC}"
git add -A

# Commit
echo -e "${BLUE}💾 Committing changes...${NC}"
git commit -m "$COMMIT_MSG" || {
  echo -e "${YELLOW}⚠️  Nothing to commit or commit failed${NC}"
  exit 0
}

# Push to GitHub
echo -e "${BLUE}🚀 Pushing to GitHub...${NC}"
git push origin "$BRANCH" || {
  echo -e "${YELLOW}⚠️  Push failed. Continuing to send events...${NC}"
}

echo -e "${GREEN}✅ Git operations complete${NC}"
echo ""

# Send events to Kairos
echo -e "${BLUE}📡 Sending events to Kairos...${NC}"
if command -v npm &> /dev/null; then
  npm run kairos:production-fixes 2>/dev/null || echo -e "${YELLOW}⚠️  Kairos events failed (non-critical)${NC}"
else
  echo -e "${YELLOW}⚠️  npm not found, skipping Kairos events${NC}"
fi

echo ""
echo -e "${GREEN}✅ All operations complete!${NC}"

