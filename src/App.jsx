import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

import {
  ensureUserData,
  loadUserData,
  saveUserData,
  publishCustomerSnapshot,
} from "./firestoreService";

import { auth } from "./firebase";
import AuthPage from "./AuthPage";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation, // ✅ ADD
} from "react-router-dom";

import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

import { doc, getDoc } from "firebase/firestore";

import { db } from "./firebase";

import {
  ModalBase,
  ConfirmModal,
  CustomerModal,
  JobModal,
  CustomerDetailModal,
  PaymentActionModal,
  ProfileModal,
} from "./modals/Modals.jsx";

import {
  isWeekend,
  moveToNextBusinessDay,
  addDaysSkippingWeekend,
  daysBetween,
  getJobStartDate,
  pad2,
  generateCustomerIdFromNow,
  uid,
  money,
  toNum,
  partLineTotal,
  partsTotalOf,
  jobTotalOf,
  calcHours,
  formatTimer,
  makeEmptyCustomer,
  makeEmptyJob,
} from "./utils/helpers";

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
      vaultName: "Main Vault",
      vaultBalance: 0, // cash register balance
    };
  }
}

/** Save state to sessionStorage */
function persistState(state) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * ================= BUSINESS RULES =================
 *
 * CUSTOMER
 * - balanceOwed:
 *   > POSITIVE  = customer owes us money
 *   > ZERO      = settled
 *   > NEGATIVE  = customer overpaid (credit)
 *
 * JOB
 * - A job does NOT affect money until it is marked completed
 * - When completed:
 *   → job total is ADDED to customer.balanceOwed
 * - When paid:
 *   → job is marked isPaid=true
 *   → money is tracked via payments, not jobs
 *
 * PAYMENT / DEBT (payments array)
 * - type: "payment" → money COMES IN (Payment)
 * - type: "debt"    → money ADDS TO DEBT (borç)
 *
 * IMPORTANT:
 * - Cash (vault) is ONLY affected by "payment"
 * - Debt NEVER touches vault
 *
 * ===================================================
 */

/* ============================================================
   3) DEFAULT MODELS
============================================================ */

/**
 * Make Payment (TAHSİLAT)
 *
 * BUSINESS RULES:
 * 1) Payment always REDUCES customer.balanceOwed
 * 2) Payment always INCREASES vault.balance
 * 3) Payment is applied to UNPAID COMPLETED JOBS first
 *    - Oldest job first
 *    - If payment fully covers a job → job.isPaid = true
 *    - Partial payments do NOT mark job paid
 *
 * IMPORTANT:
 * - Jobs are NEVER partially paid
 * - Job payment status is binary: paid / unpaid
 * - Payment history is the source of truth
 */

//
/* ============================================================
   4) MAIN APP (ROUTER)
============================================================ */

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate />
    </BrowserRouter>
  );
}

function AuthGate() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Yükleniyor...</div>;

  // ✅ PUBLIC route: login istemez
  if (location.pathname.startsWith("/customer/")) {
    return (
      <Routes>
        <Route path="/customer/:id" element={<PublicCustomerSharePage />} />
      </Routes>
    );
  }

  // 🔒 Admin tarafı: login şart
  if (!user) return <AuthPage />;

  return <AppRoutes user={user} />;
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
      // ✅ MIGRATION: support old users that still have vaultName/vaultBalance
      const fixed = { ...data };
      if (!fixed.currency) {
        fixed.currency = "TRY"; // default
      }

      if (!fixed.vaults || !Array.isArray(fixed.vaults)) {
        const legacyName = fixed.vaultName || "Vault Name";
        const legacyBal = Number(fixed.vaultBalance || 0);

        fixed.vaults = [
          {
            id: "main_vault",
            name: legacyName,
            balance: legacyBal,
            currency: fixed.currency || "TRY",
            createdAt: Date.now(),
          },
        ];
        fixed.activeVaultId = "main_vault";
      }

      // optional: remove old fields if you want (not required)
      // delete fixed.vaultName;
      // delete fixed.vaultBalance;

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
      <Route
        path="/"
        element={<MainApp state={state} setState={setState} user={user} />}
      />
    </Routes>
  );
}

/* ============================================================
   5) MAIN APP UI (Home / Customers / Settings)
============================================================ */

function MainApp({ state, setState, user }) {
  const [page, setPage] = useState("home"); // home | customers | settings
  const [search, setSearch] = useState("");
  const [customerSort, setCustomerSort] = useState("latest");

  const [profileOpen, setProfileOpen] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState("payment");
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [vaultDetailOpen, setVaultDetailOpen] = useState(false);
  const [selectedVaultId, setSelectedVaultId] = useState(null);

  const [jobActionOpen, setJobActionOpen] = useState(false);
  const [jobActionJobId, setJobActionJobId] = useState(null);

  const [openCustomerFolders, setOpenCustomerFolders] = useState({});

  // Delete confirmation modal
  const [confirm, setConfirm] = useState({
    open: false,
    type: null, // "job" | "customer"
    id: null,
    message: "",
  });

  // Modals
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [jobFixedCustomerId, setJobFixedCustomerId] = useState(null);

  const [custModalOpen, setCustModalOpen] = useState(false);
  const [custDetailOpen, setCustDetailOpen] = useState(false);

  useAndroidBackHandler({
    page,
    setPage,
    closeAllModals: () => {
      if (jobModalOpen) {
        setJobModalOpen(false);
        return true;
      }
      if (custModalOpen) {
        setCustModalOpen(false);
        return true;
      }
      if (custDetailOpen) {
        setCustDetailOpen(false);
        return true;
      }
      if (paymentModalOpen) {
        setPaymentModalOpen(false);
        return true;
      }
      if (profileOpen) {
        setProfileOpen(false);
        return true;
      }
      if (vaultDetailOpen) {
        setVaultDetailOpen(false);
        return true;
      }
      if (jobActionOpen) {
        setJobActionOpen(false);
        return true;
      }
      if (confirm.open) {
        setConfirm({ open: false });
        return true;
      }
      return false;
    },
  });

  function toggleCustomerFolder(customerId) {
    setOpenCustomerFolders((s) => ({
      ...s,
      [customerId]: !s[customerId],
    }));
  }

  function openPaymentModal(mode, customer) {
    setPaymentMode(mode);
    setPaymentCustomer(customer);
    setPaymentModalOpen(true);
  }

  const currency = state.currency || "TRY";

  const activeVault = useMemo(() => {
    return (
      (state?.vaults || []).find((k) => k.id === state?.activeVaultId) || null
    );
  }, [state?.vaults, state?.activeVaultId]);

  // vault DELETE CONFIRM STATE
  const [vaultDeleteConfirm, setvaultDeleteConfirm] = useState({
    open: false,
    vaultId: null,
    text: "",
  });

  const [editingVaultId, setEditingVaultId] = useState(null);
  const [editingVaultName, setEditingVaultName] = useState("");

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
  const activeJobsByCustomer = useMemo(() => {
    const map = new Map();

    activeJobs.forEach((job) => {
      if (!map.has(job.customerId)) {
        map.set(job.customerId, []);
      }
      map.get(job.customerId).push(job);
    });

    return map;
  }, [activeJobs]);

  const completedJobs = filteredJobs.filter((j) => j.isCompleted && !j.isPaid);

  // 📊 Financial summary (Home page) — DERIVED (correct)
  const financialSummary = useMemo(() => {
    let totalPayment = 0;
    let totalDebt = 0;

    // 🟢 1) REAL MONEY IN (Payment)
    (state.payments || []).forEach((p) => {
      if (p.type === "payment") {
        totalPayment += toNum(p.amount);
      }

      if (p.type === "debt") {
        totalDebt += toNum(p.amount);
      }
    });

    // 🔴 2) JOB VALUE THAT IS NOT PAID YET
    state.jobs.forEach((job) => {
      if (job.isPaid) return; // ❌ paid jobs NEVER count as borç

      const liveMs =
        job.isRunning && job.clockInAt ? Date.now() - job.clockInAt : 0;

      const totalMs = (job.workedMs || 0) + liveMs;

      const hours =
        job.timeMode === "clock"
          ? totalMs / 36e5
          : calcHours(job.start, job.end);

      const jobTotal = hours * toNum(job.rate) + partsTotalOf(job);

      totalDebt += jobTotal;
    });

    return {
      totalPayment,
      totalDebt,
      net: totalPayment - totalDebt,
    };
  }, [state.payments, state.jobs]);

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

  function getLatestCustomerTransaction(customerId, jobs, payments) {
    let latest = 0;

    (payments || []).forEach((p) => {
      if (p.customerId === customerId) {
        const t = p.createdAt || new Date(p.date || 0).getTime() || 0;
        latest = Math.max(latest, t);
      }
    });

    (jobs || []).forEach((j) => {
      if (j.customerId === customerId) {
        latest = Math.max(latest, j.createdAt || 0);
      }
    });

    return latest;
  }
  function getVaultBalance(vaultId) {
    return (state.payments || []).reduce((sum, p) => {
      if (p.vaultId !== vaultId) return sum;

      if (p.type === "payment") {
        return sum + toNum(p.amount);
      }

      if (p.type === "debt") {
        return sum - toNum(p.amount);
      }

      return sum;
    }, 0);
  }

  function renameVault(vaultId, update) {
    setState((s) => ({
      ...s,
      vaults: s.vaults.map((k) =>
        k.id === vaultId
          ? typeof update === "string"
            ? { ...k, name: update } // old behavior
            : { ...k, ...update } // new behavior (currency etc.)
          : k
      ),
    }));
  }

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
    // 2) SORT
    switch (customerSort) {
      case "latest":
        list.sort((a, b) => {
          const aDate = getLatestCustomerTransaction(
            a.id,
            state.jobs,
            state.payments || []
          );
          const bDate = getLatestCustomerTransaction(
            b.id,
            state.jobs,
            state.payments || []
          );
          return bDate - aDate; // newest first
        });
        break;

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
  }, [search, state.customers, customerSort, state.jobs, state.payments]);

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

  /** Delete customer + their jobs  + payments */
  function deleteCustomer(customerId) {
    setState((s) => ({
      ...s,
      customers: s.customers.filter((c) => c.id !== customerId),
      jobs: s.jobs.filter((j) => j.customerId !== customerId),
      payments: (s.payments || []).filter((p) => p.customerId !== customerId),
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
  function makePayment(customerId, amount, note, date, vaultId, method) {
    const amt = toNum(amount);
    if (amt <= 0) return;

    setState((s) => {
      let remaining = amt;

      // 1️⃣ Find unpaid completed jobs (oldest first)
      const unpaidJobs = s.jobs
        .filter(
          (j) => j.customerId === customerId && j.isCompleted && !j.isPaid
        )
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      // 2️⃣ Apply payment job by job
      const nextJobs = s.jobs.map((job) => {
        if (
          job.customerId !== customerId ||
          !job.isCompleted ||
          job.isPaid ||
          remaining <= 0
        ) {
          return job;
        }

        const nextJobs = s.jobs.map((job) => {
          if (
            job.customerId !== customerId ||
            !job.isCompleted ||
            job.isPaid ||
            remaining <= 0
          ) {
            return job;
          }

          // ✅ SINGLE SOURCE OF TRUTH
          const jobTotal = jobTotalOf(job);

          if (remaining >= jobTotal) {
            remaining -= jobTotal;
            return { ...job, isPaid: true };
          }

          return job;
        });

        if (remaining >= jobTotal) {
          remaining -= jobTotal;
          return { ...job, isPaid: true };
        }

        return job; // partial payment → still unpaid
      });

      // 3️⃣ Create payment record
      const payment = {
        id: uid(),
        customerId,
        vaultId: vaultId || s.activeVaultId,
        type: "payment",
        amount: amt,
        method,
        note: note || "Tahsilat",
        date,
        createdAt: Date.now(),
        currency:
          (s.vaults || []).find((k) => k.id === (vaultId || s.activeVaultId))
            ?.currency ||
          s.currency ||
          "TRY",
      };

      // 4️⃣ Update customer balance
      const nextCustomers = s.customers.map((c) =>
        c.id === customerId
          ? { ...c, balanceOwed: toNum(c.balanceOwed) - amt }
          : c
      );

      // 5️⃣ Update vault balance
      const nextVaults = s.vaults.map((k) =>
        k.id === (vaultId || s.activeVaultId)
          ? { ...k, balance: toNum(k.balance) + amt }
          : k
      );

      return {
        ...s,
        jobs: nextJobs,
        customers: nextCustomers,
        vaults: nextVaults,
        payments: [...(s.payments || []), payment],
      };
    });
  }

  /**
   * Add Debt (BORÇ)
   *
   * BUSINESS RULES:
   * - Debt INCREASES customer.balanceOwed
   * - Debt DOES NOT affect vault balance
   * - Debt exists only as a record (payments array)
   *
   * WHY:
   * - Borç is an accounting adjustment, not real cash movement
   */

  /** Add debt to a customer (does NOT affect cash) */
  function addDebt(customerId, amount, note, date, vaultId, method) {
    const amt = toNum(amount);
    if (amt <= 0) return;

    setState((s) => {
      const debt = {
        id: uid(),
        customerId,
        vaultId: vaultId || s.activeVaultId,
        type: "debt",
        amount: amt,
        method, // ✅ SAVE METHOD
        note: note || "Borç",
        date,
        createdAt: Date.now(),

        currency:
          (s.vaults || []).find((k) => k.id === (vaultId || s.activeVaultId))
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

  function updatePaymentTransaction(updated) {
    setState((s) => {
      const old = (s.payments || []).find((p) => p.id === updated.id);
      if (!old) return s;

      const oldAmt = toNum(old.amount);
      const newAmt = toNum(updated.amount);

      // diff = how much changed
      const diff = newAmt - oldAmt;

      // 1) update payments array
      const nextPayments = (s.payments || []).map((p) =>
        p.id === updated.id ? { ...p, ...updated, amount: newAmt } : p
      );

      // 2) update customer balance owed (depends on type)
      const nextCustomers = (s.customers || []).map((c) => {
        if (c.id !== old.customerId) return c;

        // payment reduces debt, debt increases debt
        if (old.type === "payment") {
          return { ...c, balanceOwed: toNum(c.balanceOwed) - diff };
        } else {
          return { ...c, balanceOwed: toNum(c.balanceOwed) + diff };
        }
      });

      // 3) update vault balances
      // ONLY change vault if it’s a payment (borç does not touch vault in your system)
      let nextVaults = s.vaults || [];

      if (old.type === "payment") {
        const oldVaultId = old.vaultId || s.activeVaultId;
        const newVaultId = updated.vaultId || oldVaultId;

        // If Vault changed: remove old amount from old Vault and add new amount to new Vault
        if (oldVaultId !== newVaultId) {
          nextVaults = nextVaults.map((k) => {
            if (k.id === oldVaultId)
              return { ...k, balance: toNum(k.balance) - oldAmt };
            if (k.id === newVaultId)
              return { ...k, balance: toNum(k.balance) + newAmt };
            return k;
          });
        } else {
          // same Vault: adjust by diff only
          nextVaults = nextVaults.map((k) =>
            k.id === oldVaultId ? { ...k, balance: toNum(k.balance) + diff } : k
          );
        }
      }

      return {
        ...s,
        payments: nextPayments,
        customers: nextCustomers,
        vaults: nextVaults,
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

  /**
   * Mark Job as Completed
   *
   * BUSINESS RULES:
   * - Completing a job:
   *   → FREEZES its total (hours + parts)
   *   → ADDS total to customer.balanceOwed
   * - Job is NOT paid automatically
   * - Job becomes eligible for payment allocation
   *
   * IMPORTANT:
   * - Editing job AFTER completion will NOT auto-adjust balance
   *   (manual correction via transactions is required)
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

      const liveMs =
        job.isRunning && job.clockInAt ? Date.now() - job.clockInAt : 0;

      const totalMs = (job.workedMs || 0) + liveMs;

      const hours =
        job.timeMode === "clock"
          ? totalMs / 36e5
          : calcHours(job.start, job.end);

      const total = jobTotalOf(job);

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

  /**
   * Mark Job Paid (MANUAL)
   *
   * BUSINESS RULES:
   * - This only changes job state
   * - NO money movement
   * - NO Vault update
   *
   * WHY:
   * - Actual money is tracked via payments
   * - Job paid state is informational / reporting only
   */

  function markJobPaid(jobId) {
    setState((s) => {
      const job = s.jobs.find((j) => j.id === jobId);
      if (!job || job.isPaid) return s;

      // 🔹 calculate job total
      const liveMs =
        job.isRunning && job.clockInAt ? Date.now() - job.clockInAt : 0;

      const totalMs = (job.workedMs || 0) + liveMs;

      const hours =
        job.timeMode === "clock"
          ? totalMs / 36e5
          : calcHours(job.start, job.end);

      const jobTotal = jobTotalOf(job);

      const vaultId = s.activeVaultId;

      // 🔹 create Payment record
      const payment = {
        id: uid(),
        customerId: job.customerId,
        vaultId,
        type: "payment",
        amount: jobTotal,
        method: "cash",
        note: "İş ödemesi (manuel)",
        date: new Date().toISOString().slice(0, 10),
        createdAt: Date.now(),
        source: "job", // ✅ ADD THIS LINE
        currency:
          s.vaults.find((k) => k.id === vaultId)?.currency ||
          s.currency ||
          "TRY",
      };

      return {
        ...s,
        jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, isPaid: true } : j)),
        customers: s.customers.map((c) =>
          c.id === job.customerId
            ? { ...c, balanceOwed: toNum(c.balanceOwed) - jobTotal }
            : c
        ),
        vaults: s.vaults.map((k) =>
          k.id === vaultId ? { ...k, balance: toNum(k.balance) + jobTotal } : k
        ),
        payments: [...(s.payments || []), payment],
      };
    });
  }

  function useAndroidBackHandler({ page, setPage, closeAllModals }) {
    const lastBack = useRef(0);

    useEffect(() => {
      // ✅ Push guard ONLY once
      if (!window.history.state?.pwa) {
        window.history.pushState({ pwa: true }, "");
      }

      const onBack = () => {
        // 🔴 FIX #1: Allow React Router to handle non-root routes
        if (window.location.pathname !== "/") {
          return;
        }

        // 1️⃣ Close modals first
        if (closeAllModals()) {
          if (!window.history.state?.pwa) {
            window.history.pushState({ pwa: true }, "");
          }
          return;
        }

        // 2️⃣ Navigate to home instead of exiting
        if (page !== "home") {
          setPage("home");

          if (!window.history.state?.pwa) {
            window.history.pushState({ pwa: true }, "");
          }
          return;
        }

        // 3️⃣ Double back to exit
        const now = Date.now();
        if (now - lastBack.current < 1500) {
          window.history.back(); // allow exit
          return;
        }

        lastBack.current = now;
        alert("Çıkmak için tekrar geri basın");

        if (!window.history.state?.pwa) {
          window.history.pushState({ pwa: true }, "");
        }
      };

      window.addEventListener("popstate", onBack);
      return () => window.removeEventListener("popstate", onBack);
    }, [page, setPage, closeAllModals]);
  }

  /**
   * Clock In:
   * - Start job timer (only one running job at a time for safety)
   * If another job is running, we stop it automatically.
   */

  /**
   * CLOCK-IN / CLOCK-OUT RULES
   *
   * - Only ONE job can be running at a time
   * - Starting a new job auto-stops the previous one
   * - Time is accumulated into workedMs
   * - Session history is preserved for audit
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

  /**
   * CLOCK-IN / CLOCK-OUT RULES
   *
   * - Only ONE job can be running at a time
   * - Starting a new job auto-stops the previous one
   * - Time is accumulated into workedMs
   * - Session history is preserved for audit
   */

  function clockOut(jobId) {
    setState((s) => {
      const now = Date.now();

      const nextJobs = s.jobs.map((j) => {
        if (j.id !== jobId) return j;
        if (!j.clockInAt) return { ...j, isRunning: false };

        const sessionMs = now - j.clockInAt;

        return {
          ...j,
          isRunning: false,
          clockOutAt: now,
          clockInAt: null,

          workedMs: (j.workedMs || 0) + sessionMs,

          // ✅ SAVE SESSION HISTORY
          clockSessions: [
            ...(j.clockSessions || []),
            {
              in: j.clockInAt,
              out: now,
              ms: sessionMs,
            },
          ],
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
      setJobFixedCustomerId(null); // ✅ allow selecting custome
      setJobModalOpen(true);
    } else if (page === "customers") {
      setEditingCustId(null);
      setCustModalOpen(true);
    }
  }

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <>
      <div className="app-shell">
        <div className="app-frame">
          <div className="container">
            {/* Search bar */}
            {/* Search bar */}
            <div className="search-wrap">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="search-bar"
                  placeholder="Ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                {search && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearch("")}
                    title="Temizle"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>

              {page === "customers" && (
                <div className="sort-wrapper">
                  <button
                    type="button"
                    className="sort-icon-btn"
                    title="Sırala"
                    onClick={() =>
                      document.getElementById("customer-sort").click()
                    }
                  >
                    <i className="fa-solid fa-arrow-up-wide-short"></i>
                  </button>

                  <select
                    id="customer-sort"
                    value={customerSort}
                    onChange={(e) => setCustomerSort(e.target.value)}
                    className="sort-hidden-select"
                  >
                    <option value="debt_desc">💸 Borcu En Yüksek</option>
                    <option value="debt_asc">💰 Borcu En Düşük</option>
                    <option value="name_asc">🔤 İsim A → Z</option>
                    <option value="name_desc">🔤 İsim Z → A</option>
                    <option value="latest">🕒 Son İşlem (En Yeni)</option>
                  </select>
                </div>
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
                        {money(financialSummary.totalDebt, currency)}
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
                        {money(financialSummary.totalPayment, currency)}
                      </div>
                    </div>
                  </div>

                  {/* NET */}
                  <div
                    style={{
                      marginBottom: 12,
                      padding: 10,
                      borderRadius: 10,
                      background:
                        financialSummary.net > 0 ? "#fef2f2" : "#f0fdf4",
                      color: financialSummary.net > 0 ? "#7f1d1d" : "#166534",
                      fontWeight: 600,
                      textAlign: "center",
                    }}
                  >
                    Net Durum: {money(Math.abs(financialSummary.net), currency)}{" "}
                    {financialSummary.net > 0 ? "(Alacak)" : "(Fazla Tahsilat)"}
                  </div>

                  {/* BAR CHART */}
                  {(() => {
                    const max = Math.max(
                      financialSummary.totalDebt,
                      financialSummary.totalPayment,
                      1
                    );

                    const debtPct = (financialSummary.totalDebt / max) * 100;

                    const payPct = (financialSummary.totalPayment / max) * 100;

                    return (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 12, marginBottom: 4 }}>
                            Borç
                          </div>
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
                        <i className="fa-solid fa-bell"></i> 30 Günlük Ödeme
                        Takibi ({paymentWatchList.length})
                      </strong>
                      <span>{paymentOpen ? "▾" : "▸"}</span>
                    </div>
                  </div>

                  {paymentOpen &&
                    (paymentWatchList.length === 0 ? (
                      <div
                        className="card"
                        style={{ fontSize: 12, color: "#666" }}
                      >
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
                              {(() => {
                                const totalMs = job.workedMs || 0;
                                const hours =
                                  job.timeMode === "clock"
                                    ? totalMs / 36e5
                                    : calcHours(job.start, job.end);

                                return money(
                                  hours * toNum(job.rate) + partsTotalOf(job),
                                  currency
                                );
                              })()}
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
                    (activeJobsByCustomer.size === 0 ? (
                      <div className="card">Aktif iş yok.</div>
                    ) : (
                      Array.from(activeJobsByCustomer.entries()).map(
                        ([customerId, jobs]) => {
                          const customer = customersById.get(customerId);

                          const isOpen =
                            openCustomerFolders[customerId] ?? false;

                          const totalAmount = jobs.reduce(
                            (sum, j) => sum + jobTotalOf(j),
                            0
                          );

                          return (
                            <div key={customerId}>
                              {/* CUSTOMER FOLDER HEADER */}
                              <div
                                className="card list-item"
                                style={{
                                  cursor: "pointer",
                                  background: "#f8fafc",
                                }}
                                onClick={() => toggleCustomerFolder(customerId)}
                              >
                                <div>
                                  <strong>
                                    {customer
                                      ? `${customer.name} ${customer.surname}`
                                      : "Bilinmeyen"}
                                  </strong>

                                  <div style={{ fontSize: 12, color: "#666" }}>
                                    {jobs.length} aktif iş
                                  </div>
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                  }}
                                >
                                  <strong style={{ color: "var(--primary)" }}>
                                    {money(totalAmount, currency)}
                                  </strong>

                                  <span
                                    className={`folder-arrow ${
                                      isOpen ? "open" : ""
                                    }`}
                                  >
                                    ▸
                                  </span>
                                </div>
                              </div>

                              {/* JOBS */}
                              <div
                                className={`job-folder ${isOpen ? "open" : ""}`}
                              >
                                {jobs.map((job) => (
                                  <div key={job.id} className="job-folder-item">
                                    <JobCard
                                      job={job}
                                      customersById={customersById}
                                      toggleJobOpen={toggleJobOpen}
                                      clockIn={clockIn}
                                      clockOut={clockOut}
                                      currency={currency}
                                      markJobComplete={markJobComplete} // ✅ ADD THIS LINE
                                      markJobPaid={markJobPaid} // ✅ (optional but good)
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                      )
                    ))}

                  {/* COMPLETED JOBS FOLDER */}
                  <div className="card" style={{ marginTop: 10 }}>
                    <div
                      className="list-item"
                      style={{ cursor: "pointer" }}
                      onClick={() => setCompletedOpen((o) => !o)}
                    >
                      <strong>
                        ✅ Tamamlanan İşler ({completedJobs.length})
                      </strong>
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
                            onOpenActions={(jobId) => {
                              setJobActionJobId(jobId);
                              setJobActionOpen(true);
                            }}
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
                    filteredCustomers.map((c) => {
                      const bakiye = -toNum(c.balanceOwed); // ✅ THIS WAS MISSING

                      return (
                        <div
                          key={c.id}
                          className="card list-item"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setCustDetailOpen(true);
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              width: "100%",
                            }}
                          >
                            {/* LEFT */}
                            <div>
                              <strong>
                                {c.name} {c.surname}
                              </strong>
                              <br />
                              <small>{c.phone || "Telefon yok"}</small>

                              <div
                                style={{
                                  marginTop: 4,
                                  fontSize: 12,
                                  color: "#666",
                                }}
                              >
                                ID:{" "}
                                <span style={{ fontFamily: "monospace" }}>
                                  {c.id}
                                </span>
                              </div>
                            </div>

                            {/* RIGHT — BAKİYE */}
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 14,
                                color: bakiye >= 0 ? "#16a34a" : "#dc2626",
                                minWidth: 90,
                                textAlign: "right",
                              }}
                            >
                              {bakiye >= 0 ? "+" : "-"}
                              {Math.abs(bakiye).toFixed(2)} {currency}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* SETTINGS PAGE */}
            {page === "settings" && (
              <div id="page-settings">
                <div className="card">
                  {/* 🔓 LOGOUT BUTTON */}
                  <button
                    className="logout-btn"
                    onClick={() => signOut(auth)}
                    style={{ marginTop: 12, width: "100%" }}
                  >
                    <i className="fa-solid fa-right-from-bracket"></i> Çıkış Yap
                  </button>
                  {/* 👤 ADMIN PROFILE */}
                  <div
                    className="card admin-profile"
                    style={{ cursor: "pointer" }}
                    onClick={() => setProfileOpen(true)}
                  >
                    <div className="admin-row">
                      <div className="admin-avatar">
                        {user?.email?.[0]?.toUpperCase() || "A"}
                      </div>

                      <div className="admin-info" style={{ flex: 1 }}>
                        <strong className="admin-name">
                          {user?.displayName || "Yönetici"}
                        </strong>

                        <div className="admin-email">
                          {user?.email || "admin@example.com"}
                        </div>

                        <span className="admin-role">ADMIN</span>
                      </div>

                      {/* RIGHT SIDE */}
                      <div className="admin-meta-right">
                        {state.profile?.phone && (
                          <div className="admin-meta">
                            📞 {state.profile.phone}
                          </div>
                        )}

                        {state.profile?.address && (
                          <div className="admin-meta">
                            📍 {state.profile.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <h3>Kasa Yönetimi</h3>

                  {/* Vault LIST */}
                  {state.vaults.map((vault) => {
                    const isActive = vault.id === state.activeVaultId;

                    return (
                      <div
                        key={vault.id}
                        className="card list-item"
                        style={{
                          borderLeft: isActive
                            ? "6px solid #2563eb"
                            : "6px solid transparent",
                          background: isActive ? "#eff6ff" : "white",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          setCustDetailOpen(false); //  CLOSE customer detail FIRST
                          setJobModalOpen(false);
                          setSelectedCustomerId(null);

                          setSelectedVaultId(vault.id);
                          setVaultDetailOpen(true);
                        }}
                      >
                        <div>
                          {editingVaultId === vault.id ? (
                            <input
                              value={editingVaultName}
                              autoFocus
                              onChange={(e) =>
                                setEditingVaultName(e.target.value)
                              }
                              onBlur={() => {
                                if (!editingVaultName.trim()) {
                                  setEditingVaultId(null);
                                  return;
                                }

                                setState((s) => ({
                                  ...s,
                                  vaults: s.vaults.map((k) =>
                                    k.id === vault.id
                                      ? { ...k, name: editingVaultName.trim() }
                                      : k
                                  ),
                                }));
                                setEditingVaultId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.target.blur();
                                if (e.key === "Escape") setEditingVaultId(null);
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
                                setEditingVaultId(vault.id);
                                setEditingVaultName(vault.name);
                              }}
                            >
                              {vault.name}
                            </strong>
                          )}

                          <div style={{ fontSize: 12, color: "#555" }}>
                            Bakiye:{" "}
                            {money(getVaultBalance(vault.id), vault.currency)}
                          </div>
                        </div>

                        {isActive ? (
                          <div className="vault-active-badge">AKTİF</div>
                        ) : (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="btn btn-save vault-select-btn"
                              onClick={(e) => {
                                e.stopPropagation(); // 🔥 PREVENT vault detail opening
                                setState((s) => ({
                                  ...s,
                                  activeVaultId: vault.id,
                                }));
                              }}
                            >
                              Seç
                            </button>

                            <button
                              className="btn btn-delete vault-select-btn"
                              onClick={(e) => {
                                e.stopPropagation(); // 🔥 PREVENT vault detail opening
                                setVaultDeleteConfirm({
                                  open: true,
                                  vaultId: vault.id,
                                  text: "",
                                });
                              }}
                            >
                              Sil
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* ADD NEW vault */}
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
                        vaults: [
                          ...(s.vaults || []),
                          {
                            id,
                            name: `Yeni Kasa ${s.vaults.length + 1}`,
                            balance: 0,
                            currency: s.currency || "TRY", // ✅ add this
                            createdAt: Date.now(),
                          },
                        ],
                        activeVaultId: id,
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
              <i className="fa-solid fa-plus"></i>
            </button>
          )}

          {/* Bottom navigation */}
          <nav className="bottom-nav">
            <button
              className={`nav-item ${page === "home" ? "active" : ""}`}
              onClick={() => setPage("home")}
            >
              <span className="nav-icon">
                <i className="fa-solid fa-house"></i>
              </span>
              <span className="nav-label">Anasayfa</span>
            </button>

            <button
              className={`nav-item ${page === "customers" ? "active" : ""}`}
              onClick={() => setPage("customers")}
            >
              <span className="nav-icon">
                <i className="fa-solid fa-users"></i>
              </span>

              <span className="nav-label">Müşteriler</span>
            </button>

            <button
              className={`nav-item ${page === "settings" ? "active" : ""}`}
              onClick={() => setPage("settings")}
            >
              <span className="nav-icon">
                <i className="fa-solid fa-gear"></i>
              </span>

              <span className="nav-label">Ayarlar</span>
            </button>
          </nav>

          {/* JOB MODAL */}
          <JobModal
            open={jobModalOpen}
            onClose={() => {
              setJobModalOpen(false);
              setJobFixedCustomerId(null);
            }}
            customers={state.customers}
            jobs={state.jobs}
            editingJobId={editingJobId}
            onSave={(job) => upsertJob(job)}
            currency={currency} // ✅ ADD THIS
            setConfirm={setConfirm} // ✅ ADD
            fixedCustomerId={jobFixedCustomerId} // ✅ ADD
            zIndex={3000}
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
            zIndex={1500} // ✅ ADD THIS LINE
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
            vaults={state.vaults} // ✅ ADD
            activeVaultId={state.activeVaultId} // ✅ ADD
            onOpenPayment={openPaymentModal}
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
              setCustDetailOpen(false); // 🔥 CLOSE customer detail
              setSelectedCustomerId(null);

              setEditingJobId(jobId);
              setJobModalOpen(true);
            }}
            onAddJob={() => {
              setCustDetailOpen(false); // 🔥 CLOSE customer detail
              setSelectedCustomerId(null);

              setEditingJobId(null);
              setJobFixedCustomerId(selectedCustomerId);
              setJobModalOpen(true);
            }}
            onDeleteJob={(jobId) =>
              setConfirm({
                open: true,
                type: "job",
                id: jobId,
                message: "Bu işi silmek istediğinize emin misiniz?",
              })
            }
            onUpdatePayment={updatePaymentTransaction}
            setConfirm={setConfirm}
          />

          <PaymentActionModal
            open={paymentModalOpen}
            mode={paymentMode}
            customer={paymentCustomer}
            vaults={state.vaults}
            activeVaultId={state.activeVaultId}
            onClose={() => setPaymentModalOpen(false)}
            onSubmit={(amount, note, vaultId, date, method) => {
              if (!paymentCustomer) return;

              if (paymentMode === "payment") {
                // ✅ Payment: vault seçilebilir
                makePayment(
                  paymentCustomer.id,
                  amount,
                  note,
                  date,
                  vaultId,
                  method
                );
              } else {
                // ✅ Borç: vault yok → active vault kullanılır
                addDebt(paymentCustomer.id, amount, note, date, null, null);
              }
            }}
          />

          <VaultDetailModal
            open={vaultDetailOpen}
            onClose={() => setVaultDetailOpen(false)}
            vault={state.vaults.find((k) => k.id === selectedVaultId)}
            onRenameVault={renameVault}
            payments={state.payments}
          />
          <ProfileModal
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            user={user}
            profile={state.profile} // ✅ ADD THIS
            setState={setState} // ✅ ADD THIS
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

              if (confirm.type === "payment") {
                setState((s) => ({
                  ...s,
                  payments: (s.payments || []).filter(
                    (p) => p.id !== confirm.id
                  ),
                }));
              }

              setConfirm({ open: false, type: null, id: null, message: "" });
            }}
          />

          {jobActionOpen && (
            <ModalBase
              open={true}
              title="İş Seçenekleri"
              onClose={() => setJobActionOpen(false)}
            >
              <div style={{ display: "grid", gap: 10 }}>
                <button
                  className="btn btn-save"
                  onClick={() => {
                    setEditingJobId(jobActionJobId);
                    setJobActionOpen(false);
                    setTimeout(() => setJobModalOpen(true), 0);
                  }}
                >
                  <i className="fa-solid fa-pen"></i> Düzenle
                </button>

                <button
                  className="btn btn-delete"
                  onClick={() => {
                    setJobActionOpen(false);
                    setConfirm({
                      open: true,
                      type: "job",
                      id: jobActionJobId,
                      message: "Bu işi silmek istediğinize emin misiniz?",
                    });
                  }}
                >
                  <i className="fa-solid fa-trash"></i> Sil
                </button>
              </div>
            </ModalBase>
          )}

          {/* vault DELETE CONFIRM MODAL */}
          {vaultDeleteConfirm.open && (
            <ModalBase
              open={true}
              title="Kasa Silme Onayı"
              onClose={() =>
                setVaultDeleteConfirm({ open: false, vaultId: null, text: "" })
              }
            >
              <p style={{ color: "#b91c1c", fontWeight: 600 }}>
                ⚠️ Bu kasa kalıcı olarak silinecek.
              </p>

              <p>
                Devam etmek için <b>SIL</b> yazın:
              </p>

              <input
                value={vaultDeleteConfirm.text}
                onChange={(e) =>
                  setVaultDeleteConfirm((s) => ({
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
                    setVaultDeleteConfirm({
                      open: false,
                      vaultId: null,
                      text: "",
                    })
                  }
                >
                  Vazgeç
                </button>

                <button
                  className="btn btn-delete"
                  disabled={vaultDeleteConfirm.text !== "SIL"}
                  onClick={() => {
                    setState((s) => ({
                      ...s,
                      vaults: s.vaults.filter(
                        (k) => k.id !== vaultDeleteConfirm.vaultId
                      ),
                      payments: (s.payments || []).filter(
                        (p) => p.vaultId !== vaultDeleteConfirm.vaultId
                      ),
                    }));

                    setVaultDeleteConfirm({
                      open: false,
                      vaultId: null,
                      text: "",
                    });
                  }}
                >
                  Kalıcı Olarak Sil
                </button>
              </div>
            </ModalBase>
          )}
        </div>
      </div>
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
  onOpenActions, // ✅ ADD
  hideActions = false, // ✅ ADD THIS LINE
}) {
  const c = customersById.get(job.customerId);

  const liveMs =
    job.isRunning && job.clockInAt ? Date.now() - job.clockInAt : 0;

  // ✅ TOTAL accumulated time (past sessions + current running session)
  const totalMs =
    (job.workedMs || 0) + (job.isRunning && job.clockInAt ? liveMs : 0);

  // ✅ FINAL hours logic
  const hours =
    job.timeMode === "clock" ? totalMs / 36e5 : calcHours(job.start, job.end);

  const partsTotal = partsTotalOf(job);

  const total = jobTotalOf(job);

  let jobStatusClass = "job-card";

  if (!job.isCompleted) {
    jobStatusClass += " job-active";
  } else if (job.isCompleted && !job.isPaid) {
    jobStatusClass += " job-unpaid";
  } else if (job.isCompleted && job.isPaid) {
    jobStatusClass += " job-paid";
  }

  return (
    <div className={jobStatusClass}>
      {/* Folder header row */}
      <div className="list-item" style={{ gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="iconLike"
              title="Klasörü aç/kapat"
              onClick={(e) => {
                e.stopPropagation();
                toggleJobOpen(job.id);
              }}
            >
              <i
                className={`fa-solid ${
                  job.isOpen ? "fa-chevron-down" : "fa-chevron-right"
                }`}
              />
            </button>

            <strong>{c ? `${c.name} ${c.surname}` : "Bilinmeyen"}</strong>

            <span className="job-status-badge">
              {!job.isCompleted
                ? "Borç"
                : job.isCompleted && !job.isPaid
                ? "Bekleyen Ödeme"
                : "Ödendi"}
            </span>

            {job.isRunning && <span className="badge">Çalışıyor</span>}
          </div>

          <div style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
            {job.isRunning ? (
              <>
                <i className="fa-solid fa-clock"></i> Süre:{" "}
                <strong style={{ color: "#111" }}>{formatTimer(liveMs)}</strong>
              </>
            ) : (
              <>
                <span>{job.date || "Tarih yok"}</span> |{" "}
                {job.timeMode === "fixed" ? (
                  <span>💲 Sabit Ücret</span>
                ) : (
                  <>
                    <span>
                      {job.start || "--:--"} - {job.end || "--:--"}
                    </span>{" "}
                    | <span>{hours.toFixed(2)} saat</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          {!hideActions && onOpenActions && (
            <button
              className="job-options-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenActions(job.id);
              }}
            >
              <i className="fa-solid fa-ellipsis-vertical"></i>
            </button>
          )}

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
            {/* ⏱ Clock actions — ONLY for ACTIVE (not completed) jobs */}
            {job.timeMode === "clock" &&
              !job.isCompleted &&
              (job.isRunning ? (
                <button
                  className="btn btn-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    clockOut(job.id);
                  }}
                >
                  Clock Out
                </button>
              ) : (
                <button
                  className="btn btn-save"
                  onClick={(e) => {
                    e.stopPropagation();
                    clockIn(job.id);
                  }}
                >
                  Clock In
                </button>
              ))}
          </div>
        </div>
      </div>

      {job.isOpen && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            {job.timeMode === "fixed" ? (
              <div className="miniRow">
                <span>Sabit Ücret:</span>
                <strong>{money(job.fixedPrice, currency)}</strong>
              </div>
            ) : (
              <>
                <div className="miniRow">
                  <span>Saatlik Ücret:</span>
                  <strong>{money(job.rate, currency)}</strong>
                </div>

                <div className="miniRow">
                  <span>İşçilik:</span>
                  <strong>{money(hours * toNum(job.rate), currency)}</strong>
                </div>
              </>
            )}

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
                    <span>
                      {p.name || "Parça"} {p.qty != null ? `× ${p.qty}` : ""}
                    </span>
                    <span>{money(partLineTotal(p), currency)}</span>
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
            {/* ⏱️ CLOCK IN / OUT HISTORY */}
            {job.timeMode === "clock" && job.clockSessions?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  <i className="fa-solid fa-clock"></i>
                  Çalışma Geçmişi
                </div>

                {job.clockSessions.map((s, i) => {
                  const start = new Date(s.in);
                  const end = new Date(s.out);
                  const hours = (s.ms / 36e5).toFixed(2);

                  return (
                    <div
                      key={i}
                      className="miniRow"
                      style={{ fontSize: 12, color: "#444" }}
                    >
                      <span>
                        #{i + 1} •{" "}
                        {start.toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        →{" "}
                        {end.toLocaleTimeString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      <strong>{hours} saat</strong>
                    </div>
                  );
                })}
              </div>
            )}

            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              {!job.isCompleted && (
                <button
                  className="btn btn-save"
                  onClick={(e) => {
                    e.stopPropagation(); // ✅ ADD THIS
                    markJobComplete(job.id);
                  }}
                >
                  İş Tamamla (Borç Ekle)
                </button>
              )}
              {job.isCompleted && !job.isPaid && (
                <button
                  className="btn btn-primary green"
                  onClick={(e) => {
                    e.stopPropagation(); // ✅ ADD THIS
                    markJobPaid(job.id);
                  }}
                >
                  Ödeme Tamamlandı
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PublicCustomerSharePage() {
  const { id } = useParams();
  const [snap, setSnap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const ref = doc(db, "public_customers", id);
        const s = await getDoc(ref);
        if (!s.exists()) {
          setSnap(null);
          setLoading(false);
          return;
        }
        setSnap(s.data());
      } catch (e) {
        console.error(e);
        setSnap(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>Yükleniyor...</div>;
  if (!snap) return <div style={{ padding: 20 }}>Müşteri bulunamadı.</div>;

  const customer = snap.customer;
  const jobs = snap.jobs || [];
  const payments = (snap.payments || []).filter((p) => p.source !== "job"); // senin noiseyi gizleme mantığın

  const currency = snap.currency || "TRY";

  return (
    <>
      <div className="header">
        <h2>Müşteri İş Geçmişi</h2>
        <div style={{ fontSize: "0.9rem", marginTop: 5 }}>
          {customer.name} {customer.surname} — Borç:{" "}
          <strong>{money(customer.balanceOwed, currency)}</strong>
        </div>
      </div>

      <div className="container">
        <div style={{ marginTop: 12 }}>
          {payments.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>💰 Tahsilat / Borç Geçmişi</h3>

              {payments
                .slice()
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                .map((p) => {
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
                          <div style={{ fontSize: 12, color: "#555" }}>
                            {p.note}
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: "#777" }}>
                          {p.date}
                        </div>
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          color: isPayment ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {isPayment ? "+" : "-"}
                        {money(p.amount, p.currency || currency)}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {jobs.length === 0 ? (
            <div className="card">İş kaydı yok.</div>
          ) : (
            jobs
              .slice()
              .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
              .map((j) => {
                const hours = calcHours(j.start, j.end);
                const total = hours * toNum(j.rate) + partsTotalOf(j);

                return (
                  <div
                    key={j.id}
                    className="card list-item"
                    style={{ alignItems: "center" }}
                  >
                    <div style={{ flex: 1 }}>
                      <strong>{j.date}</strong>
                      <br />
                      <small>
                        {j.start || "--:--"}-{j.end || "--:--"} |{" "}
                        {hours.toFixed(2)} saat
                      </small>
                    </div>

                    <div style={{ textAlign: "right", minWidth: 110 }}>
                      <strong
                        style={{ color: "var(--primary)", display: "block" }}
                      >
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
   6) CUSTOMER SHARE PAGE (Read-only)
   URL: /customer/:id
============================================================ */

function CustomerSharePage({ state }) {
  const { id } = useParams();

  const currency = state.currency || "TRY";
  const customer = state.customers.find((c) => c.id === id) || null;

  const customerJobs = useMemo(() => {
    return state.jobs
      .filter((j) => j.customerId === id)
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [state.jobs, id]);

  const customerPayments = useMemo(() => {
    if (!customer) return [];

    return (state.payments || [])
      .filter((p) => p.customerId === customer.id)
      .filter((p) => p.source !== "job") // ✅ hide job-generated Payment
      .slice()
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [state.payments, customer]);

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
        <div style={{ marginTop: 12 }}>
          {/* 💰 Payment / Borç Geçmişi */}
          {customerPayments.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>💰 Tahsilat / Borç Geçmişi</h3>

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
                        <div style={{ fontSize: 12, color: "#555" }}>
                          {p.note}
                        </div>
                      )}

                      <div style={{ fontSize: 12, color: "#777" }}>
                        {p.date}
                      </div>
                    </div>

                    <div
                      style={{
                        fontWeight: 700,
                        color: isPayment ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {isPayment ? "+" : "-"}
                      {money(p.amount, p.currency || currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
                <div
                  key={j.id}
                  className="card list-item"
                  style={{ alignItems: "center" }}
                >
                  <div style={{ flex: 1 }}>
                    <strong>{j.date}</strong>
                    <br />
                    <small>
                      {j.start || "--:--"}-{j.end || "--:--"} |{" "}
                      {hours.toFixed(2)} saat
                    </small>
                  </div>

                  <div style={{ textAlign: "right", minWidth: 110 }}>
                    <strong
                      style={{ color: "var(--primary)", display: "block" }}
                    >
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

/**
 * vault RULES
 *
 * - vault balance represents REAL CASH
 * - Only "payment" transactions affect vault
 * - Debt transactions NEVER affect vault
 *
 * Net:
 *   net = totalPayment - totalDebt
 *
 * NOTE:
 * - vault can go negative if manually adjusted
 */

function VaultDetailModal({ open, onClose, vault, payments, onRenameVault }) {
  const [editingName, setEditingName] = useState(false);
  const [vaultName, setVaultName] = useState("");
  const printRef = useRef(null);

  useEffect(() => {
    if (open && vault) {
      setVaultName(vault.name);
      setEditingName(false);
    }
  }, [open, vault]);
  if (!open || !vault) return null;

  // Filter only transactions belonging to this vault
  const vaultPayments = (payments || []).filter((p) => p.vaultId === vault.id);

  const totalPayment = vaultPayments
    .filter((p) => p.type === "payment")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalDebt = vaultPayments
    .filter((p) => p.type === "debt")
    .reduce((sum, p) => sum + p.amount, 0);

  const net = totalPayment - totalDebt;

  function printVault() {
    const html = printRef.current?.innerHTML;
    if (!html) return;

    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup engellendi");
      return;
    }

    w.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Kasa Dökümü</title>
      <style>
        body{font-family:Segoe UI,system-ui;padding:24px}
        h1{margin:0 0 6px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #ddd;padding:8px;font-size:12px}
        th{background:#f3f4f6}
        .right{text-align:right}
        @media print {
          button { display:none }
        }
      </style>
    </head>
    <body>
      <button onclick="window.print()" style="
        margin-bottom:12px;
        padding:10px 14px;
        background:#2563eb;
        color:white;
        border:none;
        border-radius:8px;
        font-weight:700;
        cursor:pointer;">
        Yazdır / PDF Kaydet
      </button>

      ${html}
    </body>
    </html>
  `);

    w.document.close();
    w.focus();
  }

  return (
    <ModalBase open={open} title="Kasa Detayı" onClose={onClose}>
      <div className="vault-detail-page">
        <div className="vault-detail-card">
          {/* HEADER */}
          <div className="card">
            {!editingName ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0 }}>{vault.name}</h3>
                <button
                  className="btn btn-cancel"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                  onClick={() => setEditingName(true)}
                >
                  <i className="fa-solid fa-pen"></i> Düzenle
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={vaultName}
                  onChange={(e) => setVaultName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-save"
                  onClick={() => {
                    onRenameVault(vault.id, vaultName);
                    setEditingName(false);
                  }}
                >
                  Kaydet
                </button>
                <button
                  className="btn btn-cancel"
                  onClick={() => {
                    setVaultName(vault.name);
                    setEditingName(false);
                  }}
                >
                  İptal
                </button>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                Para Birimi
              </div>

              <select
                value={vault.currency}
                onChange={(e) =>
                  onRenameVault(vault.id, {
                    ...vault,
                    currency: e.target.value,
                  })
                }
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  padding: "0 10px",
                  fontSize: 14,
                }}
              >
                <option value="TRY">₺ Türk Lirası</option>
                <option value="USD">$ US Dollar</option>
                <option value="EUR">€ Euro</option>
              </select>
            </div>
          </div>
          <div className="btn-row" style={{ marginBottom: 12 }}>
            <button className="btn btn-save" onClick={printVault}>
              <i className="fa-solid fa-print"></i> Kasa Dökümü Yazdır
            </button>
          </div>

          {/* STATS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 12,
            }}
          >
            <div
              className="card"
              style={{ background: "#f0fdf4", color: "#166534" }}
            >
              <div style={{ fontSize: 12 }}>Toplam Tahsilat</div>
              <strong>
                +{totalPayment.toFixed(2)} {vault.currency}
              </strong>
            </div>

            <div
              className="card"
              style={{ background: "#fef2f2", color: "#7f1d1d" }}
            >
              <div style={{ fontSize: 12 }}>Toplam Borç</div>
              <strong>
                -{totalDebt.toFixed(2)} {vault.currency}
              </strong>
            </div>
          </div>

          {/* NET */}
          <div
            className="card"
            style={{
              marginTop: 12,
              textAlign: "center",
              fontWeight: 700,
              background: net >= 0 ? "#eff6ff" : "#fef2f2",
            }}
          >
            Net Durum: {net.toFixed(2)} {vault.currency}
          </div>

          {/* COUNT */}
          <div
            className="card"
            style={{ marginTop: 12, fontSize: 12, color: "#555" }}
          >
            Toplam İşlem Sayısı: <strong>{vaultPayments.length}</strong>
          </div>
          <div className="hidden">
            <div ref={printRef}>
              <h1>Kasa Dökümü</h1>
              <div style={{ color: "#555", marginBottom: 8 }}>
                Kasa: <b>{vault.name}</b>
                <br />
                Para Birimi: <b>{vault.currency}</b>
                <br />
                Tarih: {new Date().toLocaleDateString("tr-TR")}
              </div>

              <hr />

              <table>
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Tür</th>
                    <th>Açıklama</th>
                    <th>Yöntem</th>
                    <th className="right">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {vaultPayments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.date}</td>
                      <td>{p.type === "payment" ? "Tahsilat" : "Borç"}</td>
                      <td>{p.note || "-"}</td>
                      <td>{p.method || "-"}</td>
                      <td className="right">
                        {p.type === "payment" ? "+" : "-"}
                        {p.amount.toFixed(2)} {vault.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <hr />

              <div style={{ marginTop: 12 }}>
                <b>Toplam Tahsilat:</b> +{totalPayment.toFixed(2)}{" "}
                {vault.currency}
                <br />
                <b>Toplam Borç:</b> -{totalDebt.toFixed(2)} {vault.currency}
                <br />
                <b>Net Durum:</b> {net.toFixed(2)} {vault.currency}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalBase>
  );
}
