import React, { useEffect, useMemo, useRef, useState } from "react";
import { PAYMENT_METHOD } from "../utils/helpers";

import { useLang } from "../i18n/LanguageContext";

export function PaymentActionModal({
  open,
  mode, // "payment" | "debt"
  onClose,
  customer,
  vaults,
  activeVaultId,
  onSubmit,
}) {
  const allowedVaults = customer?.currency
    ? vaults.filter((v) => v.currency === customer.currency)
    : vaults;

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [vaultId, setVaultId] = useState(activeVaultId || "");
  const [method, setMethod] = useState(PAYMENT_METHOD.CASH);

  const [dueDate, setDueDate] = useState("");

  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));

  const { t } = useLang();

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setNote("");
    setVaultId(activeVaultId || "");
    setMethod(PAYMENT_METHOD.CASH);
    setAddDate(new Date().toISOString().slice(0, 10));

    setDueDate("");
  }, [open, activeVaultId]);

  if (!open) return null;

  return (
    <div className="payment-backdrop" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h3 style={{ margin: 0 }}>
            {mode === "payment"
              ? t("collect_payment_title")
              : t("add_debt_title")}
          </h3>

          <button
            className="btn btn-cancel"
            onClick={onClose}
            style={{ flex: "unset" }}
          >
            {t("close")}
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          {/* VAULT */}
          {mode === "payment" && (
            <div className="form-group">
              <label>{t("vault")}</label>
              <select
                value={vaultId}
                onChange={(e) => setVaultId(e.target.value)}
              >
                <option value="">{t("select_vault")}</option>
                {allowedVaults.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} ({k.currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* DEBT ADD DATE */}
          {mode === "debt" && (
            <div className="form-group">
              <label>{t("debt_add_date") || "Debt Date"}</label>
              <input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
              />
              <small style={{ color: "var(--muted)" }}>
                {t("debt_add_date_info") || "Date when the debt was created"}
              </small>
            </div>
          )}
          {/* DUE DATE — ONLY FOR DEBT */}
          {mode === "debt" && (
            <div className="form-group">
              <label>{t("payment_due_date") || "Due Date"}</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={addDate}
              />
              <small style={{ color: "var(--muted)" }}>
                {t("payment_due_info") ||
                  "Debt will be tracked until this date"}
              </small>
            </div>
          )}

          {/* PAYMENT METHOD */}
          {mode === "payment" && (
            <div className="form-group">
              <label>{t("payment_method")}</label>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className={`btn ${
                    method === PAYMENT_METHOD.CASH ? "btn-save" : ""
                  }`}
                  onClick={() => setMethod(PAYMENT_METHOD.CASH)}
                >
                  <i className="fa-solid fa-money-bill-wave"></i> {t("cash")}
                </button>

                <button
                  type="button"
                  className={`btn ${
                    method === PAYMENT_METHOD.CARD ? "btn-save" : ""
                  }`}
                  onClick={() => setMethod(PAYMENT_METHOD.CARD)}
                >
                  <i className="fa-solid fa-credit-card"></i> {t("card")}
                </button>

                <button
                  type="button"
                  className={`btn ${
                    method === PAYMENT_METHOD.TRANSFER ? "btn-save" : ""
                  }`}
                  onClick={() => setMethod(PAYMENT_METHOD.TRANSFER)}
                >
                  <i className="fa-solid fa-building-columns"></i>{" "}
                  {t("transfer")}
                </button>
              </div>
            </div>
          )}

          {/* AMOUNT */}
          <div className="form-group">
            <label>{t("amount")}</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* NOTE */}
          <div className="form-group">
            <label>{t("description_note")}</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("note_placeholder")}
            />
          </div>

          {/* ACTIONS */}
          <div className="btn-row">
            <button className="btn btn-cancel" onClick={onClose}>
              {t("cancel")}
            </button>
            <button
              className={mode === "payment" ? "btn btn-save" : "btn btn-delete"}
              onClick={() => {
                onSubmit({
                  amount,
                  note,
                  vaultId,

                  // ✅ EXPLICIT DATES
                  addDate,
                  dueDate,

                  // ✅ PAYMENT ONLY
                  method: mode === "payment" ? method : null,
                });

                onClose();
              }}
            >
              {mode === "payment" ? t("collect_payment") : t("add_debt")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
