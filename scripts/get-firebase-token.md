# How to Get Your Firebase CI Token

The Firebase CI token is needed for automated deployments in CI/CD pipelines (like GitHub Actions).

## Method 1: Interactive Terminal (Recommended)

1. **Open a terminal/command prompt** (PowerShell, CMD, or Git Bash)

2. **Navigate to your project directory:**
   ```bash
   cd "C:\Users\Administrator\Downloads\New folder\Pandorasbox"
   ```

3. **Run the Firebase login command:**
   ```bash
   firebase login:ci
   ```

4. **Follow the prompts:**
   - A browser window will open
   - Sign in with your Google account
   - Authorize Firebase CLI
   - The token will be displayed in your terminal

5. **Copy the token** and add it to your `.env.local` file:
   ```
   FIREBASE_TOKEN=your_token_here
   ```

## Method 2: Using Existing Firebase Login

If you're already logged in to Firebase CLI, you can check your current token:

1. **Check if you're logged in:**
   ```bash
   firebase projects:list
   ```

2. **If logged in, the token is stored in:**
   - **Windows**: `%APPDATA%\firebase\config.json`
   - **macOS/Linux**: `~/.config/firebase/config.json`

3. **Extract the token from the config file** (look for `tokens` object)

## Method 3: Generate New Token via Browser

1. Go to: https://console.firebase.google.com/
2. Select your project: `seismic-vista-480710-q5`
3. Go to Project Settings → Service Accounts
4. Generate a new private key (this is different from CI token)

**Note:** The CI token is specifically for Firebase CLI automation, not the service account key.

## Security Best Practices

- ✅ Store the token in `.env.local` (already in `.gitignore`)
- ✅ Never commit the token to Git
- ✅ Use GitHub Secrets for CI/CD pipelines
- ✅ Rotate tokens periodically

## Adding to GitHub Secrets (for CI/CD)

1. Go to your GitHub repository: https://github.com/besfeng23/Pandorasbox
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `FIREBASE_TOKEN`
5. Value: Paste your token
6. Click **Add secret**

## Verify Token Works

After adding the token, test it:
```bash
firebase projects:list --token YOUR_TOKEN
```

