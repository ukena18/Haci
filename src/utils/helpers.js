// src/utils/helpers.js
/* ============================================================
   HELPERS (shared)
   - used by App.jsx and Modals.jsx
============================================================ */

// ✅ Weekend helpers (business day logic)
export function isWeekend(date) {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

export function moveToNextBusinessDay(date) {
  const d = new Date(date);

  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function addDaysSkippingWeekend(startDate, days) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + days);

  // If due date falls on weekend → move forward
  return moveToNextBusinessDay(d);
}

export function daysBetween(a, b) {
  const ms = 1000 * 60 * 60 * 24;
  return Math.floor((b - a) / ms);
}

export function getJobStartDate(job) {
  if (!job) return null;

  // 1️⃣ Explicit date (manual / fixed jobs)
  if (job.date) {
    const d = new Date(job.date);
    if (!isNaN(d)) return d;
  }

  // 2️⃣ Clock jobs: first session
  if (job.sessions && job.sessions.length > 0) {
    const first = job.sessions[0]?.inAt;
    if (first) return new Date(first);
  }

  // 3️⃣ Fallback: createdAt
  if (job.createdAt) {
    return new Date(job.createdAt);
  }

  return null;
}

/** Pad to 2 digits (ex: 4 => "04") */
export function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Customer ID requirement:
 * day, month, year, hour, minute, second (based on current date/time)
 * Example: 11012026153045 (11/01/2026 15:30:45)
 */
export function generateCustomerIdFromNow() {
  const d = new Date();
  return (
    pad2(d.getDate()) +
    pad2(d.getMonth() + 1) +
    d.getFullYear() +
    pad2(d.getHours()) +
    pad2(d.getMinutes()) +
    pad2(d.getSeconds())
  );
}

/** Unique ID for jobs / parts inside the session */
export function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** Safe number conversion */
export function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Format money as currency */
export function money(v, currency = "TRY") {
  const n = toNum(v);

  const symbols = {
    TRY: "₺",
    USD: "$",
    EUR: "€",
  };

  const symbol = symbols[currency] || "₺";
  return `${n.toFixed(2)} ${symbol}`;
}

/** Calculate hours from "HH:MM" start/end (simple same-day logic) */
export function calcHours(start, end) {
  if (!start || !end) return 0;

  const s = new Date(`2000-01-01T${start}`);
  const e = new Date(`2000-01-01T${end}`);

  const diff = (e - s) / (1000 * 60 * 60);
  return diff > 0 ? diff : 0;
}

export function calcHoursWithBreak(start, end, breakMinutes = 0) {
  const rawHours = calcHours(start, end);
  const breakHours = (Number(breakMinutes) || 0) / 60;
  return Math.max(0, rawHours - breakHours);
}

/** Format milliseconds to HH:MM:SS for live timer */
export function formatTimer(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

/** NEW + OLD format support for parts */
export function partLineTotal(p) {
  // ✅ NEW: qty/unitPrice
  if (p && (p.qty != null || p.unitPrice != null)) {
    return toNum(p.qty || 0) * toNum(p.unitPrice || 0);
  }

  // ✅ OLD: price
  return toNum(p?.price || 0);
}

export function partsTotalOf(job) {
  return (job?.parts || []).reduce((sum, p) => sum + partLineTotal(p), 0);
}

export function jobTotalOf(job) {
  const parts = partsTotalOf(job);

  // ✅ Fixed-price job: total = fixedPrice + parts
  if (job?.timeMode === "fixed") {
    return toNum(job.fixedPrice) + parts;
  }

  // ✅ Clock/manual jobs: total = hours * rate + parts
  const liveMs =
    job?.isRunning && job?.clockInAt ? Date.now() - job.clockInAt : 0;
  const totalMs = toNum(job?.workedMs) + liveMs;

  const hours =
    job?.timeMode === "clock"
      ? totalMs / 36e5
      : calcHours(job?.start, job?.end);

  return hours * toNum(job?.rate) + parts;
}

export function clockHoursOf(job) {
  const sessions = job.sessions || [];

  const pastMs = sessions.reduce((sum, s) => {
    if (!s?.inAt || !s?.outAt) return sum;
    return sum + (s.outAt - s.inAt);
  }, 0);

  const liveMs =
    job?.isRunning && job?.clockInAt ? Date.now() - job.clockInAt : 0;

  return (pastMs + liveMs) / 36e5;
}

/** Optional: keep these if your modals/app use them */
export function makeEmptyCustomer() {
  return {
    id: generateCustomerIdFromNow(),
    name: "",
    surname: "",
    phone: "",
    email: "",
    address: "",

    createdAt: Date.now(),
  };
}

export function makeEmptyJob(customers = []) {
  return {
    id: uid(),
    customerId: "",
    vaultId: "", // ✅ ADD THIS
    date: new Date().toISOString().slice(0, 10),

    // 👇 NEW
    dueDays: 30,

    start: "",
    end: "",
    rate: "",
    timeMode: "manual",
    fixedPrice: "",
    // 🗓 FIXED JOB DATE RANGE (NEW)
    plannedStartDate: "",
    plannedEndDate: "",
    breakMinutes: 0,
    parts: [],
    notes: "",
    isRunning: false,
    clockInAt: null,
    clockOutAt: null,
    workedMs: 0,
    isCompleted: false,

    createdAt: Date.now(),
  };
}

export function computeCustomerTotals(customerId, jobs = [], payments = []) {
  let totalDebt = 0;
  let totalPayment = 0;

  // 1) Explicit transactions
  for (const p of payments || []) {
    if (p.customerId !== customerId) continue;

    if (p.type === "payment") totalPayment += toNum(p.amount);
    if (p.type === "debt") totalDebt += toNum(p.amount);
  }

  // 2) Jobs are ALWAYS DEBT (no matter isPaid / isCompleted)
  for (const j of jobs || []) {
    if (j.customerId !== customerId) continue;
    totalDebt += jobTotalOf(j);
  }

  return {
    totalDebt,
    totalPayment,
    balance: totalPayment - totalDebt,
  };
}

// ✅ Backward compatibility wrapper
export function computeCustomerBalance(customerId, jobs = [], payments = []) {
  return computeCustomerTotals(customerId, jobs, payments).balance;
}
