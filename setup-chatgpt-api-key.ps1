# PowerShell script to set up ChatGPT API key in Cloud Secret Manager
# Run this script to create the secret for ChatGPT integration

$PROJECT_ID = "seismic-vista-480710-q5"
$SECRET_NAME = "chatgpt-api-key"

Write-Host "Setting up ChatGPT API key for Pandora's Box..." -ForegroundColor Cyan

# Check if gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "Error: gcloud CLI is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Check if user is authenticated
Write-Host "Checking gcloud authentication..." -ForegroundColor Yellow
$authStatus = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>&1
if (-not $authStatus) {
    Write-Host "Not authenticated. Please run: gcloud auth login" -ForegroundColor Red
    exit 1
}

Write-Host "Authenticated as: $authStatus" -ForegroundColor Green

# Set the project
Write-Host "Setting project to $PROJECT_ID..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# Check if secret already exists
Write-Host "Checking if secret already exists..." -ForegroundColor Yellow
$secretExists = gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Secret '$SECRET_NAME' already exists." -ForegroundColor Yellow
    $update = Read-Host "Do you want to update it? (y/n)"
    if ($update -eq "y" -or $update -eq "Y") {
        Write-Host "Please enter the new API key (or press Enter to generate one):" -ForegroundColor Cyan
        $apiKey = Read-Host -AsSecureString
        
        if ([string]::IsNullOrEmpty($apiKey)) {
            # Generate a random API key
            $apiKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
            Write-Host "Generated API key: $apiKey" -ForegroundColor Green
            Write-Host "IMPORTANT: Save this key! You'll need it to configure ChatGPT." -ForegroundColor Yellow
        } else {
            $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey)
            $apiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        }
        
        # Update the secret
        Write-Host "Updating secret..." -ForegroundColor Yellow
        echo $apiKey | gcloud secrets versions add $SECRET_NAME --data-file=-
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Secret updated successfully!" -ForegroundColor Green
        } else {
            Write-Host "Failed to update secret." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Keeping existing secret." -ForegroundColor Yellow
    }
} else {
    # Create new secret
    Write-Host "Secret does not exist. Creating new secret..." -ForegroundColor Yellow
    Write-Host "Please enter the API key (or press Enter to generate one):" -ForegroundColor Cyan
    $apiKey = Read-Host -AsSecureString
    
    if ([string]::IsNullOrEmpty($apiKey)) {
        # Generate a random API key
        $apiKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
        Write-Host "Generated API key: $apiKey" -ForegroundColor Green
        Write-Host "IMPORTANT: Save this key! You'll need it to configure ChatGPT." -ForegroundColor Yellow
    } else {
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey)
        $apiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    }
    
    # Create the secret
    echo $apiKey | gcloud secrets create $SECRET_NAME --data-file=- --project=$PROJECT_ID
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Secret created successfully!" -ForegroundColor Green
    } else {
        Write-Host "Failed to create secret." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ChatGPT API Key Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Add this API key to your ChatGPT Custom GPT configuration" -ForegroundColor White
Write-Host "2. Use the OpenAPI schema at: /api/chatgpt/openapi.yaml" -ForegroundColor White
Write-Host "3. Test the integration using the examples in CHATGPT_INTEGRATION.md" -ForegroundColor White
Write-Host ""
Write-Host "API Key: $apiKey" -ForegroundColor Cyan
Write-Host "IMPORTANT: Keep this key secure and don't share it publicly!" -ForegroundColor Red
Write-Host ""

