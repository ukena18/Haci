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
  // ✅ NEW
  editingTx = null, // payment or debt being edited
  onDelete = null,
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

  const isEdit = !!editingTx;

  const title =
    mode === "payment"
      ? isEdit
        ? t("edit_payment_title")
        : t("collect_payment_title")
      : isEdit
        ? t("edit_debt_title")
        : t("add_debt_title");

  const primaryLabel =
    mode === "payment"
      ? isEdit
        ? t("update_payment")
        : t("collect_payment")
      : isEdit
        ? t("update_debt")
        : t("add_debt");

  useEffect(() => {
    if (!open) return;

    const today = new Date().toISOString().slice(0, 10);

    if (editingTx) {
      // 🔁 EDIT MODE
      setAmount(String(editingTx.amount ?? ""));
      setNote(editingTx.note || "");
      setVaultId(editingTx.vaultId || activeVaultId || "");
      setMethod(editingTx.method || PAYMENT_METHOD.CASH);

      setAddDate(editingTx.addDate || editingTx.date || today);

      setDueDate(
        editingTx.dueDate ||
          (editingTx.dueDays != null
            ? addDaysToDate(
                editingTx.addDate || editingTx.date,
                editingTx.dueDays,
              )
            : ""),
      );
    } else {
      // ➕ CREATE MODE
      setAmount("");
      setNote("");
      setVaultId(activeVaultId || "");
      setMethod(PAYMENT_METHOD.CASH);

      setAddDate(today);
      setDueDate(addDaysToDate(today, 30));
    }
  }, [open, editingTx, activeVaultId]);

  if (!open) return null;

  function addDaysToDate(dateStr, days) {
    if (!dateStr || days == null) return "";
    const d = new Date(dateStr);
    d.setDate(d.getDate() + Number(days));
    return d.toISOString().slice(0, 10);
  }

  return (
    <div className="payment-backdrop" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>

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
          {/* PAYMENT DATE — ONLY FOR PAYMENT */}
          {mode === "payment" && (
            <div className="form-group">
              <label>{t("payment_date")}</label>
              <input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
              />
              <small style={{ color: "var(--muted)" }}>
                {t("payment_date_info")}
              </small>
            </div>
          )}

          {/* DEBT ADD DATE */}
          {mode === "debt" && (
            <div className="form-group">
              <label>{t("debt_add_date")}</label>
              <input
                type="date"
                value={addDate}
                onChange={(e) => {
                  const newDate = e.target.value;

                  setAddDate((prev) => {
                    const autoDue =
                      !dueDate || dueDate === addDaysToDate(prev, 30);

                    if (autoDue) {
                      setDueDate(addDaysToDate(newDate, 30));
                    }

                    return newDate;
                  });
                }}
              />
              <small style={{ color: "var(--muted)" }}>
                {t("debt_add_date_info")}
              </small>
            </div>
          )}
          {/* DUE DATE — ONLY FOR DEBT */}
          {mode === "debt" && (
            <div className="form-group">
              <label>{t("payment_due_date")}</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={addDate}
              />
              <small style={{ color: "var(--muted)" }}>
                {t("payment_due_info")}
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
            {/* DELETE — ONLY IN EDIT MODE */}
            {isEdit && (
              <button
                className="btn btn-delete"
                onClick={() => {
                  onDelete?.(editingTx);
                  onClose();
                }}
              >
                {t("delete")}
              </button>
            )}

            <button className="btn btn-cancel" onClick={onClose}>
              {t("cancel")}
            </button>

            <button
              className={mode === "payment" ? "btn btn-save" : "btn btn-delete"}
              onClick={() => {
                const payload = {
                  ...editingTx,
                  amount: Number(amount),
                  note,
                  vaultId,
                  addDate,
                  dueDate,
                  method: mode === "payment" ? method : null,
                  // ✅ normalize date fields
                  date: addDate,
                  addDate: mode === "debt" ? addDate : undefined,
                  dueDate: mode === "debt" ? dueDate : undefined,
                };

                onSubmit(payload);
                onClose();
              }}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
