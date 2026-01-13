import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { ensureUserData, loadUserData, saveUserData } from "./firestoreService";

import { auth } from "./firebase";
import AuthPage from "./AuthPage";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
} from "react-router-dom";

/**
 * ============================================================
 *  USTA TAKİP SİSTEMİ (React)
 *  - UI design matches your provided HTML/CSS
 *  - Data stored ONLY for browser session (sessionStorage)
 *  - Includes jobs + customers + cash register + clock in/out
 * ============================================================
 */

/* ============================================================
   1) STORAGE (session-only)
   - sessionStorage is cleared when the tab/session ends
============================================================ */

const STORAGE_KEY = "usta_app_data_react_session";

/** Load initial state from sessionStorage */
function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("no storage");
    return JSON.parse(raw);
  } catch {
    return {
      customers: [],
      jobs: [],
      kasaName: "Ana Kasa",
      kasaBalance: 0, // cash register balance
    };
  }
}

/** Save state to sessionStorage */
function persistState(state) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ============================================================
   2) HELPERS
============================================================ */

// ✅ Weekend helpers (business day logic)

function isWeekend(date) {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

function moveToNextBusinessDay(date) {
  const d = new Date(date);

  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1);
  }

  return d;
}

function addDaysSkippingWeekend(startDate, days) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + days);

  // If due date falls on weekend → move forward
  return moveToNextBusinessDay(d);
}

function daysBetween(a, b) {
  const ms = 1000 * 60 * 60 * 24;
  return Math.floor((b - a) / ms);
}

function getJobStartDate(job) {
  // If user manually selected a date, use it (YYYY-MM-DD)
  if (job.date) {
    return new Date(job.date + "T00:00:00");
  }

  // Fallback to createdAt (old behavior)
  if (job.createdAt) {
    return new Date(job.createdAt);
  }

  return null;
}

/** Pad to 2 digits (ex: 4 => "04") */
function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Customer ID requirement:
 * day, month, year, hour, minute, second (based on current date/time)
 * Example: 11012026153045 (11/01/2026 15:30:45)
 */
function generateCustomerIdFromNow() {
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
function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** Format money as TRY (₺) */
function money(v, currency = "TRY") {
  const n = Number(v || 0);

  const symbols = {
    TRY: "₺",
    USD: "$",
    EUR: "€",
  };

  const symbol = symbols[currency] || "₺";

  return `${n.toFixed(2)} ${symbol}`;
}

/** Safe number conversion */
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function partLineTotal(p) {
  // ✅ supports NEW format (qty/unitPrice)
  if (p && (p.qty != null || p.unitPrice != null)) {
    return toNum(p.qty || 0) * toNum(p.unitPrice || 0);
  }

  // ✅ supports OLD format (price)
  return toNum(p?.price || 0);
}

function partsTotalOf(job) {
  return (job.parts || []).reduce((sum, p) => sum + partLineTotal(p), 0);
}

/** Calculate hours from "HH:MM" start/end (simple same-day logic) */
function calcHours(start, end) {
  if (!start || !end) return 0;

  const s = new Date(`2000-01-01T${start}`);
  const e = new Date(`2000-01-01T${end}`);

  const diff = (e - s) / (1000 * 60 * 60);
  return diff > 0 ? diff : 0;
}

/** Format milliseconds to HH:MM:SS for live timer */
function formatTimer(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

/* ============================================================
   3) DEFAULT MODELS
============================================================ */

function makeEmptyCustomer() {
  return {
    id: generateCustomerIdFromNow(),
    name: "",
    surname: "",
    phone: "",
    email: "",
    address: "",
    balanceOwed: 0, // customer's debt/balance
  };
}

function makeEmptyJob(customers) {
  return {
    id: uid(),
    customerId: "", // ✅ no default customer
    date: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
    start: "",
    end: "",
    rate: 0,
    parts: [], // { id, name, price }
    notes: "",

    // Clock in/out fields
    isRunning: false,
    clockInAt: null,
    clockOutAt: null,

    // Folder style UI (expanded/collapsed)
    isOpen: false,

    // Job lifecycle
    isCompleted: false, // mark completed
    isPaid: false, // ✅ NEW
  };
}

/* ============================================================
   4) MAIN APP (ROUTER)
============================================================ */

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return <div style={{ padding: 20 }}>Yükleniyor...</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <BrowserRouter>
      <AppRoutes user={user} />
    </BrowserRouter>
  );
}

function AppRoutes({ user }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Load user-specific data from Firestore
  useEffect(() => {
    async function init() {
      await ensureUserData(user.uid);
      const data = await loadUserData(user.uid);
      // ✅ MIGRATION: support old users that still have kasaName/kasaBalance
      const fixed = { ...data };
      if (!fixed.currency) {
        fixed.currency = "TRY"; // default
      }

      if (!fixed.kasalar || !Array.isArray(fixed.kasalar)) {
        const legacyName = fixed.kasaName || "Ana Kasa";
        const legacyBal = Number(fixed.kasaBalance || 0);

        fixed.kasalar = [
          {
            id: "kasa_ana",
            name: legacyName,
            balance: legacyBal,
            currency: fixed.currency || "TRY",
            createdAt: Date.now(),
          },
        ];
        fixed.activeKasaId = "kasa_ana";
      }

      // optional: remove old fields if you want (not required)
      // delete fixed.kasaName;
      // delete fixed.kasaBalance;

      setState(fixed);

      setLoading(false);
      setHydrated(true);
    }

    init();
  }, [user.uid]);

  useEffect(() => {
    if (!hydrated || !state) return;
    saveUserData(user.uid, state);
  }, [state, hydrated, user.uid]);

  /**
   * Live timer (unchanged)
   */
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (loading || !state) {
    return <div style={{ padding: 20 }}>Kullanıcı verisi yükleniyor...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<MainApp state={state} setState={setState} />} />
      <Route
        path="/customer/:id"
        element={<CustomerSharePage state={state} />}
      />
    </Routes>
  );
}

/* ============================================================
   5) MAIN APP UI (Home / Customers / Settings)
============================================================ */

function MainApp({ state, setState }) {
  const [page, setPage] = useState("home"); // home | customers | settings
  const [search, setSearch] = useState("");
  const [customerSort, setCustomerSort] = useState("debt_desc");

  const currency = state.currency || "TRY";

  const activeKasa = useMemo(() => {
    return (
      (state?.kasalar || []).find((k) => k.id === state?.activeKasaId) || null
    );
  }, [state?.kasalar, state?.activeKasaId]);
  // Modals
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [custModalOpen, setCustModalOpen] = useState(false);
  const [custDetailOpen, setCustDetailOpen] = useState(false);

  // KASA DELETE CONFIRM STATE
  const [kasaDeleteConfirm, setKasaDeleteConfirm] = useState({
    open: false,
    kasaId: null,
    text: "",
  });

  const [editingKasaId, setEditingKasaId] = useState(null);
  const [editingKasaName, setEditingKasaName] = useState("");

  // STEP 2: folder open / close state
  const [activeOpen, setActiveOpen] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);

  // 30-day payment tracking folder
  const [paymentOpen, setPaymentOpen] = useState(true);

  // Editing entities
  const [editingJobId, setEditingJobId] = useState(null);
  const [editingCustId, setEditingCustId] = useState(null);

  // Selected customer for detail modal
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // Delete confirmation modal
  const [confirm, setConfirm] = useState({
    open: false,
    type: null, // "job" | "customer"
    id: null,
    message: "",
  });

  /** Convenience lookup */
  const customersById = useMemo(() => {
    const m = new Map();
    for (const c of state.customers) m.set(c.id, c);
    return m;
  }, [state.customers]);

  /**
   * Jobs filtering by search (Home tab)
   * Search matches: customer name + date + notes
   */
  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.jobs;

    return state.jobs.filter((j) => {
      const c = customersById.get(j.customerId);
      const text = `${c?.name || ""} ${c?.surname || ""} ${j.date || ""} ${
        j.notes || ""
      }`.toLowerCase();
      return text.includes(q);
    });
  }, [search, state.jobs, customersById]);

  const activeJobs = filteredJobs.filter((j) => !j.isCompleted);
  const completedJobs = filteredJobs.filter((j) => j.isCompleted && !j.isPaid);
  // 📊 Financial summary (Home page)

  const totalDebt = useMemo(() => {
    return state.customers.reduce(
      (sum, c) => sum + Math.max(0, toNum(c.balanceOwed)),
      0
    );
  }, [state.customers]);

  const totalPayments = useMemo(() => {
    return (state.payments || [])
      .filter((p) => p.type === "payment")
      .reduce((sum, p) => sum + toNum(p.amount), 0);
  }, [state.payments]);

  const netBalance = totalDebt - totalPayments;

  const unpaidCompletedJobs = filteredJobs.filter(
    (j) => j.isCompleted && !j.isPaid
  );

  const paymentWatchList = filteredJobs
    .filter((j) => j.isCompleted && !j.isPaid)
    .map((job) => {
      const startDate = getJobStartDate(job);
      if (!startDate) return null;

      // ✅ Due date = 30 days later, adjusted to weekday
      const dueDate = addDaysSkippingWeekend(startDate, 30);

      const daysLeft = daysBetween(new Date(), dueDate);

      return {
        job,
        daysLeft,
        dueDate, // optional but useful
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  /**
   * Customers filtering by search (Customers tab)
   */
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();

    // 1) FILTER
    let list = state.customers.filter((c) => {
      if (!q) return true;
      const text =
        `${c.name} ${c.surname} ${c.phone} ${c.email} ${c.address} ${c.id}`.toLowerCase();
      return text.includes(q);
    });

    // 2) SORT
    switch (customerSort) {
      case "debt_desc":
        list.sort((a, b) => toNum(b.balanceOwed) - toNum(a.balanceOwed));
        break;

      case "debt_asc":
        list.sort((a, b) => toNum(a.balanceOwed) - toNum(b.balanceOwed));
        break;

      case "name_desc":
        list.sort((a, b) =>
          `${b.name} ${b.surname}`.localeCompare(`${a.name} ${a.surname}`)
        );
        break;

      case "name_asc":
      default:
        list.sort((a, b) =>
          `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)
        );
        break;
    }

    return list;
  }, [search, state.customers, customerSort]);

  /* ============================================================
     ACTIONS (mutating state safely)
  ============================================================ */

  /** Add or update a customer */
  function upsertCustomer(customer) {
    setState((s) => {
      // Ensure customers with the same ID appear as a single entry
      const idx = s.customers.findIndex((x) => x.id === customer.id);
      const nextCustomers =
        idx >= 0
          ? s.customers.map((x) => (x.id === customer.id ? customer : x))
          : [...s.customers, customer];
      return { ...s, customers: nextCustomers };
    });
  }

  /** Add or update a job */
  function upsertJob(job) {
    setState((s) => {
      const idx = s.jobs.findIndex((x) => x.id === job.id);
      const nextJobs =
        idx >= 0
          ? s.jobs.map((x) => (x.id === job.id ? job : x))
          : [...s.jobs, job];
      return { ...s, jobs: nextJobs };
    });
  }

  /** Delete customer + their jobs */
  function deleteCustomer(customerId) {
    setState((s) => ({
      ...s,
      customers: s.customers.filter((c) => c.id !== customerId),
      jobs: s.jobs.filter((j) => j.customerId !== customerId),
    }));
  }

  /** Delete job */
  function deleteJob(jobId) {
    setState((s) => ({
      ...s,
      jobs: s.jobs.filter((j) => j.id !== jobId),
    }));
  }

  /**
   * Make Payment:
   * - Reduce customer's balance owed
   * - Increase cash register balance
   */
  function makePayment(customerId, amount, note, kasaId, method) {
    const amt = toNum(amount);
    if (amt <= 0) return;

    setState((s) => {
      const oldCustomer = s.customers.find((c) => c.id === customerId);
      const oldBalance = toNum(oldCustomer?.balanceOwed);
      const newBalance = oldBalance - amt;

      const payment = {
        id: uid(),
        customerId,
        kasaId: kasaId || s.activeKasaId,
        type: "payment",
        amount: amt,
        method, // ✅ NEW
        note: note || "Tahsilat",
        date: new Date().toISOString().slice(0, 10),
        createdAt: Date.now(),

        currency:
          (s.kasalar || []).find((k) => k.id === (kasaId || s.activeKasaId))
            ?.currency ||
          s.currency ||
          "TRY",
      };

      return {
        ...s,
        kasalar: s.kasalar.map((k) =>
          k.id === s.activeKasaId
            ? { ...k, balance: toNum(k.balance) + amt }
            : k
        ),
        customers: s.customers.map((c) =>
          c.id === customerId
            ? { ...c, balanceOwed: toNum(c.balanceOwed) - amt } //allow negatives
            : c
        ),
        jobs: s.jobs.map((j) => {
          if (j.customerId !== customerId) return j;

          // If job is completed and customer is now fully paid (or negative), mark paid
          if (j.isCompleted && newBalance <= 0) {
            return { ...j, isPaid: true };
          }
          return j;
        }),

        payments: [...(s.payments || []), payment],
      };
    });
  }

  /** Add debt to a customer (does NOT affect cash) */
  function addDebt(customerId, amount, note, kasaId, method) {
    const amt = toNum(amount);
    if (amt <= 0) return;

    setState((s) => {
      const debt = {
        id: uid(),
        customerId,
        kasaId: kasaId || s.activeKasaId,
        type: "debt",
        amount: amt,
        method, // ✅ SAVE METHOD
        note: note || "Borç",
        date: new Date().toISOString().slice(0, 10),
        createdAt: Date.now(),

        currency:
          (s.kasalar || []).find((k) => k.id === (kasaId || s.activeKasaId))
            ?.currency ||
          s.currency ||
          "TRY",
      };

      return {
        ...s,
        customers: s.customers.map((c) =>
          c.id === customerId
            ? { ...c, balanceOwed: toNum(c.balanceOwed) + amt }
            : c
        ),
        payments: [...(s.payments || []), debt],
      };
    });
  }

  /**
   * Mark job as completed:
   * - job.isCompleted = true
   * - Add job total to customer balance owed
   *
   * NOTE: This matches your request: “Mark as complete and add it to my balance”
   */
  function markJobComplete(jobId) {
    setState((s) => {
      const job = s.jobs.find((j) => j.id === jobId);
      if (!job) return s;

      // compute total at the moment of completion
      const partsTotal = (job.parts || []).reduce(
        (sum, p) => sum + toNum(p.qty) * toNum(p.unitPrice),
        0
      );

      const hours =
        job.isRunning && job.clockInAt
          ? (Date.now() - job.clockInAt) / 36e5
          : calcHours(job.start, job.end);

      const labor = hours * toNum(job.rate);
      const total = labor + partsTotal;

      // Update job
      const nextJobs = s.jobs.map((j) =>
        j.id === jobId
          ? { ...j, isCompleted: true, isPaid: false, isRunning: false } // ✅ add isPaid:false
          : j
      );

      // Add to customer balance owed
      const nextCustomers = s.customers.map((c) => {
        if (c.id !== job.customerId) return c;
        return { ...c, balanceOwed: toNum(c.balanceOwed) + total };
      });

      return { ...s, jobs: nextJobs, customers: nextCustomers };
    });
  }

  function markJobPaid(jobId) {
    setState((s) => ({
      ...s,
      jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, isPaid: true } : j)),
    }));
  }

  /**
   * Clock In:
   * - Start job timer (only one running job at a time for safety)
   * If another job is running, we stop it automatically.
   */
  function clockIn(jobId) {
    setState((s) => {
      const now = Date.now();
      const nextJobs = s.jobs.map((j) => {
        // Stop any other running job
        if (j.isRunning && j.id !== jobId) {
          return { ...j, isRunning: false, clockOutAt: now };
        }
        // Start this one
        if (j.id === jobId) {
          return { ...j, isRunning: true, clockInAt: now, clockOutAt: null };
        }
        return j;
      });
      return { ...s, jobs: nextJobs };
    });
  }

  /**
   * Clock Out:
   * - Stop running timer
   * - Auto-fill start/end manual times as a starting point
   *   (user can still adjust later manually)
   */
  function clockOut(jobId) {
    setState((s) => {
      const now = Date.now();
      const nextJobs = s.jobs.map((j) => {
        if (j.id !== jobId) return j;
        if (!j.clockInAt) return { ...j, isRunning: false };

        const startDate = new Date(j.clockInAt);
        const endDate = new Date(now);

        // If user never entered start/end manually, we fill them in
        const filledStart =
          j.start ||
          `${pad2(startDate.getHours())}:${pad2(startDate.getMinutes())}`;
        const filledEnd = `${pad2(endDate.getHours())}:${pad2(
          endDate.getMinutes()
        )}`;

        return {
          ...j,
          isRunning: false,
          clockOutAt: now,
          start: filledStart,
          end: filledEnd,
        };
      });

      return { ...s, jobs: nextJobs };
    });
  }

  /** Toggle job folder open/close */
  function toggleJobOpen(jobId) {
    setState((s) => ({
      ...s,
      jobs: s.jobs.map((j) =>
        j.id === jobId ? { ...j, isOpen: !j.isOpen } : j
      ),
    }));
  }

  /* ============================================================
     UI: FAB behavior
     - Home: Add Job
     - Customers: Add Customer
  ============================================================ */
  function onFabClick() {
    if (page === "home") {
      setEditingJobId(null);
      setJobModalOpen(true);
    } else if (page === "customers") {
      setEditingCustId(null);
      setCustModalOpen(true);
    }
  }

  const headerTitle =
    page === "home"
      ? "İş Listesi"
      : page === "customers"
      ? "Müşteriler"
      : "Ayarlar";

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <>
      {/* Top header (sticky) */}
      <div className="header">
        <div className="header header-bar">
          <div className="header-left">
            <h2 id="page-title" className="header-title">
              {headerTitle}
            </h2>
            <div id="kasa-ozet" className="header-sub">
              Kasa ({activeKasa?.name || "—"}):
              <strong id="main-kasa-val">
                {money(
                  activeKasa?.balance || 0,
                  activeKasa?.currency || currency
                )}
              </strong>
            </div>
          </div>

          <button
            className="logout-btn"
            onClick={() => signOut(auth)}
            title="Çıkış Yap"
          >
            Çıkış
          </button>
        </div>
      </div>

      <div className="container">
        {/* Search bar */}
        <div className="search-wrap">
          <input
            type="text"
            className="search-bar"
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />

          {page === "customers" && (
            <select
              className="sort-select"
              value={customerSort}
              onChange={(e) => setCustomerSort(e.target.value)}
              title="Sırala"
            >
              <option value="debt_desc">⇅</option>
              <option value="debt_desc">💸 Borcu En Yüksek</option>
              <option value="debt_asc">💰 Borcu En Düşük</option>
              <option value="name_asc">🔤 İsim A → Z</option>
              <option value="name_desc">🔤 İsim Z → A</option>
            </select>
          )}
        </div>

        {/* HOME PAGE */}
        {page === "home" && (
          <div id="page-home">
            {/* 📊 FINANSAL ÖZET */}
            <div className="card" style={{ marginBottom: 16 }}>
              <h3
                style={{
                  marginTop: 0,
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                📊 Finansal Özet
              </h3>

              {/* NUMBERS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 14,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    background: "#fef2f2",
                  }}
                >
                  <div style={{ color: "#7f1d1d", fontSize: 12 }}>
                    Toplam Borç
                  </div>
                  <div style={{ fontWeight: 700, color: "#dc2626" }}>
                    {money(totalDebt, currency)}
                  </div>
                </div>

                <div
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    background: "#f0fdf4",
                  }}
                >
                  <div style={{ color: "#166534", fontSize: 12 }}>
                    Toplam Tahsilat
                  </div>
                  <div style={{ fontWeight: 700, color: "#16a34a" }}>
                    {money(totalPayments, currency)}
                  </div>
                </div>
              </div>

              {/* NET */}
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 10,
                  background: netBalance > 0 ? "#fef2f2" : "#f0fdf4",
                  color: netBalance > 0 ? "#7f1d1d" : "#166534",
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                Net Durum: {money(Math.abs(netBalance), currency)}{" "}
                {netBalance > 0 ? "(Alacak)" : "(Fazla Tahsilat)"}
              </div>

              {/* BAR CHART */}
              {(() => {
                const max = Math.max(totalDebt, totalPayments, 1);
                const debtPct = (totalDebt / max) * 100;
                const payPct = (totalPayments / max) * 100;

                return (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, marginBottom: 4 }}>Borç</div>
                      <div className="bar-bg">
                        <div
                          className="bar-fill red"
                          style={{ width: `${debtPct}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, marginBottom: 4 }}>
                        Tahsilat
                      </div>
                      <div className="bar-bg">
                        <div
                          className="bar-fill green"
                          style={{ width: `${payPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div id="job-list">
              {/* 🔔 30 GÜNLÜK ÖDEME TAKİBİ */}
              <div className="card">
                <div
                  className="list-item section-header"
                  style={{ cursor: "pointer" }}
                  onClick={() => setPaymentOpen((o) => !o)}
                >
                  <strong>
                    🔔 30 Günlük Ödeme Takibi ({paymentWatchList.length})
                  </strong>
                  <span>{paymentOpen ? "▾" : "▸"}</span>
                </div>
              </div>

              {paymentOpen &&
                (paymentWatchList.length === 0 ? (
                  <div className="card" style={{ fontSize: 12, color: "#666" }}>
                    Takip edilecek aktif iş yok.
                  </div>
                ) : (
                  paymentWatchList.map(({ job, daysLeft, dueDate }) => {
                    const c = customersById.get(job.customerId);

                    return (
                      <div
                        key={job.id}
                        className="card list-item"
                        style={{
                          background:
                            daysLeft <= 0
                              ? "#fee2e2"
                              : daysLeft <= 5
                              ? "#fef3c7"
                              : "white",
                          borderLeft:
                            daysLeft <= 0
                              ? "6px solid #dc2626"
                              : daysLeft <= 5
                              ? "6px solid #f59e0b"
                              : "6px solid #16a34a",
                        }}
                      >
                        <div>
                          <strong>
                            {c ? `${c.name} ${c.surname}` : "Bilinmeyen"}
                          </strong>
                          <br />
                          <small>
                            {daysLeft <= 0
                              ? `⛔ ${Math.abs(daysLeft)} gün gecikmiş`
                              : `⏳ ${daysLeft} gün kaldı`}
                            <br />
                            Son Ödeme:{" "}
                            <b>{dueDate.toLocaleDateString("tr-TR")}</b>
                          </small>
                        </div>

                        <div style={{ fontWeight: 700 }}>
                          {money(
                            calcHours(job.start, job.end) * toNum(job.rate) +
                              partsTotalOf(job),
                            currency
                          )}
                        </div>
                      </div>
                    );
                  })
                ))}

              {/* ACTIVE JOBS FOLDER */}
              <div className="card">
                <div
                  className="list-item"
                  style={{ cursor: "pointer" }}
                  onClick={() => setActiveOpen((o) => !o)}
                >
                  <strong>🟢 Aktif İşler ({activeJobs.length})</strong>
                  <span>{activeOpen ? "▾" : "▸"}</span>
                </div>
              </div>

              {activeOpen &&
                (activeJobs.length === 0 ? (
                  <div className="card">Aktif iş yok.</div>
                ) : (
                  activeJobs
                    .slice()
                    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                    .map((job) => (
                      /* TEMP — job card stays same for now */
                      <JobCard
                        key={job.id}
                        job={job}
                        customersById={customersById}
                        toggleJobOpen={toggleJobOpen}
                        clockIn={clockIn}
                        clockOut={clockOut}
                        setEditingJobId={setEditingJobId}
                        setJobModalOpen={setJobModalOpen}
                        setConfirm={setConfirm}
                        markJobComplete={markJobComplete}
                        markJobPaid={markJobPaid} // ✅ THIS FIXES THE ERROR
                        currency={currency} // ✅ ADD THIS
                      />
                    ))
                ))}

              {/* COMPLETED JOBS FOLDER */}
              <div className="card" style={{ marginTop: 10 }}>
                <div
                  className="list-item"
                  style={{ cursor: "pointer" }}
                  onClick={() => setCompletedOpen((o) => !o)}
                >
                  <strong>✅ Tamamlanan İşler ({completedJobs.length})</strong>
                  <span>{completedOpen ? "▾" : "▸"}</span>
                </div>
              </div>

              {completedOpen &&
                (completedJobs.length === 0 ? (
                  <div className="card">Tamamlanan iş yok.</div>
                ) : (
                  completedJobs
                    .slice()
                    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                    .slice(0, 10) // ✅ SHOW ONLY 10
                    .map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        customersById={customersById}
                        toggleJobOpen={toggleJobOpen}
                        clockIn={clockIn}
                        clockOut={clockOut}
                        setEditingJobId={setEditingJobId}
                        setJobModalOpen={setJobModalOpen}
                        setConfirm={setConfirm}
                        markJobComplete={markJobComplete}
                        markJobPaid={markJobPaid} // ✅ THIS FIXES THE ERROR
                        currency={currency} // ✅ ADD THIS
                      />
                    ))
                ))}
            </div>
          </div>
        )}

        {/* CUSTOMERS PAGE */}
        {page === "customers" && (
          <div id="page-customers">
            <div id="customer-list">
              {filteredCustomers.length === 0 ? (
                <div className="card">Henüz müşteri yok.</div>
              ) : (
                filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="card list-item"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setCustDetailOpen(true);
                    }}
                  >
                    <div>
                      <strong>
                        {c.name} {c.surname}
                      </strong>
                      <br />
                      <small>{c.phone || "Telefon yok"}</small>
                      <div
                        style={{ marginTop: 4, fontSize: 12, color: "#666" }}
                      >
                        ID:{" "}
                        <span style={{ fontFamily: "monospace" }}>{c.id}</span>
                      </div>
                      <div
                        style={{ marginTop: 4, fontSize: 12, color: "#666" }}
                      >
                        Borç: <strong>{money(c.balanceOwed, currency)}</strong>
                      </div>
                    </div>
                    <div style={{ color: "#999" }}>›</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SETTINGS PAGE */}
        {page === "settings" && (
          <div id="page-settings">
            <div className="card">
              <h3>Kasa Yönetimi</h3>
              {/* CURRENCY SELECT */}
              <div className="card" style={{ marginBottom: 12 }}>
                <label>Para Birimi</label>

                <select
                  value={state.currency || "TRY"}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      currency: e.target.value,
                    }))
                  }
                >
                  <option value="TRY">₺ Türk Lirası</option>
                  <option value="USD">$ US Dollar</option>
                  <option value="EUR">€ Euro</option>
                </select>
              </div>

              {/* KASA LIST */}
              {state.kasalar.map((kasa) => {
                const isActive = kasa.id === state.activeKasaId;

                return (
                  <div
                    key={kasa.id}
                    className="card list-item"
                    style={{
                      borderLeft: isActive
                        ? "6px solid #2563eb"
                        : "6px solid transparent",
                      background: isActive ? "#eff6ff" : "white",
                    }}
                  >
                    <div>
                      {editingKasaId === kasa.id ? (
                        <input
                          value={editingKasaName}
                          autoFocus
                          onChange={(e) => setEditingKasaName(e.target.value)}
                          onBlur={() => {
                            if (!editingKasaName.trim()) {
                              setEditingKasaId(null);
                              return;
                            }

                            setState((s) => ({
                              ...s,
                              kasalar: s.kasalar.map((k) =>
                                k.id === kasa.id
                                  ? { ...k, name: editingKasaName.trim() }
                                  : k
                              ),
                            }));
                            setEditingKasaId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                            if (e.key === "Escape") setEditingKasaId(null);
                          }}
                          style={{
                            fontSize: 12,
                            padding: "4px 6px",
                            width: "100%",
                          }}
                        />
                      ) : (
                        <strong
                          style={{ cursor: "pointer" }}
                          title="Kasa adını düzenle"
                          onClick={() => {
                            setEditingKasaId(kasa.id);
                            setEditingKasaName(kasa.name);
                          }}
                        >
                          {kasa.name}
                        </strong>
                      )}

                      <div style={{ fontSize: 12, color: "#555" }}>
                        Bakiye: {money(kasa.balance, kasa.currency || currency)}
                        <div style={{ marginTop: 8 }}>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#666",
                              marginBottom: 4,
                            }}
                          >
                            Kasa Para Birimi
                          </div>

                          <select
                            value={kasa.currency || currency}
                            onChange={(e) =>
                              setState((s) => ({
                                ...s,
                                kasalar: s.kasalar.map((k) =>
                                  k.id === kasa.id
                                    ? { ...k, currency: e.target.value }
                                    : k
                                ),
                              }))
                            }
                            style={{ height: 40 }}
                          >
                            <option value="TRY">₺ Türk Lirası</option>
                            <option value="USD">$ US Dollar</option>
                            <option value="EUR">€ Euro</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {isActive ? (
                      <div className="kasa-active-badge">AKTİF</div>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-save kasa-select-btn"
                          onClick={() =>
                            setState((s) => ({ ...s, activeKasaId: kasa.id }))
                          }
                        >
                          Seç
                        </button>

                        <button
                          className="btn btn-delete kasa-select-btn"
                          onClick={() =>
                            setKasaDeleteConfirm({
                              open: true,
                              kasaId: kasa.id,
                              text: "",
                            })
                          }
                        >
                          Sil
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ADD NEW KASA */}
              <button
                className="btn"
                style={{
                  marginTop: 12,
                  background: "#eee",
                  color: "#333",
                }}
                onClick={() => {
                  const id = uid();

                  setState((s) => ({
                    ...s,
                    kasalar: [
                      ...(s.kasalar || []),
                      {
                        id,
                        name: `Yeni Kasa ${s.kasalar.length + 1}`,
                        balance: 0,
                        currency: s.currency || "TRY", // ✅ add this
                        createdAt: Date.now(),
                      },
                    ],
                    activeKasaId: id,
                  }));
                }}
              >
                + Yeni Kasa Ekle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {/* Floating Action Button */}
      {page !== "settings" && (
        <button className="fab" id="fab-btn" onClick={onFabClick}>
          +
        </button>
      )}

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        <button
          className={`nav-item ${page === "home" ? "active" : ""}`}
          onClick={() => setPage("home")}
        >
          <span style={{ fontSize: 18 }}>🏠</span>
          Anasayfa
        </button>
        <button
          className={`nav-item ${page === "customers" ? "active" : ""}`}
          onClick={() => setPage("customers")}
        >
          <span style={{ fontSize: 18 }}>👥</span>
          Müşteriler
        </button>
        <button
          className={`nav-item ${page === "settings" ? "active" : ""}`}
          onClick={() => setPage("settings")}
        >
          <span style={{ fontSize: 18 }}>⚙️</span>
          Ayarlar
        </button>
      </nav>

      {/* JOB MODAL */}
      <JobModal
        open={jobModalOpen}
        onClose={() => setJobModalOpen(false)}
        customers={state.customers}
        jobs={state.jobs}
        editingJobId={editingJobId}
        onSave={(job) => upsertJob(job)}
        currency={currency} // ✅ ADD THIS
      />

      {/* CUSTOMER MODAL */}
      <CustomerModal
        open={custModalOpen}
        onClose={() => setCustModalOpen(false)}
        customers={state.customers}
        editingCustomerId={editingCustId}
        onSave={(cust) => upsertCustomer(cust)}
        onDeleteCustomer={() => {
          setCustModalOpen(false); // close edit modal FIRST
          setConfirm({
            open: true,
            type: "customer",
            id: editingCustId,
            message:
              "Bu müşteriyi ve tüm işlerini silmek istediğinize emin misiniz?",
          });
        }}
      />

      {/* CUSTOMER DETAIL / STATEMENT MODAL */}
      <CustomerDetailModal
        open={custDetailOpen}
        currency={currency} // ✅ ADD THIS
        onClose={() => setCustDetailOpen(false)}
        customer={
          state.customers.find((c) => c.id === selectedCustomerId) || null
        }
        jobs={state.jobs}
        payments={state.payments}
        kasalar={state.kasalar} // ✅ ADD
        activeKasaId={state.activeKasaId} // ✅ ADD
        onMakePayment={makePayment}
        onAddDebt={addDebt}
        onEditCustomer={() => {
          setCustDetailOpen(false); // 🔴 CLOSE detail modal FIRST
          setEditingCustId(selectedCustomerId);
          setTimeout(() => {
            setCustModalOpen(true); // 🟢 OPEN edit modal AFTER
          }, 0);
        }}
        onDeleteCustomer={() =>
          setConfirm({
            open: true,
            type: "customer",
            id: selectedCustomerId,
            message: "Are you sure you want to delete this?",
          })
        }
        onEditJob={(jobId) => {
          setCustDetailOpen(false); // ✅ close customer modal first
          setEditingJobId(jobId);
          setTimeout(() => setJobModalOpen(true), 0); // ✅ open job modal after
        }}
        onAddJob={() => {
          setCustDetailOpen(false); // ✅ close customer modal first
          setEditingJobId(null);
          setTimeout(() => setJobModalOpen(true), 0); // ✅ open job modal after
        }}
      />

      {/* CONFIRMATION MODAL (Delete) */}
      <ConfirmModal
        open={confirm.open}
        message={confirm.message}
        requireText={confirm.type === "customer"} // ✅ IMPORTANT
        onNo={() =>
          setConfirm({ open: false, type: null, id: null, message: "" })
        }
        onYes={() => {
          if (confirm.type === "job") deleteJob(confirm.id);
          if (confirm.type === "customer") deleteCustomer(confirm.id);

          setConfirm({ open: false, type: null, id: null, message: "" });
          setCustDetailOpen(false);
        }}
      />
      {/* KASA DELETE CONFIRM MODAL */}
      {kasaDeleteConfirm.open && (
        <ModalBase
          open={true}
          title="Kasa Silme Onayı"
          onClose={() =>
            setKasaDeleteConfirm({ open: false, kasaId: null, text: "" })
          }
        >
          <p style={{ color: "#b91c1c", fontWeight: 600 }}>
            ⚠️ Bu kasa kalıcı olarak silinecek.
          </p>

          <p>
            Devam etmek için <b>SIL</b> yazın:
          </p>

          <input
            value={kasaDeleteConfirm.text}
            onChange={(e) =>
              setKasaDeleteConfirm((s) => ({
                ...s,
                text: e.target.value,
              }))
            }
            placeholder="SIL"
          />

          <div className="btn-row">
            <button
              className="btn btn-cancel"
              onClick={() =>
                setKasaDeleteConfirm({ open: false, kasaId: null, text: "" })
              }
            >
              Vazgeç
            </button>

            <button
              className="btn btn-delete"
              disabled={kasaDeleteConfirm.text !== "SIL"}
              onClick={() => {
                setState((s) => ({
                  ...s,
                  kasalar: s.kasalar.filter(
                    (k) => k.id !== kasaDeleteConfirm.kasaId
                  ),
                }));

                setKasaDeleteConfirm({
                  open: false,
                  kasaId: null,
                  text: "",
                });
              }}
            >
              Kalıcı Olarak Sil
            </button>
          </div>
        </ModalBase>
      )}
    </>
  );
}

function JobCard({
  job,
  customersById,
  toggleJobOpen,
  clockIn,
  clockOut,
  setEditingJobId,
  setJobModalOpen,
  setConfirm,
  markJobComplete,
  markJobPaid, // ✅ ADD THIS
  currency, // ✅ ADD THIS
}) {
  const c = customersById.get(job.customerId);

  const liveMs =
    job.isRunning && job.clockInAt ? Date.now() - job.clockInAt : 0;

  const hours = job.isRunning ? liveMs / 36e5 : calcHours(job.start, job.end);

  const partsTotal = partsTotalOf(job);

  const laborTotal = hours * toNum(job.rate);
  const total = laborTotal + partsTotal;

  return (
    <div className="card">
      {/* Folder header row */}
      <div className="list-item" style={{ gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="iconLike"
              title="Klasörü aç/kapat"
              onClick={() => toggleJobOpen(job.id)}
            >
              {job.isOpen ? "▾" : "▸"}
            </button>

            <strong>{c ? `${c.name} ${c.surname}` : "Bilinmeyen"}</strong>

            {job.isRunning && <span className="badge">Çalışıyor</span>}
            {job.isCompleted && !job.isPaid && (
              <button
                className="btn btn-save"
                style={{ marginTop: 6 }}
                onClick={() => markJobPaid(job.id)}
              >
                Ödeme Alındı
              </button>
            )}
          </div>

          <div style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
            {job.isRunning ? (
              <>
                ⏱ Süre:{" "}
                <strong style={{ color: "#111" }}>{formatTimer(liveMs)}</strong>
              </>
            ) : (
              <>
                <span>{job.date || "Tarih yok"}</span> |{" "}
                <span>
                  {job.start || "--:--"} - {job.end || "--:--"}
                </span>{" "}
                | <span>{hours.toFixed(2)} saat</span>
              </>
            )}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <strong style={{ color: "var(--primary)" }}>
            {money(total, currency)}
          </strong>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              gap: 6,
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            {job.isRunning ? (
              <button
                className="btn btn-delete"
                onClick={() => clockOut(job.id)}
              >
                Clock Out
              </button>
            ) : (
              <button
                className="btn btn-save"
                onClick={() => clockIn(job.id)}
                disabled={job.isCompleted}
              >
                Clock In
              </button>
            )}

            <button
              className="btn"
              style={{ background: "#eee", color: "#333" }}
              onClick={() => {
                setEditingJobId(job.id);
                setJobModalOpen(true);
              }}
            >
              Düzenle
            </button>

            <button
              className="btn btn-delete"
              onClick={() =>
                setConfirm({
                  open: true,
                  type: "job",
                  id: job.id,
                  message: "Are you sure you want to delete this?",
                })
              }
            >
              Sil
            </button>
          </div>
        </div>
      </div>

      {job.isOpen && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div className="miniRow">
              <span>Saatlik Ücret:</span>
              <strong>{money(job.rate, currency)}</strong>
            </div>
            <div className="miniRow">
              <span>İşçilik:</span>
              <strong>{money(laborTotal, currency)}</strong>
            </div>
            <div className="miniRow">
              <span>Parçalar:</span>
              <strong>{money(partsTotal, currency)}</strong>
            </div>

            {job.parts?.length ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  Kullanılan Parçalar
                </div>
                {job.parts.map((p) => (
                  <div key={p.id} className="partLine">
                    {job.parts.map((p) => (
                      <div key={p.id} className="partLine">
                        <span>
                          {p.name || "Parça"}{" "}
                          {p.qty != null ? `× ${p.qty}` : ""}
                        </span>
                        <span>{money(partLineTotal(p), currency)}</span>
                      </div>
                    ))}

                    <span>{money(p.qty * p.unitPrice, currency)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#666", fontSize: 12 }}>Parça yok.</div>
            )}

            {job.notes && (
              <div style={{ marginTop: 8, color: "#333" }}>
                <strong>Not:</strong> {job.notes}
              </div>
            )}

            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn btn-save"
                disabled={job.isCompleted}
                onClick={() => markJobComplete(job.id)}
              >
                İş Tamamla (Borç Ekle)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   6) CUSTOMER SHARE PAGE (Read-only)
   URL: /customer/:id
============================================================ */

function CustomerSharePage({ state }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const customer = state.customers.find((c) => c.id === id) || null;

  const customerJobs = useMemo(() => {
    return state.jobs
      .filter((j) => j.customerId === id)
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [state.jobs, id]);

  const customerPayments = useMemo(() => {
    if (!customer) return [];
    return (state?.payments || [])
      .filter((p) => p.customerId === customer.id)
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [state?.payments, customer]);

  return (
    <>
      <div className="header">
        <h2>Müşteri İş Geçmişi</h2>
        <div style={{ fontSize: "0.9rem", marginTop: 5 }}>
          {customer ? (
            <>
              {customer.name} {customer.surname} — Borç:{" "}
              <strong>{money(customer.balanceOwed, state.currency)}</strong>
            </>
          ) : (
            "Müşteri bulunamadı"
          )}
        </div>
      </div>

      <div className="container">
        <button className="btn btn-cancel" onClick={() => navigate("/")}>
          Uygulamaya Dön
        </button>

        <div style={{ marginTop: 12 }}>
          {!customer ? (
            <div className="card">Bu ID ile müşteri bulunamadı.</div>
          ) : customerJobs.length === 0 ? (
            <div className="card">İş kaydı yok.</div>
          ) : (
            customerJobs.map((j) => {
              const hours = calcHours(j.start, j.end);
              const partsTotal = partsTotalOf(j);
              const total = hours * toNum(j.rate) + partsTotal;

              return (
                <div key={j.id} className="card list-item">
                  <div>
                    <strong>{j.date || "Tarih yok"}</strong>
                    <br />
                    <small>
                      {j.start || "--:--"} - {j.end || "--:--"} |{" "}
                      {hours.toFixed(2)} saat
                    </small>
                  </div>
                  <div>
                    <strong style={{ color: "var(--primary)" }}>
                      {money(total, currency)}
                    </strong>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

/* ============================================================
   7) MODALS (Job / Customer / Customer Detail / Confirm)
============================================================ */

/**
 * Modal base
 * - matches your overlay style
 */
function ModalBase({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="modal" style={{ display: "block" }}>
      <div className="modal-content">
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 10 }}
        >
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button
            className="btn btn-cancel"
            onClick={onClose}
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
function ConfirmModal({ open, message, onYes, onNo, requireText }) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const canConfirm = !requireText || typed === "DELETE";

  return (
    <ModalBase open={open} title="Confirm" onClose={onNo}>
      <p style={{ marginTop: 0 }}>{message}</p>

      {requireText && (
        <div className="form-group">
          <label>
            Silmek için <b>DELETE</b> yazın
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
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
function CustomerModal({
  open,
  onClose,
  customers,
  editingCustomerId,
  onSave,
  onDeleteCustomer,
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
    >
      <div className="form-group">
        <label>Müşteri ID</label>
        <input value={draft.id} readOnly />
        <small style={{ color: "#666" }}>
          Bu ID paylaşım linki için kullanılır: <b>/customer/{draft.id}</b>
        </small>
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
function JobModal({
  open,
  onClose,
  customers,
  jobs,
  editingJobId,
  onSave,
  currency,
}) {
  const editing = editingJobId ? jobs.find((j) => j.id === editingJobId) : null;

  const [draft, setDraft] = useState(() => makeEmptyJob(customers));

  useEffect(() => {
    if (!open) return;
    if (editing) setDraft({ ...editing, parts: editing.parts || [] });
    else setDraft(makeEmptyJob(customers));
  }, [open, editingJobId]); // eslint-disable-line

  function setField(k, v) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function addPartRow() {
    setDraft((d) => ({
      ...d,
      parts: [
        ...(d.parts || []),
        { id: uid(), name: "", qty: 1, unitPrice: 0 },
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
  const laborTotal = hours * toNum(draft.rate);
  const grandTotal = laborTotal + partsTotal;

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
    >
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

      <div className="form-group">
        <label>Tarih</label>
        <input
          type="date"
          value={draft.date}
          onChange={(e) => setField("date", e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Çalışma Saatleri (Başlangıç - Bitiş)</label>
        <div style={{ display: "flex", gap: 5 }}>
          <input
            type="time"
            value={draft.start}
            onChange={(e) => setField("start", e.target.value)}
          />
          <input
            type="time"
            value={draft.end}
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

      {/* Parts */}
      <div id="parca-container">
        <label>Kullanılan Parçalar</label>

        {(draft.parts || []).map((p) => (
          <div key={p.id} className="parca-item">
            <input
              type="text"
              placeholder="Parça adı"
              value={p.name}
              onChange={(e) => updatePart(p.id, { name: e.target.value })}
            />

            <input
              type="number"
              placeholder="Adet"
              min="1"
              value={p.qty}
              onChange={(e) =>
                updatePart(p.id, { qty: Number(e.target.value) || 1 })
              }
            />

            <input
              type="number"
              placeholder="Birim Fiyat"
              value={p.unitPrice}
              onChange={(e) =>
                updatePart(p.id, { unitPrice: Number(e.target.value) || 0 })
              }
            />

            <button
              onClick={() => removePart(p.id)}
              style={{ background: "none", border: "none", color: "red" }}
              title="Remove part"
            >
              X
            </button>
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
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Çalışma Saati:</span>
          <strong>{hours.toFixed(2)} saat</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>İşçilik:</span>
          <strong>{money(laborTotal, currency)}</strong>
        </div>
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

/**
 * Customer detail modal:
 * - Make payment / add debt
 * - Share as PDF (print)
 * - Edit customer
 * - Edit jobs of this customer
 */
function CustomerDetailModal({
  open,
  onClose,
  customer,
  jobs,
  currency, // ✅ ADD
  kasalar, // ✅ ADD
  activeKasaId, // ✅ ADD
  payments, //ADD this
  onMakePayment,
  onAddDebt,
  onEditCustomer,
  onDeleteCustomer,
  onEditJob,
  onAddJob,
}) {
  const [selectedKasaId, setSelectedKasaId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  // 💳 Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState("payment");
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

  function methodLabel(m) {
    if (m === "cash") return "Nakit";
    if (m === "card") return "Kart";
    if (m === "transfer") return "Havale / EFT";
    if (m === "other") return "Diğer";
    return "—";
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
        const typeLabel = p.type === "payment" ? "Tahsilat" : "Borç";
        const sign = p.type === "payment" ? "+" : "-";

        text += `${p.date} | ${typeLabel}\n`;
        text += `Tutar: ${sign}${money(p.amount, p.currency || currency)}\n`;
        text += `Kasa: ${kasaNameOf(p.kasaId)}\n`;
        text += `Yöntem: ${methodLabel(p.method)}\n`;
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
        text += `Durum: ${j.isCompleted ? "Tamamlandı" : "Açık"}\n\n`;
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
    <ModalBase open={open} title="Müşteri Detayı" onClose={onClose}>
      {!customer ? (
        <div className="card">Müşteri bulunamadı.</div>
      ) : (
        <>
          <h3 id="detail-cust-name" style={{ marginTop: 0 }}>
            {customer.name} {customer.surname}
          </h3>

          <p id="detail-cust-info" style={{ marginTop: 0, color: "#444" }}>
            {customer.phone || "-"} | {customer.address || "-"}
            <br />
            <small style={{ color: "#666" }}>
              ID: <b style={{ fontFamily: "monospace" }}>{customer.id}</b> —
              Paylaşım linki: <b>/customer/{customer.id}</b>
            </small>
            <br />
            <small style={{ color: "#666" }}>
              Borç: <b>{money(customer.balanceOwed, currency)}</b>
            </small>
          </p>

          <hr />

          {/* Payment / debt */}
          {/* i basically add another button and havent changed payment amonut for debt button */}
          <div className="btn-row">
            <div style={{ flex: 1 }}>
              <div className="btn-row">
                <button
                  className="btn btn-save"
                  onClick={() => {
                    setPaymentMode("payment");
                    setPaymentModalOpen(true);
                  }}
                >
                  💰 Tahsilat Al
                </button>

                <button
                  className="btn btn-delete"
                  onClick={() => {
                    setPaymentMode("debt");
                    setPaymentModalOpen(true);
                  }}
                >
                  🧾 Borçlandır
                </button>

                <button
                  className="btn btn-save"
                  style={{ background: "#16a34a" }}
                  onClick={onAddJob}
                >
                  + İş Ekle
                </button>
              </div>
            </div>
          </div>

          <div className="btn-row" style={{ flexWrap: "wrap" }}>
            <button
              className="btn"
              style={{ background: "#2563eb", color: "white" }}
              onClick={shareAsPDF}
            >
              🖨 PDF / Yazdır
            </button>

            <button
              className="btn"
              style={{ background: "#0ea5e9", color: "white" }}
              onClick={sendByEmail}
            >
              📧 E-posta Gönder
            </button>

            <button
              className="btn"
              style={{ background: "#22c55e", color: "white" }}
              onClick={sendByWhatsApp}
            >
              💬 WhatsApp
            </button>

            <button className="btn btn-save" onClick={onEditCustomer}>
              ✏️ Müşteri Düzenle
            </button>
          </div>

          <hr />

          {/* Jobs list for customer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <h4 style={{ margin: 0 }}>İş Geçmişi</h4>

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
          </div>

          <div id="detail-history" style={{ marginTop: 12, fontSize: 12 }}>
            {/* 💰 Tahsilat / Borç Kayıtları */}
            {/* 💰 Tahsilat / Borç Kayıtları */}
            {customerPayments.map((p) => {
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
                  }}
                >
                  {/* LEFT SIDE */}
                  <div>
                    <strong
                      style={{ color: isPayment ? "#166534" : "#7f1d1d" }}
                    >
                      {isPayment ? "💰 Tahsilat" : "🧾 Borç"}
                    </strong>

                    {p.note && (
                      <div
                        style={{ fontSize: 12, color: "#555", marginTop: 4 }}
                      >
                        {p.note}
                      </div>
                    )}

                    <div style={{ fontSize: 12, color: "#777" }}>
                      {p.date}
                      {" • "}
                      Kasa: <b>{kasaNameOf(p.kasaId)}</b>
                      {" • "}
                      Yöntem: <b>{methodLabel(p.method)}</b>
                    </div>
                  </div>

                  {/* RIGHT SIDE (amount) */}
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
            })}

            {/* 🧰 İşler */}
            {customerJobs.length === 0 ? (
              <div className="card">Bu müşteriye ait iş yok.</div>
            ) : (
              customerJobs.map((j) => {
                const hours = calcHours(j.start, j.end);
                const partsTotal = partsTotalOf(j);
                const total = hours * toNum(j.rate) + partsTotal;

                return (
                  <div key={j.id} className="card list-item">
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
                        {p.type === "payment" ? "Tahsilat" : "Borç"}
                      </td>
                      <td>{kasaNameOf(p.kasaId)}</td>
                      <td>{methodLabel(p.method)}</td>
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

      <PaymentActionModal
        open={paymentModalOpen}
        mode={paymentMode}
        customer={customer}
        kasalar={kasalar}
        activeKasaId={activeKasaId}
        onClose={() => setPaymentModalOpen(false)}
        onSubmit={(amount, note, kasaId, method) => {
          if (paymentMode === "payment") {
            onMakePayment(customer.id, amount, note, kasaId, method);
          } else {
            onAddDebt(customer.id, amount, note, kasaId, method);
          }
        }}
      />
    </ModalBase>
  );
}

function PaymentActionModal({
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
  const [method, setMethod] = useState("cash");

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setNote("");
    setKasaId(activeKasaId || "");
    setMethod("cash");
  }, [open, activeKasaId]);

  if (!open) return null;

  return (
    <ModalBase
      open={open}
      title={mode === "payment" ? "Tahsilat Al" : "Borçlandır"}
      onClose={onClose}
    >
      <div className="form-group">
        <label>Kasa</label>
        <select value={kasaId} onChange={(e) => setKasaId(e.target.value)}>
          <option value="">Kasa seçin</option>
          {kasalar.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Tutar</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {mode === "payment" && (
        <div className="form-group">
          <label>Ödeme Yöntemi</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">💵 Nakit</option>
            <option value="card">💳 Kart</option>
            <option value="transfer">🏦 Havale / EFT</option>
            <option value="other">📦 Diğer</option>
          </select>
        </div>
      )}

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
            onSubmit(amount, note, kasaId, mode === "payment" ? method : null);
            onClose();
          }}
        >
          {mode === "payment" ? "Tahsilat Al" : "Borçlandır"}
        </button>
      </div>
    </ModalBase>
  );
}
