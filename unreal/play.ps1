param([string]$Engine = 'I:/Epic/UE_5.8', [switch]$Smoke)
$ErrorActionPreference = 'Stop'
$taskProject = Join-Path $PSScriptRoot 'Shankaranarayana/Shankaranarayana.uproject'
$taskEditor = Join-Path $Engine 'Engine/Binaries/Win64/UnrealEditor.exe'
$taskStandalone = Join-Path $PSScriptRoot 'build/Windows/QuietWalk.exe'
if (Test-Path $taskStandalone) {
    $taskLaunchArgs = @('-windowed', '-ResX=1600', '-ResY=900')
    if ($Smoke) { $taskLaunchArgs += '-WalkSmoke'; $taskLaunchArgs += '-unattended' }
    if ($Smoke) { Start-Process $taskStandalone -ArgumentList $taskLaunchArgs -WindowStyle Hidden }
    else { Start-Process $taskStandalone -ArgumentList $taskLaunchArgs }
    return
}
if (!(Test-Path (Join-Path $PSScriptRoot 'Shankaranarayana/Binaries/Win64/UnrealEditor-QuietWalk.dll'))) {
    throw 'Build QuietWalkEditor first. See unreal/README.md.'
}
$taskArguments = @(('"' + $taskProject + '"'), '-game', '-windowed', '-ResX=1600', '-ResY=900')
if ($Smoke) { $taskArguments += '-WalkSmoke'; $taskArguments += '-unattended' }
# This is the requested interactive game; the user needs its window.
if ($Smoke) { Start-Process $taskEditor -ArgumentList $taskArguments -WindowStyle Hidden }
else { Start-Process $taskEditor -ArgumentList $taskArguments }
