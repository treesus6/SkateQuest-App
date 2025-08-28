const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// Cloud Function to securely complete a challenge and award XP
// Expects: POST with { challengeId: string }
// Requires authenticated caller (Firebase Auth token) and will verify the challenge exists
exports.completeChallenge = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Request has no authentication context.');
  }
  const uid = context.auth.uid;
  const { challengeId } = data || {};
  if (!challengeId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing challengeId');
  }

  const challengeRef = db.collection('challenges').doc(challengeId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(challengeRef);
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Challenge not found');
    }
    const c = snap.data();
    if (c.status === 'complete') {
      throw new functions.https.HttpsError('failed-precondition', 'Challenge already completed');
    }
    const xp = c.xp || 0;
    const userRef = db.collection('users').doc(uid);
    tx.update(userRef, { xp: admin.firestore.FieldValue.increment(xp), lastCompleted: admin.firestore.FieldValue.serverTimestamp() });
    tx.update(challengeRef, { status: 'complete', completedBy: uid, completedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { success: true, xp };
  });
});
