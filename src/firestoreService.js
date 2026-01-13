import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// Create user document if it doesn't exist
export async function ensureUserData(userId) {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      profile: {
        phone: "",
        address: "",
      },
      kasalar: [
        {
          id: "kasa_ana",
          name: "Ana Kasa",
          balance: 0,
          createdAt: Date.now(),
        },
      ],
      activeKasaId: "kasa_ana",

      customers: [],
      jobs: [],
      payments: [],

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

export async function saveUserData(userId, data) {
  const ref = doc(db, "users", userId);
  await setDoc(
    ref,
    {
      ...data,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}
