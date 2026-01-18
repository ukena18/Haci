import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  uid,
  toNum,
  calcHours,
  money,
  makeEmptyCustomer,
  makeEmptyJob,
  jobTotalOf, // ✅ ADD THIS
  partsTotalOf,
  calcHoursWithBreak, // ✅ ADD THIS
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

function utcTimestampFromDateAndTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;

  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);

  return Date.UTC(y, m - 1, d, hh, mm);
}

function utcTimeFromTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

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
  vaults, // ✅ ADD
  activeVaultId, // ✅ ADD
  setConfirm, // ✅ ADD
  fixedCustomerId = null, // ✅ ADD THIS
}) {
  const editing = editingJobId ? jobs.find((j) => j.id === editingJobId) : null;
  const customerBoxRef = useRef(null);

  const [draft, setDraft] = useState(() => makeEmptyJob(customers));
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  const customerOptions = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();

    return (
      customers
        .map((c) => {
          // find last job activity
          const lastJob = jobs
            .filter((j) => j.customerId === c.id)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];

          return {
            ...c,
            lastActivity: lastJob?.createdAt || 0,
          };
        })
        // 🔥 newest activity first
        .sort((a, b) => b.lastActivity - a.lastActivity)
        // 🔍 search filter
        .filter((c) => {
          if (!q) return true;
          return `${c.name} ${c.surname}`.toLowerCase().includes(q);
        })
        // ⛔ limit to 10
        .slice(0, 10)
    );
  }, [customers, jobs, customerSearch]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        customerBoxRef.current &&
        !customerBoxRef.current.contains(e.target)
      ) {
        setCustomerDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      // when editing, keep job's customerId
      setDraft({
        ...editing,
        parts: editing.parts || [],
        sessions: editing.sessions || [],
      });
    } else {
      const fresh = makeEmptyJob(customers);

      // ✅ default kasa = active kasa
      fresh.vaultId = activeVaultId || "";

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
        p.id === partId ? { ...p, ...patch } : p,
      ),
    }));
  }

  function removePart(partId) {
    setDraft((d) => ({
      ...d,
      parts: (d.parts || []).filter((p) => p.id !== partId),
    }));
  }
  function recalcWorkedMsFromSessions(sessions = []) {
    return (sessions || []).reduce((sum, s) => {
      const inAt = toNum(s.inAt);
      const outAt = toNum(s.outAt);
      if (!inAt || !outAt) return sum;
      return sum + Math.max(0, outAt - inAt);
    }, 0);
  }

  // Auto totals in modal
  const hours = useMemo(() => {
    if (draft.timeMode !== "manual") return 0;
    return calcHoursWithBreak(draft.start, draft.end, draft.breakMinutes);
  }, [draft.start, draft.end, draft.breakMinutes, draft.timeMode]);

  const workingDays = useMemo(() => {
    if (!draft.plannedStartDate || !draft.plannedEndDate) return 0;

    const start = new Date(draft.plannedStartDate);
    const end = new Date(draft.plannedEndDate);

    const diffMs = end - start;
    if (diffMs < 0) return 0;

    // +1 so same day = 1 day
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }, [draft.plannedStartDate, draft.plannedEndDate]);

  const partsTotal = useMemo(
    () =>
      (draft.parts || []).reduce(
        (sum, p) => sum + toNum(p.qty) * toNum(p.unitPrice),
        0,
      ),
    [draft.parts],
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
    if (!draft.vaultId) {
      alert("İş için kasa seçmelisiniz.");
      return;
    }

    // Save with cleaned numeric fields
    onSave({
      ...draft,

      // ✅ IMPORTANT: if clock mode, workedMs must come from sessions
      workedMs:
        draft.timeMode === "clock"
          ? recalcWorkedMsFromSessions(draft.sessions)
          : draft.workedMs,

      // ✅ persist fixed job duration
      fixedDays: draft.timeMode === "fixed" ? workingDays : null,

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
        <div
          className="form-group"
          ref={customerBoxRef}
          style={{ position: "relative" }}
        >
          <label>Müşteri Seç</label>

          {/* SEARCH INPUT */}
          <input
            type="text"
            placeholder="Müşteri ara…"
            value={
              draft.customerId
                ? (() => {
                    const c = customers.find((x) => x.id === draft.customerId);
                    return c ? `${c.name} ${c.surname}` : "";
                  })()
                : customerSearch
            }
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              setCustomerDropdownOpen(true);
              setField("customerId", "");
            }}
            onFocus={() => setCustomerDropdownOpen(true)}
          />

          {/* DROPDOWN */}
          {customerDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 50,
                marginTop: 4,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                maxHeight: 260,
                overflowY: "auto",
                boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
              }}
            >
              {customerOptions.length === 0 ? (
                <div style={{ padding: 10, fontSize: 12, color: "#666" }}>
                  Sonuç bulunamadı
                </div>
              ) : (
                customerOptions.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      fontSize: 13,
                      borderBottom: "1px solid #f1f5f9",
                    }}
                    onClick={() => {
                      setField("customerId", c.id);
                      setCustomerSearch("");
                      setCustomerDropdownOpen(false);
                    }}
                  >
                    <strong>
                      {c.name} {c.surname}
                    </strong>
                    <div style={{ fontSize: 11, color: "#666" }}>
                      ID: {c.id}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
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
        <label>Kasa</label>
        <select
          value={draft.vaultId || ""}
          onChange={(e) => setField("vaultId", e.target.value)}
        >
          <option value="">Kasa seçin</option>
          {(vaults || []).map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Tarih</label>
        <input
          type="date"
          value={draft.date}
          onChange={(e) => setField("date", e.target.value)}
        />
      </div>
      {/* ============================= */}
      {/* ÇALIŞMA ZAMANI GİRİŞİ */}
      {/* ============================= */}
      <div className="form-group">
        <label>Çalışma Zamanı Girişi</label>

        {/* RADIO OPTIONS */}
        <div className="time-mode-row">
          <label className="time-mode-option">
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
            <span>Elle Giriş</span>
          </label>

          <label className="time-mode-option">
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
            <span>Saat Giriş/Çıkış</span>
          </label>

          <label className="time-mode-option">
            <input
              type="radio"
              name="timeMode"
              checked={draft.timeMode === "fixed"}
              onChange={() =>
                setDraft((d) => ({
                  ...d,
                  timeMode: "fixed",
                  start: "",
                  end: "",
                  rate: 0,
                  isRunning: false,
                  clockInAt: null,
                  clockOutAt: null,
                }))
              }
            />
            <span>Sabit Ücret</span>
          </label>
        </div>

        {/* 🔎 Time mode description (single block) */}
        <div className="time-mode-info" aria-live="polite">
          {draft.timeMode === "manual" ? (
            <>
              Başlangıç ve bitiş saatlerini elle girersiniz.
              <br />
              Toplam süreye göre işçilik hesaplanır.
            </>
          ) : draft.timeMode === "clock" ? (
            <>
              Çalışma süresi sayaç ile takip edilir.
              <br />
              Saat Giriş / Çıkış ile otomatik hesaplama yapılır.
            </>
          ) : (
            <>
              Bu işin toplam ücreti süreden bağımsızdır.
              <br />
              Girilen sabit fiyat üzerinden hesaplanır.
            </>
          )}
        </div>
      </div>

      {/* ============================= */}
      {/* CLOCK SESSION EDITOR (CLOCK ONLY) */}
      {/* ============================= */}
      {draft.timeMode === "clock" && (
        <div className="form-group">
          <label>Çalışma Geçmişi (Düzelt)</label>

          {(draft.sessions || []).length === 0 ? (
            <div style={{ fontSize: 12, color: "#666" }}>Henüz kayıt yok</div>
          ) : (
            (draft.sessions || []).map((s, idx) => (
              <div
                key={s.id || idx}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 12, width: 28 }}>#{idx + 1}</span>

                <input
                  type="time"
                  value={utcTimeFromTimestamp(s.inAt)}
                  onChange={(e) => {
                    const t = e.target.value;
                    setDraft((d) => ({
                      ...d,
                      sessions: d.sessions.map((x) =>
                        x.id === s.id
                          ? {
                              ...x,
                              inAt: utcTimestampFromDateAndTime(d.date, t),
                            }
                          : x,
                      ),
                    }));
                  }}
                />

                <input
                  type="time"
                  value={utcTimeFromTimestamp(s.outAt)}
                  onChange={(e) => {
                    const t = e.target.value;
                    setDraft((d) => ({
                      ...d,
                      sessions: d.sessions.map((x) =>
                        x.id === s.id
                          ? {
                              ...x,
                              outAt: utcTimestampFromDateAndTime(d.date, t),
                            }
                          : x,
                      ),
                    }));
                  }}
                />

                <button
                  type="button"
                  className="btn btn-delete"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      sessions: d.sessions.filter((x) => x.id !== s.id),
                    }))
                  }
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            ))
          )}

          {/* ✅ ADD BUTTON (ONLY ONCE) */}
          <button
            type="button"
            className="btn"
            style={{ marginTop: 8, background: "#eef2ff", color: "#1e40af" }}
            onClick={() =>
              setDraft((d) => {
                const dateStr = d.date || new Date().toISOString().slice(0, 10);
                const now = new Date();

                const hh = String(now.getHours()).padStart(2, "0");
                const mm = String(now.getMinutes()).padStart(2, "0");

                return {
                  ...d,
                  sessions: [
                    ...(d.sessions || []),
                    {
                      id: uid(),
                      inAt: utcTimestampFromDateAndTime(dateStr, `${hh}:${mm}`),
                      outAt: utcTimestampFromDateAndTime(
                        dateStr,
                        `${hh}:${mm}`,
                      ),
                    },
                  ],
                };
              })
            }
          >
            + Çalışma Ekle
          </button>
        </div>
      )}

      {/* ============================= */}
      {/* PLANLANAN İŞ SÜRESİ (FIXED ONLY) */}
      {/* ============================= */}
      {draft.timeMode === "fixed" && (
        <div className="form-group">
          {/* ✅ ONE LINE HEADER (like the other one) */}
          <label>Planlanan İş Süresi (Başlangıç - Bitiş)</label>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              style={{ flex: 1 }}
              type="date"
              value={draft.plannedStartDate || ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  plannedStartDate: e.target.value,
                }))
              }
            />

            <input
              style={{ flex: 1 }}
              type="date"
              value={draft.plannedEndDate || ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  plannedEndDate: e.target.value,
                }))
              }
            />
          </div>
        </div>
      )}

      {/* ============================= */}
      {/* MANUAL / CLOCK INPUTS */}
      {/* ============================= */}
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
          {draft.timeMode === "manual" && (
            <div className="form-group">
              <label>Öğle Molası (dakika)</label>

              <input
                type="number"
                min="0"
                step="5"
                placeholder="Örn: 30"
                value={draft.breakMinutes || ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    breakMinutes: Number(e.target.value) || 0,
                  }))
                }
              />

              <small style={{ color: "#6b7280" }}>
                Mola süresi toplam çalışmadan otomatik düşülür
              </small>
            </div>
          )}

          <div className="form-group">
            <label>Saatlik Ücret ({currency})</label>
            <input
              type="number"
              value={draft.rate}
              placeholder="Ücret"
              onChange={(e) => setField("rate", e.target.value)}
            />
          </div>
        </>
      )}

      {/* ============================= */}
      {/* FIXED PRICE */}
      {/* ============================= */}
      {draft.timeMode === "fixed" && (
        <div className="form-group">
          <label>Sabit Ücret ({currency})</label>
          <input
            type="number"
            value={draft.fixedPrice}
            placeholder="Ücret"
            onChange={(e) => setField("fixedPrice", e.target.value)}
          />
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
        {/* MANUAL / CLOCK */}
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

        {/* FIXED MODE */}
        {draft.timeMode === "fixed" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Çalışma Günü:</span>
              <strong>{workingDays} gün</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Sabit Ücret:</span>
              <strong>{money(draft.fixedPrice, currency)}</strong>
            </div>
          </>
        )}

        {/* COMMON */}
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

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>
            <strong>Toplam Tutar:</strong>
          </span>
          <strong>{money(grandTotal, currency)}</strong>
        </div>
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

  useEffect(() => {
    if (!open) return;

    setPaymentAmount("");
    setPaymentNote("");

    // ✅ default vault = active vault
    setSelectedVaultId(activeVaultId || "");

    // ✅ default payment method
    setPaymentMethod("cash");
  }, [open]);

  function vaultNameOf(id) {
    return (vaults || []).find((k) => k.id === id)?.name || "—";
  }

  function jobMetaLine(j, hours) {
    if (j.timeMode === "fixed") {
      return `${j.date} • Sabit Ücret`;
    }

    if (j.timeMode === "clock") {
      return `${j.date} • Saat Giriş/Çıkış • ${hours.toFixed(2)} saat`;
    }

    // manual
    return `${j.date} • Elle Giriş • ${hours.toFixed(2)} saat`;
  }

  function buildShareText() {
    if (!customer) return "";

    let text = "";

    text += `MÜŞTERİ HESAP DÖKÜMÜ\n`;
    text += `-------------------------\n`;
    text += `Müşteri: ${customer.name} ${customer.surname}\n`;
    text += `Telefon: ${customer.phone || "-"}\n`;
    text += `E-posta: ${customer.email || "-"}\n`;
    text += `Borç: ${money(balance, currency)}\n`;

    text += `Tarih: ${new Date().toLocaleDateString("tr-TR")}\n\n`;

    /*  PAYMENTS / DEBTS */
    if (customerPayments.length > 0) {
      text += ` TAHSİLAT / BORÇ KAYITLARI\n`;
      text += `-------------------------\n`;

      customerPayments.forEach((p) => {
        const typeLabel = PAYMENT_TYPE_LABEL_TR[p.type] || "—";
        const sign = p.type === "payment" ? "+" : "-"; // sign is logic, keep it

        text += `${p.date} | ${typeLabel}\n`;
        text += `Tutar: ${sign}${money(p.amount, p.currency || currency)}\n`;
        text += `Kasa: ${vaultNameOf(p.vaultId)}\n`;
        text += `Yöntem: ${PAYMENT_METHOD_LABEL_TR[p.method] || "—"}\n`;
        if (p.note) text += `Not: ${p.note}\n`;
        text += `\n`;
      });
    }

    /*  JOBS */
    if (customerJobs.length > 0) {
      text += ` İŞLER\n`;
      text += `-------------------------\n`;

      customerJobs.forEach((j) => {
        const total = jobTotalOf(j); // ✅ SINGLE SOURCE OF TRUTH

        const hours =
          j.timeMode === "clock"
            ? ((j.workedMs || 0) +
                (j.isRunning && j.clockInAt ? Date.now() - j.clockInAt : 0)) /
              36e5
            : calcHoursWithBreak(j.start, j.end, j.breakMinutes);

        text += `${j.date}\n`;
        text += `${j.start || "--:--"} - ${j.end || "--:--"} | ${hours.toFixed(
          2,
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

  function jobTimeModeLabel(j) {
    if (j.timeMode === "manual") return "Elle Giriş";
    if (j.timeMode === "clock") return "Saat Giriş / Çıkış";
    if (j.timeMode === "fixed") return "Sabit Ücret";
    return "İş";
  }

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
      message: "Bu işlemi silmek istediğinize emin misiniz?",
    });
    setEditTx(null);
  }

  // ✅ plus transactions (Payment button)
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
          (!j.isCompleted || // ACTIVE JOBS
            (j.isCompleted && !j.isPaid)), // COMPLETED BUT UNPAID
      )
      .reduce((sum, j) => sum + jobTotalOf(j), 0);
  }, [jobs, customer]);

  const totalPayment = paymentsPlusTotal + paidJobsTotal;

  const totalDebt = paymentsMinusTotal + unpaidJobsTotal; // all minuses
  const balance = totalPayment - totalDebt; // remaining

  async function shareAsPDF() {
    if (!customer) return;

    // Ensure snapshot exists (you already do this)
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

    // 🔥 open portal WITH print flag
    window.open(`/customer/${customer.id}?print=1`, "_blank");
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
                      <i className="fa-solid fa-location-dot"></i>{" "}
                      {customer.address}
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
              <i className="fa-solid fa-globe"></i> Müşteri Portalını Aç
            </button>
          </div>
          {/* 📊 QUICK CUSTOMER STATS */}
          <div className="cust-stats">
            <div className="cust-stat">
              <div className="stat-label">Toplam Tahsilat</div>
              <div className="stat-value green">
                +{money(totalPayment, currency)}
              </div>
            </div>

            <div className="cust-stat">
              <div className="stat-label">Toplam Borç</div>
              <div className="stat-value red">{money(totalDebt, currency)}</div>
            </div>

            <div className="cust-stat">
              <div className="stat-label">Bakiye</div>
              <div className={`stat-value ${balance >= 0 ? "green" : "red"}`}>
                {money(balance, currency)}
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

            {/* 💰 Payment / Borç Kayıtları */}
            {/* 💰 Payment / Borç Kayıtları */}
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
                          p.date || new Date().toISOString().slice(0, 10),
                        );
                        setEditMethod(p.method || "cash");
                        setEditVaultId(p.vaultId || activeVaultId || "");
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

                        {p.note &&
                          p.note !== "Tahsilat" &&
                          p.note !== "Borç" && (
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
                          Kasa: <b>{vaultNameOf(p.vaultId)}</b>
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

                const liveMs =
                  j.isRunning && j.clockInAt ? Date.now() - j.clockInAt : 0;

                const total = jobTotalOf(j);

                // ⏱ hours is ONLY for display
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
                      borderLeft: "6px solid #dc2626",
                      background: "#fef2f2",
                      cursor: "pointer",
                    }}
                    onClick={() => onEditJob(j.id)}
                  >
                    <div>
                      <strong style={{ color: "#7f1d1d" }}>
                        <i className="fa-solid fa-briefcase"></i> İş
                      </strong>

                      <div style={{ fontSize: 12, color: "#777" }}>
                        {j.date}
                        {" • "}
                        <b>{jobTimeModeLabel(j)}</b>

                        {/* CLOCK → total hours */}
                        {j.timeMode === "clock" && (
                          <>
                            {" • "}
                            {hours.toFixed(2)} saat
                          </>
                        )}

                        {/* MANUAL → entered hours */}
                        {j.timeMode === "manual" && (
                          <>
                            {" • "}
                            {hours.toFixed(2)} saat
                          </>
                        )}

                        {/* FIXED → always 1 day */}
                        {j.timeMode === "fixed" && j.fixedDays != null && (
                          <>
                            {" • "}
                            {j.fixedDays} gün
                          </>
                        )}
                      </div>

                      {/* optional: job note, same style as payment note */}
                      {j.notes && (
                        <div
                          style={{ fontSize: 12, color: "#555", marginTop: 4 }}
                        >
                          {j.notes}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        fontWeight: 700,
                        color: "#dc2626",
                        fontSize: 12,
                      }}
                    >
                      -{money(total, currency)}
                    </div>
                  </div>
                );
              })
            )}
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

            {/* vault (only for Payment) */}
            {editTx.type === "payment" && (
              <div className="form-group">
                <label>Kasa</label>
                <select
                  value={editVaultId}
                  onChange={(e) => setEditVaultId(e.target.value)}
                >
                  {vaults.map((k) => (
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
                <i className="fa-solid fa-trash"></i>Sil
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
                    vaultId:
                      editTx.type === "payment" ? editVaultId : editTx.vaultId,
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
  vaults,
  activeVaultId,
  onSubmit,
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [vaultId, setVaultId] = useState(activeVaultId || "");
  const [method, setMethod] = useState(PAYMENT_METHOD.CASH);

  // ✅ NEW: date picker state (today default)
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setNote("");
    setVaultId(activeVaultId || "");
    setMethod("cash");
    setPaymentDate(new Date().toISOString().slice(0, 10));
  }, [open, activeVaultId]);

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
          {/* thisis for vault secimi for Debt and Payment yap  */}
          {mode === "payment" && (
            <div className="form-group">
              <label>Kasa</label>
              <select
                value={vaultId}
                onChange={(e) => setVaultId(e.target.value)}
              >
                <option value="">Kasa seçin</option>
                {vaults.map((k) => (
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
                  vaultId,
                  paymentDate,
                  mode === "payment" ? method : null,
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

  const [showCalendar, setShowCalendar] = useState(
    profile?.settings?.showCalendar !== false,
  );

  useEffect(() => {
    if (!open) return;

    setShowCalendar(profile?.settings?.showCalendar !== false);
  }, [open, profile]);

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
          ...(profile || {}),
          phone,
          address,
          settings: {
            ...(profile?.settings || {}),
            showCalendar,
          },
        },
      });

      // ✅ UPDATE LOCAL STATE IMMEDIATELY
      setState((s) => ({
        ...s,
        profile: {
          ...(s.profile || {}),
          phone,
          address,
          settings: {
            ...(s.profile?.settings || {}),
            showCalendar,
          },
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

      <div className="card settings-card">
        <strong>Uygulama Ayarları</strong>

        <button
          type="button"
          className={`settings-toggle ${showCalendar ? "active" : ""}`}
          onClick={() => setShowCalendar((v) => !v)}
        >
          <span className="left">
            <i
              className={`fa-solid ${
                showCalendar ? "fa-calendar-days" : "fa-calendar-xmark"
              }`}
            />
            Takvim
          </span>

          <span className="pill" />
        </button>

        <div className="settings-hint">
          {showCalendar
            ? "Takvim menüde ve ana ekranda görünür."
            : "Takvim tamamen gizlenir."}
        </div>
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

export function CalendarPage({
  jobs = [],
  reservations = [],
  customers = [],
  onAddReservation,
  onUpdateReservation,
  onDeleteReservation,
}) {
  const [view, setView] = React.useState("monthly"); // daily | weekly | monthly
  const [referenceDate, setReferenceDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );

  const [reservationModalOpen, setReservationModalOpen] = useState(false);

  const [editingReservation, setEditingReservation] = useState(null);

  const [reservationForm, setReservationForm] = useState({
    customerId: "",
    date: selectedDate,
    start: "",
    end: "",
    note: "",
  });

  const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  /* =============================
     HELPERS
  ============================= */

  function formatDate(date) {
    const d = new Date(date);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function formatDayHeader(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  }

  function groupJobsByDate(jobsArray) {
    return jobsArray.reduce((acc, job) => {
      if (!acc[job.date]) acc[job.date] = [];
      acc[job.date].push(job);
      return acc;
    }, {});
  }

  function groupReservationsByDate(resArray) {
    return resArray.reduce((acc, r) => {
      if (!acc[r.date]) acc[r.date] = [];
      acc[r.date].push(r);
      return acc;
    }, {});
  }

  const groupedVisibleReservations = React.useMemo(() => {
    if (view === "daily") return null;

    const visible = reservations.filter((r) => {
      const d = new Date(r.date);

      if (view === "weekly") {
        const start = new Date(referenceDate);
        start.setDate(start.getDate() - ((start.getDay() || 7) - 1));

        const days = Array.from({ length: 7 }, (_, i) => {
          const dd = new Date(start);
          dd.setDate(start.getDate() + i);
          return formatDate(dd);
        });

        return days.includes(r.date);
      }

      // monthly
      return (
        d.getMonth() === referenceDate.getMonth() &&
        d.getFullYear() === referenceDate.getFullYear()
      );
    });

    return groupReservationsByDate(visible);
  }, [reservations, view, referenceDate]);

  function getJobTimeLabel(job) {
    // Has valid time
    if (job.start && job.end) {
      return `${job.start} – ${job.end}`;
    }

    // Explicit time modes (if you use them)
    if (job.timeMode === "manual") {
      return "Saat girilmedi";
    }

    if (job.timeMode === "fixed") {
      return "Sabit ücret";
    }

    // Safe fallback
    return "Zamanlama bekleniyor";
  }

  /* =============================
     NAVIGATION (← →)
  ============================= */

  function changePeriod(step) {
    const d = new Date(referenceDate);

    if (view === "daily") d.setDate(d.getDate() + step);
    if (view === "weekly") d.setDate(d.getDate() + step * 7);
    if (view === "monthly") d.setMonth(d.getMonth() + step);

    setReferenceDate(d);
    setSelectedDate(formatDate(d));
  }

  /* =============================
     FILTER VISIBLE JOBS
  ============================= */

  const visibleJobs = React.useMemo(() => {
    if (view === "daily") {
      return jobs.filter((j) => j.date === selectedDate);
    }

    if (view === "weekly") {
      const start = new Date(referenceDate);
      start.setDate(start.getDate() - ((start.getDay() || 7) - 1));

      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return formatDate(d);
      });

      return jobs.filter((j) => days.includes(j.date));
    }

    // monthly
    return jobs.filter((j) => {
      const d = new Date(j.date);
      return (
        d.getMonth() === referenceDate.getMonth() &&
        d.getFullYear() === referenceDate.getFullYear()
      );
    });
  }, [jobs, view, referenceDate, selectedDate]);

  const visibleReservations = useMemo(() => {
    return reservations.filter((r) => r.date === selectedDate);
  }, [reservations, selectedDate]);

  const groupedVisibleJobs = React.useMemo(() => {
    if (view === "daily") return null;
    return groupJobsByDate(visibleJobs);
  }, [visibleJobs, view]);

  const hasGroupedItems =
    (groupedVisibleJobs && Object.keys(groupedVisibleJobs).length > 0) ||
    (groupedVisibleReservations &&
      Object.keys(groupedVisibleReservations).length > 0);

  /* =============================
     RENDER
  ============================= */

  return (
    <div className="container">
      {/* VIEW SWITCH */}
      <div className="view-switcher">
        {[
          { k: "daily", l: "Günlük" },
          { k: "weekly", l: "Haftalık" },
          { k: "monthly", l: "Aylık" },
        ].map((v) => (
          <button
            key={v.k}
            className={`view-btn ${view === v.k ? "active" : ""}`}
            onClick={() => setView(v.k)}
          >
            {v.l}
          </button>
        ))}
      </div>

      {/* CALENDAR */}
      <div className="calendar-container">
        <div className="calendar-header">
          <button className="btn" onClick={() => changePeriod(-1)}>
            <i className="fa-solid fa-chevron-left"></i>
          </button>

          <strong>
            {view === "monthly" &&
              referenceDate.toLocaleDateString("tr-TR", {
                month: "long",
                year: "numeric",
              })}

            {view === "weekly" &&
              referenceDate.toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
              }) + " Haftası"}

            {view === "daily" && referenceDate.toLocaleDateString("tr-TR")}
          </strong>

          <button className="btn" onClick={() => changePeriod(1)}>
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        {/* MONTHLY GRID */}
        {view === "monthly" && (
          <>
            <div className="weekday-row">
              {WEEKDAYS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="calendar-grid grid-monthly">
              {(() => {
                const firstDay = new Date(
                  referenceDate.getFullYear(),
                  referenceDate.getMonth(),
                  1,
                );
                const offset = (firstDay.getDay() + 6) % 7;
                const daysInMonth = new Date(
                  referenceDate.getFullYear(),
                  referenceDate.getMonth() + 1,
                  0,
                ).getDate();

                const cells = [];

                for (let i = 0; i < offset; i++) {
                  cells.push(<div key={`e-${i}`} />);
                }

                for (let d = 1; d <= daysInMonth; d++) {
                  const dateObj = new Date(
                    referenceDate.getFullYear(),
                    referenceDate.getMonth(),
                    d,
                  );
                  const dStr = formatDate(dateObj);
                  const hasJob = jobs.some((j) => j.date === dStr);
                  const hasReservation = reservations.some(
                    (r) => r.date === dStr,
                  );

                  cells.push(
                    <div
                      key={dStr}
                      className={`calendar-day ${
                        dStr === selectedDate ? "selected" : ""
                      }`}
                      onClick={() => setSelectedDate(dStr)}
                    >
                      <div>{d}</div>
                      <div className="day-indicators">
                        {hasJob && <span className="day-badge job">İş</span>}
                        {hasReservation && (
                          <span className="day-badge reservation">Rez</span>
                        )}
                      </div>
                    </div>,
                  );
                }

                return cells;
              })()}
            </div>
          </>
        )}

        {/* WEEKLY GRID */}
        {view === "weekly" && (
          <>
            <div className="weekday-row">
              {WEEKDAYS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="calendar-grid grid-weekly">
              {Array.from({ length: 7 }, (_, i) => {
                const start = new Date(referenceDate);
                start.setDate(start.getDate() - ((start.getDay() || 7) - 1));
                const d = new Date(start);
                d.setDate(start.getDate() + i);

                const dStr = formatDate(d);
                const hasJob = jobs.some((j) => j.date === dStr);
                const hasReservation = reservations.some(
                  (r) => r.date === dStr,
                );

                return (
                  <div
                    key={dStr}
                    className={`calendar-day ${
                      dStr === selectedDate ? "selected" : ""
                    }`}
                    onClick={() => setSelectedDate(dStr)}
                  >
                    <div>{d.getDate()}</div>
                    {hasJob && <small className="dot job-dot">•</small>}
                    {hasReservation && (
                      <small className="dot reservation-dot">•</small>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* PROGRAM */}
      <h4 style={{ marginTop: 16 }}>Program</h4>

      {/* DAILY */}
      {view === "daily" && (
        <>
          {visibleJobs.length === 0 && visibleReservations.length === 0 && (
            <div className="card">Bu tarih için kayıt yok.</div>
          )}

          {visibleJobs.map((job) => {
            const customer = customers.find((c) => c.id === job.customerId);

            return (
              <div
                key={r.id}
                className="card"
                style={{ borderLeft: "6px solid #16a34a", cursor: "pointer" }}
                onClick={() => setEditingReservation(r)} // ✅ THIS IS STEP 9
              >
                <strong>
                  {customer
                    ? `${customer.name} ${customer.surname}`
                    : "Müşteri"}
                </strong>
                <div style={{ fontSize: 13 }}>{getJobTimeLabel(job)}</div>
              </div>
            );
          })}

          {visibleReservations.map((r) => {
            const customer = customers.find((c) => c.id === r.customerId);

            return (
              <div
                key={r.id}
                className="card"
                style={{ borderLeft: "6px solid #16a34a", cursor: "pointer" }}
                onClick={() => setEditingReservation(r)}
              >
                <strong>
                  {customer
                    ? `${customer.name} ${customer.surname}`
                    : "Müşteri"}
                </strong>
                <div style={{ fontSize: 13, color: "#15803d" }}>
                  {r.start} – {r.end}
                </div>
                {r.note && <div style={{ fontSize: 12 }}>{r.note}</div>}
              </div>
            );
          })}
        </>
      )}

      {/* WEEKLY / MONTHLY */}
      {view !== "daily" && (
        <>
          {!hasGroupedItems && (
            <div className="card">Bu dönem için kayıt yok.</div>
          )}

          {hasGroupedItems &&
            Array.from(
              new Set([
                ...Object.keys(groupedVisibleJobs || {}),
                ...Object.keys(groupedVisibleReservations || {}),
              ]),
            )
              .sort()
              .map((date) => (
                <div key={date} style={{ marginBottom: 14 }}>
                  {/* DATE HEADER */}
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#374151",
                      margin: "10px 4px 6px",
                    }}
                  >
                    {formatDayHeader(date)}
                  </div>

                  {/* JOBS */}
                  {(groupedVisibleJobs?.[date] || []).map((job) => {
                    const customer = customers.find(
                      (c) => c.id === job.customerId,
                    );

                    return (
                      <div key={job.id} className="card">
                        <strong>
                          {customer
                            ? `${customer.name} ${customer.surname}`
                            : "Müşteri"}
                        </strong>
                        <div style={{ fontSize: 13 }}>
                          {getJobTimeLabel(job)}
                        </div>
                      </div>
                    );
                  })}

                  {/* RESERVATIONS */}
                  {(groupedVisibleReservations?.[date] || []).map((r) => {
                    const customer = customers.find(
                      (c) => c.id === r.customerId,
                    );

                    return (
                      <div
                        key={r.id}
                        className="card"
                        style={{
                          borderLeft: "6px solid #16a34a",
                          cursor: "pointer",
                        }}
                        onClick={() => setEditingReservation(r)}
                      >
                        <strong>
                          {customer
                            ? `${customer.name} ${customer.surname}`
                            : "Müşteri"}
                        </strong>
                        <div style={{ fontSize: 13, color: "#15803d" }}>
                          {r.start} – {r.end}
                        </div>
                        {r.note && <div style={{ fontSize: 12 }}>{r.note}</div>}
                      </div>
                    );
                  })}
                </div>
              ))}
        </>
      )}
      <button
        className=" fab reservation-fab"
        onClick={() => {
          if (!customers || customers.length === 0) {
            alert("Rezervasyon eklemek için önce müşteri eklemelisiniz.");
            return;
          }

          setReservationForm({
            customerId: customers[0]?.id || "",
            date: selectedDate,
            start: "",
            end: "",
            note: "",
          });
          setReservationModalOpen(true);
        }}
      >
        <i className="fas fa-calendar-plus"></i>
      </button>
      {reservationModalOpen && (
        <ModalBase
          open={true}
          title="Yeni Rezervasyon"
          onClose={() => setReservationModalOpen(false)}
        >
          <div className="form-stack">
            {/* CUSTOMER */}
            <label>Müşteri</label>
            <select
              value={reservationForm.customerId}
              onChange={(e) =>
                setReservationForm((f) => ({
                  ...f,
                  customerId: e.target.value,
                }))
              }
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.surname}
                </option>
              ))}
            </select>

            {/* DATE */}
            <label>Tarih</label>
            <input
              type="date"
              value={reservationForm.date}
              onChange={(e) =>
                setReservationForm((f) => ({ ...f, date: e.target.value }))
              }
            />

            {/* TIME */}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label>Başlangıç</label>
                <input
                  type="time"
                  value={reservationForm.start}
                  onChange={(e) =>
                    setReservationForm((f) => ({ ...f, start: e.target.value }))
                  }
                />
              </div>

              <div style={{ flex: 1 }}>
                <label>Bitiş</label>
                <input
                  type="time"
                  value={reservationForm.end}
                  onChange={(e) =>
                    setReservationForm((f) => ({ ...f, end: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* NOTE */}
            <label>Not</label>
            <textarea
              placeholder="Rezervasyon notu"
              value={reservationForm.note}
              onChange={(e) =>
                setReservationForm((f) => ({ ...f, note: e.target.value }))
              }
            />

            {/* ACTIONS */}
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button
                className="btn btn-cancel"
                onClick={() => setReservationModalOpen(false)}
              >
                Vazgeç
              </button>

              <button
                className="btn btn-save"
                disabled={
                  !reservationForm.customerId ||
                  !reservationForm.date ||
                  !reservationForm.start ||
                  !reservationForm.end
                }
                onClick={() => {
                  onAddReservation({
                    id: uid(),
                    customerId: reservationForm.customerId,
                    date: reservationForm.date,
                    start: reservationForm.start,
                    end: reservationForm.end,
                    note: reservationForm.note,
                    createdAt: Date.now(),
                  });

                  setReservationModalOpen(false);
                }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </ModalBase>
      )}

      {editingReservation && (
        <ModalBase
          open={true}
          title="Rezervasyonu Düzenle"
          onClose={() => setEditingReservation(null)}
        >
          <div className="form-stack">
            {/* CUSTOMER */}
            <label>Müşteri</label>
            <select
              value={editingReservation.customerId}
              onChange={(e) =>
                setEditingReservation((r) => ({
                  ...r,
                  customerId: e.target.value,
                }))
              }
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.surname}
                </option>
              ))}
            </select>

            {/* DATE */}
            <label>Tarih</label>
            <input
              type="date"
              value={editingReservation.date}
              onChange={(e) =>
                setEditingReservation((r) => ({
                  ...r,
                  date: e.target.value,
                }))
              }
            />

            {/* TIME */}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label>Başlangıç</label>
                <input
                  type="time"
                  value={editingReservation.start}
                  onChange={(e) =>
                    setEditingReservation((r) => ({
                      ...r,
                      start: e.target.value,
                    }))
                  }
                />
              </div>

              <div style={{ flex: 1 }}>
                <label>Bitiş</label>
                <input
                  type="time"
                  value={editingReservation.end}
                  onChange={(e) =>
                    setEditingReservation((r) => ({
                      ...r,
                      end: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* NOTE */}
            <label>Not</label>
            <textarea
              value={editingReservation.note || ""}
              onChange={(e) =>
                setEditingReservation((r) => ({
                  ...r,
                  note: e.target.value,
                }))
              }
            />

            {/* ACTIONS */}
            <div className="btn-row" style={{ marginTop: 14 }}>
              <button
                className="btn btn-delete"
                onClick={() => {
                  onDeleteReservation(editingReservation.id);
                  setEditingReservation(null);
                }}
              >
                Sil
              </button>

              <button
                className="btn btn-cancel"
                onClick={() => setEditingReservation(null)}
              >
                İptal
              </button>

              <button
                className="btn btn-save"
                onClick={() => {
                  onUpdateReservation(editingReservation);
                  setEditingReservation(null);
                }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </ModalBase>
      )}
    </div>
  );
}
