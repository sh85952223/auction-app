const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

let db = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log('Firebase Firestore initialized via environment variable.');
  } catch (error) {
    console.error('Error initializing Firebase from env var:', error);
  }
} else if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log('Firebase Firestore initialized via serviceAccountKey.json.');
  } catch (error) {
    console.error('Error initializing Firebase from file:', error);
  }
} else {
  console.warn('⚠️ serviceAccountKey.json not found in server directory. Running without Firebase integration.');
}

// Helper to save auction state
async function saveGameState(state) {
  if (!db) return;
  try {
    // Save to 'auction' collection, document 'currentState'
    const { initialBids, ...safeState } = state; 
    await db.collection('auction').doc('currentState').set(safeState);
  } catch (err) {
    console.error('Error saving state to Firebase:', err);
  }
}

// Helper to log auction events (like successful bids, etc.)
async function logAuctionEvent(eventData) {
  if (!db) return;
  try {
    await db.collection('auction_logs').add({
      ...eventData,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('Error logging to Firebase:', err);
  }
}

module.exports = {
  db,
  saveGameState,
  logAuctionEvent
};
