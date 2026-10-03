#!/usr/bin/env bash
# Full refresh of the game from the web model: merge main, export, Blender blockout, Unreal import,
# materials, level, Lumen, package, smoke test. Run from Git Bash: bash unreal/rebuild-all.sh "what changed"
# Do not commit to main while it runs (build.ps1 re-merges main and checks the scene is current).
# One Unreal or Blender job at a time on this machine; takes about 15 minutes.
set -euo pipefail
cd "$(dirname "$0")/.."
NODE=C:/Users/abhis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe
BL="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
UEE="I:/Epic/UE_5.8/Engine/Binaries/Win64/UnrealEditor.exe"
P="D:/repos/shankaranarayana-photoreal/unreal/Shankaranarayana/Shankaranarayana.uproject"
echo "== merge $(date +%T)"
if [ "$(git ls-files | wc -l)" != "$(git ls-tree -r HEAD --name-only | wc -l)" ]; then
    echo "Git index differs from HEAD; inspect staged files before rebuilding." >&2
    exit 1
fi
git merge main -m "Merge main: ${1:-web model update}" 2>&1 | tail -2
echo "== export $(date +%T)"; CANVAS_MODULE=C:/Users/abhis/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas "$NODE" blender/export-scene.mjs | tail -1
echo "== blockout $(date +%T)"; "$BL" -b --factory-startup --python-exit-code 1 -P blender/build_blockout.py -- --poses F:/Shankaranarayana/align-poses.json 2>&1 | grep -i "cameras\|Error" | tail -3
echo "== rebuild $(date +%T)"; bash unreal/rebuild-scene.sh 2>&1 | tail -12
package_flags=()
if [ "${REUSE_NATIVE_BINARIES:-0}" = 1 ]; then package_flags+=(-ReuseNativeBinaries); fi
echo "== package $(date +%T)"; (cd unreal && powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1 -Package "${package_flags[@]}" 2>&1 | tail -4)
# The launcher waits, validates fresh reports/exit codes, and checks cold restart itself.
echo "== smoke $(date +%T)"; (cd unreal && powershell -NoProfile -ExecutionPolicy Bypass -File play.ps1 -Smoke 2>&1 | tail -4)
echo "== done $(date +%T) chain-exit 0"
