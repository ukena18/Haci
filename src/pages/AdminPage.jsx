import { useEffect, useState } from "react";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { authFetch } from "../firestoreService";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function action(url, method = "POST") {
    await authFetch(url, { method });
    await loadUsers();
  }

  async function impersonate(uid) {
    if (
      !window.confirm(
        "This will log you out and log in as this user. Continue?",
      )
    )
      return;

    const res = await authFetch(`/api/admin/impersonate/${uid}`, {
      method: "POST",
    });

    const { token } = await res.json();

    const auth = getAuth();
    await signInWithCustomToken(auth, token);
  }

  if (loading) return <div style={{ padding: 20 }}>Loading users…</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin Panel</h2>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Email</th>
            <th>UID</th>
            <th>Admin</th>
            <th>Disabled</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => (
            <tr key={u.uid} style={{ borderBottom: "1px solid #ddd" }}>
              <td>{u.email}</td>
              <td style={{ fontSize: 12 }}>{u.uid}</td>
              <td>{u.claims?.admin ? "✅" : "❌"}</td>
              <td>{u.disabled ? "🚫" : "—"}</td>

              <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {!u.claims?.admin && (
                  <button
                    onClick={() =>
                      action(`/api/admin/user/${u.uid}/make-admin`)
                    }
                  >
                    Make Admin
                  </button>
                )}

                {u.claims?.admin && (
                  <button
                    onClick={() =>
                      action(`/api/admin/user/${u.uid}/remove-admin`)
                    }
                  >
                    Remove Admin
                  </button>
                )}

                {!u.disabled ? (
                  <button
                    onClick={() => action(`/api/admin/user/${u.uid}/disable`)}
                  >
                    Disable
                  </button>
                ) : (
                  <button
                    onClick={() => action(`/api/admin/user/${u.uid}/enable`)}
                  >
                    Enable
                  </button>
                )}

                <button
                  style={{ background: "#eee" }}
                  onClick={() => impersonate(u.uid)}
                >
                  Impersonate
                </button>

                <button
                  style={{ background: "#ffdddd", color: "#900" }}
                  onClick={() => {
                    if (window.confirm("DELETE USER FOREVER?")) {
                      action(`/api/admin/user/${u.uid}`, "DELETE");
                    }
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
