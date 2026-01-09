# Firebase App Hosting Deployment Guide

## Configuration Files Updated

✅ **firebase.json** - Updated hosting configuration with:
- Public directory: `.next`
- Region: `asia-southeast1`
- Rewrites for single-page app

✅ **next.config.ts** - Updated with:
- `output: "standalone"` for Firebase deployment
- `images.unoptimized: true` for static hosting
- Environment variables for Firebase and AI services
- Build version

✅ **package.json** - Added:
- `deploy` script: `firebase deploy --only hosting`

✅ **.firebaserc** - Already configured with:
- Project: `seismic-vista-480710-q5`

## Environment Variables Required

Make sure these are set in `.env.local`:

```env
# Genkit and AI services configured via apphosting.yaml secrets
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seismic-vista-480710-q5
NEXT_PUBLIC_BUILD_VERSION=v1.0.0
```

## Deployment Steps

### 1. Initialize Firebase (if not already done)

```bash
firebase login
firebase init hosting
```

**Choose:**
- Use an existing project → `seismic-vista-480710-q5`
- Framework: Next.js
- Public directory: `.next`
- Single-page app rewrite: Yes
- Automatic builds: Yes

### 2. Build the Application

```bash
npm run build
```

This will:
- Compile Next.js app
- Generate `.next` directory
- Create standalone output

### 3. Deploy to Firebase Hosting

```bash
npm run deploy
```

Or directly:
```bash
firebase deploy --only hosting
```

### 4. Access Your Live Site

After deployment, Firebase will provide URLs:
- ✅ `https://seismic-vista-480710-q5.web.app`
- ✅ `https://seismic-vista-480710-q5.firebaseapp.com`

## Verification Checklist

- [ ] Build completes successfully
- [ ] Deploy completes without errors
- [ ] Hosting URL is accessible
- [ ] Sidebar opens smoothly
- [ ] Settings drawer opens from right
- [ ] Chat sends messages via Genkit flows
- [ ] Mobile layout collapses on <768px width
- [ ] All environment variables are set

## Troubleshooting

### Build Errors
- Check `next.config.ts` for correct configuration
- Ensure all dependencies are installed: `npm install`
- Verify TypeScript compilation: `npm run typecheck`

### Deployment Errors
- Verify Firebase login: `firebase login`
- Check project ID: `firebase projects:list`
- Ensure `.firebaserc` has correct project ID

### Runtime Errors
- Check environment variables in `.env.local`
- Verify Genkit is properly initialized
- Check Firebase project configuration

## Notes

- The app uses **Firebase App Hosting** which supports Next.js server-side rendering
- The `standalone` output mode is required for Firebase deployment
- Images are unoptimized for static hosting compatibility
- All API routes will work through Firebase's serverless functions

