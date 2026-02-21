// Ambiguity-free alphabet: no i, l, 1, o, 0
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function generateRoomCode(length = 6) {
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => ALPHABET[v % ALPHABET.length]).join('');
}

export function getRoomFromHash() {
  const hash = window.location.hash.slice(1);
  if (hash && /^[a-hjkmnp-z2-9]{6}$/.test(hash)) {
    return hash;
  }
  return null;
}

export function setRoomHash(code) {
  window.location.hash = code;
}

export function isExpired(lastActive) {
  if (!lastActive) return true;
  return Date.now() - lastActive > TTL_MS;
}

export function getTimeRemaining(lastActive) {
  if (!lastActive) return 'No data';
  const elapsed = Date.now() - lastActive;
  const remaining = TTL_MS - elapsed;
  if (remaining <= 0) return 'Expired';

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return `Expires in ${hours}h ${minutes}m`;
}
