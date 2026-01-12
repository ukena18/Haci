import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcW-mCmLoeHW4lMIREOJ7M_M-dOXvq5jk",
  authDomain: "usta-takip-50c7d.firebaseapp.com",
  projectId: "usta-takip-50c7d",
  storageBucket: "usta-takip-50c7d.firebasestorage.app",
  messagingSenderId: "789286221168",
  appId: "1:789286221168:web:d538a0d15b8ff9cf5e4bb5"
};

const app = initializeApp(firebaseConfig);

// ✅ THESE MUST BE EXPORTED
export const auth = getAuth(app);
export const db = getFirestore(app);