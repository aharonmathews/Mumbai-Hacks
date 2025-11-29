// firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCVj2Gf5lH1wK2ghx24IuFAB2gf-EmxYcU",
  authDomain: "decode-27a57.firebaseapp.com",
  projectId: "decode-27a57",
  storageBucket: "decode-27a57.firebasestorage.app",
  messagingSenderId: "465411608446",
  appId: "1:465411608446:web:c3c4f2c81be92985c0ad2f",
  measurementId: "G-GCT3D25FL5",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const auth = getAuth(app);

export default app;
