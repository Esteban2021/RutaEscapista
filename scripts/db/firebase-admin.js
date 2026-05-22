// Requiere: npm install firebase-admin
// Requiere: variable de entorno GOOGLE_APPLICATION_CREDENTIALS con la ruta al serviceAccountKey.json
// O bien, define FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY en .env.local

const admin = require('firebase-admin');

if (!admin.apps.length) {
  const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? admin.credential.applicationDefault()
    : admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      });

  admin.initializeApp({ credential });
}

const db = admin.firestore();

module.exports = { admin, db };
