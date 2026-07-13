# Create symbolic link to AE ScriptUI Panels
# 需要同时链接两个资源：
# 1. 文件软连接：WorkflowAssist.jsx → 脚本文件
# 2. 目录连接：WorkflowAssist/ → 预设目录
# 因为脚本通过 $.fileName 获取路径，拼接 /WorkflowAssist 找预设目录

param(
    [string]$AeVersion = "2023"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$sourceFile = Join-Path $root "dist\WorkflowAssist.jsx"
$sourceDir = Join-Path $root "dist\WorkflowAssist"

if (-not (Test-Path -LiteralPath $sourceFile)) {
    throw "Source file not found: $sourceFile"
}

$aePath = "C:\Program Files\Adobe\Adobe After Effects $AeVersion\Support Files\Scripts\ScriptUI Panels"
if (-not (Test-Path -LiteralPath $aePath)) {
    throw "AE ScriptUI Panels directory not found: $aePath"
}

# Step 1: Create symbolic link for .jsx file
$linkPath = Join-Path $aePath "WorkflowAssist.jsx"
if (Test-Path -LiteralPath $linkPath) {
    $item = Get-Item -LiteralPath $linkPath
    if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
        Write-Host "File symlink already exists: $linkPath"
    } else {
        Remove-Item -LiteralPath $linkPath -Force
        New-Item -ItemType SymbolicLink -Path $linkPath -Target $sourceFile | Out-Null
        Write-Host "Created file symlink: $linkPath"
    }
} else {
    New-Item -ItemType SymbolicLink -Path $linkPath -Target $sourceFile | Out-Null
    Write-Host "Created file symlink: $linkPath"
}

# Step 2: Create directory junction for WorkflowAssist/ presets
$junctionPath = Join-Path $aePath "WorkflowAssist"
if (Test-Path -LiteralPath $junctionPath) {
    $item = Get-Item -LiteralPath $junctionPath
    if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
        Write-Host "Dir junction already exists: $junctionPath"
    } else {
        Write-Host "Warning: $junctionPath exists but is not a junction. Skipping."
    }
} else {
    cmd /c mklink /J "$junctionPath" "$sourceDir" | Out-Null
    Write-Host "Created dir junction: $junctionPath -> $sourceDir"
}

Write-Host ""
Write-Host "Done. Restart AE to load the script."
