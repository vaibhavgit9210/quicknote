import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBX_PXDIKT7hRlrXQqB5P8WUvCEeHj5kyw',
  authDomain: 'gitquicknote.firebaseapp.com',
  databaseURL: 'https://gitquicknote-default-rtdb.firebaseio.com',
  projectId: 'gitquicknote',
  storageBucket: 'gitquicknote.firebasestorage.app',
  messagingSenderId: '355755173058',
  appId: '1:355755173058:web:b534e5165ba1c995acc75b',
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
