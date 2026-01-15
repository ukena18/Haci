import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  uid,
  toNum,
  calcHours,
  money,
  makeEmptyCustomer,
  makeEmptyJob,
  partsTotalOf,
} from "../utils/helpers";

import {
  PAYMENT_METHOD,
  PAYMENT_METHOD_LABEL_TR,
  PAYMENT_METHOD_ICON,
  PAYMENT_TYPE_LABEL_TR,
  JOB_STATUS_LABEL_TR,
} from "../utils/labels";

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth";

import { publishCustomerSnapshot, saveUserData } from "../firestoreService";

/* ============================================================
   7) MODALS (Job / Customer / Customer Detail / Confirm)
============================================================ */

/**
 * Modal base
 * - matches your overlay style
 */
export function ModalBase({
  open,
  title,
  onClose,
  children,
  className = "",
  zIndex = 1000,
}) {
  if (!open) return null;

  return (
    <div
      className={`modal ${className}`}
      style={{ zIndex }}
      onClick={(e) => {
        e.stopPropagation(); // ✅ prevents bubbling to modal behind
        onClose(); // ✅ close this modal only
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()} // ✅ stop inside clicks
      >
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 10 }}
        >
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button
            className="btn btn-cancel"
            onClick={(e) => {
              e.stopPropagation(); // ✅ also prevents bubbling
              onClose();
            }}
            style={{ flex: "unset" }}
          >
            Kapat
          </button>
        </div>

        <div style={{ marginTop: 14 }}>{children}</div>
      </div>
    </div>
  );
}

/**
 * Confirm delete modal
 * - uses YES/NO question exactly as requested
 */
export function ConfirmModal({ open, message, onYes, onNo, requireText }) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const canConfirm = !requireText || typed === "SIL";

  return (
    <ModalBase
      open={open}
      title="Silme Onayı"
      onClose={onNo}
      className="confirm-modal"
      zIndex={4000}
    >
      <p style={{ marginTop: 0 }}>{message}</p>

      {requireText && (
        <div className="form-group">
          <label>
            Silmek için <b>SIL</b> yazın
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="SIL"
          />
        </div>
      )}

      <div className="btn-row">
        <button className="btn btn-cancel" onClick={onNo}>
          No
        </button>

        <button
          className="btn btn-delete"
          disabled={!canConfirm}
          style={{ opacity: canConfirm ? 1 : 0.5 }}
          onClick={onYes}
        >
          Yes
        </button>
      </div>
    </ModalBase>
  );
}

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
  const editing = editingCustomerId
    ? customers.find((c) => c.id === editingCustomerId)
    : null;

  const [draft, setDraft] = useState(makeEmptyCustomer());

  useEffect(() => {
    if (!open) return;

    // If editing, load existing; else create new
    if (editing) setDraft({ ...editing });
    else setDraft(makeEmptyCustomer());
  }, [open, editingCustomerId]); // eslint-disable-line

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
    // Required fields
    if (!draft.name.trim() || !draft.surname.trim()) {
      alert("Ad ve Soyad zorunludur.");
      return;
    }

    // Phone validation
    if (!isValidPhone(draft.phone)) {
      alert("Lütfen geçerli bir telefon numarası girin.");
      return;
    }

    // Email validation
    if (!isValidEmail(draft.email)) {
      alert("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }

    // Ensure unique ID
    const duplicate =
      customers.some((c) => c.id === draft.id) &&
      (!editing || editing.id !== draft.id);

    if (duplicate) {
      alert("Bu ID zaten var. Lütfen tekrar deneyin.");
      return;
    }

    onSave({ ...draft });
    onClose();
  }

  return (
    <ModalBase
      open={open}
      title={editing ? "Müşteri Düzenle" : "Yeni Müşteri"}
      onClose={onClose}
      zIndex={zIndex} // ✅ ADD THIS
    >
      <div className="customer-edit-modal">
        <div className="form-group">
          <label>Müşteri ID</label>
          <input value={draft.id} readOnly />
          <small style={{ color: "#666" }}>
            Bu ID paylaşım linki için kullanılır: <b>/customer/{draft.id}</b>
          </small>
        </div>
      </div>
      <div className="form-group">
        <label>Ad</label>
        <input
          value={draft.name}
          onChange={(e) => setField("name", e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Soyad</label>
        <input
          value={draft.surname}
          onChange={(e) => setField("surname", e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Telefon</label>
        <input
          type="tel"
          placeholder="+1 720 555 1234"
          value={draft.phone}
          onChange={(e) => setField("phone", e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>E-posta</label>
        <input
          type="email"
          placeholder="example@email.com"
          value={draft.email}
          onChange={(e) => setField("email", e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Adres</label>
        <textarea
          value={draft.address}
          onChange={(e) => setField("address", e.target.value)}
        />
      </div>

      <div className="btn-row">
        <button className="btn btn-cancel" onClick={onClose}>
          İptal
        </button>

        <button className="btn btn-save" onClick={save}>
          Kaydet
        </button>
      </div>

      {editing && (
        <div style={{ marginTop: 12 }}>
          <button
            className="btn btn-delete"
            style={{ width: "100%" }}
            onClick={() => {
              onDeleteCustomer();
              onClose();
            }}
          >
            Müşteriyi Sil
          </button>
        </div>
      )}
    </ModalBase>
  );
}

/**
 * Job add/edit modal (includes parts)
 * - manual edit is always possible
 * - parts add unlimited
 */
export function JobModal({
  open,
  onClose,
  customers,
  jobs,
  editingJobId,
  onSave,
  currency,
  setConfirm, // ✅ ADD
  fixedCustomerId = null, // ✅ ADD THIS
}) {
  const editing = editingJobId ? jobs.find((j) => j.id === editingJobId) : null;

  const [draft, setDraft] = useState(() => makeEmptyJob(customers));

  useEffect(() => {
    if (!open) return;

    if (editing) {
      // when editing, keep job's customerId
      setDraft({ ...editing, parts: editing.parts || [] });
    } else {
      // when creating new job
      const fresh = makeEmptyJob(customers);

      // ✅ if opened from customer detail, lock customerId
      if (fixedCustomerId) {
        fresh.customerId = fixedCustomerId;
      }

      setDraft(fresh);
    }
  }, [open, editingJobId, fixedCustomerId]); // ✅ include fixedCustomerId

  function setField(k, v) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function addPartRow() {
    setDraft((d) => ({
      ...d,
      parts: [
        ...(d.parts || []),
        { id: uid(), name: "", qty: null, unitPrice: null },
      ],
    }));
  }

  function updatePart(partId, patch) {
    setDraft((d) => ({
      ...d,
      parts: (d.parts || []).map((p) =>
        p.id === partId ? { ...p, ...patch } : p
      ),
    }));
  }

  function removePart(partId) {
    setDraft((d) => ({
      ...d,
      parts: (d.parts || []).filter((p) => p.id !== partId),
    }));
  }

  // Auto totals in modal
  const hours = useMemo(
    () => calcHours(draft.start, draft.end),
    [draft.start, draft.end]
  );
  const partsTotal = useMemo(
    () =>
      (draft.parts || []).reduce(
        (sum, p) => sum + toNum(p.qty) * toNum(p.unitPrice),
        0
      ),
    [draft.parts]
  );
  const laborTotal = draft.timeMode === "fixed" ? 0 : hours * toNum(draft.rate);

  const grandTotal =
    draft.timeMode === "fixed"
      ? toNum(draft.fixedPrice) + partsTotal
      : laborTotal + partsTotal;

  function save() {
    if (!draft.customerId) {
      alert("Müşteri seçmelisiniz.");
      return;
    }

    // Save with cleaned numeric fields
    onSave({
      ...draft,
      rate: toNum(draft.rate),
      parts: (draft.parts || []).map((p) => ({
        ...p,
        qty: toNum(p.qty),
        unitPrice: toNum(p.unitPrice),
      })),
      createdAt: draft.createdAt || Date.now(),
    });

    onClose();
  }

  return (
    <ModalBase
      open={open}
      title={editing ? "İşi Düzenle" : "Yeni İş Ekle"}
      onClose={onClose}
      zIndex={1300} // ✅ add this
    >
      {!fixedCustomerId ? (
        <div className="form-group">
          <label>Müşteri Seç</label>
          <select
            value={draft.customerId}
            onChange={(e) => setField("customerId", e.target.value)}
          >
            <option value="">Müşteri seçin</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.surname}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="form-group">
          <label>Müşteri</label>
          <input
            value={(() => {
              const c = customers.find((x) => x.id === fixedCustomerId);
              return c ? `${c.name} ${c.surname}` : "—";
            })()}
            readOnly
          />
        </div>
      )}

      <div className="form-group">
        <label>Tarih</label>
        <input
          type="date"
          value={draft.date}
          onChange={(e) => setField("date", e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Çalışma Zamanı Girişi</label>

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name="timeMode"
              checked={draft.timeMode === "manual"}
              onChange={() =>
                setDraft((d) => ({
                  ...d,
                  timeMode: "manual",
                  isRunning: false,
                  clockInAt: null,
                  clockOutAt: null,
                }))
              }
            />
            Manuel
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name="timeMode"
              checked={draft.timeMode === "clock"}
              onChange={() =>
                setDraft((d) => ({
                  ...d,
                  timeMode: "clock",
                  start: "",
                  end: "",
                }))
              }
            />
            Clock In / Out
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name="timeMode"
              checked={draft.timeMode === "fixed"}
              onChange={() =>
                setDraft((d) => ({
                  ...d,
                  timeMode: "fixed",
                  // optional cleanup:
                  start: "",
                  end: "",
                  rate: 0,
                  isRunning: false,
                  clockInAt: null,
                  clockOutAt: null,
                }))
              }
            />
            Sabit Ücret
          </label>
        </div>
      </div>

      {draft.timeMode !== "fixed" && (
        <>
          <div className="form-group">
            <label>Çalışma Saatleri (Başlangıç - Bitiş)</label>
            <div style={{ display: "flex", gap: 5 }}>
              <input
                type="time"
                value={draft.start}
                disabled={draft.timeMode !== "manual"}
                onChange={(e) => setField("start", e.target.value)}
              />

              <input
                type="time"
                value={draft.end}
                disabled={draft.timeMode !== "manual"}
                onChange={(e) => setField("end", e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Saatlik Ücret ({currency})</label>
            <input
              type="number"
              value={draft.rate}
              onChange={(e) => setField("rate", e.target.value)}
            />
          </div>
        </>
      )}

      {draft.timeMode === "fixed" && (
        <div className="form-group">
          <label>Sabit Ücret ({currency})</label>
          <input
            type="number"
            value={draft.fixedPrice}
            onChange={(e) => setField("fixedPrice", e.target.value)}
            placeholder="Örn: 120"
          />
          <small style={{ color: "#666" }}>
            Bu işin toplamı zamandan bağımsızdır.
          </small>
        </div>
      )}

      {/* Parts */}
      <div id="parca-container">
        <label>Kullanılan Parçalar</label>

        {(draft.parts || []).map((p) => (
          <div
            key={p.id}
            className="parca-item"
            style={{
              flexDirection: "column",
              background: "#f9fafb",
              padding: 10,
              borderRadius: 10,
              marginBottom: 8,
            }}
          >
            <input
              type="text"
              placeholder="Parça Adı (örn: Filtre)"
              value={p.name}
              onChange={(e) => updatePart(p.id, { name: e.target.value })}
            />

            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="number"
                placeholder="Adet"
                min="1"
                value={p.qty === null ? "" : p.qty}
                onChange={(e) => {
                  const v = e.target.value;
                  updatePart(p.id, {
                    qty: v === "" ? null : Number(v),
                  });
                }}
              />

              <input
                type="number"
                placeholder="Birim Fiyat"
                value={p.unitPrice === null ? "" : p.unitPrice}
                onChange={(e) => {
                  const v = e.target.value;
                  updatePart(p.id, {
                    unitPrice: v === "" ? null : Number(v),
                  });
                }}
              />

              <button
                onClick={() => removePart(p.id)}
                title="Parçayı sil"
                style={{
                  background: "#fee2e2",
                  border: "none",
                  color: "#991b1b",
                  borderRadius: 8,
                  padding: "0 10px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn"
        style={{ background: "#eee", color: "#333", marginBottom: 10 }}
        onClick={addPartRow}
      >
        + Parça Ekle
      </button>

      {/* Totals */}
      <div className="card" style={{ background: "#f9f9f9" }}>
        {draft.timeMode !== "fixed" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Çalışma Saati:</span>
              <strong>{hours.toFixed(2)} saat</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>İşçilik:</span>
              <strong>{money(laborTotal, currency)}</strong>
            </div>
          </>
        )}
        {draft.timeMode === "fixed" && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Sabit Ücret:</span>
            <strong>{money(draft.fixedPrice, currency)}</strong>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Parçalar:</span>
          <strong>{money(partsTotal, currency)}</strong>
        </div>
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #ddd",
            margin: "10px 0",
          }}
        />
        Toplam Tutar: <strong>{money(grandTotal, currency)}</strong>
      </div>

      <div className="form-group">
        <label>Not (opsiyonel)</label>
        <textarea
          value={draft.notes}
          onChange={(e) => setField("notes", e.target.value)}
        />
      </div>

      <div className="btn-row">
        {editing && (
          <button
            className="btn btn-delete"
            onClick={() => {
              onClose();
              setConfirm({
                open: true,
                type: "job",
                id: editingJobId,
                message: "Bu işi silmek istediğinize emin misiniz?",
              });
            }}
          >
            <i className="fa-solid fa-trash"></i> Sil
          </button>
        )}

        <button className="btn btn-cancel" onClick={onClose}>
          İptal
        </button>

        <button className="btn btn-save" onClick={save}>
          Kaydet
        </button>
      </div>
    </ModalBase>
  );
}

export function CustomerDetailModal({
  open,
  onClose,
  onOpenPayment,
  customer,
  jobs,
  currency, // ✅ ADD
  kasalar, // ✅ ADD
  activeKasaId, // ✅ ADD
  payments, //ADD this
  onDeleteJob,
  onEditCustomer,
  onDeleteCustomer,
  onEditJob,
  onAddJob,
  onUpdatePayment,
  setConfirm, // ✅ ADD THIS
}) {
  const [selectedKasaId, setSelectedKasaId] = useState("");
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
  const [editKasaId, setEditKasaId] = useState("");

  // "payment" | "debt"
  function isInRange(dateStr) {
    if (!dateStr) return false;

    const d = new Date(dateStr);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    if (from && d < from) return false;
    if (to && d > to) return false;

    return true;
  }

  const printRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    setPaymentAmount("");
    setPaymentNote("");

    // ✅ default kasa = active kasa
    setSelectedKasaId(activeKasaId || "");

    // ✅ default payment method
    setPaymentMethod("cash");
  }, [open]);

  function kasaNameOf(id) {
    return (kasalar || []).find((k) => k.id === id)?.name || "—";
  }

  function buildShareText() {
    if (!customer) return "";

    let text = "";

    text += `MÜŞTERİ HESAP DÖKÜMÜ\n`;
    text += `-------------------------\n`;
    text += `Müşteri: ${customer.name} ${customer.surname}\n`;
    text += `Telefon: ${customer.phone || "-"}\n`;
    text += `E-posta: ${customer.email || "-"}\n`;
    text += `Borç: ${money(customer.balanceOwed, currency)}\n`;
    text += `Tarih: ${new Date().toLocaleDateString("tr-TR")}\n\n`;

    /* 💰 PAYMENTS / DEBTS */
    if (customerPayments.length > 0) {
      text += `💰 TAHSİLAT / BORÇ KAYITLARI\n`;
      text += `-------------------------\n`;

      customerPayments.forEach((p) => {
        const typeLabel = PAYMENT_TYPE_LABEL_TR[p.type] || "—";
        const sign = p.type === "payment" ? "+" : "-"; // ✅ sign is logic, keep it

        text += `${p.date} | ${typeLabel}\n`;
        text += `Tutar: ${sign}${money(p.amount, p.currency || currency)}\n`;
        text += `Kasa: ${kasaNameOf(p.kasaId)}\n`;
        text += `Yöntem: ${PAYMENT_METHOD_LABEL_TR[p.method] || "—"}\n`;
        if (p.note) text += `Not: ${p.note}\n`;
        text += `\n`;
      });
    }

    /* 🧰 JOBS */
    if (customerJobs.length > 0) {
      text += `🧰 İŞLER\n`;
      text += `-------------------------\n`;

      customerJobs.forEach((j) => {
        const hours = calcHours(j.start, j.end);
        const partsTotal = partsTotalOf(j);

        const total = hours * toNum(j.rate) + partsTotal;

        text += `${j.date}\n`;
        text += `${j.start || "--:--"} - ${j.end || "--:--"} | ${hours.toFixed(
          2
        )} saat\n`;
        text += `Toplam: ${money(total, currency)}\n`;
        const statusKey = j.isCompleted ? "completed" : "open";
        text += `Durum: ${JOB_STATUS_LABEL_TR[statusKey]}\n\n`;
      });
    }

    return text.trim();
  }

  function sendByEmail() {
    if (!customer?.email) {
      alert("Bu müşteri için e-posta adresi yok.");
      return;
    }

    const subject = encodeURIComponent("Müşteri Hesap Dökümü");
    const body = encodeURIComponent(buildShareText());

    window.location.href = `mailto:${customer.email}?subject=${subject}&body=${body}`;
  }

  function sendByWhatsApp() {
    if (!customer?.phone) {
      alert("Bu müşteri için telefon numarası yok.");
      return;
    }

    // WhatsApp needs digits only usually (removes spaces, dashes, parentheses)
    const phone = customer.phone.replace(/[^\d+]/g, "");

    const text = encodeURIComponent(buildShareText());

    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  }

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

  const unifiedHistory = useMemo(() => {
    if (!customer) return [];

    const jobItems = customerJobs.map((j) => ({
      kind: "job",
      date: j.date,
      createdAt: j.createdAt || 0,
      data: j,
    }));

    const paymentItems = customerPayments
      .filter((p) => p.source !== "job") // ✅ HIDE job-paid tahsilat rows
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
      message: "Bu işlemi silmek istediğinize emin misiniz?",
    });
    setEditTx(null);
  }

  // helper: job total (manual + clock)
  function jobTotalOf(j) {
    const liveMs = j.isRunning && j.clockInAt ? Date.now() - j.clockInAt : 0;
    const totalMs = (j.workedMs || 0) + liveMs;

    const hours =
      j.timeMode === "clock" ? totalMs / 36e5 : calcHours(j.start, j.end);

    return hours * toNum(j.rate) + partsTotalOf(j);
  }

  // ✅ plus transactions (tahsilat button)
  const paymentsPlusTotal = useMemo(() => {
    return customerPayments
      .filter((p) => p.type === "payment")
      .reduce((sum, p) => sum + toNum(p.amount), 0);
  }, [customerPayments]);

  // ✅ minus transactions (borç button)
  const paymentsMinusTotal = useMemo(() => {
    return customerPayments
      .filter((p) => p.type === "debt")
      .reduce((sum, p) => sum + toNum(p.amount), 0);
  }, [customerPayments]);

  // ✅ jobs totals split by paid/unpaid
  const paidJobsTotal = useMemo(() => {
    if (!customer) return 0;
    return jobs
      .filter((j) => j.customerId === customer.id && j.isPaid)
      .reduce((sum, j) => sum + jobTotalOf(j), 0);
  }, [jobs, customer]);

  /**
   * UNCOLLECTED JOB VALUE
   *
   * Includes:
   * - Active jobs (not completed yet)
   * - Completed but unpaid jobs
   *
   * Excludes:
   * - Paid jobs
   */
  const unpaidJobsTotal = useMemo(() => {
    if (!customer) return 0;

    return jobs
      .filter(
        (j) =>
          j.customerId === customer.id &&
          (!j.isCompleted || // 🟡 ACTIVE JOBS
            (j.isCompleted && !j.isPaid)) // ⚙️ COMPLETED BUT UNPAID
      )
      .reduce((sum, j) => sum + jobTotalOf(j), 0);
  }, [jobs, customer]);

  // ✅ FINAL
  // i changed this because everytime i complete and paid  a job it will create a tahsialt on the background for it i wll not see it .
  // so i dont need total jobs for this any more it will create dublicate
  // const totalTahsilat = paymentsPlusTotal + paidJobsTotal; // all pluses
  const totalTahsilat = paymentsPlusTotal; // ✅ only payments

  const totalBorc = paymentsMinusTotal + unpaidJobsTotal; // all minuses
  const bakiye = totalTahsilat - totalBorc; // remaining

  async function shareAsPDF() {
    const html = printRef.current?.innerHTML;
    if (!html) return;

    // Create a printable window
    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup blocked. Please allow popups to export PDF.");
      return;
    }

    w.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Müşteri Döküm</title>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <style>
        body{font-family:Segoe UI,system-ui,Arial; padding:24px;}
        h1{font-size:18px;margin:0 0 8px 0;}
        .muted{color:#555;}
        table{width:100%;border-collapse:collapse;margin-top:16px;}
        th,td{border:1px solid #ddd;padding:8px;font-size:12px;text-align:left;}
        th{background:#f3f4f6;}
        @media print {
          button { display:none !important; }
        }
      </style>
    </head>
    <body>
      <div style="display:flex; gap:10px; margin-bottom:14px;">
        <button id="btnPrint" style="
          padding:10px 14px;border:none;border-radius:10px;
          background:#2563eb;color:white;font-weight:700;cursor:pointer;">
          Yazdır / PDF Kaydet
        </button>

        <button id="btnDownload" style="
          padding:10px 14px;border:none;border-radius:10px;
          background:#16a34a;color:white;font-weight:700;cursor:pointer;">
          İndir (HTML)
        </button>
      </div>

      ${html}

      <script>
        // Print button
        document.getElementById("btnPrint").onclick = () => window.print();

        // Simple download as HTML fallback (works everywhere)
        document.getElementById("btnDownload").onclick = () => {
          const blob = new Blob([document.documentElement.outerHTML], { type: "text/html;charset=utf-8" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "musteri-dokumu.html";
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        };

        // Auto-open print dialog (optional). Comment out if you only want buttons.
         
      </script>
    </body>
    </html>
  `);

    w.document.close();
    w.focus();
  }

  if (!open) return null;

  return (
    <ModalBase
      open={open}
      title="Müşteri Detayı"
      onClose={onClose}
      zIndex={1100} // ✅ add this
    >
      {!customer ? (
        <div className="card">Müşteri bulunamadı.</div>
      ) : (
        <>
          <div className="cust-header-card">
            <div className="cust-header-top">
              <div>
                <h3 className="cust-name">
                  {customer.name} {customer.surname}
                </h3>

                <div className="customer-meta">
                  <a
                    href={`tel:${customer.phone}`}
                    style={{
                      color: "inherit",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    <i className="fa-solid fa-phone"> </i>
                    {customer.phone}
                  </a>

                  {"       "}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <i className="fa-solid fa-location-dot"></i>
                    {customer.address}
                  </span>
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
                  customer,
                  jobs: customerJobs,
                  payments: customerPayments,
                  currency,
                });

                window.open(`/customer/${customer.id}`, "_blank");
              }}
            >
              <i className="fa-solid fa-globe"></i> Müşteri Portalını Aç
            </button>
          </div>
          {/* 📊 QUICK CUSTOMER STATS */}
          <div className="cust-stats">
            <div className="cust-stat">
              <div className="stat-label">Toplam Tahsilat</div>
              <div className="stat-value green">
                +{money(totalTahsilat, currency)}
              </div>
            </div>

            <div className="cust-stat">
              <div className="stat-label">Toplam Borç</div>
              <div className="stat-value red">{money(totalBorc, currency)}</div>
            </div>

            <div className="cust-stat">
              <div className="stat-label">Bakiye</div>
              <div className={`stat-value ${bakiye >= 0 ? "green" : "red"}`}>
                {money(bakiye, currency)}
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
                  <i className="fa-solid fa-money-bill-wave"></i> Tahsilat
                </button>

                <button
                  className="btn-primary red"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPayment("debt", customer);
                  }}
                >
                  <i className="fa-solid fa-file-invoice"></i> Borç
                </button>

                <button className="btn-primary blue" onClick={onAddJob}>
                  <i className="fa-solid fa-plus"></i> İş
                </button>
              </div>
            </div>
          </div>

          <div className="secondary-actions">
            <button onClick={shareAsPDF}>
              <i className="fa-solid fa-print"></i> PDF
            </button>
            <button onClick={sendByEmail}>
              <i className="fa-solid fa-envelope"></i>
              Mail
            </button>
            <button onClick={sendByWhatsApp}>
              <i className="fa-brands fa-whatsapp"></i> WA
            </button>
            <button onClick={onEditCustomer}>
              <i className="fa-solid fa-pen"></i>
            </button>
          </div>

          <hr />

          <div className="history-card">
            <div className="history-header">
              <h4>İş Geçmişi</h4>

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

            {/* 💰 Tahsilat / Borç Kayıtları */}
            {/* 💰 Tahsilat / Borç Kayıtları */}
            {unifiedHistory.length === 0 ? (
              <div className="card">Kayıt yok.</div>
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
                      className="card list-item"
                      style={{
                        borderLeft: `6px solid ${
                          isPayment ? "#16a34a" : "#dc2626"
                        }`,
                        background: isPayment ? "#f0fdf4" : "#fef2f2",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setEditTx(p);
                        setEditAmount(String(p.amount ?? ""));
                        setEditNote(p.note || "");
                        setEditDate(
                          p.date || new Date().toISOString().slice(0, 10)
                        );
                        setEditMethod(p.method || "cash");
                        setEditKasaId(p.kasaId || activeKasaId || "");
                      }}
                    >
                      <div>
                        <strong
                          style={{ color: isPayment ? "#166534" : "#7f1d1d" }}
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
                          {p.date}
                          {" • "}
                          Kasa: <b>{kasaNameOf(p.kasaId)}</b>
                          {" • "}
                          Yöntem:{" "}
                          <b>{PAYMENT_METHOD_LABEL_TR[p.method] || "—"}</b>
                        </div>
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          color: isPayment ? "#16a34a" : "#dc2626",
                          fontSize: 12,
                        }}
                      >
                        {isPayment ? "+" : "-"}
                        {money(p.amount, p.currency || currency)}
                      </div>
                    </div>
                  );
                }

                // ======================
                // JOB ROW
                // ======================
                const j = item.data;
                let jobStatusClass = "job-card";

                if (!j.isCompleted) {
                  jobStatusClass += " job-active"; // 🔴 active
                } else if (j.isCompleted && !j.isPaid) {
                  jobStatusClass += " job-unpaid"; // 🟠 completed unpaid
                } else if (j.isCompleted && j.isPaid) {
                  jobStatusClass += " job-paid"; // 🟢 paid
                }

                const liveMs =
                  j.isRunning && j.clockInAt ? Date.now() - j.clockInAt : 0;
                const totalMs = (j.workedMs || 0) + liveMs;

                const hours =
                  j.timeMode === "clock"
                    ? totalMs / 36e5
                    : calcHours(j.start, j.end);

                const partsTotal = partsTotalOf(j);
                const total = hours * toNum(j.rate) + partsTotal;

                return (
                  <div
                    key={j.id}
                    className={jobStatusClass}
                    style={{ cursor: "pointer" }}
                    onClick={() => onEditJob(j.id)}
                  >
                    <div>
                      <strong>{j.date}</strong>
                      <br />
                      <small>
                        {j.start || "--:--"}-{j.end || "--:--"} |{" "}
                        {hours.toFixed(2)} saat
                      </small>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <strong style={{ color: "var(--primary)" }}>
                        {money(total, currency)}
                      </strong>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Hidden print template for PDF */}
          <div className="hidden">
            <div ref={printRef}>
              <h1>Müşteri Dökümü</h1>
              <div className="muted">
                Tarih: {new Date().toLocaleDateString("tr-TR")}
              </div>
              <hr />
              <div>
                <b>Müşteri:</b> {customer.name} {customer.surname} <br />
                <b>ID:</b> {customer.id} <br />
                <b>Borç:</b> {money(customer.balanceOwed, currency)}
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Başlangıç</th>
                    <th>Bitiş</th>
                    <th>Kasa</th>
                    <th>Yöntem</th>
                    <th>Tutar</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 💰 Tahsilat / Borç */}
                  {customerPayments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.date}</td>
                      <td colSpan="2">
                        {PAYMENT_TYPE_LABEL_TR[p.type] || "—"}
                      </td>
                      <td>{kasaNameOf(p.kasaId)}</td>
                      <td>{PAYMENT_METHOD_LABEL_TR[p.method] || "—"}</td>
                      <td>
                        {p.type === "payment"
                          ? `+${money(p.amount, p.currency || currency)}`
                          : `-${money(p.amount, p.currency || currency)}`}
                      </td>
                      <td>{p.note}</td>
                    </tr>
                  ))}

                  {/* ⚙️ İşler */}
                  {customerJobs.map((j) => {
                    const hours = calcHours(j.start, j.end);
                    const partsTotal = partsTotalOf(j);
                    const total = hours * toNum(j.rate) + partsTotal;

                    return (
                      <tr key={j.id}>
                        <td>{j.date}</td>
                        <td>{j.start || "--:--"}</td>
                        <td>{j.end || "--:--"}</td>
                        <td>—</td>
                        <td>—</td>
                        <td>{money(total, currency)}</td>
                        <td>{j.isCompleted ? "Tamamlandı" : "Açık"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {editTx && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h3
              style={{
                marginTop: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {editTx.type === "payment" ? (
                <>
                  <i className="fa-solid fa-money-bill-wave"></i>
                  Tahsilat Düzenle
                </>
              ) : (
                <>
                  <i className="fa-solid fa-file-invoice"></i>
                  Borç Düzenle
                </>
              )}
            </h3>

            {/* KASA (only for Tahsilat) */}
            {editTx.type === "payment" && (
              <div className="form-group">
                <label>Kasa</label>
                <select
                  value={editKasaId}
                  onChange={(e) => setEditKasaId(e.target.value)}
                >
                  {kasalar.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* DATE */}
            <div className="form-group">
              <label>Tarih</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>

            {/* METHOD */}
            {editTx.type === "payment" && (
              <div className="form-group">
                <label>Yöntem</label>
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value)}
                >
                  <option value={PAYMENT_METHOD.CASH}>
                    {PAYMENT_METHOD_LABEL_TR[PAYMENT_METHOD.CASH]}
                  </option>

                  <option value={PAYMENT_METHOD.CARD}>
                    {PAYMENT_METHOD_LABEL_TR[PAYMENT_METHOD.CARD]}
                  </option>

                  <option value={PAYMENT_METHOD.TRANSFER}>
                    {PAYMENT_METHOD_LABEL_TR[PAYMENT_METHOD.TRANSFER]}
                  </option>
                </select>
              </div>
            )}

            {/* AMOUNT */}
            <div className="form-group">
              <label>Tutar</label>
              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>

            {/* NOTE */}
            <div className="form-group">
              <label>Not</label>
              <input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>

            {/* ACTIONS */}
            <div className="modal-actions">
              <button
                className="btn btn-delete"
                onClick={() => deleteTransaction(editTx.id)}
              >
                <i className="fa-solid fa-trash"></i>
              </button>

              <button
                className="btn btn-cancel"
                onClick={() => setEditTx(null)}
              >
                İptal
              </button>

              <button
                className="btn btn-save"
                onClick={() => {
                  onUpdatePayment({
                    ...editTx,
                    amount: toNum(editAmount),
                    note: editNote,
                    date: editDate,
                    method: editTx.type === "payment" ? editMethod : null,
                    kasaId:
                      editTx.type === "payment" ? editKasaId : editTx.kasaId,
                  });
                  setEditTx(null);
                }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalBase>
  );
}

export function PaymentActionModal({
  open,
  mode, // "payment" | "debt"
  onClose,
  customer,
  kasalar,
  activeKasaId,
  onSubmit,
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [kasaId, setKasaId] = useState(activeKasaId || "");
  const [method, setMethod] = useState(PAYMENT_METHOD.CASH);

  // ✅ NEW: date picker state (today default)
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setNote("");
    setKasaId(activeKasaId || "");
    setMethod("cash");
    setPaymentDate(new Date().toISOString().slice(0, 10));
  }, [open, activeKasaId]);

  if (!open) return null;

  return (
    <div className="payment-backdrop" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="payment-modal-header">
          <h3 style={{ margin: 0 }}>
            {mode === "payment" ? "Tahsilat Al" : "Borçlandır"}
          </h3>

          <button
            className="btn btn-cancel"
            onClick={onClose}
            style={{ flex: "unset" }}
          >
            Kapat
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          {/* thisis for kasa secimi for borclandirma and tahsilat yap  */}
          {mode === "payment" && (
            <div className="form-group">
              <label>Kasa</label>
              <select
                value={kasaId}
                onChange={(e) => setKasaId(e.target.value)}
              >
                <option value="">Kasa seçin</option>
                {kasalar.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Tarih</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          {/* Ödeme Yöntemi */}
          {mode === "payment" && (
            <div className="form-group">
              <div className="form-group">
                <label>Ödeme Yöntemi</label>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className={`btn ${
                      method === PAYMENT_METHOD.CASH ? "btn-save" : ""
                    }`}
                    onClick={() => setMethod(PAYMENT_METHOD.CASH)}
                  >
                    <i className="fa-solid fa-money-bill-wave"></i> Nakit
                  </button>

                  <button
                    type="button"
                    className={`btn ${method === "card" ? "btn-save" : ""}`}
                    onClick={() => setMethod(PAYMENT_METHOD.CARD)}
                  >
                    <i className="fa-solid fa-credit-card"></i> Kart
                  </button>

                  <button
                    type="button"
                    className={`btn ${method === "transfer" ? "btn-save" : ""}`}
                    onClick={() => setMethod(PAYMENT_METHOD.TRANSFER)}
                  >
                    <i className="fa-solid fa-building-columns"></i> Havale
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tutar */}
          <div className="form-group">
            <label>Tutar</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label>Açıklama / Not</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Örn: Avans, Parça ücreti"
            />
          </div>

          <div className="btn-row">
            <button className="btn btn-cancel" onClick={onClose}>
              İptal
            </button>

            <button
              className={mode === "payment" ? "btn btn-save" : "btn btn-delete"}
              onClick={() => {
                onSubmit(
                  amount,
                  note,
                  kasaId,
                  paymentDate,
                  mode === "payment" ? method : null
                );
                onClose();
              }}
            >
              {mode === "payment" ? "Tahsilat Al" : "Borçlandır"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileModal({ open, onClose, user, profile, setState }) {
  const [name, setName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setName(user?.displayName || "");
    setEmail(user?.email || "");

    // ✅ LOAD FROM FIRESTORE
    setPhone(profile?.phone || "");
    setAddress(profile?.address || "");

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  }, [open, user, profile]);

  async function reauthRequired() {
    if (!currentPassword) {
      throw new Error("Mevcut şifre zorunludur.");
    }

    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);
  }

  async function save() {
    try {
      setLoading(true);
      setError("");

      const emailChanged = email !== user.email;
      const wantsPasswordChange = newPassword || confirmPassword;

      // ✅ If changing email OR password → MUST reauth
      if (emailChanged || wantsPasswordChange) {
        await reauthRequired();
      }

      // ✅ Validate password change (if user typed anything)
      if (wantsPasswordChange) {
        if (!newPassword || !confirmPassword) {
          throw new Error("Yeni şifreyi iki kez girin.");
        }

        if (newPassword.length < 6) {
          throw new Error("Yeni şifre en az 6 karakter olmalıdır.");
        }

        if (newPassword !== confirmPassword) {
          throw new Error("Yeni şifreler eşleşmiyor.");
        }
      }

      // ✅ Update display name
      if (name !== user.displayName) {
        await updateProfile(user, { displayName: name });
      }

      // ✅ Update email
      if (emailChanged) {
        await updateEmail(user, email);
      }

      // ✅ Update password
      if (wantsPasswordChange) {
        await updatePassword(user, newPassword);
      }

      // ✅ SAVE extra profile fields to Firestore
      await saveUserData(user.uid, {
        profile: {
          phone,
          address,
        },
      });

      // ✅ UPDATE LOCAL STATE IMMEDIATELY
      setState((s) => ({
        ...s,
        profile: {
          ...(s.profile || {}),
          phone,
          address,
        },
      }));

      alert("Profil güncellendi ✅");
      onClose();
    } catch (err) {
      // friendlier firebase messages
      if (err?.code === "auth/wrong-password") {
        setError("Mevcut şifre yanlış.");
      } else if (err?.code === "auth/requires-recent-login") {
        setError("Güvenlik için tekrar giriş yapmanız gerekiyor.");
      } else {
        setError(err?.message || "Bir hata oluştu.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <ModalBase
      open={open}
      title="Profil Ayarları"
      onClose={onClose}
      zIndex={3000}
    >
      <div className="form-group">
        <label>Ad / Ünvan</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Adınız"
        />
      </div>

      <div className="form-group">
        <label>E-posta</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Telefon</label>
        <input
          type="tel"
          placeholder="+90 5xx xxx xx xx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Adres</label>
        <textarea
          rows={2}
          placeholder="Adres"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <hr />

      <div className="form-group">
        <label>Mevcut Şifre (E-posta / Şifre değişimi için zorunlu)</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      <div className="form-group">
        <label>Yeni Şifre</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Yeni şifre"
        />
        <div className="form-group">
          <label>Yeni Şifre (Tekrar)</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Yeni şifreyi tekrar girin"
          />
        </div>

        {error && (
          <div style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>
            {error}
          </div>
        )}
      </div>

      <div className="btn-row">
        <button className="btn btn-cancel" onClick={onClose}>
          İptal
        </button>

        <button className="btn btn-save" onClick={save} disabled={loading}>
          {loading ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </ModalBase>
  );
}
