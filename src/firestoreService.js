import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// Create user document if it doesn't exist
export async function ensureUserData(userId) {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      kasaName: "Ana Kasa",
      kasaBalance: 0,
      customers: [],
      jobs: [],
      createdAt: Date.now(),
    });
  }
}

// Load user data
export async function loadUserData(userId) {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return snap.data();
}
