#!/usr/bin/env bash
# Full refresh of the game from the web model: merge main, export, Blender blockout, Unreal import,
# materials, level, Lumen, package, smoke test. Run from Git Bash: bash unreal/rebuild-all.sh "what changed"
# Do not commit to main while it runs (build.ps1 re-merges main and checks the scene is current).
# One Unreal or Blender job at a time on this machine; takes about 15 minutes.
set -e
cd "$(dirname "$0")/.."
NODE=C:/Users/abhis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe
BL="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
UEE="I:/Epic/UE_5.8/Engine/Binaries/Win64/UnrealEditor.exe"
P="D:/repos/shankaranarayana-photoreal/unreal/Shankaranarayana/Shankaranarayana.uproject"
echo "== merge $(date +%T)"; [ "$(git ls-files | wc -l)" = "$(git ls-tree -r HEAD --name-only | wc -l)" ] || git reset -q
git merge main -m "Merge main: ${1:-web model update}" 2>&1 | tail -2
echo "== export $(date +%T)"; CANVAS_MODULE=C:/Users/abhis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas "$NODE" blender/export-scene.mjs | tail -1
echo "== blockout $(date +%T)"; "$BL" -b --factory-startup --python-exit-code 1 -P blender/build_blockout.py -- --poses F:/Shankaranarayana/align-poses.json 2>&1 | grep -i "cameras\|Error" | tail -3
echo "== rebuild $(date +%T)"; bash unreal/rebuild-scene.sh 2>&1 | tail -12
echo "== package $(date +%T)"; (cd unreal && powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1 -Package 2>&1 | tail -4)
J=unreal/build/Windows/Shankaranarayana/Saved/WalkReview/smoke.json; rm -f $J
echo "== smoke $(date +%T)"; (cd unreal && powershell -NoProfile -ExecutionPolicy Bypass -File play.ps1 -Smoke 2>&1 | tail -3) || true
for i in $(seq 1 80); do [ -s $J ] && break; ping -n 4 127.0.0.1 >/dev/null; done; cat $J; echo
echo "== done $(date +%T) chain-exit 0"
