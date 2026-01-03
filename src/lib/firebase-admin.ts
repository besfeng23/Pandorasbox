
import 'server-only';
import admin from 'firebase-admin';

let firestoreAdmin: admin.firestore.Firestore;
let authAdmin: admin.auth.Auth;

if (!admin.apps.length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountKey);
      } catch (e) {
        console.log("Parsing raw JSON failed, attempting to fix newlines...");
        serviceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));
      }

      console.log("Initializing Firebase Admin with Service Account Key...");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      console.log("No Service Account Key found. Using Application Default Credentials.");
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
  } catch (error) {
    console.error('❌ Firebase Admin Initialization Failed:', error);
  }
}

// Use a getter to ensure the app is initialized before accessing services
function getFirestoreAdmin() {
  if (!firestoreAdmin) {
    firestoreAdmin = admin.firestore();
  }
  return firestoreAdmin;
}

function getAuthAdmin() {
    if (!authAdmin) {
        authAdmin = admin.auth();
    }
    return authAdmin;
}

// Export the getter functions
export { getFirestoreAdmin, getAuthAdmin };
