import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC2Y5LE3kfuv14Viz7pzcSbEZhdySOUbcM",
  authDomain: "wolly-1133d.firebaseapp.com",
  projectId: "wolly-1133d",
  storageBucket: "wolly-1133d.appspot.com",
  messagingSenderId: "550264739666",
  appId: "1:550264739666:web:889ef63529c127a1d8cc8b",
  measurementId: "G-8VGN263DL3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
