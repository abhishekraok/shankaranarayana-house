param([string]$Engine = 'I:/Epic/UE_5.8', [switch]$Package)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
Push-Location $taskRoot
try {
    if ((git branch --show-current) -ne 'photoreal') { throw 'Run this from the photoreal branch.' }
    git merge main
    if ($LASTEXITCODE) { throw 'Resolve the merge first; use main for conflicts in dist/ and tests/.' }
    python unreal/scripts/check_model_source.py
    if ($LASTEXITCODE) { throw 'Refresh the generated scene before building.' }
    python unreal/scripts/install_game.py
    if ($LASTEXITCODE) { throw 'Game source installation failed' }
    $taskProject = Join-Path $PSScriptRoot 'Shankaranarayana/Shankaranarayana.uproject'
    & "$Engine/Engine/Build/BatchFiles/Build.bat" QuietWalkEditor Win64 Development $taskProject -WaitMutex -NoHotReloadFromIDE
    if ($LASTEXITCODE) { throw 'Editor module build failed' }
    if ($Package) {
        $lightingLog = Join-Path $PSScriptRoot 'Shankaranarayana/Saved/Logs/lighting-preflight.log'
        $auditArgs = @("`"$taskProject`"", '-run=pythonscript', "-script=`"$PSScriptRoot/scripts/verify_lighting.py`"", '-unattended', '-nosplash', "-abslog=`"$lightingLog`"")
        $audit = Start-Process "$Engine/Engine/Binaries/Win64/UnrealEditor-Cmd.exe" -ArgumentList $auditArgs -WindowStyle Hidden -PassThru
        $audit.WaitForExit()
        if ($audit.ExitCode -or -not (Select-String -LiteralPath $lightingLog -Pattern 'LIGHTING_AUDIT_PASSED:' -Quiet)) {
            throw "Lighting failed after reload. Run finish_game.py; see $lightingLog"
        }
        & "$Engine/Engine/Build/BatchFiles/RunUAT.bat" BuildCookRun "-project=$taskProject" -noP4 -platform=Win64 -clientconfig=Development -target=QuietWalk -build -cook -iterativecooking -map=/Game/Maps/Site -stage -pak -archive "-archivedirectory=$PSScriptRoot/build" -unattended -utf8output
        if ($LASTEXITCODE) { throw 'Windows packaging failed' }
    }
} finally { Pop-Location }
