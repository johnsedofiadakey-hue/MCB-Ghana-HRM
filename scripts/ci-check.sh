#!/bin/bash
set -e

echo "Running CI Checks..."

# 1. Check for unresolved merge conflict markers
echo "Checking for merge conflict markers..."
if grep -R "^<<<<<<< \\|^=======$\\|^>>>>>>> " --exclude-dir=.git --exclude-dir=node_modules . ; then
  echo "❌ Found unresolved merge conflict markers!"
  exit 1
else
  echo "✅ No merge conflict markers found."
fi

# 2. Server Build
echo "Building server..."
cd server
npm run build
cd ..
echo "✅ Server build passed."

# 3. Client Build
echo "Building client..."
cd client
npm run build
cd ..
echo "✅ Client build passed."

echo "🎉 All CI checks passed!"
