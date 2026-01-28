import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  toNum,
  money,
  jobTotalOf,
  calcHoursWithBreak,
  formatDateByLang,
  moneyForTransaction,
  PAYMENT_METHOD,
  PAYMENT_METHOD_LABEL_TR,
} from "../utils/helpers";

import { ModalBase } from "./ModalBase";

import { publishCustomerSnapshot } from "../firestoreService";

import { useLang } from "../i18n/LanguageContext";

export function CustomerDetailModal({
  open,
  onClose,
  onOpenPayment,
  customer,
  jobs,
  currency, // ✅ ADD
  vaults, // ✅ ADD
  activeVaultId, // ✅ ADD
  payments, //ADD this
  onDeleteJob,
  onEditCustomer,
  onDeleteCustomer,
  onEditJob,
  onAddJob,
  onUpdatePayment,
  setConfirm, // ✅ ADD THIS
}) {
  const { lang } = useLang();
  const { t } = useLang();

  const [selectedVaultId, setSelectedVaultId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editTx, setEditTx] = useState(null); // selected transaction to edit
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editMethod, setEditMethod] = useState("cash");
  const [editVaultId, setEditVaultId] = useState("");
  const [editDueDays, setEditDueDays] = useState("30");
  const [editDueDismissed, setEditDueDismissed] = useState(false);

  const displayCurrency = customer?.currency || null;

  function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function isInRange(dateStr) {
    if (!dateStr) return false;

    const d = parseLocalDate(dateStr);
    const from = fromDate ? parseLocalDate(fromDate) : null;
    const to = toDate ? parseLocalDate(toDate) : null;

    if (from && d < from) return false;
    if (to && d > to) return false;

    return true;
  }

  const portalUrl = customer
    ? `${window.location.origin}/customer/${customer.id}`
    : "";

  useEffect(() => {
    if (!open) return;

    setPaymentAmount("");
    setPaymentNote("");

    setSelectedVaultId(activeVaultId || "");
    setPaymentMethod("cash");
  }, [open]);

  function vaultNameOf(id) {
    return (vaults || []).find((k) => k.id === id)?.name || t("unknown");
  }

  function jobMetaLine(j, hours) {
    if (j.timeMode === "fixed") {
      return `${j.date} • ${t("fixed_price")}`;
    }

    if (j.timeMode === "clock") {
      return `${j.date} • ${t("start_stop")} • ${hours.toFixed(2)} ${t("hours")}`;
    }

    return `${j.date} • ${t("manual_entry")} • ${hours.toFixed(2)} ${t("hours")}`;
  }

  function buildShareText() {
    if (!customer) return "";

    let text = "";

    text += `${t("customer_account_statement").toUpperCase()}\n`;
    text += `-------------------------\n`;
    text += `${t("customer")}: ${customer.name} ${customer.surname}\n`;
    text += `${t("phone")}: ${customer.phone || "-"}\n`;
    text += `${t("email")}: ${customer.email || "-"}\n`;
    text += `${t("balance")}: ${money(balance, displayCurrency)}\n`;

    const today = new Date().toISOString().slice(0, 10);
    text += `${t("date")}: ${formatDateByLang(today, lang)}\n\n`;

    if (customerPayments.length > 0) {
      text += ` ${t("transaction_history").toUpperCase()}\n`;
      text += `-------------------------\n`;

      customerPayments.forEach((p) => {
        const typeLabel = p.type === "payment" ? t("payment") : t("debt");
        const sign = p.type === "payment" ? "+" : "-";

        text += `${formatDateByLang(p.date, lang)} | ${typeLabel}\n`;
        text += `${t("amount")}: ${sign}${moneyForTransaction(p.amount, p, customer)}\n`;
        text += `${t("vault")}: ${vaultNameOf(p.vaultId)}\n`;
        text += `${t("method_label")}: ${
          PAYMENT_METHOD_LABEL_TR[p.method] || t("unknown")
        }\n`;
        if (p.note) text += `${t("note")}: ${p.note}\n`;
        text += `\n`;
      });
    }

    if (customerJobs.length > 0) {
      text += ` ${t("jobs").toUpperCase()}\n`;
      text += `-------------------------\n`;

      customerJobs.forEach((j) => {
        const total = jobTotalOf(j);

        const hours =
          j.timeMode === "clock"
            ? ((j.workedMs || 0) +
                (j.isRunning && j.clockInAt ? Date.now() - j.clockInAt : 0)) /
              36e5
            : calcHoursWithBreak(j.start, j.end, j.breakMinutes);

        text += `${formatDateByLang(j.date, lang)}\n`;
        text += `${j.start || "--:--"} - ${j.end || "--:--"} | ${hours.toFixed(
          2,
        )} ${t("hours")}\n`;
        text += `${t("total")}: ${money(total, displayCurrency)}\n`;

        const statusKey = j.isCompleted
          ? t("completed_jobs")
          : t("active_jobs");

        text += `${t("job_status")}: ${statusKey}\n\n`;
      });
    }
    text += `\n-------------------------\n`;
    text += `${t("customer_portal")}:\n`;
    text += `${portalUrl}\n`;

    return text.trim();
  }

  function sendByEmail() {
    if (!customer?.email) {
      alert(t("send_email_missing"));
      return;
    }

    const subject = encodeURIComponent(t("customer_account_statement"));
    const body = encodeURIComponent(buildShareText());

    window.location.href = `mailto:${customer.email}?subject=${subject}&body=${body}`;
  }

  function sendByWhatsApp() {
    if (!customer?.phone) {
      alert(t("send_phone_missing"));
      return;
    }

    const phone = customer.phone.replace(/[^\d+]/g, "");
    const text = encodeURIComponent(buildShareText());

    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  }

  // 🔒 ALL customer payments (NO DATE FILTER)
  const allCustomerPayments = useMemo(() => {
    if (!customer) return [];
    return (payments || []).filter((p) => p.customerId === customer.id);
  }, [payments, customer]);

  // 🔒 ALL customer jobs (NO DATE FILTER)
  const allCustomerJobs = useMemo(() => {
    if (!customer) return [];
    return jobs.filter((j) => j.customerId === customer.id);
  }, [jobs, customer]);

  const customerJobs = useMemo(() => {
    if (!customer) return [];

    return jobs
      .filter((j) => j.customerId === customer.id)
      .filter((j) => {
        if (!fromDate && !toDate) return true;
        return isInRange(j.date);
      })
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [jobs, customer, fromDate, toDate]);

  const customerPayments = useMemo(() => {
    if (!customer) return [];

    return (payments || [])
      .filter((p) => p.customerId === customer.id)
      .filter((p) => {
        if (!fromDate && !toDate) return true;
        return isInRange(p.date);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [payments, customer, fromDate, toDate]);

  function jobTimeModeLabel(j) {
    if (j.timeMode === "manual") return t("manual_entry");
    if (j.timeMode === "clock") return t("clock_history");
    if (j.timeMode === "fixed") return t("fixed_price");
    return t("job");
  }

  const allowedVaults = customer?.currency
    ? vaults.filter((v) => v.currency === customer.currency)
    : vaults;

  const unifiedHistory = useMemo(() => {
    if (!customer) return [];

    const jobItems = customerJobs.map((j) => ({
      kind: "job",
      date: j.date,
      createdAt: j.createdAt || 0,
      data: j,
    }));

    const paymentItems = customerPayments
      .filter((p) => p.source !== "job") // ✅ HIDE job-paid Payment rows
      .map((p) => ({
        kind: "payment",
        date: p.date,
        createdAt: p.createdAt || 0,
        data: p,
      }));

    return [...jobItems, ...paymentItems].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();

      // 1) sort by date (newest first)
      if (da !== db) return db - da;

      // 2) if same date, sort by createdAt (newest first)
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [customerJobs, customerPayments, customer]);

  function deleteTransaction(txId) {
    setConfirm({
      open: true,
      type: "payment",
      id: txId,
      message: t("delete_transaction_confirm"),
    });
    setEditTx(null);
  }

  // ✅ PLUS (payments)
  const paymentsPlusTotal = useMemo(() => {
    return allCustomerPayments
      .filter((p) => p.type === "payment" && p.source !== "job")
      .reduce((sum, p) => sum + toNum(p.amount), 0);
  }, [allCustomerPayments]);

  // ✅ MINUS (debts)
  const paymentsMinusTotal = useMemo(() => {
    return allCustomerPayments
      .filter((p) => p.type === "debt")
      .reduce((sum, p) => sum + toNum(p.amount), 0);
  }, [allCustomerPayments]);

  // ✅ PAID JOBS
  const paidJobsTotal = useMemo(() => {
    return allCustomerJobs
      .filter((j) => j.isPaid)
      .reduce((sum, j) => sum + jobTotalOf(j), 0);
  }, [allCustomerJobs]);

  // ✅ UNPAID JOBS (active + completed unpaid)
  const unpaidJobsTotal = useMemo(() => {
    return allCustomerJobs
      .filter((j) => !j.isCompleted || (j.isCompleted && !j.isPaid))
      .reduce((sum, j) => sum + jobTotalOf(j), 0);
  }, [allCustomerJobs]);

  const totalPayment = paymentsPlusTotal + paidJobsTotal;

  const totalDebt = paymentsMinusTotal + unpaidJobsTotal; // all minuses
  const balance = totalPayment - totalDebt; // remaining

  async function shareAsPDF() {
    if (!customer) return;

    await publishCustomerSnapshot(customer.id, {
      customer: {
        id: customer.id,
        name: customer.name,
        surname: customer.surname,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
      },
      jobs,
      payments,
      currency: customer.currency,
    });

    const params = new URLSearchParams();

    // ✅ If user selected a date range → include it
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    // always print
    params.set("print", "1");

    const query = params.toString();
    const url = query
      ? `/customer/${customer.id}?${query}`
      : `/customer/${customer.id}?print=1`;

    window.open(url, "_blank");
  }

  if (!open) return null;

  return (
    <>
      <ModalBase
        open={open}
        title={t("customer_detail")}
        onClose={onClose}
        zIndex={1100} // ✅ add this
      >
        {!customer ? (
          <div className="card">{t("customer_not_found")}</div>
        ) : (
          <div className="modal-scroll">
            <div className="cust-header-card">
              <div className="cust-header-top">
                <div>
                  <h3 className="cust-name">
                    {customer.name} {customer.surname}
                  </h3>

                  <div className="customer-meta">
                    {customer.phone && (
                      <div className="customer-meta-line">
                        <a
                          href={`tel:${customer.phone}`}
                          style={{
                            color: "inherit",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          <i className="fa-solid fa-phone"></i> {customer.phone}
                        </a>
                      </div>
                    )}

                    {customer.address && (
                      <div className="customer-meta-line">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            customer.address,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "inherit",
                            textDecoration: "none",
                            fontWeight: 600,
                          }}
                        >
                          <i className="fa-solid fa-location-dot"></i>{" "}
                          {customer.address}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="cust-meta">
                    ID: <b style={{ fontFamily: "monospace" }}>{customer.id}</b>
                  </div>
                </div>
              </div>

              <button
                className="portal-btn"
                onClick={async () => {
                  if (!customer) return;

                  // customerJobs ve customerPayments zaten CustomerDetailModal içinde var
                  await publishCustomerSnapshot(customer.id, {
                    customer: {
                      id: customer.id,
                      name: customer.name,
                      surname: customer.surname,
                      phone: customer.phone,
                      email: customer.email,
                      address: customer.address,
                    },
                    jobs,
                    payments,
                    currency,
                  });

                  window.open(`/customer/${customer.id}`, "_blank");
                }}
              >
                <i className="fa-solid fa-globe"></i>{" "}
                {t("open_customer_portal")}
              </button>
            </div>

            {/* 📊 QUICK CUSTOMER STATS */}
            <div className="cust-stats">
              <div className="cust-stat">
                <div className="stat-label">{t("total_payment")}</div>
                <div className="stat-value green">
                  +{money(totalPayment, displayCurrency)}
                </div>
              </div>

              <div className="cust-stat">
                <div className="stat-label">{t("total_debt")}</div>
                <div className="stat-value red">
                  -{money(totalDebt, displayCurrency)}
                </div>
              </div>

              <div className="cust-stat">
                <div className="stat-label">{t("balance")}</div>
                <div className={`stat-value ${balance >= 0 ? "green" : "red"}`}>
                  {money(balance, displayCurrency)}
                </div>
              </div>
            </div>

            <hr />
            {/* Payment / debt */}
            {/* i basically add another button and havent changed payment amonut for debt button */}
            <div className="btn-row">
              <div style={{ flex: 1 }}>
                <div className="primary-actions">
                  <button
                    className="btn-primary green"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPayment("payment", customer);
                    }}
                  >
                    <i className="fa-solid fa-money-bill-wave"></i>{" "}
                    {t("payment")}
                  </button>

                  <button
                    className="btn-primary red"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPayment("debt", customer);
                    }}
                  >
                    <i className="fa-solid fa-file-invoice"></i> {t("debt")}
                  </button>

                  {onAddJob && (
                    <button className="btn-primary blue" onClick={onAddJob}>
                      {t("add_job")}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="secondary-actions">
              <button onClick={shareAsPDF}>
                <i className="fa-solid fa-print"></i> {t("pdf")}
              </button>
              <button onClick={sendByEmail}>
                <i className="fa-solid fa-envelope"></i> {t("mail")}
              </button>
              <button onClick={sendByWhatsApp}>
                <i className="fa-brands fa-whatsapp"></i> {t("whatsapp")}
              </button>
              <button onClick={onEditCustomer}>
                <i className="fa-solid fa-pen"></i>
              </button>
            </div>

            <hr />

            <div className="history-card">
              <div className="history-header">
                <h4>{t("job_history")}</h4>

                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>

              <div
                id="detail-history"
                style={{ marginTop: 8, fontSize: 12 }}
              ></div>

              {/* 💰 Payment / Debt Records */}
              {unifiedHistory.length === 0 ? (
                <div className="card">{t("no_records")}</div>
              ) : (
                unifiedHistory.map((item) => {
                  // ======================
                  // PAYMENT / DEBT ROW
                  // ======================
                  if (item.kind === "payment") {
                    const p = item.data;
                    const isPayment = p.type === "payment";

                    return (
                      <div
                        key={p.id}
                        className={`card list-item ${isPayment ? "payment-row" : "debt-row"}`}
                        style={{
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          onOpenPayment(
                            isPayment ? "payment" : "debt",
                            customer,
                            p,
                          );
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              color: isPayment
                                ? "var(--success)"
                                : "var(--danger)",
                            }}
                          >
                            {isPayment ? (
                              <>
                                <i className="fa-solid fa-money-bill-wave"></i>{" "}
                                {t("payment")}
                              </>
                            ) : (
                              <>
                                <i className="fa-solid fa-file-invoice"></i>{" "}
                                {t("debt")}
                              </>
                            )}
                          </strong>

                          {p.note &&
                            p.note !== t("default_payment_note") &&
                            p.note !== t("default_debt_note") && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#555",
                                  marginTop: 4,
                                }}
                              >
                                {p.note}
                              </div>
                            )}

                          <div style={{ fontSize: 12, color: "#777" }}>
                            {formatDateByLang(p.date, lang)}
                            {" • "}
                            {t("vault")}: <b>{vaultNameOf(p.vaultId)}</b>
                            {" • "}
                            {t("method_label")}:{" "}
                            <b>
                              {PAYMENT_METHOD_LABEL_TR[p.method] ||
                                t("unknown")}
                            </b>
                          </div>
                        </div>

                        <div
                          style={{
                            fontWeight: 700,
                            color: isPayment
                              ? "var(--success)"
                              : "var(--danger)",
                            fontSize: 12,
                          }}
                        >
                          {isPayment ? "+" : "-"}
                          {moneyForTransaction(p.amount, p, customer)}
                        </div>
                      </div>
                    );
                  }

                  // ======================
                  // JOB ROW
                  // ======================
                  const j = item.data;

                  const total = jobTotalOf(j);

                  const hours =
                    j.timeMode === "clock"
                      ? ((j.workedMs || 0) +
                          (j.isRunning && j.clockInAt
                            ? Date.now() - j.clockInAt
                            : 0)) /
                        36e5
                      : calcHoursWithBreak(j.start, j.end, j.breakMinutes);

                  return (
                    <div
                      key={j.id}
                      className="card list-item"
                      style={{
                        borderLeft: "6px solid var(--danger)",

                        cursor: "pointer",
                      }}
                      onClick={() => onEditJob(j.id)}
                    >
                      <div>
                        <strong style={{ color: "var(--danger)" }}>
                          <i className="fa-solid fa-briefcase"></i> {t("job")}
                        </strong>

                        <div style={{ fontSize: 12, color: "#777" }}>
                          {formatDateByLang(j.date, lang)}
                          {" • "}
                          <b>{jobTimeModeLabel(j)}</b>

                          {(j.timeMode === "clock" ||
                            j.timeMode === "manual") && (
                            <>
                              {" • "}
                              {hours.toFixed(2)} {t("hours")}
                            </>
                          )}

                          {j.timeMode === "fixed" && j.fixedDays != null && (
                            <>
                              {" • "}
                              {j.fixedDays} {t("days")}
                            </>
                          )}
                        </div>

                        {j.notes && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#555",
                              marginTop: 4,
                            }}
                          >
                            {j.notes}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          color: "var(--danger)",
                          fontSize: 12,
                        }}
                      >
                        -{moneyForTransaction(total, j, customer)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </ModalBase>
    </>
  );
}
