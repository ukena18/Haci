import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  uid,
  toNum,
  money,
  makeEmptyJob,
  calcHoursWithBreak, // ✅ ADD THIS
} from "../utils/helpers";

import { ModalBase } from "./ModalBase";

import { useLang } from "../i18n/LanguageContext";

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

  setConfirm,
  fixedCustomerId = null,
}) {
  const { t } = useLang();
  const editing = editingJobId ? jobs.find((j) => j.id === editingJobId) : null;
  const customerBoxRef = useRef(null);

  const [draft, setDraft] = useState(() => makeEmptyJob(customers));
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  const customerOptions = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();

    return customers
      .map((c) => {
        const lastJob = jobs
          .filter((j) => j.customerId === c.id)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];

        return {
          ...c,
          lastActivity: lastJob?.createdAt || 0,
        };
      })
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .filter((c) => {
        if (!q) return true;
        return `${c.name} ${c.surname}`.toLowerCase().includes(q);
      })
      .slice(0, 10);
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
      setDraft({
        ...editing,
        parts: editing.parts || [],
        sessions: editing.sessions || [],

        // ✅ CRITICAL FIX
        trackPayment: editing.trackPayment !== false,

        // optional safety
        dueDays: editing.dueDays == null ? "" : String(editing.dueDays),
        dueDate: editing.dueDays
          ? addDaysToDate(editing.date, editing.dueDays)
          : "",

        dueDismissed: editing.dueDismissed === true,
      });
    } else {
      const fresh = makeEmptyJob(customers);

      fresh.dueDate = addDaysToDate(fresh.date, 30);
      fresh.dueDays = 30;
      if (fixedCustomerId) {
        fresh.customerId = fixedCustomerId;
      }

      setDraft(fresh);
    }
  }, [open, editingJobId, fixedCustomerId]); // ✅ include fixedCustomerId

  // ✅ Currency is derived from selected customer (can be null)
  const jobCurrency = useMemo(() => {
    const c = customers.find((x) => x.id === draft.customerId);
    return c?.currency || null;
  }, [customers, draft.customerId]);

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

  function addDaysToDate(dateStr, days) {
    if (!dateStr || days == null) return "";
    const d = new Date(dateStr);
    d.setDate(d.getDate() + Number(days));
    return d.toISOString().slice(0, 10);
  }

  function diffDays(fromDateStr, toDateStr) {
    if (!fromDateStr || !toDateStr) return null;
    const from = new Date(fromDateStr);
    const to = new Date(toDateStr);
    const diff = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
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
      alert(t("select_customer_required"));
      return;
    }
    // Save with cleaned numeric fields
    onSave({
      ...draft,

      breakMinutes:
        draft.breakMinutes === "" || draft.breakMinutes == null
          ? 0
          : Number(draft.breakMinutes),

      dueDismissed: draft.dueDismissed === true,

      trackPayment: draft.trackPayment !== false,
      dueDays:
        draft.trackPayment === false
          ? null
          : draft.dueDate
            ? diffDays(draft.date, draft.dueDate)
            : 30,

      // ✅ IMPORTANT: if clock mode, workedMs must come from sessions
      workedMs:
        draft.timeMode === "clock"
          ? recalcWorkedMsFromSessions(draft.sessions)
          : draft.workedMs,

      // ✅ persist fixed job duration
      fixedDays: draft.timeMode === "fixed" ? workingDays : null,

      rate: Math.max(0, toNum(draft.rate)),
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
      title={editing ? t("edit_job") : t("add_job")}
      onClose={onClose}
      zIndex={1300} // ✅ add this
    >
      <div className="modal-scroll">
        {!fixedCustomerId ? (
          <div
            className="form-group"
            ref={customerBoxRef}
            style={{ position: "relative" }}
          >
            {/* SEARCH INPUT */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder={t("search_customer")}
                value={
                  draft.customerId
                    ? (() => {
                        const c = customers.find(
                          (x) => x.id === draft.customerId,
                        );
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
                style={{ paddingRight: 36 }} // 👈 space for X
              />

              {/* ❌ CLEAR BUTTON */}
              {(customerSearch || draft.customerId) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerSearch("");
                    setField("customerId", "");
                    setCustomerDropdownOpen(false);
                  }}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted)",
                    fontSize: 16,
                  }}
                  aria-label="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            {/* DROPDOWN */}
            {customerDropdownOpen && (
              <div className="dropdown-panel">
                {customerOptions.length === 0 ? (
                  <div style={{ padding: 10, fontSize: 12, color: "#666" }}>
                    {t("no_results")}
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
            <label>{t("customer")}</label>
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
          <input
            type="date"
            value={draft.date}
            onChange={(e) => {
              const newDate = e.target.value;

              setDraft((d) => {
                // if dueDate was auto (date + 30), keep it in sync
                const autoDue =
                  d.dueDate === addDaysToDate(d.date, 30) || !d.dueDate;

                return {
                  ...d,
                  date: newDate,
                  dueDate: autoDue ? addDaysToDate(newDate, 30) : d.dueDate,
                  dueDays: autoDue ? 30 : d.dueDays,
                };
              });
            }}
          />
        </div>
        <div className="form-group">
          <label>{t("payment_due_date")}</label>

          <input
            type="date"
            value={draft.dueDate ?? ""}
            onChange={(e) => {
              const v = e.target.value;

              setDraft((d) => ({
                ...d,
                dueDate: v,
                // 🔁 auto-calc dueDays from job date
                dueDays: v ? diffDays(d.date, v) : "",
              }));
            }}
            disabled={!draft.trackPayment}
          />

          <small style={{ color: "var(--muted)" }}>
            {draft.trackPayment
              ? t("payment_due_info")
              : t("payment_tracking_disabled")}
          </small>

          {editing && draft.dueDismissed && (
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 15%, var(--surface))",
                  color: "var(--primary)",
                  fontWeight: 600,
                }}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    dueDismissed: false,
                  }))
                }
              >
                🔔 {t("restore_payment_tracking")}
              </button>

              <div style={{ fontSize: 12, color: "#0369a1", marginTop: 4 }}>
                {t("payment_tracking_resume_info")}
              </div>
            </div>
          )}
        </div>

        {/* ============================= */}
        {/* ÇALIŞMA ZAMANI GİRİŞİ */}
        {/* ============================= */}
        <div className="form-group">
          <label>{t("work_time_input")}</label>

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
              <span>{t("manual_entry")}</span>
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
              <span>{t("start_stop")}</span>
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
              <span>{t("fixed_price")}</span>
            </label>
          </div>
        </div>

        {/* ============================= */}
        {/* CLOCK SESSION EDITOR (CLOCK ONLY) */}
        {/* ============================= */}
        {draft.timeMode === "clock" && (
          <div className="form-group">
            <label>{t("work_history_edit")}</label>

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
                  const dateStr =
                    d.date || new Date().toISOString().slice(0, 10);
                  const now = new Date();

                  const hh = String(now.getHours()).padStart(2, "0");
                  const mm = String(now.getMinutes()).padStart(2, "0");

                  return {
                    ...d,
                    sessions: [
                      ...(d.sessions || []),
                      {
                        id: uid(),
                        inAt: utcTimestampFromDateAndTime(
                          dateStr,
                          `${hh}:${mm}`,
                        ),
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
              + {t("add_work_session")}
            </button>
          </div>
        )}

        {/* ============================= */}
        {/* PLANNED JOB DURATION (FIXED ONLY) */}
        {/* ============================= */}
        {draft.timeMode === "fixed" && (
          <div className="form-group">
            {/* ✅ ONE LINE HEADER (like the other one) */}
            <label>{t("planned_job_duration")}</label>

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
              <label>{t("work_hours_range")}</label>
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
                <input
                  type="number"
                  min="0"
                  step="5"
                  placeholder={t("lunch_break_minutes")}
                  value={draft.breakMinutes ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      breakMinutes: e.target.value, // ✅ STRING ONLY
                    }))
                  }
                />

                <small style={{ color: "var(--muted)" }}>
                  {t("break_auto_deduct_info")}
                </small>
              </div>
            )}

            <div className="form-group">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder={t("hourly_rate")}
                value={draft.rate ?? ""}
                onKeyDown={(e) => {
                  // ❌ block minus & scientific notation
                  if (e.key === "-" || e.key === "e" || e.key === "E") {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const v = e.target.value;

                  // allow empty while typing
                  if (v === "") {
                    setField("rate", "");
                    return;
                  }

                  const n = Number(v);

                  // clamp to >= 0
                  setField("rate", Number.isFinite(n) ? Math.max(0, n) : 0);
                }}
              />
            </div>
          </>
        )}

        {/* ============================= */}
        {/* FIXED PRICE */}
        {/* ============================= */}
        {draft.timeMode === "fixed" && (
          <div className="form-group">
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.fixedPrice ?? ""}
              placeholder="Sabit Ücret"
              onWheel={(e) => e.currentTarget.blur()}
              onKeyDown={(e) => {
                if (e.key === "-" || e.key === "e" || e.key === "E")
                  e.preventDefault();
              }}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") return setField("fixedPrice", "");
                setField("fixedPrice", Math.max(0, Number(v)));
              }}
            />
          </div>
        )}

        {/* Parts */}
        <div id="parca-container">
          <label>{t("used_parts")}</label>

          {(draft.parts || []).map((p) => (
            <div
              key={p.id}
              className="parca-item"
              style={{
                flexDirection: "column",
                background: "var(--surface-muted)",
                padding: 10,
                borderRadius: 10,
                marginBottom: 8,
              }}
            >
              <input
                type="text"
                placeholder={t("part_name_placeholder")}
                value={p.name}
                onChange={(e) => updatePart(p.id, { name: e.target.value })}
              />

              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="number"
                  placeholder={t("quantity")}
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
                  placeholder={t("unit_price")}
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
                  title={t("delete_part")}
                  style={{
                    background:
                      "color-mix(in srgb, var(--danger) 15%, var(--surface))",
                    color: "var(--danger)",
                    border: "none",

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
          + {t("add_part")}
        </button>

        {/* Totals */}
        <div className="card" style={{ background: "var(--surface-muted)" }}>
          {/* MANUAL / CLOCK */}
          {draft.timeMode !== "fixed" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{t("work_hours")}:</span>
                <strong>
                  {hours.toFixed(2)} {t("hours")}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{t("labor")}:</span>
                <strong>{money(laborTotal, jobCurrency)}</strong>
              </div>
            </>
          )}

          {/* FIXED MODE */}
          {draft.timeMode === "fixed" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{t("working_days")}:</span>
                <strong>
                  {workingDays} {t("days")}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{t("fixed_price")}:</span>
                <strong>{money(draft.fixedPrice, jobCurrency)}</strong>
              </div>
            </>
          )}

          {/* COMMON */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t("parts")}:</span>
            <strong>{money(partsTotal, jobCurrency)}</strong>
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
              <strong>{t("total_amount")}:</strong>
            </span>
            <strong>{money(grandTotal, jobCurrency)}</strong>
          </div>
        </div>

        <div className="form-group">
          <label>{t("note_optional")}</label>
          <textarea
            value={draft.notes}
            onChange={(e) => setField("notes", e.target.value)}
          />
        </div>
      </div>

      <div className="modal-actions">
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
            <i className="fa-solid fa-trash"></i> {t("delete")}
          </button>
        )}

        <button className="btn btn-cancel" onClick={onClose}>
          {t("cancel")}
        </button>

        <button className="btn btn-save" onClick={save}>
          {t("save")}
        </button>
      </div>
    </ModalBase>
  );
}
