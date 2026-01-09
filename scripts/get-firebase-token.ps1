# PowerShell script to help get Firebase CI token
# This script provides instructions and checks if you're already logged in

Write-Host "🔐 Firebase CI Token Helper" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
try {
    $firebaseVersion = firebase --version 2>&1
    Write-Host "✅ Firebase CLI found: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "   Install: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📋 Instructions to get your Firebase CI token:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open a NEW PowerShell or Command Prompt window" -ForegroundColor White
Write-Host "2. Navigate to your project:" -ForegroundColor White
Write-Host "   cd `"C:\Users\Administrator\Downloads\New folder\Pandorasbox`"" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Run this command:" -ForegroundColor White
Write-Host "   firebase login:ci" -ForegroundColor Green
Write-Host ""
Write-Host "4. A browser will open - sign in and authorize" -ForegroundColor White
Write-Host "5. Copy the token that appears in the terminal" -ForegroundColor White
Write-Host ""
Write-Host "6. Add it to your .env.local file:" -ForegroundColor White
Write-Host "   FIREBASE_TOKEN=your_token_here" -ForegroundColor Gray
Write-Host ""

# Check if already logged in
Write-Host "🔍 Checking if you're already logged in..." -ForegroundColor Cyan
try {
    $projects = firebase projects:list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ You are logged in to Firebase CLI!" -ForegroundColor Green
        Write-Host ""
        Write-Host "💡 Your token is stored in:" -ForegroundColor Yellow
        $configPath = "$env:APPDATA\firebase\config.json"
        if (Test-Path $configPath) {
            Write-Host "   $configPath" -ForegroundColor Gray
            Write-Host ""
            Write-Host "⚠️  Note: Extracting token from config.json requires manual inspection." -ForegroundColor Yellow
            Write-Host "   It is safer to run firebase login:ci to get a fresh CI token." -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Not logged in. Please run firebase login:ci in a new terminal." -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Could not check login status." -ForegroundColor Red
}

Write-Host ""
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 For GitHub Actions, add the token as a secret:" -ForegroundColor Yellow
Write-Host "   1. Go to: https://github.com/besfeng23/Pandorasbox/settings/secrets/actions" -ForegroundColor Gray
Write-Host "   2. Click New repository secret" -ForegroundColor Gray
Write-Host "   3. Name: FIREBASE_TOKEN" -ForegroundColor Gray
Write-Host "   4. Value: [paste your token]" -ForegroundColor Gray
Write-Host ""

