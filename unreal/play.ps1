param([string]$Engine = 'I:/Epic/UE_5.8', [switch]$Smoke,
    [ValidateRange(30, 1800)][int]$SmokeTimeoutSeconds = 300)
$ErrorActionPreference = 'Stop'
$taskProject = Join-Path $PSScriptRoot 'Shankaranarayana/Shankaranarayana.uproject'
$taskEditor = Join-Path $Engine 'Engine/Binaries/Win64/UnrealEditor.exe'
$taskStandalone = Join-Path $PSScriptRoot 'build/Windows/QuietWalk.exe'
$taskModule = Join-Path $PSScriptRoot 'Shankaranarayana/Binaries/Win64/UnrealEditor-QuietWalk.dll'
$taskExecutable = $taskEditor
$taskArguments = @(('"' + $taskProject + '"'), '-game')
# Use the package only when it is newer than the project content (level, scene, tour) and the
# game code; otherwise run the current project in the editor so a stale package never shows.
if (Test-Path $taskStandalone) {
    $taskPaks = Get-ChildItem (Join-Path $PSScriptRoot 'build/Windows/Shankaranarayana/Content/Paks') -File -ErrorAction SilentlyContinue
    $taskPackaged = ($taskPaks | Measure-Object LastWriteTime -Minimum).Minimum
    $taskSources = @(foreach ($taskFolder in @('Shankaranarayana/Content', 'Shankaranarayana/Config', 'game/Source')) {
        Get-ChildItem (Join-Path $PSScriptRoot $taskFolder) -File -Recurse -ErrorAction SilentlyContinue
    }) + @(Get-Item $taskModule -ErrorAction SilentlyContinue)
    $taskNewest = $taskSources | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($taskPackaged -and $taskNewest.LastWriteTime -le $taskPackaged) {
        $taskExecutable = $taskStandalone
        $taskArguments = @()
    } else {
        Write-Warning "The packaged game is older than $($taskNewest.FullName). Running the current project in the editor instead; run unreal/build.ps1 -Package to refresh the package."
    }
}
if ($taskExecutable -eq $taskEditor -and !(Test-Path $taskModule)) {
    throw 'Build QuietWalkEditor first. See unreal/README.md.'
}
$taskArguments += @('-windowed', '-ResX=1600', '-ResY=900')
if (-not $Smoke) {
    # -UserDir controls ProjectSavedDir in both editor -game and packaged builds.
    # Keep this outside generated projects/packages so their replacement cannot lose progress.
    $taskUserDir = Join-Path $PSScriptRoot 'user-data'
    $taskSaveDir = Join-Path $taskUserDir 'Saved/SaveGames'
    $taskSave = Join-Path $taskSaveDir 'QuietWalk.sav'
    try {
        New-Item -ItemType Directory -Force $taskSaveDir | Out-Null
        if (-not (Test-Path -LiteralPath $taskSave)) {
            $taskLegacy = @(foreach ($taskPath in @(
                'Shankaranarayana/Saved/SaveGames/QuietWalk.sav',
                'build/Windows/Shankaranarayana/Saved/SaveGames/QuietWalk.sav')) {
                $taskCandidate = Join-Path $PSScriptRoot $taskPath
                if (Test-Path -LiteralPath $taskCandidate) { Get-Item -LiteralPath $taskCandidate }
            }) | Sort-Object LastWriteTimeUtc -Descending
            if ($taskLegacy.Count) {
                $taskOrigin = $taskLegacy[0]
                if ($taskOrigin.Length -eq 0) { throw "Existing save is empty: $($taskOrigin.FullName)" }
                $taskTemporary = Join-Path $taskSaveDir ('migration-' + [guid]::NewGuid().ToString('N') + '.tmp')
                Copy-Item -LiteralPath $taskOrigin.FullName -Destination $taskTemporary
                if ((Get-FileHash -LiteralPath $taskOrigin.FullName).Hash -ne (Get-FileHash -LiteralPath $taskTemporary).Hash) {
                    throw 'Save changed during migration; close the other walk and retry.'
                }
                # File.Move fails if the destination appeared meanwhile; never overwrite progress.
                [System.IO.File]::Move($taskTemporary, $taskSave)
                Write-Output "Preserved saved walk from $($taskOrigin.FullName)"
            }
        }
        if ((Test-Path -LiteralPath $taskSave) -and (Get-Item -LiteralPath $taskSave).Length -eq 0) {
            throw "Shared save is empty: $taskSave"
        }
        if (Test-Path -LiteralPath $taskSave) { $null = Get-FileHash -LiteralPath $taskSave }
    } catch {
        throw "Saved-walk continuity could not be verified; game was not started. $($_.Exception.Message)"
    }
    Write-Output "Saved walk: $taskSave"
    # This is the requested interactive game; the user needs its window.
    Start-Process $taskExecutable -ArgumentList ($taskArguments + "-UserDir=`"$taskUserDir`"")
    return
}

# A unique user directory prevents stale reports and isolates smoke saves/config/photos.
if ($taskExecutable -eq $taskStandalone) {
    # Own the actual runtime process, not the package's prerequisite/bootstrap launcher.
    $taskExecutable = Join-Path $PSScriptRoot 'build/Windows/Shankaranarayana/Binaries/Win64/QuietWalk.exe'
    if (-not (Test-Path -LiteralPath $taskExecutable)) { throw "Missing packaged runtime: $taskExecutable" }
}
$taskUserDir = Join-Path $PSScriptRoot ('smoke-runs/' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $taskUserDir | Out-Null
$taskArguments += @("-UserDir=`"$taskUserDir`"", '-unattended')
foreach ($taskStage in @(
    @{Name='smoke'; Flag='-WalkSmoke'; Report='smoke.json'},
    @{Name='resume'; Flag='-WalkSmokeResume'; Report='resume-smoke.json'})) {
    $taskReportPath = Join-Path $taskUserDir ('Saved/WalkReview/' + $taskStage.Report)
    $taskStarted = [DateTime]::UtcNow
    $taskProcess = Start-Process $taskExecutable -ArgumentList ($taskArguments + $taskStage.Flag) -WindowStyle Hidden -PassThru
    $taskWatch = [Diagnostics.Stopwatch]::StartNew()
    $taskTimedOut = $false
    while (-not $taskProcess.WaitForExit(10000)) {
        Write-Output "$($taskStage.Name): running ($([int]$taskWatch.Elapsed.TotalSeconds)s); reports in $taskUserDir"
        if ($taskWatch.Elapsed.TotalSeconds -ge $SmokeTimeoutSeconds) {
            $taskTimedOut = $true
            # This process belongs solely to this bounded smoke run.
            $taskProcess.Kill()
            $null = $taskProcess.WaitForExit(10000)
            break
        }
    }
    $taskProcess.Refresh()
    $taskExit = if ($taskProcess.HasExited) { $taskProcess.ExitCode } else { $null }
    $taskPassed = $false
    $taskReportError = $null
    try {
        $taskReportFile = Get-Item -LiteralPath $taskReportPath
        if ($taskReportFile.LastWriteTimeUtc -lt $taskStarted.AddSeconds(-2)) { throw 'Report predates this stage.' }
        $taskReport = Get-Content -LiteralPath $taskReportPath -Raw | ConvertFrom-Json
        $taskPassed = $taskReport.passed -is [bool] -and $taskReport.passed
        if (-not $taskPassed) { $taskReportError = "Failed checks: $($taskReport.failures -join '; ')" }
    } catch { $taskReportError = $_.Exception.Message }
    @{stage=$taskStage.Name; started_utc=$taskStarted.ToString('o'); executable=$taskExecutable;
      exit_code=$taskExit; timed_out=$taskTimedOut; report_passed=$taskPassed;
      report=$taskReportPath; report_error=$taskReportError} |
        ConvertTo-Json | Set-Content (Join-Path $taskUserDir ($taskStage.Name + '-process.json'))
    Write-Output "$($taskStage.Name): exit=$taskExit; timed_out=$taskTimedOut; report_passed=$taskPassed; $taskReportPath"
    if ($taskTimedOut -or $null -eq $taskExit -or $taskExit -ne 0 -or -not $taskPassed) {
        throw "$($taskStage.Name) failed. $taskReportError See $taskUserDir"
    }
}
Write-Output "Smoke and cold-restart checks passed: $taskUserDir"
