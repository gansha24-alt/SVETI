import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Real production credentials registered in sveti-f188d
const firebaseConfig = {
  apiKey: "AIzaSyCZcQWFuROqRcEWukmuR8tMVNQhdV6p99E",
  authDomain: "sveti-f188d.firebaseapp.com",
  projectId: "sveti-f188d",
  storageBucket: "sveti-f188d.firebasestorage.app",
  messagingSenderId: "406467485782",
  appId: "1:406467485782:web:d7ef87a3774f72d9975bf7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const isMockFirebase = false; // Disable mock fallback!

export { app, auth, db, isMockFirebase };
