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

// roomId별로 상태 저장 (initialBids는 민감 데이터이므로 저장 제외)
async function saveGameState(state, roomId = 'currentState') {
  if (!db) return;
  try {
    const { initialBids, ...stateToSave } = state;
    await db.collection('auction').doc(roomId).set(stateToSave);
  } catch (err) {
    console.error('Error saving state to Firebase:', err);
  }
}

// roomId별로 상태 로드
async function loadGameState(roomId = 'currentState') {
  if (!db) return null;
  try {
    const doc = await db.collection('auction').doc(roomId).get();
    if (doc.exists) return doc.data();
  } catch (err) {
    console.error('Error loading state from Firebase:', err);
  }
  return null;
}

// 서버 시작 시 모든 룸 상태 복원
async function loadAllRooms() {
  if (!db) return {};
  try {
    const snapshot = await db.collection('auction').get();
    const result = {};
    snapshot.forEach(doc => { result[doc.id] = doc.data(); });
    return result;
  } catch (err) {
    console.error('Error loading all rooms from Firebase:', err);
    return {};
  }
}

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
  loadGameState,
  loadAllRooms,
  logAuctionEvent
};
