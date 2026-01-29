import React, { useEffect, useRef, useState, useMemo } from "react";

import { useLang } from "../i18n/LanguageContext";

// helpers (same ones you already use in App.jsx)
import { money, toNum, jobTotalOf } from "../utils/helpers";

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
