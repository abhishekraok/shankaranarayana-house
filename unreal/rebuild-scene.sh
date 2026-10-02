set -e
cd /d/repos/shankaranarayana-photoreal
B="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
UEC="I:/Epic/UE_5.8/Engine/Binaries/Win64/UnrealEditor-Cmd.exe"; UEE="I:/Epic/UE_5.8/Engine/Binaries/Win64/UnrealEditor.exe"
P="D:/repos/shankaranarayana-photoreal/unreal/Shankaranarayana/Shankaranarayana.uproject"; S="D:/repos/shankaranarayana-photoreal/unreal/scripts"
L=blender/build/claude-ue.log; : > $L
step(){ echo "== $(date +%H:%M:%S) $1" | tee -a $L; }
step lookdev; "$B" -b blender/build/blockout.blend --python-exit-code 1 -P blender/lookdev.py >> $L 2>&1
step export_unreal; "$B" -b blender/build/blockout.blend --python-exit-code 1 -P blender/export_unreal.py >> $L 2>&1
cp blender/build/nav.json blender/build/tour.json blender/build/views.json blender/build/unreal/
step import_scene; "$UEC" "$P" -run=pythonscript -script="$S/import_scene.py" -unattended -nosplash >> $L 2>&1
step materials; "$UEC" "$P" -run=pythonscript -script="$S/materials.py --rebuild" -unattended -nosplash >> $L 2>&1
step build_level; "$UEC" "$P" -run=pythonscript -script="$S/build_level.py" -unattended -nosplash >> $L 2>&1
# The full editor sometimes segfaults while quitting after the script has finished: judge the step by its audit file.
step configure_lumen; A=unreal/Shankaranarayana/Saved/lumen-build-audit.json; rm -f $A; "$UEE" "$P" -ExecutePythonScript="$S/configure_lumen.py" -unattended -nosplash >> $L 2>&1 || true; [ -s $A ]
step finish_game; "$UEC" "$P" -run=pythonscript -script="$S/finish_game.py" -unattended -nosplash >> $L 2>&1
step verify_scene; "$UEC" "$P" -run=pythonscript -script="$S/verify_scene.py" -unattended -nosplash >> $L 2>&1
step done
