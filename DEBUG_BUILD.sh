#!/bin/bash
# Debug build issues
# Check what's in the files

cd services/kairos-event-gateway

echo "📋 Checking package.json..."
cat package.json | head -20

echo ""
echo "📋 Checking tsconfig.json..."
cat tsconfig.json

echo ""
echo "📋 Checking Dockerfile..."
cat Dockerfile

echo ""
echo "📋 Checking src/index.ts (first 50 lines)..."
head -50 src/index.ts

echo ""
echo "📋 Testing TypeScript compilation locally..."
if command -v npm &> /dev/null; then
    npm install
    npm run build 2>&1 | head -50
else
    echo "npm not available - skipping local build test"
fi

