#!/bin/sh
# PortPilot voor Windows bouwen op Linux. Draaien vanuit de map windows: sh build.sh
# Nodig: Node.js 20+ en makensis (apt install nsis). Wine is niet nodig.
set -e
cd "$(dirname "$0")"
[ -d node_modules ] || npm ci
node build_app.js
rm -rf dist
npx electron-builder --win dir --x64
node stamp_exe.js dist/win-unpacked/PortPilot.exe
npx electron-builder --win portable --x64 --prepackaged dist/win-unpacked
makensis -V2 -DVERSION=$(node -p "require('./package.json').version") installer.nsi
ls -la dist/*.exe
