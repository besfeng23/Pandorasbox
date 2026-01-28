export const GOOGLE_CLOUD_CONFIG = {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'seismic-vista-480710-q5',
    region: 'us-central1', // Defaulting to the deployed backend region
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'seismic-vista-480710-q5.firebasestorage.app',
};
