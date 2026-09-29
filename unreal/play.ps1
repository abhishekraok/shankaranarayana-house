param([string]$Engine = 'I:/Epic/UE_5.8', [switch]$Smoke)
$ErrorActionPreference = 'Stop'
$taskProject = Join-Path $PSScriptRoot 'Shankaranarayana/Shankaranarayana.uproject'
$taskEditor = Join-Path $Engine 'Engine/Binaries/Win64/UnrealEditor.exe'
$taskStandalone = Join-Path $PSScriptRoot 'build/Windows/QuietWalk.exe'
$taskModule = Join-Path $PSScriptRoot 'Shankaranarayana/Binaries/Win64/UnrealEditor-QuietWalk.dll'
# Use the package only when it is newer than the project content (level, scene, tour) and the
# game code; otherwise run the current project in the editor so a stale package never shows.
if (Test-Path $taskStandalone) {
    $taskPaks = Get-ChildItem (Join-Path $PSScriptRoot 'build/Windows/Shankaranarayana/Content/Paks') -File -ErrorAction SilentlyContinue
    $taskPackaged = ($taskPaks | Measure-Object LastWriteTime -Minimum).Minimum
    $taskSources = @(Get-ChildItem (Join-Path $PSScriptRoot 'Shankaranarayana/Content') -File -Recurse) + @(Get-Item $taskModule -ErrorAction SilentlyContinue)
    $taskNewest = $taskSources | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($taskPackaged -and $taskNewest.LastWriteTime -le $taskPackaged) {
        $taskLaunchArgs = @('-windowed', '-ResX=1600', '-ResY=900')
        if ($Smoke) { $taskLaunchArgs += '-WalkSmoke'; $taskLaunchArgs += '-unattended' }
        if ($Smoke) { Start-Process $taskStandalone -ArgumentList $taskLaunchArgs -WindowStyle Hidden }
        else { Start-Process $taskStandalone -ArgumentList $taskLaunchArgs }
        return
    }
    Write-Warning "The packaged game is older than $($taskNewest.FullName). Running the current project in the editor instead; run unreal/build.ps1 -Package to refresh the package."
}
if (!(Test-Path $taskModule)) {
    throw 'Build QuietWalkEditor first. See unreal/README.md.'
}
$taskArguments = @(('"' + $taskProject + '"'), '-game', '-windowed', '-ResX=1600', '-ResY=900')
if ($Smoke) { $taskArguments += '-WalkSmoke'; $taskArguments += '-unattended' }
# This is the requested interactive game; the user needs its window.
if ($Smoke) { Start-Process $taskEditor -ArgumentList $taskArguments -WindowStyle Hidden }
else { Start-Process $taskEditor -ArgumentList $taskArguments }
