import { useEffect, useState } from "react";
import { useLang } from "../i18n/LanguageContext";
import { ModalBase } from "./ModalBase";
import { makeEmptyCustomer, validateCustomer } from "../utils/helpers";

/**
 * Customer add/edit modal
 */
export function CustomerModal({
  open,
  onClose,
  customers,
  editingCustomerId,
  onSave,
  onDeleteCustomer,
  zIndex = 1000, // ✅ ADD THIS
}) {
  const { t } = useLang();
  const editing = editingCustomerId
    ? customers.find((c) => c.id === editingCustomerId)
    : null;

  const [draft, setDraft] = useState(() => makeEmptyCustomer());

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;

    if (editing) {
      setDraft({ ...editing }); // ✏️ EDIT MODE
    } else {
      setDraft(makeEmptyCustomer()); // ➕ ADD MODE (RESET)
    }
  }, [open, editing]);

  function setField(k, v) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function isValidEmail(email) {
    if (!email) return true; // optional field
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidPhone(phone) {
    if (!phone) return true; // optional field
    return /^[0-9+\s()-]{7,20}$/.test(phone);
  }

  function save() {
    const { isValid, errors: validationErrors } = validateCustomer(draft);

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    if (!isValid) {
      setErrors(validationErrors);

      const firstErrorField = Object.keys(validationErrors)[0];
      document.querySelector(`[name="${firstErrorField}"]`)?.focus();

      return;
    }

    // Email validation (still optional)
    if (!isValidEmail(draft.email)) {
      setErrors((e) => ({ ...e, email: t("invalid_email") }));
      return;
    }

    // Ensure unique ID
    const duplicate =
      customers.some((c) => c.id === draft.id) &&
      (!editing || editing.id !== draft.id);

    if (duplicate) {
      alert(t("duplicate_customer_id"));
      return;
    }

    onSave({ ...draft });
    onClose();
  }

  return (
    <ModalBase
      open={open}
      title={editing ? t("edit_customer") : t("new_customer")}
      onClose={onClose}
      zIndex={zIndex}
    >
      {/* 🔹 SCROLLABLE CONTENT */}
      <div className="modal-scroll">
        <div className="customer-edit-modal">
          <div className="form-group">
            <label>{t("customer_id")}</label>
            <input value={draft.id} readOnly />
            <small style={{ color: "var(--muted)" }}>
              {t("customer_id_info")} <b>/customer/{draft.id}</b>
            </small>
          </div>
        </div>

        <div className="form-group">
          <label>
            {t("name")} <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            name="name"
            className={errors.name ? "input-error" : ""}
            value={draft.name}
            onChange={(e) => {
              setField("name", e.target.value);
              setErrors((err) => ({ ...err, name: null }));
            }}
          />
          {errors.name && <div className="error-text">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label>
            {t("surname")} <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            name="surname"
            className={errors.surname ? "input-error" : ""}
            value={draft.surname}
            onChange={(e) => {
              setField("surname", e.target.value);
              setErrors((err) => ({ ...err, surname: null }));
            }}
          />
          {errors.surname && <div className="error-text">{errors.surname}</div>}
        </div>

        <div className="form-group">
          <label>
            {t("phone")} <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            name="phone"
            className={errors.phone ? "input-error" : ""}
            type="tel"
            inputMode="tel"
            placeholder="+90 5xx xxx xx xx"
            value={draft.phone}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^\d+]/g, "");
              setField("phone", cleaned);
              setErrors((err) => ({ ...err, phone: null }));
            }}
          />
          {errors.phone && <div className="error-text">{errors.phone}</div>}
        </div>

        <div className="form-group">
          <label>{t("email")}</label>
          <input
            className={errors.email ? "input-error" : ""}
            type="email"
            placeholder="example@email.com"
            value={draft.email}
            onChange={(e) => {
              const raw = e.target.value;
              const lower = raw.toLowerCase();
              const cleaned = lower.replace(/[^a-z0-9@._+-]/g, "");
              setField("email", cleaned);
              setErrors((err) => ({ ...err, email: null }));
            }}
          />
          {errors.email && <div className="error-text">{errors.email}</div>}
        </div>

        <div className="form-group">
          <label>{t("address")}</label>
          <textarea
            value={draft.address}
            onChange={(e) => setField("address", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>{t("notes")}</label>
          <textarea
            value={draft.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder={t("notes_placeholder") || "Internal notes"}
            rows={3}
          />
        </div>
      </div>
      {/* 🔹 STICKY ACTIONS */}
      <div className="modal-actions">
        <button className="btn btn-cancel" onClick={onClose}>
          {t("cancel")}
        </button>

        <button className="btn btn-save" onClick={save}>
          {t("save")}
        </button>
      </div>

      {editing && (
        <div className="modal-actions" style={{ paddingTop: 0 }}>
          <button
            className="btn btn-delete"
            style={{ width: "100%" }}
            onClick={() => {
              onDeleteCustomer();
              onClose();
            }}
          >
            {t("delete_customer")}
          </button>
        </div>
      )}
    </ModalBase>
  );
}
