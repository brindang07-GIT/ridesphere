import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADyJHetbcIrMTYBkeXzLWoGUEGZIZu1-w",
  authDomain: "smartrideai-9549b.firebaseapp.com",
  projectId: "smartrideai-9549b",
  storageBucket: "smartrideai-9549b.firebasestorage.app",
  messagingSenderId: "446608112318",
  appId: "1:446608112318:web:177993dcaa920ef4c5bcef",
  measurementId: "G-BSDB4DKQPP"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);