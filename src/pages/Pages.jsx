import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// helpers (same ones you already use in App.jsx)
import {
  computeCustomerBalance,
  money,
  toNum,
  calcHours,
  partsTotalOf,
  jobTotalOf,
  partLineTotal,
  clockHoursOf,
} from "../utils/helpers";

export function HomePage({
  // ===== values =====
  currency,
  financialSummary,
  paymentWatchList,
  customersById,
  activeJobs,
  activeJobsByCustomer,
  completedJobs,
  openCustomerFolders,

  // ===== UI state =====
  paymentOpen,
  activeOpen,
  completedOpen,

  // ===== setters / handlers =====
  setPaymentOpen,
  setActiveOpen,
  setCompletedOpen,
  setState,
  toggleCustomerFolder,
  toggleJobOpen,
  clockIn,
  clockOut,
  markJobComplete,
  setEditingJobId,
  setJobModalOpen,
  setConfirm,

  // ===== helpers =====
  money,
  calcHours,
  toNum,
  partsTotalOf,
  jobTotalOf,

  // ===== persistence/auth =====
  auth,
  saveUserData,

  // ===== components =====
  JobCard,
}) {
  return (
    <div id="page-home">
      {/* FINANSAL ÖZET */}
      <div className="card" style={{ marginBottom: 16 }}>
        {/* NUMBERS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 14,
            fontSize: 12,
          }}
        >
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "#fef2f2",
              textAlign: "center",
            }}
          >
            {/* Total debt  */}
            <div
              style={{
                color: "#7f1d1d",
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              Toplam Borç
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "#dc2626",
                fontSize: 16,
              }}
            >
              {money(financialSummary.totalDebt, currency)}
            </div>
          </div>

          {/* Total payment  */}
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "#f0fdf4",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#166534",
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              Toplam Tahsilat
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "#16a34a",
                fontSize: 16,
              }}
            >
              {money(financialSummary.totalPayment, currency)}
            </div>
          </div>
        </div>

        {/* NET */}
        <div
          style={{
            marginTop: 8,
            padding: 14,
            borderRadius: 12,
            background: financialSummary.net < 0 ? "#fef2f2" : "#f0fdf4",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 12,
              marginBottom: 4,
              color: financialSummary.net < 0 ? "#7f1d1d" : "#166534",
            }}
          >
            Net Durum
          </div>

          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: financialSummary.net < 0 ? "#dc2626" : "#16a34a",
            }}
          >
            {money(financialSummary.net, currency)}
          </div>
        </div>
      </div>

      <div id="job-list">
        {/*  30 GÜNLÜK ÖDEME TAKİBİ */}
        <div className="card">
          <div
            className="list-item section-header due-header"
            onClick={() => setPaymentOpen((o) => !o)}
          >
            <strong>
              <i className="fa-solid fa-bell"></i> 30 Günlük Ödeme Takibi (
              {paymentWatchList.length})
            </strong>
            <i
              className={`fa-solid fa-chevron-${
                paymentOpen ? "down" : "right"
              } due-arrow`}
            />
          </div>
        </div>

        {paymentOpen &&
          (paymentWatchList.length === 0 ? (
            <div className="card" style={{ fontSize: 12, color: "#666" }}>
              Takip edilecek aktif iş yok.
            </div>
          ) : (
            paymentWatchList.map(({ job, daysLeft, dueDate }) => {
              const c = customersById.get(job.customerId);

              return (
                <div
                  key={job.id}
                  className="card list-item"
                  style={{
                    background:
                      daysLeft <= 0
                        ? "#fee2e2"
                        : daysLeft <= 5
                          ? "#fef3c7"
                          : "white",
                    borderLeft:
                      daysLeft <= 0
                        ? "6px solid #dc2626"
                        : daysLeft <= 5
                          ? "6px solid #f59e0b"
                          : "6px solid #16a34a",
                  }}
                >
                  <div>
                    <strong>
                      {c ? `${c.name} ${c.surname}` : "Bilinmeyen"}
                    </strong>
                    <br />
                    <small>
                      {daysLeft <= 0 ? (
                        <>
                          <i className="fa-solid fa-circle-xmark"></i>{" "}
                          {Math.abs(daysLeft)} gün gecikmiş
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-hourglass-half"></i>{" "}
                          {daysLeft} gün kaldı
                        </>
                      )}
                      <br />
                      Son Ödeme: <b>{dueDate.toLocaleDateString("tr-TR")}</b>
                    </small>
                  </div>

                  <div style={{ fontWeight: 700 }}>
                    <button
                      className="due-dismiss-btn"
                      onClick={(e) => {
                        e.stopPropagation();

                        setState((s) => {
                          const nextJobs = s.jobs.map((j) =>
                            j.id === job.id
                              ? { ...j, dueDismissed: true } //   SAVE FLAG
                              : j,
                          );

                          const nextState = {
                            ...s,
                            jobs: nextJobs,
                          };

                          // 🔒 persist immediately
                          saveUserData(auth.currentUser.uid, nextState);

                          return nextState;
                        });
                      }}
                    >
                      <i className="fa-solid fa-check "></i> Takipten Kaldır
                    </button>

                    {(() => {
                      const totalMs = job.workedMs || 0;
                      const hours =
                        job.timeMode === "clock"
                          ? totalMs / 36e5
                          : calcHours(job.start, job.end);

                      return money(
                        hours * toNum(job.rate) + partsTotalOf(job),
                        currency,
                      );
                    })()}
                  </div>
                </div>
              );
            })
          ))}

        {/* ACTIVE JOBS FOLDER */}
        <div className="card">
          <div
            className="list-item"
            style={{ cursor: "pointer" }}
            onClick={() => {
              const next = !activeOpen;
              setActiveOpen(next);

              // collapse active jobs ONLY when opening
              if (next) {
                setState((s) => ({
                  ...s,
                  jobs: s.jobs.map((j) =>
                    !j.isCompleted ? { ...j, isOpen: false } : j,
                  ),
                }));
              }
            }}
          >
            <strong>
              <i className="fa-solid fa-circle-play"></i> Aktif İşler (
              {activeJobs.length})
            </strong>
            <span>
              <i
                className={`fa-solid fa-chevron-${
                  activeOpen ? "down" : "right"
                }`}
              />
            </span>
          </div>
        </div>

        {activeOpen &&
          (activeJobsByCustomer.size === 0 ? (
            <div className="card">Aktif iş yok.</div>
          ) : (
            Array.from(activeJobsByCustomer.entries()).map(
              ([customerId, jobs]) => {
                const customer = customersById.get(customerId);

                const isOpen = openCustomerFolders[customerId] ?? false;

                const totalAmount = jobs.reduce(
                  (sum, j) => sum + jobTotalOf(j),
                  0,
                );

                return (
                  <div key={customerId}>
                    {/* CUSTOMER FOLDER HEADER */}
                    <div
                      className="card list-item"
                      style={{
                        cursor: "pointer",
                        background: "#f8fafc",
                      }}
                      onClick={() => toggleCustomerFolder(customerId)}
                    >
                      <div>
                        <strong>
                          {customer
                            ? `${customer.name} ${customer.surname}`
                            : "Bilinmeyen"}
                        </strong>

                        <div style={{ fontSize: 12, color: "#666" }}>
                          {jobs.length} aktif iş
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <strong style={{ color: "var(--primary)" }}>
                          {money(totalAmount, currency)}
                        </strong>

                        <span
                          className={`folder-arrow ${isOpen ? "open" : ""}`}
                        >
                          <i className="fa-solid fa-chevron-right"></i>
                        </span>
                      </div>
                    </div>

                    {/* JOBS */}
                    <div className={`job-folder ${isOpen ? "open" : ""}`}>
                      {jobs.map((job) => (
                        <div key={job.id} className="job-folder-item">
                          <JobCard
                            job={job}
                            customersById={customersById}
                            toggleJobOpen={toggleJobOpen}
                            clockIn={clockIn}
                            clockOut={clockOut}
                            currency={currency}
                            markJobComplete={markJobComplete}
                            onOpenActions={(jobId) => {
                              setEditingJobId(jobId);
                              setJobModalOpen(true);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              },
            )
          ))}

        {/* COMPLETED JOBS FOLDER */}
        <div className="card" style={{ marginTop: 10 }}>
          <div
            className="list-item"
            style={{ cursor: "pointer" }}
            onClick={() => {
              const next = !completedOpen;
              setCompletedOpen(next);

              // collapse completed jobs ONLY when opening
              if (next) {
                setState((s) => ({
                  ...s,
                  jobs: s.jobs.map((j) =>
                    j.isCompleted ? { ...j, isOpen: false } : j,
                  ),
                }));
              }
            }}
          >
            <strong>
              <i className="fa-solid fa-circle-check"></i> Tamamlanan İşler (
              {completedJobs.length})
            </strong>
            <span>
              <i
                className={`fa-solid fa-chevron-${
                  completedOpen ? "down" : "right"
                }`}
              />
            </span>
          </div>
        </div>

        {completedOpen &&
          (completedJobs.length === 0 ? (
            <div className="card">Tamamlanan iş yok.</div>
          ) : (
            completedJobs
              .slice()
              .sort((a, b) => {
                const at = a.createdAt || new Date(a.date || 0).getTime() || 0;
                const bt = b.createdAt || new Date(b.date || 0).getTime() || 0;
                return bt - at; // newest first
              })
              .slice(0, 10)
              .map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  customersById={customersById}
                  toggleJobOpen={toggleJobOpen}
                  clockIn={clockIn}
                  clockOut={clockOut}
                  setEditingJobId={setEditingJobId}
                  setJobModalOpen={setJobModalOpen}
                  setConfirm={setConfirm}
                  markJobComplete={markJobComplete}
                  currency={currency}
                  onOpenActions={(jobId) => {
                    setEditingJobId(jobId);
                    setJobModalOpen(true);
                  }}
                />
              ))
          ))}
      </div>
    </div>
  );
}

export function CustomersPage({
  // data
  state,
  currency,
  filteredCustomers,
  visibleCustomerList,

  // pagination / search
  search,
  visibleCustomers,
  setVisibleCustomers,

  // ui
  setSelectedCustomerId,
  setCustDetailOpen,

  // helpers
  computeCustomerBalance,
}) {
  return (
    <div id="page-customers">
      <div id="customer-list">
        {filteredCustomers.length === 0 ? (
          <div className="card">Henüz müşteri yok.</div>
        ) : (
          visibleCustomerList.map((c) => {
            const balance = computeCustomerBalance(
              c.id,
              state.jobs,
              state.payments,
            );

            return (
              <div
                key={c.id}
                className="card list-item"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setSelectedCustomerId(c.id);
                  setCustDetailOpen(true);
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  {/* LEFT */}
                  <div>
                    <strong>
                      {c.name} {c.surname}
                    </strong>
                    <br />
                    <small>{c.phone || "Telefon yok"}</small>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "#666",
                      }}
                    >
                      ID:{" "}
                      <span style={{ fontFamily: "monospace" }}>{c.id}</span>
                    </div>
                  </div>

                  {/* RIGHT — BAKİYE */}
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: balance >= 0 ? "#16a34a" : "#dc2626",
                      minWidth: 90,
                      textAlign: "right",
                    }}
                  >
                    {balance >= 0 ? "+" : "-"}
                    {Math.abs(balance).toFixed(2)} {currency}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* LOAD MORE */}
      {!search && visibleCustomers < filteredCustomers.length && (
        <button
          className="load-more-btn"
          onClick={() => setVisibleCustomers((n) => n + 10)}
        >
          Daha fazla yükle
        </button>
      )}
    </div>
  );
}

export function SettingsPage({
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
                <div className="admin-meta">
                  <i className="fa-solid fa-phone"></i> {state.profile.phone}
                </div>
              )}

              {state.profile?.address && (
                <div className="admin-meta">
                  <i className="fa-solid fa-location-dot"></i>{" "}
                  {state.profile.address}
                </div>
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

      {/*   UPDATES & CHANGELOG */}
      <div className="card" style={{ marginTop: 20 }}>
        <div
          className="list-item"
          style={{ cursor: "pointer" }}
          onClick={() => setShowChangelog((v) => !v)}
        >
          <div>
            <strong>
              <i className="fa-solid fa-box-open"></i> Güncellemeler & Sürüm
              Geçmişi
            </strong>
            <div style={{ fontSize: 12, color: "#666" }}>
              Mevcut sürüm: v1.2.7
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

export function PublicCustomerSharePage() {
  const { id } = useParams();
  const [snap, setSnap] = useState(null);
  const [loading, setLoading] = useState(true);

  const printRef = useRef(null);

  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get("print") === "1";
  useEffect(() => {
    if (!autoPrint) return;
    if (!snap) return;

    // give browser time to render
    const t = setTimeout(() => {
      window.print();
    }, 500);

    return () => clearTimeout(t);
  }, [autoPrint, snap]);

  useEffect(() => {
    async function load() {
      try {
        const ref = doc(db, "public_customers", id);
        const s = await getDoc(ref);

        if (!s.exists()) {
          setSnap(null);
          setLoading(false);
          return;
        }

        setSnap(s.data());
      } catch (e) {
        console.error(e);
        setSnap(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>Yükleniyor...</div>;
  if (!snap) return <div style={{ padding: 20 }}>Müşteri bulunamadı.</div>;

  const customer = snap.customer;
  const jobs = snap.jobs || [];
  const payments = (snap.payments || []).filter((p) => p.source !== "job");

  const currency = snap.currency || "TRY";
  const balance = computeCustomerBalance(customer.id, jobs, payments);

  const totalPayment = payments
    .filter((p) => p.type === "payment")
    .reduce((sum, p) => sum + toNum(p.amount), 0);

  const totalDebt =
    payments
      .filter((p) => p.type === "debt")
      .reduce((sum, p) => sum + toNum(p.amount), 0) +
    jobs.reduce((sum, j) => sum + jobTotalOf(j), 0);

  // ✅ MIX jobs + payments into ONE historic timeline
  const unifiedHistory = [
    ...payments.map((p) => ({
      kind: "payment",
      id: `p_${p.id}`,
      sortKey: p.createdAt || new Date(p.date || 0).getTime() || 0,
      data: p,
    })),
    ...jobs.map((j) => ({
      kind: "job",
      id: `j_${j.id}`,
      sortKey: j.createdAt || new Date(j.date || 0).getTime() || 0,
      data: j,
    })),
  ].sort((a, b) => b.sortKey - a.sortKey);

  function printPage() {
    const html = printRef.current?.innerHTML;
    if (!html) return;

    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup engellendi");
      return;
    }

    w.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Müşteri İş Dökümü</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI; padding: 24px; }
          .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()" style="
          margin-bottom:16px;
          padding:10px 14px;
          background:#2563eb;
          color:white;
          border:none;
          border-radius:8px;
          font-weight:600;
          cursor:pointer;">
          Yazdır / PDF Kaydet
        </button>
        ${html}
      </body>
      </html>
    `);

    w.document.close();
    w.focus();
  }

  function renderJobForPrint(job, currency) {
    const hours =
      job.timeMode === "clock"
        ? clockHoursOf(job)
        : job.timeMode === "manual"
          ? calcHours(job.start, job.end)
          : 0;

    const laborTotal =
      job.timeMode === "fixed"
        ? toNum(job.fixedPrice)
        : hours * toNum(job.rate);

    const partsTotal = partsTotalOf(job);
    const grandTotal = laborTotal + partsTotal;

    return `
    <div class="card list-item" style="
      display:flex;
      justify-content:space-between;
      align-items:center;
    ">
      <!-- LEFT -->
      <div>
        <strong>
          <i class="fa-solid fa-screwdriver-wrench"></i> İş
        </strong>
        <div style="font-size:12px;color:#555;">
          ${job.date || "-"}
        </div>
      </div>

      <!-- RIGHT (AMOUNT) -->
      <div style="
        font-weight:700;
        color:#111;
        white-space:nowrap;
      ">
        ${money(grandTotal, currency)}
      </div>
    </div>
  `;
  }

  return (
    <>
      <div
        className="header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* LEFT SIDE (TEXT) */}
        <div style={{ flex: 1 }}>
          <h2>Müşteri İş Geçmişi</h2>

          <div style={{ fontSize: "0.9rem", marginTop: 5 }}>
            <strong>
              {customer.name} {customer.surname}
            </strong>{" "}
            — Borç: <strong>{money(balance, currency)}</strong>
          </div>

          {customer.phone && (
            <div style={{ marginTop: 6, fontSize: "0.85rem" }}>
              <i className="fa-solid fa-phone"></i>{" "}
              <a
                href={`tel:${customer.phone}`}
                style={{
                  color: "inherit",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                {customer.phone}
              </a>
            </div>
          )}

          {customer.address && (
            <div
              style={{
                marginTop: 4,
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.9)",
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              }}
            >
              <i className="fa-solid fa-location-dot"></i> {customer.address}
            </div>
          )}
        </div>

        {/* RIGHT SIDE (PRINT BUTTON) */}
        <button
          onClick={printPage}
          style={{
            height: 40,
            padding: "0 16px",
            borderRadius: 10,
            border: "none",
            background: "rgba(255,255,255,0.15)",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
          }}
        >
          <i className="fa-solid fa-print"></i>
          Yazdır
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          margin: "16px",
        }}
      >
        {/* TOPLAM TAHSİLAT */}
        <div
          className="card"
          style={{
            background: "#f0fdf4",
            textAlign: "center",
            padding: 14,
          }}
        >
          <div style={{ fontSize: 12, color: "#166534" }}>Toplam Tahsilat</div>
          <strong style={{ color: "#16a34a", fontSize: 16 }}>
            +{money(totalPayment, currency)}
          </strong>
        </div>

        {/* TOPLAM BORÇ */}
        <div
          className="card"
          style={{
            background: "#fef2f2",
            textAlign: "center",
            padding: 14,
          }}
        >
          <div style={{ fontSize: 12, color: "#7f1d1d" }}>Toplam Borç</div>
          <strong style={{ color: "#dc2626", fontSize: 16 }}>
            -{money(totalDebt, currency)}
          </strong>
        </div>

        {/* BAKİYE */}
        <div
          className="card"
          style={{
            background: balance >= 0 ? "#eff6ff" : "#fef2f2",
            textAlign: "center",
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: balance >= 0 ? "#1e40af" : "#7f1d1d",
            }}
          >
            Bakiye
          </div>
          <strong
            style={{
              fontSize: 16,
              color: balance >= 0 ? "#2563eb" : "#dc2626",
            }}
          >
            {money(balance, currency)}
          </strong>
        </div>
      </div>

      <div className="container">
        <div ref={printRef}>
          <div style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>📜 İşlem Geçmişi</h3>

            {unifiedHistory.length === 0 ? (
              <div className="card">Kayıt yok.</div>
            ) : (
              unifiedHistory.map((item) => {
                // =====================
                // PAYMENT / DEBT ROW
                // =====================
                if (item.kind === "payment") {
                  const p = item.data;
                  const isPayment = p.type === "payment";

                  return (
                    <div
                      key={item.id}
                      className="card list-item"
                      style={{
                        borderLeft: `6px solid ${
                          isPayment ? "#16a34a" : "#dc2626"
                        }`,
                        background: isPayment ? "#f0fdf4" : "#fef2f2",
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            color: isPayment ? "#166534" : "#7f1d1d",
                          }}
                        >
                          {isPayment ? (
                            <>
                              <i className="fa-solid fa-money-bill-wave"></i>{" "}
                              Tahsilat
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-file-invoice"></i> Borç
                            </>
                          )}
                        </strong>

                        {p.note && (
                          <div style={{ fontSize: 12, color: "#555" }}>
                            {p.note}
                          </div>
                        )}

                        <div style={{ fontSize: 12, color: "#777" }}>
                          {p.date}
                        </div>
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          color: isPayment ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {isPayment ? "+" : "-"}
                        {money(p.amount, p.currency || currency)}
                      </div>
                    </div>
                  );
                }

                // =====================
                // JOB ROW (PRINT — DETAILED)
                // =====================
                return (
                  <div
                    key={item.id}
                    dangerouslySetInnerHTML={{
                      __html: renderJobForPrint(item.data, currency),
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
