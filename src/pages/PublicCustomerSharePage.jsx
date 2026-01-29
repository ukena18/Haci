import React, { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

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
        const res = await fetch(`/api/public-customers/${id}`);

        if (!res.ok) {
          setSnap(null);
          return;
        }

        const data = await res.json();
        setSnap(data);
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
