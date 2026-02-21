import { ref, set, onValue, serverTimestamp } from 'firebase/database';
import { db } from './firebase-config.js';

let debounceTimer = null;
let isLocalChange = false;
let unsubscribe = null;

export function saveText(roomId, text) {
  isLocalChange = true;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const roomRef = ref(db, `rooms/${roomId}`);
    set(roomRef, {
      text,
      lastActive: Date.now(),
    }).catch((err) => {
      console.error('Failed to save text:', err);
    });
  }, 300);
}

export function listenToRoom(roomId, callback) {
  // Clean up previous listener
  if (unsubscribe) {
    unsubscribe();
  }

  const roomRef = ref(db, `rooms/${roomId}`);
  const unsub = onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    // Skip if this is our own local change echoing back
    if (isLocalChange) {
      isLocalChange = false;
      return;
    }
    callback(data);
  });

  unsubscribe = unsub;
  return unsub;
}

export function stopListening() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
