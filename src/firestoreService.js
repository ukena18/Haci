import { getAuth } from "firebase/auth";

async function authFetch(url, options = {}) {
  const user = getAuth().currentUser;
  const token = await user.getIdToken();

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function ensureUserData(userId) {
  const res = await authFetch(`/api/users/${userId}/ensure`, {
    method: "POST",
  });

  if (!res.ok) throw new Error("Failed to ensure user data");
}

export async function loadUserData(userId) {
  const res = await authFetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error("Failed to load user data");
  return res.json();
}

export async function saveUserData(userId, data) {
  const res = await authFetch(`/api/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to save user data");
}

export async function publishCustomerSnapshot(customerId, payload) {
  const res = await authFetch(`/api/public-customers/${customerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to publish customer snapshot");
}
