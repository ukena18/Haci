import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * 🔒 Firestore safety helper
 * Removes ALL undefined values (recursively)
 */
function stripUndefined(obj) {
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(stripUndefined);
  }

  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefined(v)]),
  );
}

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
      vaults: [
        {
          id: "main_vault",
          name: "Main Vault",
          balance: 0,
          currency: "TRY",
          createdAt: Date.now(),
        },
      ],
      activeVaultId: "main_vault",

      customers: [],
      jobs: [],
      payments: [],

      // ✅ ADD THIS
      reservations: [],

      createdAt: Date.now(),
    });
  }
}

// Load user data
export async function loadUserData(userId) {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data();

  return {
    ...data,

    // ✅ normalize Vaults → vaults
    vaults: data.vaults || data.Vaults || [],

    // ✅ ADD THIS
    reservations: data.reservations || [],

    // optional cleanup
    Vaults: undefined,
  };
}

export async function saveUserData(userId, data) {
  const ref = doc(db, "users", userId);

  const safePayload = stripUndefined({
    profile: data.profile ?? {},
    customers: data.customers ?? [],
    jobs: data.jobs ?? [],
    payments: data.payments ?? [],
    reservations: data.reservations ?? [],
    vaults: data.vaults ?? [],
    activeVaultId: data.activeVaultId ?? null,
    updatedAt: Date.now(),
  });

  await setDoc(ref, safePayload, { merge: false });
}

export async function publishCustomerSnapshot(customerId, payload) {
  const ref = doc(db, "public_customers", customerId);
  await setDoc(
    ref,
    {
      ...payload,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
}
