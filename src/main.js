import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ref, remove, get } from 'firebase/database';
import { auth, db } from './firebase-config.js';
import { saveText, listenToRoom, stopListening } from './clipboard.js';
import { uploadImage, deleteImage } from './storage.js';
import {
  generateRoomCode,
  getRoomFromHash,
  setRoomHash,
  isExpired,
  getTimeRemaining,
} from './utils.js';

// DOM elements
const textArea = document.getElementById('text-area');
const roomBadge = document.getElementById('room-badge');
const copyLinkBtn = document.getElementById('copy-link-btn');
const newRoomBtn = document.getElementById('new-room-btn');
const clearBtn = document.getElementById('clear-btn');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const imagePreview = document.getElementById('image-preview');
const expiryTimer = document.getElementById('expiry-timer');
const toast = document.getElementById('toast');

let currentRoom = null;
let expiryInterval = null;

// --- Toast ---
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// --- Room Management ---
function initRoom() {
  let roomCode = getRoomFromHash();
  if (!roomCode) {
    roomCode = generateRoomCode();
    setRoomHash(roomCode);
  }
  joinRoom(roomCode);
}

async function joinRoom(roomCode) {
  // Clean up previous room
  stopListening();
  clearInterval(expiryInterval);
  imagePreview.innerHTML = '';
  textArea.value = '';

  currentRoom = roomCode;
  roomBadge.textContent = roomCode;
  document.title = `QuickNote - ${roomCode}`;

  // Check if room is expired
  try {
    const roomRef = ref(db, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);
    const data = snapshot.val();

    if (data && isExpired(data.lastActive)) {
      await remove(roomRef);
      showToast('Room expired, starting fresh');
    }
  } catch (err) {
    console.warn('Could not check room expiry:', err);
  }

  // Listen for changes
  listenToRoom(roomCode, (data) => {
    if (data) {
      // Update text only if different to preserve cursor position
      if (data.text !== undefined && data.text !== textArea.value) {
        textArea.value = data.text || '';
      }
      // Update images
      renderImages(data.images);
      updateExpiry(data.lastActive);
    } else {
      textArea.value = '';
      imagePreview.innerHTML = '';
      expiryTimer.textContent = '';
    }
  });

  // Start expiry timer updates
  expiryInterval = setInterval(() => {
    // Re-read from current display; actual value will be refreshed by listener
  }, 60000);
}

function updateExpiry(lastActive) {
  if (lastActive) {
    expiryTimer.textContent = getTimeRemaining(lastActive);
  } else {
    expiryTimer.textContent = '';
  }
}

function renderImages(images) {
  if (!images) {
    imagePreview.innerHTML = '';
    return;
  }

  const entries = Object.entries(images);
  // Only re-render if count changed (avoid flicker)
  if (imagePreview.children.length === entries.length) {
    return;
  }

  imagePreview.innerHTML = '';
  for (const [key, imgData] of entries) {
    const wrapper = document.createElement('div');
    wrapper.className = 'img-wrapper';

    const img = document.createElement('img');
    img.src = imgData.url;
    img.alt = 'Uploaded image';
    img.loading = 'lazy';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-img';
    deleteBtn.textContent = '\u00d7';
    deleteBtn.title = 'Delete image';
    deleteBtn.addEventListener('click', async () => {
      try {
        await deleteImage(currentRoom, key, imgData.storagePath);
        showToast('Image deleted');
      } catch (err) {
        console.error('Failed to delete image:', err);
        showToast('Failed to delete image');
      }
    });

    wrapper.appendChild(img);
    wrapper.appendChild(deleteBtn);
    imagePreview.appendChild(wrapper);
  }
}

// --- Image Handling ---
async function handleImageUpload(file) {
  if (!file || !file.type.startsWith('image/')) return;
  if (!currentRoom) return;

  try {
    dropZone.innerHTML = '<p class="upload-progress">Uploading...</p>';
    await uploadImage(currentRoom, file);
    showToast('Image uploaded');
  } catch (err) {
    console.error('Upload failed:', err);
    showToast('Upload failed: ' + err.message);
  } finally {
    dropZone.innerHTML =
      '<p>Drop or paste image here</p><p class="drop-hint">(or click to select file)</p>';
  }
}

// --- Event Listeners ---

// Text input
textArea.addEventListener('input', () => {
  if (currentRoom) {
    saveText(currentRoom, textArea.value);
  }
});

// Copy link
copyLinkBtn.addEventListener('click', () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(
    () => showToast('Link copied!'),
    () => showToast('Failed to copy link')
  );
});

// New room
newRoomBtn.addEventListener('click', () => {
  const newCode = generateRoomCode();
  setRoomHash(newCode);
  joinRoom(newCode);
  showToast('New room created');
});

// Clear room
clearBtn.addEventListener('click', async () => {
  if (!currentRoom) return;
  try {
    const roomRef = ref(db, `rooms/${currentRoom}`);
    await remove(roomRef);
    textArea.value = '';
    imagePreview.innerHTML = '';
    expiryTimer.textContent = '';
    showToast('Room cleared');
  } catch (err) {
    console.error('Clear failed:', err);
    showToast('Failed to clear room');
  }
});

// Drop zone click → file picker
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) {
    handleImageUpload(fileInput.files[0]);
    fileInput.value = '';
  }
});

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleImageUpload(file);
});

// Paste anywhere on page
document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const blob = item.getAsFile();
      if (blob) handleImageUpload(blob);
      return;
    }
  }
});

// Hash change (back/forward navigation)
window.addEventListener('hashchange', () => {
  const roomCode = getRoomFromHash();
  if (roomCode && roomCode !== currentRoom) {
    joinRoom(roomCode);
  }
});

// --- Auth & Init ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.body.classList.remove('loading');
    initRoom();
  }
});

// Sign in anonymously
document.body.classList.add('loading');
signInAnonymously(auth).catch((err) => {
  console.error('Auth failed:', err);
  document.body.classList.remove('loading');
  showToast('Authentication failed. Check Firebase config.');
});
