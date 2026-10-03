param([ValidateRange(600, 18000)][int]$Frames = 3600,
      [ValidateRange(30, 1800)][int]$TimeoutSeconds = 180)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskProcess = $null
Push-Location $taskRoot
try {
    if ((git branch --show-current) -ne 'photoreal') { throw 'Run this from the photoreal branch.' }
    git merge main
    if ($LASTEXITCODE) { throw 'Resolve the main merge first.' }
    py -3 unreal/scripts/check_model_source.py
    if ($LASTEXITCODE) { throw 'Generated scene is stale.' }
    $taskExecutable = Join-Path $PSScriptRoot 'build/Windows/Shankaranarayana/Binaries/Win64/QuietWalk.exe'
    if (-not (Test-Path -LiteralPath $taskExecutable)) { throw 'Build the standalone package first.' }
    $taskPaks = @(Get-ChildItem (Join-Path $PSScriptRoot 'build/Windows/Shankaranarayana/Content/Paks') -File)
    $taskPackaged = ($taskPaks | Measure-Object LastWriteTime -Minimum).Minimum
    $taskSources = @(foreach ($taskFolder in @('Shankaranarayana/Content', 'Shankaranarayana/Config', 'game/Source')) {
        Get-ChildItem (Join-Path $PSScriptRoot $taskFolder) -File -Recurse
    }) + @(Get-Item (Join-Path $PSScriptRoot 'Shankaranarayana/Binaries/Win64/UnrealEditor-QuietWalk.dll'))
    $taskNewest = $taskSources | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $taskPackaged -or $taskNewest.LastWriteTime -gt $taskPackaged) {
        throw 'Package is stale; run unreal/build.ps1 -Package first.'
    }
    $taskNativeSources = @(foreach ($taskFolder in @('game/Source', 'Shankaranarayana/Source')) {
        Get-ChildItem (Join-Path $PSScriptRoot $taskFolder) -File -Recurse
    })
    $taskNewestNative = $taskNativeSources | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($taskNewestNative.LastWriteTime -gt (Get-Item -LiteralPath $taskExecutable).LastWriteTime) {
        throw 'Packaged native executable is stale; compile and package first.'
    }
    $taskOut = Join-Path $PSScriptRoot ('profile-runs/' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force $taskOut | Out-Null
    $taskStarted = [DateTime]::UtcNow
    # Begin after engine initialization. Boot -csvCaptureFrames reproduced a
    # crash-reporting-thread shutdown failure on this UE build.
    $taskArgs = @('-windowed', '-unattended', '-ExitAfterCsvProfiling', '-csvGpuStats',
        "-UserDir=`"$taskOut`"", "-abslog=`"$taskOut/game.log`"",
        "-ExecCmds=`"t.IdleWhenNotForeground 0,CsvProfile FRAMES=$Frames`"")
    $taskProcess = Start-Process $taskExecutable -ArgumentList $taskArgs -WindowStyle Hidden -PassThru
    $taskWatch = [Diagnostics.Stopwatch]::StartNew()
    $taskTimedOut = $false
    while (-not $taskProcess.WaitForExit(10000)) {
        Write-Output "Runtime profiling: $([int]$taskWatch.Elapsed.TotalSeconds)s; $taskOut"
        if ($taskWatch.Elapsed.TotalSeconds -ge $TimeoutSeconds) {
            $taskTimedOut = $true
            $taskProcess.Kill()
            $null = $taskProcess.WaitForExit(10000)
            break
        }
    }
    $taskProcess.Refresh()
    @{executable=$taskExecutable; started_utc=$taskStarted.ToString('o');
      exit_code=$taskProcess.ExitCode; timed_out=$taskTimedOut;
      duration_seconds=$taskWatch.Elapsed.TotalSeconds; capture_frames=$Frames;
      main=(git rev-parse main); photoreal=(git rev-parse HEAD);
      uncommitted_edits=[bool](git status --porcelain)} |
        ConvertTo-Json | Set-Content (Join-Path $taskOut 'process.json')
    if ($taskTimedOut -or $null -eq $taskProcess.ExitCode -or $taskProcess.ExitCode -ne 0) {
        throw "Runtime profiling failed; retained reports: $taskOut"
    }
    py -3 unreal/scripts/summarize_runtime.py $taskOut
    if ($LASTEXITCODE) { throw "Runtime CSV validation failed: $taskOut" }
    Write-Output "Runtime profile: $taskOut/summary.json"
} finally {
    try {
        if ($null -ne $taskProcess) {
            $taskProcess.Refresh()
            if (-not $taskProcess.HasExited) {
                # Normal interruption/error cleanup owns only this launched child.
                $taskProcess.Kill()
                $null = $taskProcess.WaitForExit(10000)
            }
        }
    } finally { Pop-Location }
}
