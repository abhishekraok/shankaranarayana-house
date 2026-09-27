# A quiet walk

Run `unreal/play.cmd` or `unreal/build/Windows/QuietWalk.exe` to open the native game.
The launcher prefers the standalone build; if absent, it uses the generated project
and compiled editor module. No browser or photo server is needed.

- Begin / Continue, pause, settings, controls, save & quit.
- Walk with WASD and mouse, or the controller sticks. Shift / right trigger walks faster.
- E / A notices a nearby place. J / Y opens the seven-place journal; discovered places
  can be revisited. Guidance can be disabled. There is no timer or required order.
- Escape / Menu pauses. Return to the entrance is available if you get stuck.
- Sensitivity, FOV, invert look, guidance, volume, graphics and display settings persist.
- No jump, camera bob or motion blur. Position saves every 20 seconds on safe ground,
  when noticing a place and on exit. A new walk asks before replacing progress.

## Rebuild

The authored runtime is `game/Source`; `scripts/install_game.py` copies it into the
ignored project. Do not edit the generated copy. Requires Unreal 5.8 and MSVC 14.38+.

```powershell
python unreal/scripts/create_project.py
python unreal/scripts/install_game.py
python unreal/scripts/make_audio.py
& 'I:/Epic/UE_5.8/Engine/Build/BatchFiles/Build.bat' QuietWalkEditor Win64 Development "$PWD/unreal/Shankaranarayana/Shankaranarayana.uproject" -WaitMutex
```

After the existing scene export/import/materials/level pipeline, run `finish_game.py`
with `UnrealEditor-Cmd -run=pythonscript -script=<absolute script path>` to apply the
game mode, adaptive exposure and audio. Re-run it after every level rebuild.

`unreal/play.ps1 -Smoke` runs native runtime checks and UI screenshots, then exits.
It uses the separate `QuietWalkSmoke` save slot. Results are in `Saved/WalkReview`
under the generated project, or `build/Windows/Shankaranarayana` for the standalone
game. Regular saves are in that same game's `Saved/SaveGames/QuietWalk.sav`.
Launch the executable with `-WalkSmokeResume` after a smoke run to verify persistence
in a new process; its result is `Saved/WalkReview/resume-smoke.json`.

All imported assets, screenshots, synthesized audio and binaries remain ignored.
Only text source and build scripts belong in Git. Audio is generated locally from
noise and tones; it is atmospheric, not a recording of the actual site.

`unreal/build.ps1 -Package` builds the runtime and cooks a standalone Windows copy
under ignored `unreal/build/Windows`. It uses the existing generated scene; rebuild
that scene separately when geometry changes. Keep the whole Windows folder together.
