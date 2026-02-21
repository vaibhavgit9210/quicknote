import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { ref as dbRef, push, set, remove } from 'firebase/database';
import { storage, db } from './firebase-config.js';

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 0.8;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function compressImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Only resize if wider than MAX_WIDTH
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Canvas compression failed'));
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export async function uploadImage(roomId, blob, onProgress) {
  // Compress first
  const compressed = await compressImage(blob);
  if (compressed.size > MAX_SIZE) {
    throw new Error('Image too large (max 5MB after compression)');
  }

  const timestamp = Date.now();
  const fileRef = storageRef(storage, `rooms/${roomId}/img_${timestamp}.jpg`);

  if (onProgress) onProgress('Uploading...');
  await uploadBytes(fileRef, compressed, { contentType: 'image/jpeg' });

  const downloadURL = await getDownloadURL(fileRef);

  // Save reference in RTDB
  const imagesRef = dbRef(db, `rooms/${roomId}/images`);
  const newImageRef = push(imagesRef);
  await set(newImageRef, {
    url: downloadURL,
    storagePath: `rooms/${roomId}/img_${timestamp}.jpg`,
    createdAt: timestamp,
  });

  if (onProgress) onProgress(null);
  return downloadURL;
}

export async function deleteImage(roomId, imageKey, storagePath) {
  // Delete from Storage
  if (storagePath) {
    try {
      const fileRef = storageRef(storage, storagePath);
      await deleteObject(fileRef);
    } catch (err) {
      console.warn('Failed to delete from storage:', err);
    }
  }

  // Delete reference from RTDB
  const imageRef = dbRef(db, `rooms/${roomId}/images/${imageKey}`);
  await remove(imageRef);
}
