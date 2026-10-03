param(
    [string]$Engine = 'I:/Epic/UE_5.8',
    [string]$Poses = 'F:/Shankaranarayana/align-poses.json',
    [int]$Width = 768,
    [double]$Delay = 3,
    # Capture the scene as exported, without merging a main that has moved on since.
    [switch]$NoMerge
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
Push-Location $taskRoot
try {
    if ((git branch --show-current) -ne 'photoreal') { throw 'Run this from the photoreal branch.' }
    if (-not $NoMerge) { git merge main }
    if ($LASTEXITCODE) { throw 'Resolve the merge first; use main for conflicts in dist/ and tests/.' }
    python unreal/scripts/check_model_source.py
    if ($LASTEXITCODE) { throw 'Generated scene is stale.' }
    $mainHash = if ($NoMerge) { git rev-parse --short HEAD } else { git rev-parse --short main }
    $reviewRoot = Join-Path $taskRoot "blender/build/sheets-$mainHash"
    $reviewOut = Join-Path $reviewRoot ('unreal-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    New-Item -ItemType Directory -Force $reviewOut | Out-Null
    Copy-Item -LiteralPath $Poses -Destination "$reviewOut/poses.json"
    $revision = @{main=(git rev-parse main); photoreal=(git rev-parse HEAD); scene=(Get-FileHash blender/build/scene.json -Algorithm SHA256).Hash; map=(Get-FileHash unreal/Shankaranarayana/Content/Maps/Site.umap -Algorithm SHA256).Hash}
    $revision.uncommitted_edits = [bool](git status --porcelain)
    $revision.scripts = @{}
    foreach ($source in @('blender/export_unreal.py','unreal/scripts/import_scene.py','unreal/scripts/configure_lumen.py','unreal/scripts/capture_poses.py','unreal/scripts/materials.py','unreal/scripts/build_level.py','unreal/scripts/finish_game.py','unreal/scripts/lighting.py')) {
        $revision.scripts[$source] = (Get-FileHash $source -Algorithm SHA256).Hash
    }
    if (Test-Path blender/build/unreal/parts.json) { $revision.native_parts = Get-Content blender/build/unreal/parts.json -Raw | ConvertFrom-Json }
    $revision | ConvertTo-Json -Depth 8 | Set-Content "$reviewOut/revision.json"
    # Unreal tokenizes this command itself; use normalized local paths.
    if ($reviewOut -match '\s') { throw 'The Unreal script runner requires a checkout path without spaces.' }
    $pythonCommand = "$PSScriptRoot/scripts/capture_poses.py --poses $reviewOut/poses.json --out $reviewOut --width $Width --delay $Delay"
    $pythonCommand = $pythonCommand.Replace('\', '/')
    $captureArgs = @("`"$PSScriptRoot/Shankaranarayana/Shankaranarayana.uproject`"", "-ExecutePythonScript=`"$pythonCommand`"", '-windowed', '-ResX=1280', '-ResY=720', '-unattended', '-nosplash', "-abslog=`"$reviewOut/editor.log`"")
    $captureProcess = Start-Process "$Engine/Engine/Binaries/Win64/UnrealEditor.exe" -ArgumentList $captureArgs -WindowStyle Hidden -PassThru
    while (-not $captureProcess.WaitForExit(10000)) {
        if (Test-Path "$reviewOut/capture.json") {
            $progress = Get-Content "$reviewOut/capture.json" -Raw | ConvertFrom-Json
            Write-Output "Captured $($progress.captured)/$($progress.expected) poses"
        }
    }
    $captureProcess.Refresh()
    $captureExit = $captureProcess.ExitCode
    @{exit_code=$captureExit; clean_exit=($null -ne $captureExit -and $captureExit -eq 0);
      finished_utc=[DateTime]::UtcNow.ToString('o'); log="$reviewOut/editor.log"} |
        ConvertTo-Json | Set-Content "$reviewOut/process.json"
    Write-Output "Capture process exit: $captureExit; details: $reviewOut/process.json"
    $result = Get-Content "$reviewOut/capture.json" -Raw | ConvertFrom-Json
    if (-not $result.complete -or $result.captured -ne $result.expected) { throw "Incomplete capture: $reviewOut" }
    $captureWarning = ''
    if ($null -eq $captureExit -or $captureExit -ne 0) {
        $captureWarning = "Images completed, but the editor exited abnormally (exit $captureExit). See process.json and editor.log."
        Write-Warning $captureWarning
    }
    python blender/contact_sheet.py $reviewOut
    if ($LASTEXITCODE) { throw 'Contact sheet assembly failed.' }
    $relative = Split-Path $reviewOut -Leaf
    "# Latest full-pose review`n`nMain: $mainHash`n`n$($result.captured)/$($result.expected) images captured. Editor exit: $captureExit. $captureWarning`n`n[Process status]($relative/process.json)`n`n[Searchable overview]($relative/index.html)`n`n[All sheets]($relative/REVIEW.md)" | Set-Content "$reviewRoot/REVIEW.md"
    Write-Output "Full review: $reviewOut/index.html"
} finally { Pop-Location }
