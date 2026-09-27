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
        & "$Engine/Engine/Build/BatchFiles/RunUAT.bat" BuildCookRun "-project=$taskProject" -noP4 -platform=Win64 -clientconfig=Development -target=QuietWalk -build -cook -iterativecooking -map=/Game/Maps/Site -stage -pak -archive "-archivedirectory=$PSScriptRoot/build" -unattended -utf8output
        if ($LASTEXITCODE) { throw 'Windows packaging failed' }
    }
} finally { Pop-Location }
