# Create complete Pandorasbox archive for build audit
# Excludes: node_modules, .next, .git, build artifacts

$projectRoot = "C:\Users\Administrator\Downloads\New folder\Pandorasbox"
$outputZip = "C:\Users\Administrator\Downloads\New folder\Pandorasbox-full.zip"

# Remove existing zip if present
if (Test-Path $outputZip) {
    Remove-Item $outputZip -Force
    Write-Host "Removed existing archive"
}

# Directories to exclude
$excludeDirs = @('node_modules', '.next', '.git', '.cursor', 'coverage', 'out', 'build', '.vercel', '.genkit')

# File extensions/names to exclude
$excludeFiles = @('*.tsbuildinfo', 'next-env.d.ts')

Write-Host "Creating archive from: $projectRoot"
Write-Host "Output: $outputZip"
Write-Host ""

# Get all files, excluding specified directories and files
$files = Get-ChildItem -Path $projectRoot -Recurse -File | Where-Object {
    $shouldInclude = $true
    
    # Check if file is in excluded directory
    $relativePath = $_.FullName.Replace($projectRoot, '').TrimStart('\')
    $pathParts = $relativePath.Split('\')
    
    foreach ($part in $pathParts) {
        if ($excludeDirs -contains $part) {
            $shouldInclude = $false
            break
        }
    }
    
    # Check if file matches excluded patterns
    if ($shouldInclude) {
        foreach ($pattern in $excludeFiles) {
            if ($_.Name -like $pattern) {
                $shouldInclude = $false
                break
            }
        }
    }
    
    $shouldInclude
}

Write-Host "Found $($files.Count) files to archive"
Write-Host "Total size: $([math]::Round(($files | Measure-Object -Property Length -Sum).Sum / 1MB, 2)) MB"
Write-Host ""

# Create archive
Write-Host "Creating zip archive..."
$files | ForEach-Object {
    $relativePath = $_.FullName.Replace($projectRoot, '').TrimStart('\')
    Write-Host "  Adding: $relativePath"
} | Out-Null

Compress-Archive -Path $files.FullName -DestinationPath $outputZip -CompressionLevel Optimal

$zipSize = (Get-Item $outputZip).Length
Write-Host ""
Write-Host "✅ Archive created successfully!"
Write-Host "   Location: $outputZip"
Write-Host "   Size: $([math]::Round($zipSize / 1MB, 2)) MB"
Write-Host ""
Write-Host "Archive includes:"
Write-Host "  ✓ All source files (src/)"
Write-Host "  ✓ Configuration files (package.json, tsconfig.json, next.config.ts, firebase.json)"
Write-Host "  ✓ Public assets (public/)"
Write-Host "  ✓ Scripts (scripts/)"
Write-Host "  ✓ Documentation (*.md files)"
Write-Host "  ✓ Firestore rules and indexes"
Write-Host ""
Write-Host "Excluded:"
Write-Host "  ✗ node_modules/"
Write-Host "  ✗ .next/ (build output)"
Write-Host "  ✗ .git/"
Write-Host "  ✗ Build artifacts (*.tsbuildinfo)"

