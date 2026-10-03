param([string]$Engine = 'I:/Epic/UE_5.8', [switch]$Package, [switch]$ReuseNativeBinaries)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
Push-Location $taskRoot
try {
    if ((git branch --show-current) -ne 'photoreal') { throw 'Run this from the photoreal branch.' }
    git merge main
    if ($LASTEXITCODE) { throw 'Resolve the merge first; use main for conflicts in dist/ and tests/.' }
    py -3 unreal/scripts/check_model_source.py
    if ($LASTEXITCODE) { throw 'Refresh the generated scene before building.' }
    $taskProject = Join-Path $PSScriptRoot 'Shankaranarayana/Shankaranarayana.uproject'
    if ($ReuseNativeBinaries) {
        # Asset-only look-dev can be cooked without an installed C++ toolchain.
        # Refuse to reuse binaries when authored native source has changed.
        $taskNative = @('UnrealEditor-QuietWalk.dll', 'QuietWalk.exe') | ForEach-Object {
            $taskBinary = Join-Path $PSScriptRoot "Shankaranarayana/Binaries/Win64/$_"
            if (-not (Test-Path $taskBinary)) { throw "Missing native binary: $taskBinary" }
            Get-Item $taskBinary
        }
        $taskOldestBinary = ($taskNative | Measure-Object LastWriteTime -Minimum).Minimum
        $taskSourceRoot = Join-Path $PSScriptRoot 'game/Source'
        $taskInstalledRoot = Join-Path $PSScriptRoot 'Shankaranarayana/Source'
        $taskSources = @(Get-ChildItem $taskSourceRoot -File -Recurse)
        $taskSourceNames = @($taskSources | ForEach-Object { $_.FullName.Substring($taskSourceRoot.Length) } | Sort-Object)
        $taskInstalledNames = @(Get-ChildItem $taskInstalledRoot -File -Recurse | ForEach-Object { $_.FullName.Substring($taskInstalledRoot.Length) } | Sort-Object)
        if (Compare-Object $taskSourceNames $taskInstalledNames) {
            throw 'Native source files were added or removed; compile before packaging.'
        }
        foreach ($taskSource in $taskSources) {
            $taskInstalled = Join-Path $PSScriptRoot ('Shankaranarayana/Source' + $taskSource.FullName.Substring($taskSourceRoot.Length))
            if (-not (Test-Path $taskInstalled) -or
                (Get-FileHash $taskSource.FullName).Hash -ne (Get-FileHash $taskInstalled).Hash -or
                $taskSource.LastWriteTime -gt $taskOldestBinary) {
                throw "Native source needs compilation: $($taskSource.FullName)"
            }
        }
    }
    py -3 unreal/scripts/install_game.py
    if ($LASTEXITCODE) { throw 'Game source installation failed' }
    if (-not $ReuseNativeBinaries) {
        & "$Engine/Engine/Build/BatchFiles/Build.bat" QuietWalkEditor Win64 Development $taskProject -WaitMutex -NoHotReloadFromIDE
        if ($LASTEXITCODE) { throw 'Editor module build failed' }
    }
    if ($Package) {
        $lightingLog = Join-Path $PSScriptRoot 'Shankaranarayana/Saved/Logs/lighting-preflight.log'
        $taskLightingScript = (Join-Path $PSScriptRoot 'scripts/verify_lighting.py').Replace('\', '/')
        $auditArgs = @("`"$taskProject`"", '-run=pythonscript', "-script=`"$taskLightingScript`"", '-unattended', '-nosplash', "-abslog=`"$lightingLog`"")
        $audit = Start-Process "$Engine/Engine/Binaries/Win64/UnrealEditor-Cmd.exe" -ArgumentList $auditArgs -WindowStyle Hidden -PassThru
        $audit.WaitForExit()
        if ($audit.ExitCode -or -not (Select-String -LiteralPath $lightingLog -Pattern 'LIGHTING_AUDIT_PASSED:' -Quiet)) {
            throw "Lighting failed after reload. Run finish_game.py; see $lightingLog"
        }
        [string[]]$taskBuildFlags = if ($ReuseNativeBinaries) { @('-skipbuild', '-nocompileeditor') } else { @('-build') }
        & "$Engine/Engine/Build/BatchFiles/RunUAT.bat" BuildCookRun "-project=$taskProject" -noP4 -platform=Win64 -clientconfig=Development -target=QuietWalk @taskBuildFlags -cook -iterativecooking -map=/Game/Maps/Site -stage -pak -archive "-archivedirectory=$PSScriptRoot/build" -unattended -utf8output
        if ($LASTEXITCODE) { throw 'Windows packaging failed' }
    }
} finally { Pop-Location }
