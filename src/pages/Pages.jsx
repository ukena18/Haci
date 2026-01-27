import React, { useEffect, useRef, useState, useMemo } from "react";
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
  defaultCurrency,
  financialSummary,
  paymentWatchList,
  customersById,
  activeJobs,
  activeJobsByCustomer,
  completedJobs,
  openCustomerFolders,

  paymentOpen,
  activeOpen,
  completedOpen,

  setPaymentOpen,
  setActiveOpen,
  setCompletedOpen,
  setState,
  state,
  toggleCustomerFolder,
  toggleJobOpen,
  clockIn,
  clockOut,
  markJobComplete,
  setEditingJobId,
  setJobModalOpen,
  setConfirm,

  JobCard,
}) {
  const { t } = useLang();
  const [summaryCurrency, setSummaryCurrency] = useState(defaultCurrency);

  const safePaymentWatchList = Array.isArray(paymentWatchList)
    ? paymentWatchList
    : [];

  const availableCurrencies = React.useMemo(() => {
    if (!customersById || customersById.size === 0) return [];

    return Array.from(
      new Set(
        Array.from(customersById.values())
          .map((c) => c?.currency)
          .filter(Boolean),
      ),
    );
  }, [customersById]);

  const jobsEnabled = state?.profile?.settings?.enableJobs !== false;

  useEffect(() => {
    if (defaultCurrency) {
      setSummaryCurrency(defaultCurrency);
    }
  }, [defaultCurrency]);

  const dueStats = useMemo(() => {
    const byCurrency = {};

    function ensure(cur) {
      if (!byCurrency[cur])
        byCurrency[cur] = { overdue: 0, upcoming: 0, total: 0 };
      return byCurrency[cur];
    }

    (paymentWatchList || []).forEach((item) => {
      const customer = customersById.get(item.ref.customerId);
      const cur = customer?.currency || defaultCurrency;

      // currency filter
      if (cur !== summaryCurrency) return;

      const amount =
        item.kind === "job" ? jobTotalOf(item.ref) : toNum(item.ref.amount);

      const bucket = ensure(cur);

      if (item.daysLeft <= 0) bucket.overdue += amount;
      else bucket.upcoming += amount;

      bucket.total += amount;
    });

    return byCurrency;
  }, [paymentWatchList, customersById, summaryCurrency, defaultCurrency]);

  const filteredSummary = {
    totalDebt: financialSummary.byCurrency?.[summaryCurrency]?.totalDebt || 0,
    totalPayment:
      financialSummary.byCurrency?.[summaryCurrency]?.totalPayment || 0,
    net:
      (financialSummary.byCurrency?.[summaryCurrency]?.totalPayment || 0) -
      (financialSummary.byCurrency?.[summaryCurrency]?.totalDebt || 0),
  };

  const summaryLines = useMemo(() => {
    const entries = Object.entries(financialSummary?.byCurrency || {});
    // keep stable order
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries;
  }, [financialSummary]);

  return (
    <div id="page-home" className="page-top-spacing">
      <div className="summary-toolbar">
        <select
          value={summaryCurrency}
          onChange={(e) => setSummaryCurrency(e.target.value)}
          className="currency-select"
        >
          {availableCurrencies.map((cur) => (
            <option key={cur} value={cur}>
              {cur}
            </option>
          ))}
        </select>
      </div>

      <div className="card fin-summary">
        {/* FINANCIAL SUMMARY */}

        <div className="fin-summary-grid">
          {/* TOTAL DEBT */}
          <div className="fin-card debt">
            <div className="label">{t("total_debt")}</div>
            <div className="value">
              - {money(filteredSummary.totalDebt, summaryCurrency)}
            </div>
          </div>

          {/* TOTAL PAYMENT */}
          <div className="fin-card payment">
            <div className="label">{t("total_payment")}</div>
            <div className="value">
              {summaryCurrency === "ALL"
                ? summaryLines.length
                  ? summaryLines.map(([cur, b]) => (
                      <div key={cur}>{money(b.totalPayment, cur)}</div>
                    ))
                  : money(0, defaultCurrency)
                : money(filteredSummary.totalPayment, summaryCurrency)}
            </div>
          </div>

          {/* NET STATUS */}
          <div
            className={`fin-card net ${
              filteredSummary.net < 0 ? "negative" : "positive"
            }`}
          >
            <div className="label">{t("net_status")}</div>
            <div className="value">
              {summaryCurrency === "ALL"
                ? summaryLines.length
                  ? summaryLines.map(([cur, b]) => (
                      <div key={cur}>{money(b.net, cur)}</div>
                    ))
                  : money(0, defaultCurrency)
                : money(filteredSummary.net, summaryCurrency)}
            </div>
          </div>
        </div>

        {/* DUE MONITOR */}
        <div className="due-section">
          <div className="due-monitor-grid">
            {/* OVERDUE */}
            <div className="due-card overdue">
              <div className="label">{t("overdue_amount")}</div>
              <div className="value">
                -{" "}
                {summaryCurrency === "ALL"
                  ? Object.entries(dueStats).map(([cur, b]) => (
                      <div key={cur}>{money(b.overdue, cur)}</div>
                    ))
                  : money(
                      dueStats?.[summaryCurrency]?.overdue || 0,
                      summaryCurrency,
                    )}
              </div>
            </div>

            {/* UPCOMING */}
            <div className="due-card upcoming">
              <div className="label">{t("upcoming_due")}</div>
              <div className="value">
                -{" "}
                {summaryCurrency === "ALL"
                  ? Object.entries(dueStats).map(([cur, b]) => (
                      <div key={cur}>{money(b.upcoming, cur)}</div>
                    ))
                  : money(
                      dueStats?.[summaryCurrency]?.upcoming || 0,
                      summaryCurrency,
                    )}
              </div>
            </div>

            {/* TOTAL */}
            <div className="due-card total">
              <div className="label">{t("total_due_exposure")}</div>
              <div className="value">
                -{" "}
                {summaryCurrency === "ALL"
                  ? Object.entries(dueStats).map(([cur, b]) => (
                      <div key={cur}>{money(b.total, cur)}</div>
                    ))
                  : money(
                      dueStats?.[summaryCurrency]?.total || 0,
                      summaryCurrency,
                    )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="job-list">
        <div className="card">
          <div
            className="list-item section-row"
            onClick={() => setPaymentOpen((o) => !o)}
          >
            <strong>
              <i className="fa-solid fa-bell"></i> {t("payment_tracking")} (
              {safePaymentWatchList.length})
            </strong>
            <i
              className={`fa-solid fa-chevron-${
                paymentOpen ? "down" : "right"
              } due-arrow`}
            />
          </div>
        </div>

        {paymentOpen &&
          (safePaymentWatchList.length === 0 ? (
            <div className="card muted-card">{t("no_tracked_jobs")}</div>
          ) : (
            safePaymentWatchList.map((item) => {
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
                    className={`card list-item due-item ${
                      daysLeft <= 0
                        ? "overdue"
                        : daysLeft <= 5
                          ? "warning"
                          : "ok"
                    }`}
                  >
                    <div>
                      <strong>
                        {c.name} {c.surname}
                      </strong>
                      {c.currency && (
                        <span className="currency-badge">{c.currency}</span>
                      )}

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

                      {money(jobTotalOf(job), c.currency || defaultCurrency)}
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
                    className={`card list-item due-item ${
                      daysLeft <= 0
                        ? "overdue"
                        : daysLeft <= 5
                          ? "warning"
                          : "ok"
                    }`}
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

                      {money(
                        debt.amount,
                        debt.currency || c.currency || defaultCurrency,
                      )}
                    </div>
                  </div>
                );
              }

              return null;
            })
          ))}
        {/* ACTIVE JOBS FOLDER */}
        {jobsEnabled && (
          <>
            <div className="card">
              <div
                className="list-item section-row"
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
                  <i className="fa-solid fa-circle-play"></i> {t("active_jobs")}{" "}
                  ({activeJobs.length})
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
                    const customerCurrency =
                      customer?.currency || defaultCurrency;

                    const totalAmount = jobs.reduce(
                      (sum, j) => sum + jobTotalOf(j),
                      0,
                    );

                    return (
                      <div key={customerId}>
                        <div
                          className="card list-item"
                          style={{ cursor: "pointer" }}
                          onClick={() => toggleCustomerFolder(customerId)}
                        >
                          <div>
                            <strong>
                              {customer
                                ? `${customer.name} ${customer.surname}`
                                : t("unknown")}
                            </strong>

                            <div
                              style={{ fontSize: 12, color: "var(--muted)" }}
                            >
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
                            <strong className="customer-debt-amount">
                              {money(totalAmount, customerCurrency)}
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
                                currency={customerCurrency}
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
          </>
        )}

        {/* COMPLETED JOBS FOLDER */}
        {jobsEnabled && (
          <>
            <div className="card" style={{ marginTop: 10 }}>
              <div
                className="list-item section-row"
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
                  <i className="fa-solid fa-circle-check"></i>{" "}
                  {t("completed_jobs")} ({completedJobs.length})
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
                    const at =
                      a.createdAt || new Date(a.date || 0).getTime() || 0;
                    const bt =
                      b.createdAt || new Date(b.date || 0).getTime() || 0;
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
                      currency={job.currency || defaultCurrency}
                      onOpenActions={(jobId) => {
                        setEditingJobId(jobId);
                        setJobModalOpen(true);
                      }}
                    />
                  ))
              ))}
          </>
        )}
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
    <div id="page-customers " className="page-top-spacing">
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
            const rowCurrency = c.currency || currency;

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
                        color: "var(--muted)",
                      }}
                    >
                      ID:{" "}
                      <span style={{ fontFamily: "monospace" }}>{c.id}</span>
                    </div>
                  </div>

                  {/* RIGHT — BALANCE */}
                  <div
                    className={`balance-amount ${balance >= 0 ? "positive" : "negative"}`}
                  >
                    {money(balance, rowCurrency)}
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
      {/* ADMIN HEADER */}
      <div className="settings-admin-card">
        <div className="admin-left">
          <div className="admin-avatar">
            {user?.email?.[0]?.toUpperCase() || "A"}
          </div>

          <div className="admin-info">
            <strong className="admin-name">
              {state.profile?.name ||
                user?.displayName ||
                t("settings.adminFallback")}
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
  const [openJobs, setOpenJobs] = useState(() => new Set());
  const COLOR_POSITIVE = "var(--success)";
  const COLOR_NEGATIVE = "var(--danger)";
  const COLOR_TEXT_MAIN = "var(--text)";
  const COLOR_TEXT_MUTED = "var(--muted)";

  function toggleJob(jobId) {
    setOpenJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

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
  const customerId = customer?.id;
  const jobs = (snap.jobs || []).filter((j) => j.customerId === customerId);

  const payments = (snap.payments || []).filter(
    (p) => p.customerId === customerId,
  );

  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  function isInRange(dateStr) {
    if (!dateStr) return false;

    const d = new Date(dateStr);
    if (fromDate && d < new Date(fromDate)) return false;
    if (toDate && d > new Date(toDate)) return false;

    return true;
  }

  const filteredJobs =
    fromDate || toDate ? jobs.filter((j) => isInRange(j.date)) : jobs;

  const filteredPayments =
    fromDate || toDate ? payments.filter((p) => isInRange(p.date)) : payments;

  const currency = snap.currency || "TRY";

  let totalPayment = 0;
  let totalDebt = 0;

  // ✅ payments & debts — MUST use filteredPayments
  filteredPayments.forEach((p) => {
    const amount = toNum(p.amount);
    if (p.type === "payment") totalPayment += amount;
    if (p.type === "debt") totalDebt += amount;
  });
  // jobs
  filteredJobs.forEach((j) => {
    const jobTotal = jobTotalOf(j);
    if (j.isPaid) totalPayment += jobTotal;
    else totalDebt += jobTotal;
  });

  const balance = totalPayment - totalDebt;

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

  function printableRow(item) {
    // PAYMENT / DEBT
    if (item.kind === "payment") {
      const p = item.data;
      const isPay = p.type === "payment";

      return {
        date: p.date || "-",
        type: isPay ? t("public.payment") : t("public.debt"),
        note: p.note || "-",
        amount: `${isPay ? "+" : "-"}${money(
          toNum(p.amount),
          p.currency || currency,
        )}`,
        positive: isPay,
      };
    }

    // JOB
    const j = item.data;
    const total = jobTotalOf(j);

    return {
      date: j.date || "-",
      type: t("public.job"),
      note: j.note || "-",
      amount: `-${money(total, currency)}`,
      positive: false,
    };
  }

  // ✅ MIX jobs + payments into ONE historic timeline
  const unifiedHistory = [
    ...filteredPayments.map((p) => ({
      kind: "payment",
      id: `p_${p.id}`,
      sortKey: p.createdAt || new Date(p.date || 0).getTime() || 0,
      data: p,
    })),
    ...filteredJobs.map((j) => ({
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

  function renderJobPrintRows(job) {
    const rows = [];

    const laborTotal = jobLaborTotal(job);
    const parts = job.parts || [];

    // 🧑‍🔧 Labor (description-only)
    if (laborTotal > 0) {
      rows.push(
        <tr key={`labor_${job.id}`} style={{ color: "#374151" }}>
          <td></td>
          <td style={{ paddingLeft: 20 }}>{t("public.labor")}</td>
          <td>{money(laborTotal, currency)}</td>
          <td></td> {/* ❌ NO total column value */}
        </tr>,
      );
    }

    // 🔧 Parts (description-only)
    parts.forEach((p, idx) => {
      rows.push(
        <tr key={`part_${job.id}_${idx}`} style={{ color: "#374151" }}>
          <td></td>
          <td style={{ paddingLeft: 20 }}>{t("public.part") || "Part"}</td>
          <td>
            {p.name} × {p.qty}
            {" — "}
            {money(partLineTotal(p), currency)}
            {p.note && (
              <div style={{ fontSize: 10, color: "#6b7280" }}>{p.note}</div>
            )}
          </td>
          <td></td> {/* ❌ NO total column value */}
        </tr>,
      );
    });

    return rows;
  }

  return (
    <div id="page-public" className="page-top-spacing">
      <div className="page-inner">
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
                  color: "var(--muted)",
                }}
              >
                {t("public.balance")}:{" "}
                <strong
                  style={{
                    color: balance >= 0 ? "var(--success)" : "var(--danger)",
                  }}
                >
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
                  color: "var(--text)",
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
            <button onClick={printPage} className="btn btn-print">
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
          <div className="card stat-card success">
            <div style={{ fontSize: 12, color: "var(--success)" }}>
              {t("public.totalPayment")}
            </div>
            <strong style={{ color: "var(--success)", fontSize: 16 }}>
              +{money(totalPayment, currency)}
            </strong>
          </div>

          {/* TOPLAM BORÇ */}
          <div
            className="card"
            style={{
              background:
                "color-mix(in srgb, var(--danger) 12%, var(--surface))",
              textAlign: "center",
              padding: 14,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--danger)" }}>
              {t("public.totalDebt")}
            </div>
            <strong style={{ color: "var(--danger)", fontSize: 16 }}>
              -{money(totalDebt, currency)}
            </strong>
          </div>

          {/* BAKİYE */}
          <div
            className="card"
            style={{
              background:
                balance >= 0
                  ? "color-mix(in srgb, var(--info) 12%, var(--surface))"
                  : "color-mix(in srgb, var(--danger) 12%, var(--surface))",
              textAlign: "center",
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: balance >= 0 ? "var(--info)" : "var(--danger)",
              }}
            >
              {t("public.balance")}
            </div>
            <strong
              style={{
                fontSize: 16,
                color: balance >= 0 ? "var(--info)" : "var(--danger)",
              }}
            >
              {money(balance, currency)}
            </strong>
          </div>
        </div>

        <div className="  screen-only">
          <div ref={printRef}>
            <div style={{ marginTop: 12, padding: 10 }}>
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
                          borderLeft: `6px solid ${isPayment ? "var(--success)" : "var(--danger)"}`,
                        }}
                      >
                        <div>
                          <strong style={{ color: COLOR_TEXT_MAIN }}>
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
                            <div
                              style={{ fontSize: 12, color: "var(--muted)" }}
                            >
                              {p.note}
                            </div>
                          )}

                          <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            {p.date}
                          </div>
                        </div>

                        <div
                          style={{
                            fontWeight: 700,
                            color: isPayment
                              ? "var(--success)"
                              : "var(--danger)",
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
                  // =====================
                  // JOB ROW (SCREEN — EXPANDABLE)
                  // =====================
                  const job = item.data;
                  const jobId = job.id || item.id; // fallback
                  const isOpen = openJobs.has(jobId);

                  const parts = job.parts || [];
                  const laborTotal = jobLaborTotal(job);
                  const partsTotal = partsTotalOf(job);
                  const grandTotal = laborTotal + partsTotal;

                  return (
                    <div
                      key={item.id}
                      className="card"
                      style={{
                        padding: 0,
                        overflow: "hidden",
                        borderLeft: `6px solid ${COLOR_NEGATIVE}`,
                        color: COLOR_TEXT_MAIN,
                      }}
                    >
                      {/* HEADER ROW (click to expand) */}
                      <div
                        className="list-item"
                        onClick={() => toggleJob(jobId)}
                        style={{
                          padding: "14px",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <i className="fa-solid fa-screwdriver-wrench"></i>{" "}
                            {t("public.job")}
                            <span
                              className={`folder-arrow ${isOpen ? "open" : ""}`}
                            >
                              ›
                            </span>
                          </strong>

                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--muted)",
                              marginTop: 4,
                            }}
                          >
                            {job.date || "-"}
                          </div>
                        </div>

                        <div style={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                          - {money(grandTotal, currency)}
                        </div>
                      </div>

                      {/* EXPANDED DETAILS */}
                      <div className={`job-folder ${isOpen ? "open" : ""}`}>
                        <div style={{ padding: "0 14px 14px" }}>
                          {/* Labor */}
                          <div className="miniRow" style={{ marginTop: 10 }}>
                            <span>{t("public.labor")}</span>
                            <strong>{money(laborTotal, currency)}</strong>
                          </div>

                          {/* Parts */}
                          <div className="miniRow" style={{ marginTop: 8 }}>
                            <span>{t("public.parts")}</span>
                            <strong>{money(partsTotal, currency)}</strong>
                          </div>

                          {/* Parts list */}
                          {parts.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: 13,
                                  marginBottom: 8,
                                }}
                              >
                                {t(
                                  "public.usedParts",
                                ) /* add this key or hardcode */ ||
                                  "Kullanılan Parçalar"}
                              </div>

                              {parts.map((p, i) => (
                                <div key={i} className="partLine">
                                  <span>
                                    {p.name} × {p.qty}
                                  </span>
                                  <strong>
                                    {money(partLineTotal(p), currency)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Total */}
                          <div
                            className="miniRow"
                            style={{
                              marginTop: 10,
                              fontWeight: 900,
                            }}
                          >
                            <span>{t("public.jobTotal")}</span>
                            <strong>{money(grandTotal, currency)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
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

          {/* TRANSACTIONS (PRINT) */}
          <div className="job">
            <h4>{t("public.historyTitle")}</h4>

            <table>
              <thead>
                <tr>
                  <th>{t("public.date") || "Date"}</th>
                  <th>{t("public.type") || "Type"}</th>
                  <th>{t("public.desc") || "Note"}</th>
                  <th style={{ textAlign: "right" }}>
                    {t("public.total") || "Amount"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {unifiedHistory.map((item) => {
                  // 💳 PAYMENT / DEBT (single row)
                  if (item.kind === "payment") {
                    const row = printableRow(item);

                    return (
                      <tr key={item.id}>
                        <td>{row.date}</td>
                        <td>{row.type}</td>
                        <td>{row.note}</td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            color: row.positive ? "#16a34a" : "#dc2626",
                          }}
                        >
                          {row.amount}
                        </td>
                      </tr>
                    );
                  }

                  // 🧾 JOB (multi-row)
                  const job = item.data;
                  const total = jobTotalOf(job);

                  return (
                    <React.Fragment key={item.id}>
                      {/* Job header */}
                      <tr>
                        <td>{job.date}</td>
                        <td>{t("public.job")}</td>
                        <td>{job.note || "-"}</td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 800,
                            color: "#dc2626",
                          }}
                        >
                          -{money(total, currency)}
                        </td>
                      </tr>

                      {/* Job details (labor + parts) */}
                      {renderJobPrintRows(job)}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

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
      </div>
    </div>
  );
}
