import React, { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut  } from "firebase/auth";
import { ensureUserData, loadUserData, saveUserData  } from "./firestoreService";

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

function daysBetween(a, b) {
  const ms = 1000 * 60 * 60 * 24;
  return Math.floor((b - a) / ms);
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
function moneyTRY(v) {
  const n = Number(v || 0);
  return `${n.toFixed(2)} ₺`;
}

/** Safe number conversion */
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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
    customerId: customers?.[0]?.id || "",
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
      <style>{css}</style>
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
      setState(data);
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

  // Modals
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [custModalOpen, setCustModalOpen] = useState(false);
  const [custDetailOpen, setCustDetailOpen] = useState(false);

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
  


  const activeJobs = filteredJobs.filter(j => !j.isCompleted);
  const completedJobs = filteredJobs.filter(j => j.isCompleted);


  // 🔔 30-day payment tracking (active jobs only)
const paymentWatchList = activeJobs
  .map((job) => {
    if (!job.createdAt) return null;

    const created = new Date(job.createdAt);
    const now = new Date();

    const daysPassed = daysBetween(created, now);
    const daysLeft = 30 - daysPassed;

    return {
      job,
      daysLeft,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.daysLeft - b.daysLeft); // closest first



  /**
   * Customers filtering by search (Customers tab)
   */
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.customers;

    return state.customers.filter((c) => {
      const text = `${c.name} ${c.surname} ${c.phone} ${c.email} ${c.address} ${c.id}`.toLowerCase();
      return text.includes(q);
    });
  }, [search, state.customers]);

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
        idx >= 0 ? s.jobs.map((x) => (x.id === job.id ? job : x)) : [...s.jobs, job];
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
function makePayment(customerId, amount, note) {
  const amt = toNum(amount);
  if (amt <= 0) return;

  setState((s) => {
    const payment = {
      id: uid(),
      customerId,
      type: "payment",
      amount: amt,
      note: note || "Tahsilat",
      date: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
    };

    return {
      ...s,
      kasaBalance: toNum(s.kasaBalance) + amt,
      customers: s.customers.map((c) =>
        c.id === customerId
          ? { ...c, balanceOwed: Math.max(0, toNum(c.balanceOwed) - amt) }
          : c
      ),
      payments: [...(s.payments || []), payment],
    };
  });
}


  /** Add debt to a customer (does NOT affect cash) */
function addDebt(customerId, amount, note) {
  const amt = toNum(amount);
  if (amt <= 0) return;

  setState((s) => {
    const debt = {
      id: uid(),
      customerId,
      type: "debt",
      amount: amt,
      note: note || "Borç",
      date: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
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
      const partsTotal = (job.parts || []).reduce((sum, p) => sum + toNum(p.price), 0);

      const hours = job.isRunning && job.clockInAt
        ? (Date.now() - job.clockInAt) / 36e5
        : calcHours(job.start, job.end);

      const labor = hours * toNum(job.rate);
      const total = labor + partsTotal;

      // Update job
      const nextJobs = s.jobs.map((j) =>
        j.id === jobId ? { ...j, isCompleted: true, isRunning: false } : j
      );

      // Add to customer balance owed
      const nextCustomers = s.customers.map((c) => {
        if (c.id !== job.customerId) return c;
        return { ...c, balanceOwed: toNum(c.balanceOwed) + total };
      });

      return { ...s, jobs: nextJobs, customers: nextCustomers };
    });
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
        const filledEnd = `${pad2(endDate.getHours())}:${pad2(endDate.getMinutes())}`;

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
    page === "home" ? "İş Listesi" : page === "customers" ? "Müşteriler" : "Ayarlar";

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <>
      {/* Top header (sticky) */}
      <div className="header">
           <div className="header header-bar">
  <div className="header-left">
    <h2 id="page-title" className="header-title">{headerTitle}</h2>
    <div id="kasa-ozet" className="header-sub">
      Kasa: <strong id="main-kasa-val">{moneyTRY(state.kasaBalance)}</strong>
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
        <input
          type="text"
          className="search-bar"
          placeholder="Ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* HOME PAGE */}
        {page === "home" && (
          <div id="page-home">
            <div id="job-list">
            {/* 🔔 30 GÜNLÜK ÖDEME TAKİBİ */}
<div className="card">
  <div
    className="list-item section-header"
    style={{ cursor: "pointer" }}
    onClick={() => setPaymentOpen(o => !o)}
  >
    <strong>🔔 30 Günlük Ödeme Takibi ({paymentWatchList.length})</strong>
    <span>{paymentOpen ? "▾" : "▸"}</span>
  </div>
</div>

{paymentOpen && (
  paymentWatchList.length === 0 ? (
    <div className="card" style={{ fontSize: 13, color: "#666" }}>
      Takip edilecek aktif iş yok.
    </div>
  ) : (
    paymentWatchList.map(({ job, daysLeft }) => {
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
            <strong>{c ? `${c.name} ${c.surname}` : "Bilinmeyen"}</strong>
            <br />
            <small>
              {daysLeft <= 0
                ? `⛔ ${Math.abs(daysLeft)} gün gecikmiş`
                : `⏳ ${daysLeft} gün kaldı`}
            </small>
          </div>

          <div style={{ fontWeight: 700 }}>
            {moneyTRY(
              calcHours(job.start, job.end) * toNum(job.rate) +
                (job.parts || []).reduce(
                  (s, p) => s + toNum(p.price),
                  0
                )
            )}
          </div>
        </div>
      );
    })
  )
)}



              {/* ACTIVE JOBS FOLDER */}
<div className="card">
  <div
    className="list-item"
    style={{ cursor: "pointer" }}
    onClick={() => setActiveOpen(o => !o)}
  >
    <strong>🟢 Aktif İşler ({activeJobs.length})</strong>
    <span>{activeOpen ? "▾" : "▸"}</span>
  </div>
</div>

{activeOpen && (
  activeJobs.length === 0 ? (
    <div className="card">Aktif iş yok.</div>
  ) : (
    activeJobs
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map(job => (
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
/>

      ))
  )
)}

{/* COMPLETED JOBS FOLDER */}
<div className="card" style={{ marginTop: 10 }}>
  <div
    className="list-item"
    style={{ cursor: "pointer" }}
    onClick={() => setCompletedOpen(o => !o)}
  >
    <strong>✅ Tamamlanan İşler ({completedJobs.length})</strong>
    <span>{completedOpen ? "▾" : "▸"}</span>
  </div>
</div>

{completedOpen && (
  completedJobs.length === 0 ? (
    <div className="card">Tamamlanan iş yok.</div>
  ) : (
    completedJobs
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map(job => (
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
/>
      ))
  )
)}

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
                filteredCustomers
                  .slice()
                  .sort((a, b) =>
                    `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`)
                  )
                  .map((c) => (
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
                        <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                          ID: <span style={{ fontFamily: "monospace" }}>{c.id}</span>
                        </div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                          Borç: <strong>{moneyTRY(c.balanceOwed)}</strong>
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
              <div className="form-group">
                <label>Kasa Adı (Örn: Recep Kasası)</label>
                <input
                  type="text"
                  value={state.kasaName}
                  onChange={(e) =>
                    setState((s) => ({ ...s, kasaName: e.target.value }))
                  }
                  placeholder="Kasa adını girin"
                />
              </div>

              <div className="form-group">
                <label>Kasa Başlangıç / Düzeltme Bakiye</label>
                <input
                  type="number"
                  value={state.kasaBalance}
                  onChange={(e) =>
                    setState((s) => ({ ...s, kasaBalance: toNum(e.target.value) }))
                  }
                />
              </div>

              <p>
                Mevcut Bakiye:{" "}
                <strong id="settings-kasa-val">{moneyTRY(state.kasaBalance)}</strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button className="fab" id="fab-btn" onClick={onFabClick}>
        +
      </button>

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
      />

      {/* CUSTOMER MODAL */}
      <CustomerModal
        open={custModalOpen}
        onClose={() => setCustModalOpen(false)}
        customers={state.customers}
        editingCustomerId={editingCustId}
        onSave={(cust) => upsertCustomer(cust)}
      />

      {/* CUSTOMER DETAIL / STATEMENT MODAL */}
      <CustomerDetailModal
        open={custDetailOpen}
        onClose={() => setCustDetailOpen(false)}
        customer={state.customers.find((c) => c.id === selectedCustomerId) || null}
        jobs={state.jobs}
        payments={state.payments}
        kasaName={state.kasaName}
        onMakePayment={makePayment}
        onAddDebt={addDebt}
        onEditCustomer={() => {
          setEditingCustId(selectedCustomerId);
          setCustModalOpen(true);
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
          setEditingJobId(jobId);
          setJobModalOpen(true);
        }}
        onAddJob={() => {
          setEditingJobId(null);
          setJobModalOpen(true);
        }}
      />

      {/* CONFIRMATION MODAL (Delete) */}
      <ConfirmModal
        open={confirm.open}
        message={confirm.message}
        onNo={() => setConfirm({ open: false, type: null, id: null, message: "" })}
        onYes={() => {
          if (confirm.type === "job") deleteJob(confirm.id);
          if (confirm.type === "customer") deleteCustomer(confirm.id);
          setConfirm({ open: false, type: null, id: null, message: "" });
          setCustDetailOpen(false);
        }}
      />
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
}) {
  const c = customersById.get(job.customerId);

  const liveMs =
    job.isRunning && job.clockInAt ? Date.now() - job.clockInAt : 0;

  const hours = job.isRunning
    ? liveMs / 36e5
    : calcHours(job.start, job.end);

  const partsTotal = (job.parts || []).reduce(
    (sum, p) => sum + toNum(p.price),
    0
  );

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

            <strong>
              {c ? `${c.name} ${c.surname}` : "Bilinmeyen"}
            </strong>

            {job.isRunning && <span className="badge">Çalışıyor</span>}
            {job.isCompleted && (
              <span
                className="badge"
                style={{ background: "#dcfce7", color: "#166534" }}
              >
                Tamamlandı
              </span>
            )}
          </div>

          <div style={{ marginTop: 6, fontSize: 13, color: "#555" }}>
            {job.isRunning ? (
              <>
                ⏱ Süre:{" "}
                <strong style={{ color: "#111" }}>
                  {formatTimer(liveMs)}
                </strong>
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
            {moneyTRY(total)}
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
              <strong>{moneyTRY(job.rate)}</strong>
            </div>
            <div className="miniRow">
              <span>İşçilik:</span>
              <strong>{moneyTRY(laborTotal)}</strong>
            </div>
            <div className="miniRow">
              <span>Parçalar:</span>
              <strong>{moneyTRY(partsTotal)}</strong>
            </div>

            {job.parts?.length ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  Kullanılan Parçalar
                </div>
                {job.parts.map((p) => (
                  <div key={p.id} className="partLine">
                    <span>{p.name || "Parça"}</span>
                    <span>{moneyTRY(p.price)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#666", fontSize: 13 }}>
                Parça yok.
              </div>
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
              <strong>{moneyTRY(customer.balanceOwed)}</strong>
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
              const partsTotal = (j.parts || []).reduce(
                (sum, p) => sum + toNum(p.price),
                0
              );
              const total = hours * toNum(j.rate) + partsTotal;

              return (
                <div key={j.id} className="card list-item">
                  <div>
                    <strong>{j.date || "Tarih yok"}</strong>
                    <br />
                    <small>
                      {j.start || "--:--"} - {j.end || "--:--"} | {hours.toFixed(2)} saat
                    </small>
                  </div>
                  <div>
                    <strong style={{ color: "var(--primary)" }}>
                      {moneyTRY(total)}
                    </strong>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <style>{css}</style>
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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn btn-cancel" onClick={onClose} style={{ flex: "unset" }}>
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
function ConfirmModal({ open, message, onYes, onNo }) {
  return (
    <ModalBase open={open} title="Confirm" onClose={onNo}>
      <p style={{ marginTop: 0 }}>{message}</p>
      <div className="btn-row">
        <button className="btn btn-cancel" onClick={onNo}>
          No
        </button>
        <button className="btn btn-delete" onClick={onYes}>
          Yes
        </button>
      </div>
    </ModalBase>
  );
}

/**
 * Customer add/edit modal
 */
function CustomerModal({ open, onClose, customers, editingCustomerId, onSave }) {
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
        <input value={draft.name} onChange={(e) => setField("name", e.target.value)} />
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
    </ModalBase>
  );
}

/**
 * Job add/edit modal (includes parts)
 * - manual edit is always possible
 * - parts add unlimited
 */
function JobModal({ open, onClose, customers, jobs, editingJobId, onSave }) {
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
      parts: [...(d.parts || []), { id: uid(), name: "", price: 0 }],
    }));
  }

  function updatePart(partId, patch) {
    setDraft((d) => ({
      ...d,
      parts: (d.parts || []).map((p) => (p.id === partId ? { ...p, ...patch } : p)),
    }));
  }

  function removePart(partId) {
    setDraft((d) => ({
      ...d,
      parts: (d.parts || []).filter((p) => p.id !== partId),
    }));
  }

  // Auto totals in modal
  const hours = useMemo(() => calcHours(draft.start, draft.end), [draft.start, draft.end]);
  const partsTotal = useMemo(
    () => (draft.parts || []).reduce((sum, p) => sum + toNum(p.price), 0),
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
        price: toNum(p.price),
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
        <input type="date" value={draft.date} onChange={(e) => setField("date", e.target.value)} />
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
        <label>Saatlik Ücret (₺)</label>
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
              placeholder="Fiyat"
              value={p.price}
              onChange={(e) => updatePart(p.id, { price: e.target.value })}
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
          <strong>{moneyTRY(laborTotal)}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Parçalar:</span>
          <strong>{moneyTRY(partsTotal)}</strong>
        </div>
        <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "10px 0" }} />
        Toplam Tutar: <strong>{moneyTRY(grandTotal)}</strong>
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
  kasaName,
    payments,   //ADD this
  onMakePayment,
  onAddDebt,
  onEditCustomer,
  onDeleteCustomer,
  onEditJob,
  onAddJob,
}) {
  const [paymentAmount, setPaymentAmount] = useState("");
const [paymentNote, setPaymentNote] = useState("");
  const printRef = useRef(null);

useEffect(() => {
  if (!open) return;
  setPaymentAmount("");
  setPaymentNote("");
}, [open]);


  const customerJobs = useMemo(() => {
    if (!customer) return [];
    return jobs
      .filter((j) => j.customerId === customer.id)
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [jobs, customer]);

 const customerPayments = useMemo(() => {
  if (!customer) return [];
  return (payments || [])
    .filter((p) => p.customerId === customer.id)
    .sort((a, b) => b.createdAt - a.createdAt);
}, [payments, customer]);




  function shareAsPDF() {
    // This uses the browser print dialog. User can choose “Save as PDF”.
    const html = printRef.current?.innerHTML;
    if (!html) return;

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
        <style>
          body{font-family:Segoe UI,system-ui,Arial; padding:24px;}
          h1{font-size:18px;margin:0 0 8px 0;}
          .muted{color:#555;}
          table{width:100%;border-collapse:collapse;margin-top:16px;}
          th,td{border:1px solid #ddd;padding:8px;font-size:12px;text-align:left;}
          th{background:#f3f4f6;}
        </style>
      </head>
      <body>${html}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
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
              ID: <b style={{ fontFamily: "monospace" }}>{customer.id}</b> — Paylaşım linki:{" "}
              <b>/customer/{customer.id}</b>
            </small>
            <br />
            <small style={{ color: "#666" }}>
              Borç: <b>{moneyTRY(customer.balanceOwed)}</b>
            </small>
          </p>

          <hr />

          {/* Payment / debt */}
          {/* i basically add another button and havent changed payment amonut for debt button */}
          <div className="btn-row">
            <div style={{ flex: 1 }}>
              <label>Tutar (₺)</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <label style={{ marginTop: 6 }}>Açıklama / Not</label>
<input
  type="text"
  placeholder="Örn: Parça ücreti, Avans, Elden ödeme"
  value={paymentNote}
  onChange={(e) => setPaymentNote(e.target.value)}
/>
              <button
                className="btn btn-save"
                style={{ marginTop: 8 }}
                onClick={() => {
  onMakePayment(customer.id, paymentAmount, paymentNote);
  setPaymentAmount("");
  setPaymentNote("");
}}
              >
                Tahsilat Al
              </button>
               <button
                className="btn btn-delete"
                style={{ marginTop: 8 }}
                onClick={() => {
  onAddDebt(customer.id, paymentAmount, paymentNote);
  setPaymentAmount("");
  setPaymentNote("");
}}
              >
                Borçlandır
              </button>
            </div>
            {/* this part is no longer needed you can delete it  */}
            {/* <div style={{ flex: 1 }}>
              <label>Borçlandır (₺)</label>
              <input
                type="number"
                value={debtAmount}
                onChange={(e) => setDebtAmount(e.target.value)}
              />
              
               <button
                className="btn btn-delete"
                style={{ marginTop: 8 }}
                onClick={() => {
                  onAddDebt(customer.id, debtAmount);
                  setDebtAmount("");
                }}
              >
                Borçlandır
              </button> 
            </div> */}
          </div>

          <div className="btn-row">
            <button
              className="btn"
              style={{ background: "#2563eb", color: "white" }}
              onClick={shareAsPDF}
            >
              PDF Paylaş / Çıktı
            </button>
            <button className="btn btn-save" onClick={onEditCustomer}>
              Müşteri Düzenle
            </button>
            <button className="btn btn-delete" onClick={onDeleteCustomer}>
              Müşteriyi Sil
            </button>
          </div>

          <hr />

          {/* Jobs list for customer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0 }}>İş Geçmişi</h4>
            <button className="btn btn-save" onClick={onAddJob}>
              + İş Ekle
            </button>
          </div>

          <div id="detail-history" style={{ marginTop: 12, fontSize: 14 }}>

  {/* 💰 Tahsilat / Borç Kayıtları */}
  {customerPayments.map((p) => (
    <div
      key={p.id}
      className="card"
      style={{
        borderLeft: `5px solid ${p.type === "payment" ? "#16a34a" : "#dc2626"}`
      }}
    >
      <strong>
        {p.type === "payment" ? "💰 Tahsilat" : "🧾 Borç"}
      </strong>{" "}
      — {moneyTRY(p.amount)}

      <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
        {p.note}
      </div>

      <div style={{ fontSize: 12, color: "#777" }}>
        {p.date}
      </div>
    </div>
  ))}

  {/* 🧰 İşler */}
  {customerJobs.length === 0 ? (
    <div className="card">Bu müşteriye ait iş yok.</div>
  ) : (
    customerJobs.map((j) => {
      const hours = calcHours(j.start, j.end);
      const partsTotal = (j.parts || []).reduce(
        (sum, p) => sum + toNum(p.price),
        0
      );
      const total = hours * toNum(j.rate) + partsTotal;

      return (
        <div key={j.id} className="card list-item">
          <div>
            <strong>{j.date}</strong>
            <br />
            <small>
              {j.start || "--:--"}-{j.end || "--:--"} | {hours.toFixed(2)} saat
            </small>
          </div>
          <div style={{ textAlign: "right" }}>
            <strong style={{ color: "var(--primary)" }}>
              {moneyTRY(total)}
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
                Kasa: {kasaName} <br />
                Tarih: {new Date().toLocaleDateString("tr-TR")}
              </div>
              <hr />
              <div>
                <b>Müşteri:</b> {customer.name} {customer.surname} <br />
                <b>ID:</b> {customer.id} <br />
                <b>Borç:</b> {moneyTRY(customer.balanceOwed)}
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Başlangıç</th>
                    <th>Bitiş</th>
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
      <td>
        {p.type === "payment"
          ? `-${moneyTRY(p.amount)}`
          : moneyTRY(p.amount)}
      </td>
      <td>{p.note}</td>
    </tr>
  ))}

  {/* ⚙️ İşler */}
  {customerJobs.map((j) => {
    const hours = calcHours(j.start, j.end);
    const partsTotal = (j.parts || []).reduce(
      (sum, p) => sum + toNum(p.price),
      0
    );
    const total = hours * toNum(j.rate) + partsTotal;

    return (
      <tr key={j.id}>
        <td>{j.date}</td>
        <td>{j.start || "--:--"}</td>
        <td>{j.end || "--:--"}</td>
        <td>{moneyTRY(total)}</td>
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
    </ModalBase>
  );
}

/* ============================================================
   8) CSS (Copied + adapted from your HTML)
============================================================ */

const css = `
:root {
  --primary: #2563eb;
  --success: #16a34a;
  --danger: #dc2626;
  --bg: #f3f4f6;
  --white: #ffffff;
}

body {
  font-family: 'Segoe UI', sans-serif;
  margin: 0;
  background: var(--bg);
  padding-bottom: 70px;
}

.header {
  background: var(--primary);
  color: white;
  padding: 1rem;
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.container { padding: 15px; }

/* Bottom navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  width: 100%;
  background: white;
  display: flex;
  justify-content: space-around;
  padding: 10px 0;
  border-top: 1px solid #ddd;
  box-shadow: 0 -2px 5px rgba(0,0,0,0.1);
  z-index: 99;
}

.nav-item {
  border: none;
  background: none;
  color: #666;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  cursor: pointer;
  gap: 4px;
}

.nav-item.active { color: var(--primary); }

/* Cards */
.card {
  background: white;
  padding: 15px;
  border-radius: 14px;
  margin-bottom: 10px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.06);
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge {
  background: #e0e7ff;
  color: #4338ca;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

/* Floating button */
.fab {
  position: fixed;
  bottom: 85px;
  right: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  border: none;
  font-size: 28px;
 
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  
}

/* Modal */
.modal {
  display: none; /* React controls display */
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  overflow-y: auto;
}

.modal-content {
  background: white;
  margin: 10% auto;
  padding: 20px;
  width: 90%;
  border-radius: 15px;
  max-width: 500px;
}

.form-group { margin-bottom: 15px; }
label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 14px;
}

input, select, textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  box-sizing: border-box;
}

.btn-row { display: flex; gap: 10px; margin-top: 15px; }
.btn {
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  flex: 1;
  font-weight: bold;
}

.btn-save { background: var(--success); color: white; }
.btn-cancel { background: #666; color: white; }
.btn-delete { background: var(--danger); color: white; }

.parca-item { display: flex; gap: 5px; margin-bottom: 5px; }
.search-bar {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border-radius: 20px;
  border: 1px solid #ddd;
}

.hidden { display: none; }

.partLine{
  display:flex;
  justify-content:space-between;
  background:#f9fafb;
  padding:8px 10px;
  border-radius:8px;
  margin-bottom:6px;
  font-size:13px;
}

.miniRow{
  display:flex;
  justify-content:space-between;
  background:#f9fafb;
  padding:8px 10px;
  border-radius:8px;
  font-size:13px;
}

.iconLike{
  border:none;
  background:transparent;
  font-size:16px;
  cursor:pointer;
  color:#333;
  padding:0 4px;
}


.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.header-title {
  margin: 0;
  font-size: 20px;
  letter-spacing: 0.2px;
}

.header-sub {
  font-size: 13px;
  opacity: 0.95;
  margin-top: 4px;
}

.logout-btn {
  background: rgba(255, 255, 255, 0.18);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.15s ease;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.28);
}


.section-header {
  padding: 10px 12px;
  border-radius: 12px;
}

.section-header strong {
  font-size: 14px;
}


`;

/* ============================================================
   Notes / Next Improvements (Optional)
============================================================ */
/**
 * - If you want jsPDF (real PDF file export) instead of print->PDF,
 *   tell me and I’ll swap shareAsPDF() to use jsPDF + autotable.
 * - We can also add “Prevent clock in if another is running” as a warning
 *   instead of auto-stopping the previous job.
 */




