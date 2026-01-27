import React, { useEffect, useMemo, useRef, useState } from "react";
import { toNum } from "../utils/helpers";

import { ModalBase } from "./ModalBase";

import { useLang } from "../i18n/LanguageContext";

/**
 * vault RULES
 *
 * - vault balance represents REAL CASH
 * - Only "payment" transactions affect vault
 * - Debt transactions NEVER affect vault
 *
 * Net:
 *   net = totalPayment - totalDebt
 *
 * NOTE:
 * - vault can go negative if manually adjusted
 */

export function VaultDetailModal({
  open,
  onClose,
  vault,
  payments,
  jobs,
  onRenameVault,
  activeVaultId,
  setVaultDeleteConfirm,
  setState, // ✅ ADD
  zIndex = 2000, // ✅ DEFAULT
}) {
  const { t } = useLang();

  const [editingName, setEditingName] = useState(false);
  const [vaultName, setVaultName] = useState("");
  const printRef = useRef(null);

  useEffect(() => {
    if (open && vault) {
      setVaultName(vault.name);
      setEditingName(false);
    }
  }, [open, vault]);
  if (!open || !vault) return null;

  // ✅ ONLY payments
  const vaultPayments = (payments || []).filter(
    (p) => p.vaultId === vault.id && p.type === "payment",
  );

  const totalPayment = vaultPayments.reduce(
    (sum, p) => sum + toNum(p.amount),
    0,
  );

  const transactionCount = vaultPayments.length;

  const hasTransactions = transactionCount > 0;

  function printVault() {
    const html = printRef.current?.innerHTML;
    if (!html) return;

    const w = window.open("", "_blank");
    if (!w) {
      alert(t("popup_blocked"));
      return;
    }

    w.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>${t("vault_report_title")}</title>
      <style>
        body{font-family:Segoe UI,system-ui;padding:24px}
        h1{margin:0 0 6px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #ddd;padding:8px;font-size:12px}
        th{background:#f3f4f6}
        .right{text-align:right}
        @media print {
          button { display:none }
        }
      </style>
    </head>
    <body>
      <button onclick="window.print()" style="
        margin-bottom:12px;
        padding:10px 14px;
        background:#2563eb;
        color:white;
        border:none;
        border-radius:8px;
        font-weight:700;
        cursor:pointer;">
        ${t("vault_print_button")}
      </button>

      ${html}
    </body>
    </html>
  `);

    w.document.close();
    w.focus();
  }

  return (
    <ModalBase
      open={open}
      title={t("vault_detail_title")}
      onClose={onClose}
      zIndex={zIndex} // ✅ THIS IS THE KEY
    >
      <div className="vault-detail-page">
        <div className="vault-detail-card">
          {/* HEADER */}
          <div className="card">
            {!editingName ? (
              <div className="vault-header-row">
                <h3 className="vault-title">{vault.name}</h3>

                <button
                  className="vault-edit-btn"
                  onClick={() => setEditingName(true)}
                >
                  <i className="fa-solid fa-pen"></i>
                  <span>{t("edit")}</span>
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={vaultName}
                  onChange={(e) => setVaultName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-save"
                  onClick={() => {
                    onRenameVault(vault.id, vaultName);
                    setEditingName(false);
                  }}
                >
                  {t("save")}
                </button>
                <button
                  className="btn btn-cancel"
                  onClick={() => {
                    setVaultName(vault.name);
                    setEditingName(false);
                  }}
                >
                  {t("cancel")}
                </button>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <div
                style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}
              >
                {t("currency_label")}
              </div>

              <select
                value={vault.currency}
                onChange={(e) =>
                  onRenameVault(vault.id, { currency: e.target.value })
                }
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  padding: "0 10px",
                  fontSize: 14,
                }}
              >
                <option value="TRY">₺ Türk Lirası</option>
                <option value="USD">$ US Dollar</option>
                <option value="EUR">€ Euro</option>
              </select>
            </div>
          </div>

          <div className="btn-row" style={{ marginBottom: 12 }}>
            <button className="btn btn-save" onClick={printVault}>
              <i className="fa-solid fa-print"></i> {t("vault_print")}
            </button>
          </div>

          {/* PRIMARY PAYMENT */}
          <div className="card vault-primary-payment">
            <div className="label">{t("total_payment")}</div>

            <div className="amount">
              +{totalPayment.toFixed(2)} {vault.currency}
            </div>

            <div className="hint">
              <i className="fa-solid fa-money-bill-1"></i> {t("cash_received")}
            </div>
          </div>

          {/* COUNT */}
          <div className="card vault-transaction-count">
            {t("total_transaction_count")} <strong>{transactionCount}</strong>
          </div>

          {/* TRANSACTIONS LIST */}
          <div className="card vault-transactions-list">
            <div className="vault-transactions-header">
              <strong>{t("transactions") || "Transactions"}</strong>
              <span className="vault-transactions-sub">
                {transactionCount} {t("total_transaction_count") || "total"}
              </span>
            </div>

            {vaultPayments.length === 0 ? (
              <div className="vault-empty">
                {t("no_transactions") || "No transactions"}
              </div>
            ) : (
              <div className="vault-transactions-scroll">
                {vaultPayments
                  .slice()
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                  .map((p) => {
                    const dateText =
                      p.date ||
                      (p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString("tr-TR")
                        : "-");

                    return (
                      <div key={p.id} className="vault-tx-row">
                        <div className="vault-tx-left">
                          <div className="vault-tx-note">{p.note || "-"}</div>
                          <div className="vault-tx-meta">
                            <span>{dateText}</span>
                            {p.method ? (
                              <span className="vault-tx-method">
                                {p.method}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="vault-tx-right">
                          <div className="vault-tx-amount">
                            +{toNum(p.amount).toFixed(2)} {vault.currency}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="hidden">
            <div ref={printRef}>
              <h1>{t("vault_report_title")}</h1>
              <div style={{ color: "var(--muted)", marginBottom: 8 }}>
                {t("vault_label")}: <b>{vault.name}</b>
                <br />
                {t("currency_label")}: <b>{vault.currency}</b>
                <br />
                {t("date_label")}: {new Date().toLocaleDateString("tr-TR")}
              </div>

              <hr />

              <table>
                <thead>
                  <tr>
                    <th>{t("date_label")}</th>
                    <th>{t("type_label")}</th>
                    <th>{t("description_label")}</th>
                    <th>{t("method_label")}</th>
                    <th className="right">{t("amount_label")}</th>
                  </tr>
                </thead>
                <tbody>
                  {vaultPayments
                    .filter((p) => p.type === "payment")
                    .map((p) => (
                      <tr key={p.id}>
                        <td>{p.date}</td>
                        <td>
                          {p.type === "payment" ? t("payment") : t("debt")}
                        </td>
                        <td>{p.note || "-"}</td>
                        <td>{p.method || "-"}</td>
                        <td className="right">
                          {p.type === "payment" ? "+" : "-"}
                          {p.amount.toFixed(2)} {vault.currency}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              <hr />

              <div style={{ marginTop: 12 }}>
                <b>{t("total_payment")}:</b> +{totalPayment.toFixed(2)}{" "}
                {vault.currency}
                <br />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          className="btn btn-delete"
          style={{ width: "100%" }}
          disabled={hasTransactions}
          onClick={() => {
            if (hasTransactions) {
              alert(t("vault_cannot_delete_has_transactions"));
              return;
            }

            if (vault.id === activeVaultId) {
              alert(t("active_vault_cannot_delete"));
              return;
            }

            setVaultDeleteConfirm({
              open: true,
              vaultId: vault.id,
              text: "",
              transactionCount, // ✅ PASS REAL COUNT
            });
          }}
        >
          <i className="fa-solid fa-trash"></i>{" "}
          {hasTransactions ? t("vault_has_transactions") : t("delete_vault")}
        </button>

        {vault.id !== activeVaultId && (
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              className="btn btn-save"
              style={{ width: "100%" }}
              onClick={() => {
                setState((s) => ({
                  ...s,
                  activeVaultId: vault.id,
                }));
                onClose();
              }}
            >
              {t("make_vault_active")}
            </button>
          </div>
        )}
      </div>
    </ModalBase>
  );
}
