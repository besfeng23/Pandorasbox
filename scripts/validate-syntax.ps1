$scriptPath = Join-Path $PSScriptRoot "check-gcp-secrets.ps1"
$parseErrors = $null
$ast = $null

try {
    $ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$null, [ref]$parseErrors)
    if ($parseErrors.Count -eq 0) {
        Write-Host "Syntax is valid!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Syntax errors found:" -ForegroundColor Red
        foreach ($err in $parseErrors) {
            Write-Host "Line $($err.Extent.StartLineNumber), Column $($err.Extent.StartColumnNumber): $($err.Message)" -ForegroundColor Yellow
        }
        exit 1
    }
} catch {
    Write-Host "Parse failed: $_" -ForegroundColor Red
    exit 1
}

