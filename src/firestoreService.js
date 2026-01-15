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
      Vaults: [
        {
          id: "main_vault",
          name: "Main Vault",
          balance: 0,
          createdAt: Date.now(),
        },
      ],
      activeVaultId: "main_vault",

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
      profile: data.profile ?? {},
      customers: data.customers ?? [],
      jobs: data.jobs ?? [],
      payments: data.payments ?? [],
      Vaults: data.Vaults ?? [],
      activeVaultId: data.activeVaultId ?? null,
      updatedAt: Date.now(),
    },
    { merge: false } // 🔥 FULL overwrite
  );
}

export async function publishCustomerSnapshot(customerId, payload) {
  const ref = doc(db, "public_customers", customerId);
  await setDoc(
    ref,
    {
      ...payload,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}
