# Scan E:\code for SQLite database files and build a DBX-friendly inventory.
# Usage:
#   .\scripts\scan-sqlite-databases.ps1
#   .\scripts\scan-sqlite-databases.ps1 -Root "D:\projects" -OpenOutputFolder

param(
    [string]$Root = "E:\code",
    [string]$OutputDir = "$env:USERPROFILE\Documents\database-inventory",
    [switch]$IncludeWranglerInternal,
    [switch]$OpenOutputFolder
)

$ErrorActionPreference = "Stop"

$extensions = @("*.sqlite", "*.sqlite3", "*.db")
$excludeDirNames = @(
    "node_modules",
    ".git",
    ".svn",
    ".hg",
    "vendor",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".cache",
    "__pycache__",
    ".venv",
    "venv",
    ".tox",
    "target",
    "bin",
    "obj",
    "packages",
    ".wrangler\state\v3\kv"
)

function Test-ExcludedPath {
    param([string]$Path)

    $normalized = $Path.Replace("/", "\")
    foreach ($name in $excludeDirNames) {
        if ($normalized -match [regex]::Escape("\$name\")) {
            return $true
        }
    }
    return $false
}

function Get-RelativePath {
    param(
        [string]$BasePath,
        [string]$TargetPath
    )

    $base = [System.IO.Path]::GetFullPath($BasePath).TrimEnd('\')
    $target = [System.IO.Path]::GetFullPath($TargetPath)

    if ($target.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $target.Substring($base.Length).TrimStart('\')
    }

    return $target
}

function Get-ProjectName {
    param(
        [string]$FullPath,
        [string]$RootPath
    )

    $relative = Get-RelativePath -BasePath $RootPath -TargetPath $FullPath
    $parts = $relative.Split([char[]]@('\', '/'), [StringSplitOptions]::RemoveEmptyEntries)

    if ($parts.Count -eq 0) {
        return [System.IO.Path]::GetFileName($RootPath)
    }

    return $parts[0]
}

function Get-ProjectHint {
    param(
        [string]$FullPath,
        [string]$RootPath,
        [string]$ProjectName
    )

    $relative = Get-RelativePath -BasePath $RootPath -TargetPath $FullPath
    $dir = Split-Path $relative -Parent

    if ([string]::IsNullOrWhiteSpace($dir) -or $dir -eq ".") {
        return $ProjectName
    }

    return "$ProjectName / $dir"
}

function Get-DatabaseKind {
    param([string]$FullPath)

    $normalized = $FullPath.Replace("/", "\").ToLowerInvariant()

    if ($normalized -match "\\\.wrangler\\state\\v3\\d1\\") {
        if ((Split-Path $FullPath -Leaf) -eq "metadata.sqlite") {
            return "wrangler-d1-metadata"
        }
        return "wrangler-d1"
    }

    if ($normalized -match "\\\.wrangler\\state\\v3\\") {
        return "wrangler-internal"
    }

    return "sqlite"
}

function Test-UsefulDatabase {
    param(
        [string]$Kind,
        [switch]$IncludeWranglerInternal
    )

    if ($Kind -eq "wrangler-d1") {
        return $true
    }

    if ($Kind -eq "sqlite") {
        return $true
    }

    if ($IncludeWranglerInternal -and $Kind -ne "wrangler-d1-metadata") {
        return $true
    }

    return $false
}

if (-not (Test-Path $Root)) {
    throw "Scan root does not exist: $Root"
}

Write-Host "Scanning $Root for SQLite databases..." -ForegroundColor Cyan

$allFiles = @()
foreach ($pattern in $extensions) {
    $allFiles += Get-ChildItem -Path $Root -Filter $pattern -File -Recurse -ErrorAction SilentlyContinue
}

$files = $allFiles |
    Where-Object { -not (Test-ExcludedPath $_.FullName) } |
    Sort-Object FullName -Unique

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$inventory = foreach ($file in $files) {
    $project = Get-ProjectName -FullPath $file.FullName -RootPath $Root
    $kind = Get-DatabaseKind -FullPath $file.FullName

    [PSCustomObject]@{
        ProjectName = $project
        ProjectHint = Get-ProjectHint -FullPath $file.FullName -RootPath $Root -ProjectName $project
        DatabaseName = $file.Name
        Kind = $kind
        FullPath = $file.FullName
        SizeKB = [math]::Round($file.Length / 1KB, 1)
        LastWriteTime = $file.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        RecommendedForDbx = (Test-UsefulDatabase -Kind $kind -IncludeWranglerInternal:$IncludeWranglerInternal)
    }
}

$dbxList = @($inventory | Where-Object { $_.RecommendedForDbx } | Sort-Object ProjectName, FullPath)
$skipped = @($inventory | Where-Object { -not $_.RecommendedForDbx } | Sort-Object ProjectName, FullPath)

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$csvPath = Join-Path $OutputDir "sqlite-inventory_$timestamp.csv"
$mdPath = Join-Path $OutputDir "sqlite-inventory_$timestamp.md"
$latestCsvPath = Join-Path $OutputDir "sqlite-inventory-latest.csv"
$latestMdPath = Join-Path $OutputDir "sqlite-inventory-latest.md"
$dbxCsvPath = Join-Path $OutputDir "sqlite-inventory-dbx_$timestamp.csv"
$dbxLatestCsvPath = Join-Path $OutputDir "sqlite-inventory-dbx-latest.csv"

$inventory | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
$inventory | Export-Csv -Path $latestCsvPath -NoTypeInformation -Encoding UTF8
$dbxList | Export-Csv -Path $dbxCsvPath -NoTypeInformation -Encoding UTF8
$dbxList | Export-Csv -Path $dbxLatestCsvPath -NoTypeInformation -Encoding UTF8

$grouped = $dbxList | Group-Object ProjectName | Sort-Object Name

$md = @()
$md += "# SQLite Database Inventory"
$md += ""
$md += "- Root: $Root"
$md += "- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$md += "- Total scanned: $($inventory.Count)"
$md += "- Recommended for DBX: $($dbxList.Count)"
$md += "- Skipped internal/metadata files: $($skipped.Count)"
$md += ""
$md += "## DBX Quick Add"
$md += ""
$md += "1. Open DBX"
$md += "2. Add Connection -> SQLite"
$md += "3. Use each row below:"
$md += '   - **Connection name** = ProjectHint'
$md += '   - **Database file** = FullPath'
$md += '4. Prefer files with Kind = wrangler-d1 for Cloudflare D1 local data'
$md += ''
$md += 'Tip: stop wrangler pages dev before editing a local D1 file in DBX.'
$md += ""
$md += "## Summary"
$md += ""
$md += "| Project | Count |"
$md += "| --- | ---: |"

foreach ($group in $grouped) {
    $md += "| $($group.Name) | $($group.Count) |"
}

$md += ""
$md += "## Full List"
$md += ""

foreach ($group in $grouped) {
    $md += "### $($group.Name)"
    $md += ""
    $md += "| DBX Name | Kind | File | Size (KB) | Updated | Full Path |"
    $md += "| --- | --- | --- | ---: | --- | --- |"

    foreach ($item in ($group.Group | Sort-Object FullPath)) {
        $md += "| $($item.ProjectHint) | $($item.Kind) | $($item.DatabaseName) | $($item.SizeKB) | $($item.LastWriteTime) | $($item.FullPath) |"
    }

    $md += ""
}

if ($skipped.Count -gt 0) {
    $md += "## Skipped (Wrangler internal / metadata)"
    $md += ""
    $md += "| Project | Kind | File | Full Path |"
    $md += "| --- | --- | --- | --- |"

    foreach ($item in $skipped) {
        $md += "| $($item.ProjectName) | $($item.Kind) | $($item.DatabaseName) | $($item.FullPath) |"
    }

    $md += ""
}

$mdText = $md -join "`r`n"
Set-Content -Path $mdPath -Value $mdText -Encoding UTF8
Set-Content -Path $latestMdPath -Value $mdText -Encoding UTF8

Write-Host ""
Write-Host "Found $($inventory.Count) database file(s); $($dbxList.Count) recommended for DBX." -ForegroundColor Green
Write-Host ""
Write-Host "Output files:"
Write-Host "  All CSV : $csvPath"
Write-Host "  DBX CSV : $dbxCsvPath"
Write-Host "  MD      : $mdPath"
Write-Host "  Latest DBX CSV: $dbxLatestCsvPath"
Write-Host "  Latest MD     : $latestMdPath"
Write-Host ""

if ($dbxList.Count -gt 0) {
    Write-Host "DBX recommended:" -ForegroundColor Yellow
    $dbxList |
        Select-Object ProjectHint, Kind, DatabaseName, SizeKB, FullPath |
        Format-Table -AutoSize
} else {
    Write-Host "No SQLite files found under $Root." -ForegroundColor Yellow
    Write-Host "Tip: run local Wrangler/D1 first if you expect .wrangler databases." -ForegroundColor DarkYellow
}

if ($OpenOutputFolder) {
    Start-Process explorer.exe $OutputDir
}
