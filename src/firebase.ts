import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCgZwH1x8_KNz4qTl299NK9EoA7ZFcBAJY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nwsdb-4db15.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nwsdb-4db15",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nwsdb-4db15.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "147733024217",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:147733024217:web:395b8eb972a17a2baa5dc8",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-HH7PF00KD2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);