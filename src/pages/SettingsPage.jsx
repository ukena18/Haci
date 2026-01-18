import React from "react";

export default function SettingsPage({
  // auth/user
  auth,
  user,
  signOut,

  // state
  state,
  setState,

  // ui state
  setProfileOpen,
  setSelectedVaultId,
  setVaultDetailOpen,

  editingVaultId,
  setEditingVaultId,
  editingVaultName,
  setEditingVaultName,

  showChangelog,
  setShowChangelog,

  // helpers
  uid,
  money,
  getVaultTotals,

  // components
  Changelog,
}) {
  return (
    <div id="page-settings">
      <div className="card">
        {/* 🔓 LOGOUT BUTTON */}
        <button
          className="logout-btn"
          onClick={() => signOut(auth)}
          style={{ marginTop: 12, width: "100%" }}
        >
          <i className="fa-solid fa-right-from-bracket"></i> Çıkış Yap
        </button>

        {/* 👤 ADMIN PROFILE */}
        <div
          className="card admin-profile"
          style={{ cursor: "pointer" }}
          onClick={() => setProfileOpen(true)}
        >
          <div className="admin-row">
            <div className="admin-avatar">
              {user?.email?.[0]?.toUpperCase() || "A"}
            </div>

            <div className="admin-info" style={{ flex: 1 }}>
              <strong className="admin-name">
                {user?.displayName || "Yönetici"}
              </strong>

              <div className="admin-email">
                {user?.email || "admin@example.com"}
              </div>

              <span className="admin-role">ADMIN</span>
            </div>

            {/* RIGHT SIDE */}
            <div className="admin-meta-right">
              {state.profile?.phone && (
                <div className="admin-meta">📞 {state.profile.phone}</div>
              )}

              {state.profile?.address && (
                <div className="admin-meta">📍 {state.profile.address}</div>
              )}
            </div>
          </div>
        </div>

        <h3>Kasa Yönetimi</h3>

        {/* Vault LIST */}
        {state.vaults.map((vault) => {
          const isActive = vault.id === state.activeVaultId;

          return (
            <div
              key={vault.id}
              className="card list-item"
              style={{
                borderLeft: isActive
                  ? "6px solid #2563eb"
                  : "6px solid transparent",
                background: isActive ? "#eff6ff" : "white",
                cursor: "pointer",
              }}
              onClick={() => {
                setSelectedVaultId(vault.id);
                setVaultDetailOpen(true);
              }}
            >
              <div>
                {editingVaultId === vault.id ? (
                  <input
                    value={editingVaultName}
                    autoFocus
                    onChange={(e) => setEditingVaultName(e.target.value)}
                    onBlur={() => {
                      if (!editingVaultName.trim()) {
                        setEditingVaultId(null);
                        return;
                      }

                      setState((s) => ({
                        ...s,
                        vaults: s.vaults.map((k) =>
                          k.id === vault.id
                            ? { ...k, name: editingVaultName.trim() }
                            : k,
                        ),
                      }));
                      setEditingVaultId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.target.blur();
                      if (e.key === "Escape") setEditingVaultId(null);
                    }}
                    style={{
                      fontSize: 12,
                      padding: "4px 6px",
                      width: "100%",
                    }}
                  />
                ) : (
                  <strong>{vault.name}</strong>
                )}

                <div style={{ fontSize: 12, color: "#555" }}>
                  balance:{" "}
                  {(() => {
                    const { net } = getVaultTotals(vault.id);
                    return money(net, vault.currency);
                  })()}
                </div>
              </div>

              {isActive ? (
                <div className="vault-active-badge">AKTİF</div>
              ) : (
                <div style={{ display: "flex", gap: 6 }}></div>
              )}
            </div>
          );
        })}

        {/* ADD NEW vault */}
        <button
          className="btn"
          style={{
            marginTop: 12,
            background: "#eee",
            color: "#333",
          }}
          onClick={() => {
            const id = uid();

            setState((s) => ({
              ...s,
              vaults: [
                ...(s.vaults || []),
                {
                  id,
                  name: `Yeni Kasa ${s.vaults.length + 1}`,
                  balance: 0,
                  currency: s.currency || "TRY", // ✅ add this
                  createdAt: Date.now(),
                },
              ],
            }));
          }}
        >
          + Yeni Kasa Ekle
        </button>
      </div>

      {/* 📦 UPDATES & CHANGELOG */}
      <div className="card" style={{ marginTop: 20 }}>
        <div
          className="list-item"
          style={{ cursor: "pointer" }}
          onClick={() => setShowChangelog((v) => !v)}
        >
          <div>
            <strong>📦 Güncellemeler & Sürüm Geçmişi</strong>
            <div style={{ fontSize: 12, color: "#666" }}>
              Mevcut sürüm: v1.2.6
            </div>
          </div>

          <i
            className={`fa-solid fa-chevron-${showChangelog ? "down" : "right"}`}
          />
        </div>

        {showChangelog && <Changelog language="tr" />}
      </div>
    </div>
  );
}
