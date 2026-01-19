import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useLang } from "../i18n/LanguageContext";

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
  const { t } = useLang();

  return (
    <div id="page-home">
      {/* FINANCIAL SUMMARY */}
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
            {/* Total debt */}
            <div
              style={{
                color: "#7f1d1d",
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              {t("total_debt")}
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

          {/* Total payment */}
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
              {t("total_payment")}
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
            {t("net_status")}
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
        {/* 30-DAY PAYMENT TRACKING */}
        <div className="card">
          <div
            className="list-item section-header due-header"
            onClick={() => setPaymentOpen((o) => !o)}
          >
            <strong>
              <i className="fa-solid fa-bell"></i> {t("payment_tracking_30")} (
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
              {t("no_tracked_jobs")}
            </div>
          ) : (
            paymentWatchList.map((item) => {
              const { kind, ref, daysLeft, dueDate } = item;

              // =====================
              // JOB WATCH ITEM
              // =====================
              if (kind === "job") {
                const job = ref;
                const c = customersById.get(job.customerId);

                if (!c) return null;

                return (
                  <div
                    key={`job-${job.id}`}
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
                        {c.name} {c.surname}
                      </strong>
                      <br />
                      <small>
                        {daysLeft <= 0 ? (
                          <>
                            <i className="fa-solid fa-circle-xmark"></i>{" "}
                            {Math.abs(daysLeft)} {t("days_overdue")}
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-hourglass-half"></i>{" "}
                            {daysLeft} {t("days_left")}
                          </>
                        )}
                        <br />
                        {t("last_payment")}:{" "}
                        <b>{dueDate.toLocaleDateString("tr-TR")}</b>
                      </small>
                    </div>

                    <div style={{ fontWeight: 700 }}>
                      <button
                        className="due-dismiss-btn"
                        onClick={(e) => {
                          e.stopPropagation();

                          setState((s) => ({
                            ...s,
                            jobs: s.jobs.map((j) =>
                              j.id === job.id
                                ? { ...j, dueDismissed: true }
                                : j,
                            ),
                          }));
                        }}
                      >
                        <i className="fa-solid fa-check"></i>{" "}
                        {t("remove_from_tracking")}
                      </button>

                      {money(jobTotalOf(job), currency)}
                    </div>
                  </div>
                );
              }

              // =====================
              // DEBT WATCH ITEM
              // =====================
              if (kind === "debt") {
                const debt = ref;
                const c = customersById.get(debt.customerId);

                if (!c) return null;

                return (
                  <div
                    key={`debt-${debt.id}`}
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
                        {c.name} {c.surname}
                      </strong>
                      <br />
                      <small>
                        {daysLeft <= 0 ? (
                          <>
                            <i className="fa-solid fa-circle-xmark"></i>{" "}
                            {Math.abs(daysLeft)} {t("days_overdue")}
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-hourglass-half"></i>{" "}
                            {daysLeft} {t("days_left")}
                          </>
                        )}
                        <br />
                        {t("debt")} • {t("last_payment")}:{" "}
                        <b>{dueDate.toLocaleDateString("tr-TR")}</b>
                      </small>
                    </div>

                    <div style={{ fontWeight: 700 }}>
                      <button
                        className="due-dismiss-btn"
                        onClick={(e) => {
                          e.stopPropagation();

                          setState((s) => ({
                            ...s,
                            payments: s.payments.map((p) =>
                              p.id === debt.id
                                ? { ...p, dueDismissed: true }
                                : p,
                            ),
                          }));
                        }}
                      >
                        <i className="fa-solid fa-check"></i>{" "}
                        {t("remove_from_tracking")}
                      </button>

                      {money(debt.amount, debt.currency || currency)}
                    </div>
                  </div>
                );
              }

              return null;
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
              <i className="fa-solid fa-circle-play"></i> {t("active_jobs")} (
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
            <div className="card">{t("no_active_jobs")}</div>
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
                    <div
                      className="card list-item"
                      style={{ cursor: "pointer", background: "#f8fafc" }}
                      onClick={() => toggleCustomerFolder(customerId)}
                    >
                      <div>
                        <strong>
                          {customer
                            ? `${customer.name} ${customer.surname}`
                            : t("unknown")}
                        </strong>

                        <div style={{ fontSize: 12, color: "#666" }}>
                          {jobs.length} {t("active_job_count")}
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
              <i className="fa-solid fa-circle-check"></i> {t("completed_jobs")}{" "}
              ({completedJobs.length})
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
            <div className="card">{t("no_completed_jobs")}</div>
          ) : (
            completedJobs
              .slice()
              .sort((a, b) => {
                const at = a.createdAt || new Date(a.date || 0).getTime() || 0;
                const bt = b.createdAt || new Date(b.date || 0).getTime() || 0;
                return bt - at;
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
  const { t } = useLang();

  return (
    <div id="page-customers">
      <div id="customer-list">
        {filteredCustomers.length === 0 ? (
          <div className="card">{t("no_customers_yet")}</div>
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
                    <small>{c.phone || t("phone_missing")}</small>

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

                  {/* RIGHT — BALANCE */}
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
          {t("load_more")}
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
  setVaultListOpen,

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
  setAdvancedSettingsOpen,
}) {
  const { lang, changeLanguage, t } = useLang();

  return (
    <div className="settings-dashboard">
      <h2 className="settings-title">{t("settings.title")}</h2>

      {/* ADMIN HEADER */}
      <div className="settings-admin-card">
        <div className="admin-left">
          <div className="admin-avatar">
            {user?.email?.[0]?.toUpperCase() || "A"}
          </div>

          <div className="admin-info">
            <strong className="admin-name">
              {user?.displayName || t("settings.adminFallback")}
            </strong>

            <div className="admin-email">
              {user?.email || "admin@example.com"}
            </div>

            <span className="admin-role">ADMIN</span>
          </div>
        </div>

        <div className="admin-right">
          {state.profile?.phone && (
            <div className="admin-meta">
              <i className="fa-solid fa-phone"></i> {state.profile.phone}
            </div>
          )}

          {state.profile?.address && (
            <div className="admin-meta address">
              <i className="fa-solid fa-location-dot"></i>
              {state.profile.address}
            </div>
          )}

          <button className="logout-btn" onClick={() => signOut(auth)}>
            <i className="fa-solid fa-right-from-bracket"></i>{" "}
            {t("settings.logout")}
          </button>
        </div>
      </div>

      <div className="settings-grid">
        {/* LANGUAGE */}
        <div className="settings-card">
          <div className="settings-icon purple">
            <i className="fa-solid fa-language"></i>
          </div>

          <div className="settings-content">
            <h3>{t("settings.language.title")}</h3>
            <p>{t("settings.language.desc")}</p>

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                className={`btn ${lang === "tr" ? "btn-save" : ""}`}
                onClick={() => changeLanguage("tr")}
                type="button"
              >
                🇹🇷 TR
              </button>

              <button
                className={`btn ${lang === "en" ? "btn-save" : ""}`}
                onClick={() => changeLanguage("en")}
                type="button"
              >
                🇬🇧 EN
              </button>

              <button
                className={`btn ${lang === "de" ? "btn-save" : ""}`}
                onClick={() => changeLanguage("de")}
                type="button"
              >
                🇩🇪 DE
              </button>
            </div>
          </div>
        </div>

        {/* VAULTS */}
        <button
          className="settings-card"
          onClick={() => setVaultListOpen(true)}
          type="button"
        >
          <div className="settings-icon blue">
            <i className="fa-solid fa-vault"></i>
          </div>

          <div className="settings-content">
            <h3>{t("settings.vaults.title")}</h3>
            <p>{t("settings.vaults.desc")}</p>
          </div>

          <i className="fa-solid fa-chevron-right arrow"></i>
        </button>

        {/* PROFILE */}
        <button
          className="settings-card"
          onClick={() => setProfileOpen(true)}
          type="button"
        >
          <div className="settings-icon green">
            <i className="fa-solid fa-user-gear"></i>
          </div>

          <div className="settings-content">
            <h3>{t("settings.profile.title")}</h3>
            <p>{t("settings.profile.desc")}</p>
          </div>

          <i className="fa-solid fa-chevron-right arrow"></i>
        </button>

        {/* UPDATES */}
        <button
          className="settings-card"
          onClick={() => setShowChangelog(true)}
          type="button"
        >
          <div className="settings-icon orange">
            <i className="fa-solid fa-box-open"></i>
          </div>

          <div className="settings-content">
            <h3>{t("settings.updates.title")}</h3>
            <p>{t("settings.updates.desc")}</p>
          </div>

          <i className="fa-solid fa-chevron-right arrow"></i>
        </button>

        {/* Advanced settings */}
        <button
          className="settings-card"
          onClick={() => setAdvancedSettingsOpen(true)}
          type="button"
        >
          <div className="settings-icon gray">
            <i className="fa-solid fa-sliders"></i>
          </div>

          <div className="settings-content">
            <h3>{t("settings.advanced.title")}</h3>
            <p>{t("settings.advanced.desc")}</p>
          </div>

          <i className="fa-solid fa-chevron-right arrow"></i>
        </button>
      </div>
    </div>
  );
}

export function PublicCustomerSharePage() {
  const { t } = useLang();

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
    const tmr = setTimeout(() => {
      window.print();
    }, 500);

    return () => clearTimeout(tmr);
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

  if (loading) return <div style={{ padding: 20 }}>{t("public.loading")}</div>;
  if (!snap) return <div style={{ padding: 20 }}>{t("public.notFound")}</div>;

  const customer = snap.customer;
  const jobs = snap.jobs || [];
  const payments = (snap.payments || []).filter((p) => p.source !== "job");

  const currency = snap.currency || "TRY";
  const balance = computeCustomerBalance(customer.id, jobs, payments);

  const totalPayment = payments
    .filter((p) => p.type === "payment")
    .reduce((sum, p) => sum + toNum(p.amount), 0);

  function jobLaborTotal(job) {
    if (job.timeMode === "fixed") return toNum(job.fixedPrice);

    const hours =
      job.timeMode === "clock"
        ? clockHoursOf(job)
        : job.timeMode === "manual"
          ? calcHours(job.start, job.end)
          : 0;

    return hours * toNum(job.rate);
  }

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
    window.print();
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
          <i class="fa-solid fa-screwdriver-wrench"></i> ${t("public.job")}
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
        className="card"
        style={{
          margin: "16px",
          padding: "16px 18px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          {/* LEFT — CUSTOMER INFO */}
          <div>
            <h2 style={{ margin: 0 }}>
              {customer.name} {customer.surname}
            </h2>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#555",
              }}
            >
              {t("public.balance")}:{" "}
              <strong style={{ color: balance >= 0 ? "#16a34a" : "#dc2626" }}>
                {money(balance, currency)}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
                marginTop: 10,
                fontSize: 13,
                color: "#444",
              }}
            >
              {customer.phone && (
                <div>
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
                <div>
                  <i className="fa-solid fa-location-dot"></i>{" "}
                  {customer.address}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — PRINT BUTTON */}
          <button
            onClick={printPage}
            className="btn"
            style={{
              minWidth: 180,
              padding: "0 20px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <i className="fa-solid fa-print"></i>
            {t("public.print")}
          </button>
        </div>
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
          <div style={{ fontSize: 12, color: "#166534" }}>
            {t("public.totalPayment")}
          </div>
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
          <div style={{ fontSize: 12, color: "#7f1d1d" }}>
            {t("public.totalDebt")}
          </div>
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
            {t("public.balance")}
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

      <div className="container screen-only">
        <div ref={printRef}>
          <div style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>{t("public.historyTitle")}</h3>

            {unifiedHistory.length === 0 ? (
              <div className="card">{t("public.noRecords")}</div>
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
                              {t("public.payment")}
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-file-invoice"></i>{" "}
                              {t("public.debt")}
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
      {/* =========================
   PROFESSIONAL PRINT INVOICE
========================= */}
      <div className="print-invoice">
        {/* HEADER */}
        <div className="invoice-header">
          <div className="logo">⚡ Usta App</div>
          <div className="header-right">
            {new Date().toLocaleDateString("tr-TR")}
            <br />
            {t("public.statement")}
          </div>
        </div>

        {/* CUSTOMER */}
        <div className="customer">
          <strong>{t("public.customer")}:</strong> {customer.name}{" "}
          {customer.surname}
          <br />
          {customer.phone && (
            <>
              <strong>{t("public.phone")}:</strong> {customer.phone}
              <br />
            </>
          )}
          {customer.address && (
            <>
              <strong>{t("public.address")}:</strong> {customer.address}
              <br />
            </>
          )}
        </div>

        {/* JOBS */}
        {jobs.map((job, idx) => {
          const hours = job.timeMode === "fixed" ? null : clockHoursOf(job);

          const labor =
            job.timeMode === "fixed"
              ? toNum(job.fixedPrice)
              : hours * toNum(job.rate);

          const parts = job.parts || [];
          const partsTotal = partsTotalOf(job);
          const jobTotal = labor + partsTotal;

          return (
            <div className="job" key={job.id || idx}>
              <h4>
                {t("public.job")} #{idx + 1} – {job.date || "-"}
              </h4>

              {/* LABOR */}
              <div className="section-label">{t("public.labor")}</div>
              <table>
                <thead>
                  <tr>
                    <th>{t("public.desc")}</th>
                    <th>{t("public.hours")}</th>
                    <th>{t("public.unit")}</th>
                    <th>{t("public.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{job.note || t("public.laborFallback")}</td>
                    <td>{job.timeMode === "fixed" ? "-" : hours}</td>
                    <td>
                      {job.timeMode === "fixed"
                        ? money(job.fixedPrice, currency)
                        : money(job.rate, currency)}
                    </td>
                    <td>{money(labor, currency)}</td>
                  </tr>
                </tbody>
              </table>

              {/* PARTS */}
              {parts.length > 0 && (
                <>
                  <div className="section-label">{t("public.parts")}</div>
                  <table>
                    <thead>
                      <tr>
                        <th>{t("public.part")}</th>
                        <th>{t("public.qty")}</th>
                        <th>{t("public.unit")}</th>
                        <th>{t("public.total")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map((p, i) => (
                        <tr key={i}>
                          <td>{p.name}</td>
                          <td>{p.qty}</td>
                          <td>{money(p.price, currency)}</td>
                          <td>
                            {money(toNum(p.qty) * toNum(p.price), currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              <div className="subtotal">
                {t("public.jobTotal")}: {money(jobTotal, currency)}
              </div>
            </div>
          );
        })}

        {/* TOTALS */}
        <div className="totals">
          <table>
            <tbody>
              <tr>
                <td>
                  <strong>{t("public.totalDebt")}</strong>
                </td>
                <td>
                  <strong>{money(totalDebt, currency)}</strong>
                </td>
              </tr>
              <tr>
                <td>{t("public.totalPayment")}</td>
                <td className="paid">{money(totalPayment, currency)}</td>
              </tr>
              <tr>
                <td>{t("public.balance")}</td>
                <td className="balance">{money(balance, currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="footer">
          {t("public.thanks")}
          <br />
          {t("public.infoOnly")}
        </div>
      </div>
    </>
  );
}
