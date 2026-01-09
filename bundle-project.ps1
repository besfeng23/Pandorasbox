# PowerShell script to bundle the Pandorasbox project into a zip file
# Excludes node_modules, build artifacts, and other unnecessary files

param(
    [string]$OutputPath = ".",
    [string]$ProjectName = "Pandorasbox"
)

$ErrorActionPreference = "Stop"

# Get the script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Join-Path $ScriptDir $ProjectName

if (-not (Test-Path $ProjectRoot)) {
    Write-Host "Error: Project directory '$ProjectRoot' not found!" -ForegroundColor Red
    exit 1
}

# Create output directory if it doesn't exist
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

# Generate timestamp for zip filename
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ZipFileName = "${ProjectName}-bundle-${Timestamp}.zip"
$ZipPath = Join-Path $OutputPath $ZipFileName

Write-Host "`n=== Bundling Pandorasbox Project ===" -ForegroundColor Cyan
Write-Host "Source: $ProjectRoot" -ForegroundColor Gray
Write-Host "Output: $ZipPath" -ForegroundColor Gray
Write-Host ""

# Define exclusion patterns (based on .gitignore and common build artifacts)
$ExcludePatterns = @(
    "node_modules",
    ".next",
    "out",
    "build",
    ".pnp",
    ".pnp.*",
    ".yarn",
    "coverage",
    ".DS_Store",
    "*.pem",
    "npm-debug.log*",
    "yarn-debug.log*",
    "yarn-error.log*",
    ".pnpm-debug.log*",
    ".vercel",
    "*.tsbuildinfo",
    ".genkit",
    ".env*",
    "firebase-debug.log",
    "firestore-debug.log",
    "service-account.json",
    ".cursor",
    "TECHNICAL_DESIGN.md"
)

# Function to check if a path should be excluded
function Should-Exclude {
    param([string]$Path)
    
    $RelativePath = $Path.Replace($ProjectRoot, "").TrimStart("\", "/")
    
    foreach ($Pattern in $ExcludePatterns) {
        # Handle wildcard patterns
        if ($Pattern -like "*.*") {
            $WildcardPattern = $Pattern -replace '\*', '.*'
            if ($RelativePath -match $WildcardPattern) {
                return $true
            }
        }
        # Handle directory patterns
        elseif ($Pattern -notlike "*.*") {
            if ($RelativePath -like "*\$Pattern\*" -or $RelativePath -like "*\$Pattern" -or $RelativePath -eq $Pattern) {
                return $true
            }
        }
    }
    
    return $false
}

# Collect all files to include
Write-Host "Scanning files..." -ForegroundColor Yellow
$FilesToInclude = @()
$FileCount = 0
$SkippedCount = 0

Get-ChildItem -Path $ProjectRoot -Recurse -File | ForEach-Object {
    $FileCount++
    if (-not (Should-Exclude $_.FullName)) {
        $FilesToInclude += $_
    } else {
        $SkippedCount++
        Write-Host "  Excluding: $($_.FullName.Replace($ProjectRoot, '').TrimStart('\'))" -ForegroundColor DarkGray
    }
}

Write-Host "`nFound $FileCount files total" -ForegroundColor Gray
Write-Host "Including $($FilesToInclude.Count) files" -ForegroundColor Green
Write-Host "Excluding $SkippedCount files" -ForegroundColor DarkGray
Write-Host ""

# Create zip file
Write-Host "Creating zip archive..." -ForegroundColor Yellow

try {
    # Use .NET compression for better compatibility
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    
    # Remove existing zip if it exists
    if (Test-Path $ZipPath) {
        Remove-Item $ZipPath -Force
    }
    
    $Zip = [System.IO.Compression.ZipFile]::Open($ZipPath, [System.IO.Compression.ZipArchiveMode]::Create)
    
    $IncludedCount = 0
    foreach ($File in $FilesToInclude) {
        $RelativePath = $File.FullName.Replace($ProjectRoot, "").TrimStart("\", "/")
        $Entry = $Zip.CreateEntry($RelativePath)
        
        $FileStream = [System.IO.File]::OpenRead($File.FullName)
        $EntryStream = $Entry.Open()
        $FileStream.CopyTo($EntryStream)
        
        $FileStream.Close()
        $EntryStream.Close()
        
        $IncludedCount++
        if ($IncludedCount % 100 -eq 0) {
            Write-Progress -Activity "Bundling files" -Status "Added $IncludedCount of $($FilesToInclude.Count) files" -PercentComplete (($IncludedCount / $FilesToInclude.Count) * 100)
        }
    }
    
    $Zip.Dispose()
    Write-Progress -Activity "Bundling files" -Completed
    
    # Get zip file size
    $ZipSize = (Get-Item $ZipPath).Length
    $ZipSizeMB = [math]::Round($ZipSize / 1MB, 2)
    
    Write-Host "`n=== Bundle Complete ===" -ForegroundColor Green
    Write-Host "Archive: $ZipPath" -ForegroundColor White
    Write-Host "Size: $ZipSizeMB MB" -ForegroundColor White
    Write-Host "Files included: $IncludedCount" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "`nError creating zip file: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Bundle created successfully!" -ForegroundColor Green

