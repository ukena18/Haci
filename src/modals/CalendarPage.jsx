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
  formatDateByLang,
  moneyForTransaction,
  validateCustomer,
} from "../utils/helpers";

import { ModalBase } from "./ModalBase";
import { CustomerModal } from "./CustomerModal";

import ChangeEmailModal from "./ChangeEmailModal";

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth";

import { publishCustomerSnapshot, saveUserData } from "../firestoreService";

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

export function CalendarPage({
  jobs = [],
  reservations = [],
  customers = [],
  onAddReservation,
  onUpdateReservation,
  onDeleteReservation,
}) {
  const { t, lang } = useLang();

  const [view, setView] = React.useState("monthly"); // daily | weekly | monthly
  const [referenceDate, setReferenceDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );

  const [reservationModalOpen, setReservationModalOpen] = useState(false);

  const [editingReservation, setEditingReservation] = useState(null);

  const [reservationCustomerSearch, setReservationCustomerSearch] =
    useState("");
  const [reservationCustomerDropdownOpen, setReservationCustomerDropdownOpen] =
    useState(false);

  const reservationCustomerOptions = useMemo(() => {
    const q = reservationCustomerSearch.trim().toLowerCase();

    return customers
      .filter((c) => {
        if (!q) return true;
        return `${c.name} ${c.surname}`.toLowerCase().includes(q);
      })
      .slice(0, 10);
  }, [customers, reservationCustomerSearch]);

  const [reservationForm, setReservationForm] = useState({
    customerId: "",
    date: selectedDate,
    start: "",
    end: "",
    note: "",
  });
  function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d); // LOCAL date, no timezone shift
  }

  const WEEKDAYS =
    lang === "en"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  /* =============================
     HELPERS
  ============================= */

  function atMidnight(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function formatDate(date) {
    const d = new Date(date);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function formatDayHeader(dateStr) {
    const d = parseLocalDate(dateStr);

    const locale = lang === "en" ? "en-US" : "tr-TR";

    return d.toLocaleDateString(locale, {
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
      const d = parseLocalDate(r.date);

      if (view === "weekly") {
        const start = atMidnight(referenceDate);
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
      return t("time_not_entered");
    }

    if (job.timeMode === "fixed") {
      return t("fixed_price");
    }

    // Safe fallback
    return t("scheduling_pending");
  }

  const jobsOfSelectedDay = useMemo(() => {
    return jobs.filter((j) => j.date === selectedDate);
  }, [jobs, selectedDate]);

  const reservationsOfSelectedDay = useMemo(() => {
    return reservations.filter((r) => r.date === selectedDate);
  }, [reservations, selectedDate]);

  /* =============================
     NAVIGATION (← →)
  ============================= */

  function changePeriod(step) {
    const d = atMidnight(referenceDate);

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

  const headerLocale = lang === "en" ? "en-US" : "tr-TR";

  /* =============================
     RENDER
  ============================= */

  return (
    <div id="page-calendar" className="page-top-spacing">
      {/* VIEW SWITCH */}
      <div className="view-switcher">
        {[
          { k: "daily", l: t("daily") },
          { k: "weekly", l: t("weekly") },
          { k: "monthly", l: t("monthly") },
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
              referenceDate.toLocaleDateString(headerLocale, {
                month: "long",
                year: "numeric",
              })}

            {view === "weekly" &&
              referenceDate.toLocaleDateString(headerLocale, {
                day: "numeric",
                month: "short",
              }) + t("calendar.week_suffix")}

            {view === "daily" && referenceDate.toLocaleDateString(headerLocale)}
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
                        <div className="day-indicators">
                          {hasJob && <span className="day-dot job-dot" />}
                          {hasReservation && (
                            <span className="day-dot reservation-dot" />
                          )}
                        </div>
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
                const start = atMidnight(referenceDate);
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
                    <div className="day-indicators">
                      {hasJob && <span className="day-dot job-dot" />}
                      {hasReservation && (
                        <span className="day-dot reservation-dot" />
                      )}
                    </div>
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
            <div className="card"> {t("no_records_for_date")}</div>
          )}

          {visibleJobs.map((job) => {
            const customer = customers.find((c) => c.id === job.customerId);

            return (
              <div
                key={job.id}
                className="card"
                style={{ borderLeft: "6px solid var(--danger)" }}
              >
                <strong>
                  {customer
                    ? `${customer.name} ${customer.surname}`
                    : t("customer")}
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
                style={{
                  borderLeft: "6px solid var(--success)",
                  cursor: "pointer",
                }}
                onClick={() => setEditingReservation(r)}
              >
                <strong>
                  {customer
                    ? `${customer.name} ${customer.surname}`
                    : t("customer")}
                </strong>
                <div style={{ fontSize: 13, color: "var(--success)" }}>
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
            <div className="card">{t("no_records_for_period")}</div>
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
                      color: "var(--text)",
                      margin: "10px 4px 6px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--text)",
                        margin: "10px 4px 6px",
                      }}
                    >
                      {formatDayHeader(date)}
                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        {formatDateByLang(date, lang)}
                      </div>
                    </div>
                  </div>

                  {/* JOBS */}
                  {(groupedVisibleJobs?.[date] || []).map((job) => {
                    const customer = customers.find(
                      (c) => c.id === job.customerId,
                    );

                    return (
                      <div
                        key={job.id}
                        className="card"
                        style={{ borderLeft: "6px solid var(--danger)" }}
                      >
                        <strong>
                          {customer
                            ? `${customer.name} ${customer.surname}`
                            : t("customer")}
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
                          borderLeft: "6px solid var(--success)",
                          cursor: "pointer",
                        }}
                        onClick={() => setEditingReservation(r)}
                      >
                        <strong>
                          {customer
                            ? `${customer.name} ${customer.surname}`
                            : t("customer")}
                        </strong>
                        <div style={{ fontSize: 13, color: "var(--success)" }}>
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
        className="fab reservation-fab"
        onClick={() => {
          if (!customers || customers.length === 0) {
            alert(t("add_reservation_missing_customer"));
            return;
          }

          // 🔥 RESET EVERYTHING — NO PREFILL
          setReservationCustomerSearch("");
          setReservationCustomerDropdownOpen(false);

          setReservationForm({
            customerId: "", // ✅ EMPTY ON PURPOSE
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
          title={t("new_reservation")}
          onClose={() => setReservationModalOpen(false)}
        >
          <div className="form-stack">
            {/* CUSTOMER */}
            <label>{t("select_customer")}</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder={t("search_customer")}
                value={
                  reservationForm.customerId
                    ? (() => {
                        const c = customers.find(
                          (x) => x.id === reservationForm.customerId,
                        );
                        return c ? `${c.name} ${c.surname}` : "";
                      })()
                    : reservationCustomerSearch
                }
                onChange={(e) => {
                  setReservationCustomerSearch(e.target.value);
                  setReservationCustomerDropdownOpen(true);
                  setReservationForm((f) => ({ ...f, customerId: "" }));
                }}
                onFocus={() => setReservationCustomerDropdownOpen(true)}
              />

              {reservationCustomerDropdownOpen && (
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
                    borderRadius: 10,
                    maxHeight: 220,
                    overflowY: "auto",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                  }}
                >
                  {reservationCustomerOptions.length === 0 ? (
                    <div style={{ padding: 10, fontSize: 12, color: "#666" }}>
                      {t("no_results")}
                    </div>
                  ) : (
                    reservationCustomerOptions.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          padding: "10px 12px",
                          cursor: "pointer",
                          fontSize: 13,
                          borderBottom: "1px solid #f1f5f9",
                        }}
                        onClick={() => {
                          setReservationForm((f) => ({
                            ...f,
                            customerId: c.id,
                          }));
                          setReservationCustomerSearch("");
                          setReservationCustomerDropdownOpen(false);
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

            {/* DATE */}
            <label>{t("date")}</label>
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
                <label>{t("start_time")}</label>
                <input
                  type="time"
                  value={reservationForm.start}
                  onChange={(e) =>
                    setReservationForm((f) => ({ ...f, start: e.target.value }))
                  }
                />
              </div>

              <div style={{ flex: 1 }}>
                <label>{t("end_time")}</label>
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
            <label>{t("reservation_note")}</label>
            <textarea
              placeholder={t("reservation_note")}
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
                {t("discard")}
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
                {t("save")}
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
            <label>{t("customer")}</label>
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
            <label>{t("date")}</label>
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
                <label>{t("start_time")}</label>
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
                <label>{t("end_time")}</label>
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
            <label>{t("reservation_note")}</label>
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
                {t("delete")}
              </button>

              <button
                className="btn btn-cancel"
                onClick={() => setEditingReservation(null)}
              >
                {t("cancel")}
              </button>

              <button
                className="btn btn-save"
                onClick={() => {
                  onUpdateReservation(editingReservation);
                  setEditingReservation(null);
                }}
              >
                {t("save")}
              </button>
            </div>
          </div>
        </ModalBase>
      )}
    </div>
  );
}
