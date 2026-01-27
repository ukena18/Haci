import React, { useEffect, useMemo, useRef, useState } from "react";

import { useLang } from "./i18n/LanguageContext";

/* ============================================================
   CSS STRUCTURE MAP — READ ME
   (Source of Truth for this project)
============================================================ */

/* ============================================================
   theme.css
   ------------------------------------------------------------
   PURPOSE:
   Global design system + reusable utilities.
   Nothing in this file should depend on a specific page,
   route, modal, or feature.
============================================================ */

/*
  🔹 Design Tokens
     - :root color variables
     - gradients
     - shadows
     - border radius
     - surface & background colors

  🔹 Global Resets & Behavior
     - html, body sizing
     - overscroll-behavior
     - touch-action
     - tap highlight removal

  🔹 Global Print Rules (NON-feature)
     - hide buttons globally in print
     - reset app-frame/app-shell in print
     - remove shadows/borders for PDFs

  🔹 Reusable UI Utilities
     - .card base styles
     - .badge
     - .list-item (generic)
     - progress bars (.bar-bg, .bar-fill)
     - vault active badge

  🔹 Indicators & Status Dots
     - .job-dot
     - .reservation-dot
     - .day-dot (job / reservation)
     - .day-badge (job / reservation)

  🔹 Text Safety Utilities
     - word wrapping helpers
     - .meta-text
     - .customer-meta-line
     - generic overflow fixes
*/

/* ============================================================
   app.css
   ------------------------------------------------------------
   PURPOSE:
   Feature-specific UI, layouts, pages, and behavior.
   Everything here belongs to a screen, flow, or component.
============================================================ */

/*
  🔹 App Shell & Layout
     - .app-shell
     - .app-frame
     - responsive app sizing
     - container padding logic
     - fixed header / bottom nav

  🔹 Navigation
     - .bottom-nav
     - .nav-item
     - .nav-icon
     - FAB positioning

  🔹 Modals
     - base modal + overlay
     - stacked payment modal
     - edit payment / debt modal
     - confirm modal (scoped)
     - customer edit modal

  🔹 Forms & Inputs
     - form groups
     - inputs, selects, textareas
     - vault select fix
     - native picker safety fixes

  🔹 Customer Detail
     - header card
     - balance badge
     - primary / secondary actions
     - history cards
     - expandable job folders

  🔹 Job System
     - job cards
     - job statuses (active / unpaid / paid)
     - job status badges
     - job debt highlighting
     - job options button

  🔹 Vaults
     - vault detail page
     - vault cards & list
     - active vault badge usage
     - add vault button

  🔹 Calendar
     - monthly / weekly / daily grids
     - day cells
     - today / selected states
     - compact calendar overrides
     - event dots & indicators

  🔹 Time Mode Selector
     - time-mode row
     - pill options
     - informational warning box

  🔹 Settings
     - settings dashboard
     - settings cards
     - toggle rows + pill switches
     - admin profile card
     - logout button

  🔹 Search & Sorting
     - sticky search bar
     - clear button
     - icon-only sort button
     - hidden select behavior

  🔹 Load More / Lists
     - load more button
     - list hover & active states

  🔹 Invoice (Feature-Specific)
     - modern invoice layout
     - job grouping inside invoice
     - totals / balance / paid states
     - HARD print isolation (invoice-only printing)
*/

/* ============================================================
   RULES OF THE SYSTEM
============================================================ */

/*
  ✅ If it affects multiple pages → theme.css
  ✅ If it belongs to one feature or screen → app.css
  ❌ Do NOT add page-specific styles to theme.css
  ❌ Do NOT add design tokens to app.css

  This separation is intentional and stable.
*/

import "./App.css";

import {
  HomePage,
  CustomersPage,
  SettingsPage,
  PublicCustomerSharePage,
} from "./pages/Pages";

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
  CalendarPage,
  AdvancedSettingsModal,
} from "./modals/Modals.jsx";

import Changelog from "./components/Changelog";

import {
  isWeekend,
  moveToNextBusinessDay,
  addDaysSkippingWeekend,
  daysBetween,
  getJobStartDate,
  pad2,
  generateCustomerIdFromNow,
  uid,
  computeCustomerBalance,
  money,
  toNum,
  partLineTotal,
  partsTotalOf,
  jobTotalOf,
  calcHours,
  formatTimer,
  makeEmptyCustomer,
  makeEmptyJob,
  clockHoursOf,
  calcHoursWithBreak,
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

/* ============================================================
   3) DEFAULT MODELS
============================================================ */

//
/* ============================================================
   4) MAIN APP (ROUTER)
============================================================ */

export default function App() {
  // 🔹 STEP 5.1 — Apply saved theme on app boot
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

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
      <div className="app-shell">
        <div className="app-frame">
          <Routes>
            <Route path="/customer/:id" element={<PublicCustomerSharePage />} />
          </Routes>
        </div>
      </div>
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

  const { t } = useLang(); // ✅ ADD THIS
  // Load user-specific data from Firestore
  // Load user-specific data from Firestore
  useEffect(() => {
    async function init() {
      await ensureUserData(user.uid);
      const data = await loadUserData(user.uid);

      // 🔧 START with raw data
      const fixed = { ...data };

      // ==============================
      // ✅ PROFILE HYDRATION (CRITICAL)
      // ==============================
      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (snap.exists()) {
          const u = snap.data();

          fixed.profile = {
            ...(u.profile || {}),
          };

          // 🔁 Backward compatibility (old users)
          if (!fixed.profile.name && u.name) {
            fixed.profile.name = u.name;
          }
          if (!fixed.profile.phone && u.phone) {
            fixed.profile.phone = u.phone;
          }
          if (!fixed.profile.address && u.address) {
            fixed.profile.address = u.address;
          }
        } else {
          fixed.profile = {};
        }
      } catch (e) {
        console.error("Profile load failed:", e);
        fixed.profile = {};
      }

      // ==============================
      // ✅ JOB MIGRATION (CRITICAL)
      // ==============================
      fixed.jobs = (fixed.jobs || []).map((j) => ({
        ...j,
        trackPayment: j.trackPayment !== false, // default TRUE
        dueDays: j.dueDays ?? "30",
      }));

      // ==============================
      // ✅ RESERVATIONS INIT
      // ==============================
      if (!Array.isArray(fixed.reservations)) {
        fixed.reservations = [];
      }

      // ==============================
      // ✅ VAULT MIGRATION
      // ==============================
      if (!Array.isArray(fixed.vaults)) {
        fixed.vaults = fixed.Vaults || [
          {
            id: "main_vault",
            name: "Main Vault",
            balance: 0,
            currency: fixed.currency,
            createdAt: Date.now(),
          },
        ];

        fixed.activeVaultId = fixed.activeVaultId || "main_vault";
      }

      // ==============================
      // 🚀 DONE
      // ==============================
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
    return <div style={{ padding: 20 }}>{t("user_data_loading")}</div>;
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
  // 🔹 STEP 5.2 — Theme state (light / dark)
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light",
  );

  function applyTheme(nextTheme) {
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }

  const [search, setSearch] = useState("");
  const [customerSort, setCustomerSort] = useState("latest");

  const { t, lang } = useLang();

  const [profileOpen, setProfileOpen] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState("payment");
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [vaultDetailOpen, setVaultDetailOpen] = useState(false);
  const [selectedVaultId, setSelectedVaultId] = useState(null);

  const [vaultListOpen, setVaultListOpen] = useState(false);

  const [openCustomerFolders, setOpenCustomerFolders] = useState({});

  const [visibleCustomers, setVisibleCustomers] = useState(10);

  const [dismissedDueJobs, setDismissedDueJobs] = useState(() => new Set());

  useEffect(() => {
    if (search.trim()) {
      setVisibleCustomers(Infinity); // show all matches when searching
    } else {
      setVisibleCustomers(10); // reset when search is cleared
    }
  }, [search]);

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

  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);

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
      if (vaultListOpen) {
        setVaultListOpen(false);
        return true;
      }
      if (vaultDetailOpen) {
        setVaultDetailOpen(false);
        return true;
      }

      if (confirm.open) {
        setConfirm({ open: false });
        return true;
      }

      if (showChangelog) {
        setShowChangelog(false);
        return true;
      }

      if (advancedSettingsOpen) {
        setAdvancedSettingsOpen(false);
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

  const activeVault = useMemo(() => {
    return (
      (state?.vaults || []).find((k) => k.id === state?.activeVaultId) || null
    );
  }, [state?.vaults, state?.activeVaultId]);

  const currency = null; // do not force currency

  const defaultCurrency =
    activeVault?.currency || state.profile?.settings?.defaultCurrency || "TRY";

  const showCalendar = state.profile?.settings?.showCalendar !== false;
  // ✅ JOB FEATURE FLAG (GLOBAL)
  const enableJobs = state.profile?.settings?.enableJobs !== false;

  // vault DELETE CONFIRM STATE
  const [vaultDeleteConfirm, setVaultDeleteConfirm] = useState({
    open: false,
    vaultId: null,
    text: "",
    transactionCount: 0, // ✅ ADD THIS
  });

  const hasTransactions = vaultDeleteConfirm.transactionCount > 0;

  const [editingVaultId, setEditingVaultId] = useState(null);
  const [editingVaultName, setEditingVaultName] = useState("");

  // STEP 2: folder open / close state
  const [activeOpen, setActiveOpen] = useState(false); // ⬅ collapsed by default
  const [completedOpen, setCompletedOpen] = useState(false);

  // 30-day payment tracking folder
  const [paymentOpen, setPaymentOpen] = useState(false); // ⬅ collapsed by default
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

  const financialSummary = useMemo(() => {
    const byCurrency = {};

    function ensure(cur) {
      if (!byCurrency[cur]) {
        byCurrency[cur] = {
          totalDebt: 0,
          totalPayment: 0,
          net: 0,
        };
      }
      return byCurrency[cur];
    }

    // =====================
    // PAYMENTS
    // =====================
    (state.payments || []).forEach((p) => {
      const customer = state.customers.find((c) => c.id === p.customerId);
      const cur = p.currency || customer?.currency;
      if (!cur) return;

      const bucket = ensure(cur);

      if (p.type === "payment") {
        bucket.totalPayment += toNum(p.amount);
        bucket.net += toNum(p.amount);
      }

      if (p.type === "debt") {
        bucket.totalDebt += toNum(p.amount);
        bucket.net -= toNum(p.amount);
      }
    });

    // =====================
    // COMPLETED UNPAID JOBS
    // =====================
    (state.jobs || []).forEach((job) => {
      if (!job.isCompleted || job.isPaid) return;

      const customer = state.customers.find((c) => c.id === job.customerId);
      const cur = customer?.currency;
      if (!cur) return;

      const amount = jobTotalOf(job);
      const bucket = ensure(cur);

      bucket.totalDebt += amount;
      bucket.net -= amount;
    });

    // =====================
    // GLOBAL TOTALS (ALL)
    // =====================
    const totalDebt = Object.values(byCurrency).reduce(
      (s, b) => s + b.totalDebt,
      0,
    );

    const totalPayment = Object.values(byCurrency).reduce(
      (s, b) => s + b.totalPayment,
      0,
    );

    return {
      totalDebt,
      totalPayment,
      net: totalPayment - totalDebt,
      byCurrency,
    };
  }, [state.jobs, state.payments, state.customers]);

  const unpaidCompletedJobs = filteredJobs.filter(
    (j) => j.isCompleted && !j.isPaid,
  );

  const paymentWatchList = [
    // =====================
    // JOBS
    // =====================
    ...filteredJobs
      .filter(
        (j) =>
          j.isCompleted &&
          j.trackPayment !== false &&
          !j.dueDismissed &&
          j.isPaid !== true,
      )
      .map((job) => {
        const startDate = getJobStartDate(job);
        if (!startDate) return null;

        const dueInDays =
          job.dueDays === "" || job.dueDays == null ? 30 : Number(job.dueDays);
        const dueDate = addDaysSkippingWeekend(startDate, dueInDays);
        const daysLeft = daysBetween(new Date(), dueDate);

        return {
          kind: "job", // ✅ NEW
          ref: job, // ✅ NEW
          daysLeft,
          dueDate,
        };
      })
      .filter(Boolean),

    // =====================
    // DEBTS
    // =====================
    ...(state.payments || [])
      .filter((p) => p.type === "debt" && !p.dueDismissed && p.dueDate)
      .map((debt) => {
        const dueDate = new Date(debt.dueDate);
        const daysLeft = daysBetween(new Date(), dueDate);

        return {
          kind: "debt",
          ref: debt,
          daysLeft,
          dueDate,
        };
      })

      .filter(Boolean),
  ].sort((a, b) => a.daysLeft - b.daysLeft);

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

  function getVaultTotals(vaultId) {
    let totalPayment = 0;
    let transactionCount = 0;

    (state.payments || []).forEach((p) => {
      if (p.vaultId !== vaultId) return;
      if (p.type !== "payment") return; // ✅ ONLY PAYMENTS

      totalPayment += toNum(p.amount);
      transactionCount += 1;
    });

    return {
      totalPayment,
      transactionCount,
    };
  }

  function renameVault(vaultId, update) {
    setState((s) => ({
      ...s,
      vaults: s.vaults.map((k) =>
        k.id === vaultId
          ? typeof update === "string"
            ? { ...k, name: update } // old behavior
            : { ...k, ...update } // new behavior (currency etc.)
          : k,
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
    switch (customerSort) {
      case "latest":
        list.sort((a, b) => {
          const aDate = getLatestCustomerTransaction(
            a.id,
            state.jobs,
            state.payments || [],
          );
          const bDate = getLatestCustomerTransaction(
            b.id,
            state.jobs,
            state.payments || [],
          );
          return bDate - aDate; // newest first
        });
        break;

      case "debt_desc":
        list.sort((a, b) => {
          const ba = computeCustomerBalance(a.id, state.jobs, state.payments);
          const bb = computeCustomerBalance(b.id, state.jobs, state.payments);
          return bb - ba;
        });
        break;

      case "debt_asc":
        list.sort((a, b) => {
          const ba = computeCustomerBalance(a.id, state.jobs, state.payments);
          const bb = computeCustomerBalance(b.id, state.jobs, state.payments);
          return ba - bb;
        });
        break;

      case "name_desc":
        list.sort((a, b) =>
          `${b.name} ${b.surname}`.localeCompare(`${a.name} ${a.surname}`),
        );
        break;

      case "name_asc":
      default:
        list.sort((a, b) =>
          `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`),
        );
        break;
    }

    return list;
  }, [search, state.customers, customerSort, state.jobs, state.payments]);

  const visibleCustomerList = useMemo(() => {
    return filteredCustomers.slice(0, visibleCustomers);
  }, [filteredCustomers, visibleCustomers]);

  /* ============================================================ */

  /*   ACTIONS (mutating state safely)/* 
  /* ============================================================ */
  function findDuplicateCustomer(newCustomer, customers) {
    const nameKey = `${newCustomer.name || ""} ${newCustomer.surname || ""}`
      .trim()
      .toLowerCase();

    return customers.find((c) => {
      // ignore same customer when editing
      if (c.id === newCustomer.id) return false;

      const existingName = `${c.name || ""} ${c.surname || ""}`
        .trim()
        .toLowerCase();

      if (nameKey && existingName === nameKey) return true;
      if (newCustomer.email && c.email && c.email === newCustomer.email)
        return true;
      if (newCustomer.phone && c.phone && c.phone === newCustomer.phone)
        return true;

      return false;
    });
  }

  /** Add or update a customer */
  function upsertCustomer(customer) {
    const duplicate = findDuplicateCustomer(customer, state.customers);

    // 🔔 DUPLICATE → ASK FIRST
    if (duplicate) {
      setConfirm({
        open: true,
        type: "duplicate_customer",
        message: `
${t("duplicate_customer_found")}

${duplicate.name} ${duplicate.surname}
${duplicate.email ? "📧 " + duplicate.email : ""}
${duplicate.phone ? "📞 " + duplicate.phone : ""}

${t("duplicate_customer_confirm")}
      `,
        payload: customer, // 👈 store temporarily
      });

      return; // ❌ STOP HERE (do not save yet)
    }

    // ✅ NO DUPLICATE → SAVE NORMALLY
    setState((s) => {
      const idx = s.customers.findIndex((c) => c.id === customer.id);

      const nextCustomers =
        idx >= 0
          ? s.customers.map((c) => (c.id === customer.id ? customer : c))
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

  /** Delete customer + their jobs + payments */
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

  function updateReservation(updatedReservation) {
    setState((s) => {
      const next = {
        ...s,
        reservations: (s.reservations || []).map((r) =>
          r.id === updatedReservation.id ? updatedReservation : r,
        ),
      };

      return next;
    });
  }

  function deleteReservation(reservationId) {
    setState((s) => {
      const next = {
        ...s,
        reservations: (s.reservations || []).filter(
          (r) => r.id !== reservationId,
        ),
      };

      return next;
    });
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
      const usedVaultId = vaultId || s.activeVaultId;

      const vault = (s.vaults || []).find((k) => k.id === usedVaultId);
      const vaultCurrency = vault?.currency || s.currency || "TRY";

      // 🔒 LOCK CUSTOMER CURRENCY ON FIRST PAYMENT
      const nextCustomers = s.customers.map((c) =>
        c.id === customerId && !c.currency
          ? { ...c, currency: vaultCurrency }
          : c,
      );

      const payment = {
        id: uid(),
        customerId,
        vaultId: usedVaultId,
        type: "payment",
        amount: amt,
        method,
        note: note || t("payment_default_note"),
        date,
        createdAt: Date.now(),
        currency: vaultCurrency,
      };

      const nextState = {
        ...s,
        customers: nextCustomers,
        payments: [...(s.payments || []), payment],
      };

      return nextState;
    });
  }

  function addDebt({ customerId, amount, note, addDate, dueDate }) {
    const amt = toNum(amount);
    if (amt <= 0) return;

    setState((s) => {
      const debt = {
        id: uid(),
        customerId,
        type: "debt",
        amount: amt,
        note: note || t("debt_default_note"),

        addDate: addDate || new Date().toISOString().slice(0, 10),
        dueDate: dueDate || null,

        createdAt: Date.now(),
        dueDismissed: false,
        currency: null,
      };

      return {
        ...s,
        payments: [...(s.payments || []), debt],
      };
    });
  }

  function updatePaymentTransaction(updated) {
    setState((s) => {
      const old = (s.payments || []).find((p) => p.id === updated.id);
      if (!old) return s;

      const cleaned = stripUndefined({
        ...old,
        ...updated,
        amount: toNum(updated.amount),
      });

      const nextPayments = (s.payments || []).map((p) =>
        p.id === updated.id ? cleaned : p,
      );

      return { ...s, payments: nextPayments };
    });
  }

  function stripUndefined(obj) {
    if (!obj || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map(stripUndefined);
    }

    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    );
  }

  function markJobComplete(jobId) {
    setState((s) => {
      const now = Date.now();

      const nextJobs = s.jobs.map((j) => {
        if (j.id !== jobId) return j;

        if (j.isRunning && j.clockInAt) {
          const deltaMs = Math.max(0, now - j.clockInAt);

          const session = { id: uid(), inAt: j.clockInAt, outAt: now };

          return {
            ...j,
            isCompleted: true,
            isPaid: false,
            isRunning: false,
            clockInAt: null,
            sessions: [...(j.sessions || []), session],
            workedMs: (j.workedMs || 0) + deltaMs,
          };
        }

        return { ...j, isCompleted: true, isPaid: false, isRunning: false };
      });

      return { ...s, jobs: nextJobs };
    });
  }

  function useAndroidBackHandler({ page, setPage, closeAllModals }) {
    const lastBack = useRef(0);

    useEffect(() => {
      if (!window.history.state?.pwa) {
        window.history.pushState({ pwa: true }, "");
      }

      const onBack = () => {
        if (window.location.pathname !== "/") return;

        if (closeAllModals()) {
          if (!window.history.state?.pwa) {
            window.history.pushState({ pwa: true }, "");
          }
          return;
        }

        if (page !== "home") {
          setPage("home");
          if (!window.history.state?.pwa) {
            window.history.pushState({ pwa: true }, "");
          }
          return;
        }

        const now = Date.now();
        if (now - lastBack.current < 1500) {
          window.history.back();
          return;
        }

        lastBack.current = now;
        alert(t("press_back_again_to_exit"));

        if (!window.history.state?.pwa) {
          window.history.pushState({ pwa: true }, "");
        }
      };

      window.addEventListener("popstate", onBack);
      return () => window.removeEventListener("popstate", onBack);
    }, [page, setPage, closeAllModals]);
  }

  function clockIn(jobId) {
    setState((s) => {
      const now = Date.now();

      const nextJobs = s.jobs.map((j) => {
        if (j.id === jobId && j.isRunning) return j;

        if (j.isRunning && j.clockInAt && j.id !== jobId) {
          const deltaMs = now - j.clockInAt;

          return {
            ...j,
            isRunning: false,
            clockInAt: null,
            workedMs: (j.workedMs || 0) + deltaMs,
          };
        }

        if (j.id === jobId) {
          return { ...j, isRunning: true, clockInAt: now };
        }

        return j;
      });

      return { ...s, jobs: nextJobs };
    });
  }

  function clockOut(jobId) {
    setState((s) => {
      const now = Date.now();

      const nextJobs = s.jobs.map((j) => {
        if (j.id !== jobId || !j.clockInAt) return j;

        const deltaMs = Math.max(0, now - j.clockInAt);

        const session = {
          id: uid(),
          inAt: j.clockInAt,
          outAt: now,
        };

        return {
          ...j,
          isRunning: false,
          clockInAt: null,
          sessions: [...(j.sessions || []), session],
          workedMs: (j.workedMs || 0) + deltaMs,
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
        j.id === jobId ? { ...j, isOpen: !j.isOpen } : j,
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
      if (!enableJobs) return; // ⛔ HARD BLOCK
      setEditingJobId(null);
      setJobFixedCustomerId(null);
      setJobModalOpen(true);
    } else if (page === "customers") {
      setEditingCustId(null); // 🔥 RESET EDIT MODE
      setCustModalOpen(true); // ➕ OPEN ADD CUSTOMER
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
            {page !== "settings" && page !== "calendar" && (
              <div className="search-sticky">
                <div className="search-wrap">
                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      className="search-bar"
                      placeholder={t("search_placeholder")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />

                    {search && (
                      <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => setSearch("")}
                        title={t("clear")}
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
                        title={t("sort_button_title")}
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
                        <option value="debt_desc">{t("sort_debt_desc")}</option>
                        <option value="debt_asc">{t("sort_debt_asc")}</option>
                        <option value="name_asc">{t("sort_name_asc")}</option>
                        <option value="name_desc">{t("sort_name_desc")}</option>
                        <option value="latest">{t("sort_latest")}</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* HOME PAGE */}
            {page === "home" && (
              <HomePage
                defaultCurrency={defaultCurrency}
                financialSummary={financialSummary}
                paymentWatchList={paymentWatchList}
                customersById={customersById}
                activeJobs={activeJobs}
                activeJobsByCustomer={
                  enableJobs ? activeJobsByCustomer : new Map()
                }
                completedJobs={completedJobs}
                openCustomerFolders={openCustomerFolders}
                paymentOpen={paymentOpen}
                activeOpen={activeOpen}
                completedOpen={completedOpen}
                setPaymentOpen={setPaymentOpen}
                setActiveOpen={setActiveOpen}
                setCompletedOpen={setCompletedOpen}
                setState={setState}
                state={state}
                toggleCustomerFolder={toggleCustomerFolder}
                toggleJobOpen={toggleJobOpen}
                clockIn={clockIn}
                clockOut={clockOut}
                markJobComplete={markJobComplete}
                setEditingJobId={setEditingJobId}
                setJobModalOpen={setJobModalOpen}
                setConfirm={setConfirm}
                auth={auth}
                JobCard={JobCard}
              />
            )}

            {/* CUSTOMERS PAGE */}
            {page === "customers" && (
              <CustomersPage
                state={state}
                currency={currency}
                filteredCustomers={filteredCustomers}
                visibleCustomerList={visibleCustomerList}
                search={search}
                visibleCustomers={visibleCustomers}
                setVisibleCustomers={setVisibleCustomers}
                setSelectedCustomerId={setSelectedCustomerId}
                setCustDetailOpen={setCustDetailOpen}
                computeCustomerBalance={computeCustomerBalance}
              />
            )}

            {page === "calendar" && showCalendar && (
              <CalendarPage
                jobs={state.jobs}
                reservations={state.reservations || []}
                customers={state.customers}
                onAddReservation={(reservation) => {
                  setState((s) => {
                    const next = {
                      ...s,
                      reservations: [...(s.reservations || []), reservation],
                    };

                    return next;
                  });
                }}
                onUpdateReservation={updateReservation}
                onDeleteReservation={deleteReservation}
              />
            )}

            {/* SETTINGS PAGE */}
            {page === "settings" && (
              <SettingsPage
                auth={auth}
                user={user}
                signOut={signOut}
                state={state}
                setState={setState}
                setProfileOpen={setProfileOpen}
                setSelectedVaultId={setSelectedVaultId}
                setVaultDetailOpen={setVaultDetailOpen}
                setVaultListOpen={setVaultListOpen}
                editingVaultId={editingVaultId}
                setEditingVaultId={setEditingVaultId}
                editingVaultName={editingVaultName}
                setEditingVaultName={setEditingVaultName}
                showChangelog={showChangelog}
                setShowChangelog={setShowChangelog}
                uid={uid}
                money={money}
                getVaultTotals={getVaultTotals}
                Changelog={Changelog}
                setAdvancedSettingsOpen={setAdvancedSettingsOpen}
              />
            )}
          </div>

          {page !== "settings" &&
            page !== "calendar" &&
            (page !== "home" || enableJobs) && (
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
              <span className="nav-label">{t("nav_home")}</span>
            </button>

            <button
              className={`nav-item ${page === "customers" ? "active" : ""}`}
              onClick={() => setPage("customers")}
            >
              <span className="nav-icon">
                <i className="fa-solid fa-users"></i>
              </span>
              <span className="nav-label">{t("nav_customers")}</span>
            </button>

            {showCalendar && (
              <button
                className={`nav-item ${page === "calendar" ? "active" : ""}`}
                onClick={() => setPage("calendar")}
              >
                <span className="nav-icon">
                  <i className="fa-solid fa-calendar-days"></i>
                </span>
                <span className="nav-label">{t("nav_calendar")}</span>
              </button>
            )}

            <button
              className={`nav-item ${page === "settings" ? "active" : ""}`}
              onClick={() => setPage("settings")}
            >
              <span className="nav-icon">
                <i className="fa-solid fa-gear"></i>
              </span>
              <span className="nav-label">{t("nav_settings")}</span>
            </button>
          </nav>
          {/* JOB MODAL */}
          <JobModal
            open={jobModalOpen}
            onClose={() => {
              setJobModalOpen(false);
              setEditingJobId(null); //  RESET EDIT MODE
              setJobFixedCustomerId(null); //  RESET FIXED CUSTOMER
            }}
            customers={state.customers}
            jobs={state.jobs}
            editingJobId={editingJobId}
            onSave={(job) => upsertJob(job)}
            currency={currency}
            setConfirm={setConfirm}
            fixedCustomerId={jobFixedCustomerId}
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
                message: t("confirm_delete_customer_full"),
              });
            }}
            zIndex={1500}
          />

          {/* CUSTOMER DETAIL / STATEMENT MODAL */}
          <CustomerDetailModal
            open={custDetailOpen}
            currency={currency}
            onClose={() => setCustDetailOpen(false)}
            customer={
              state.customers.find((c) => c.id === selectedCustomerId) || null
            }
            jobs={state.jobs}
            payments={state.payments}
            vaults={state.vaults}
            activeVaultId={state.activeVaultId}
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
                message: t("confirm_delete_generic"),
              })
            }
            onEditJob={(jobId) => {
              setEditingJobId(jobId);
              setJobModalOpen(true);
            }}
            onAddJob={
              enableJobs
                ? () => {
                    setEditingJobId(null);
                    setJobFixedCustomerId(selectedCustomerId);
                    setJobModalOpen(true);
                  }
                : null
            }
            onDeleteJob={(jobId) =>
              setConfirm({
                open: true,
                type: "job",
                id: jobId,
                message: t("confirm_delete_job"),
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
            onSubmit={(data) => {
              if (!paymentCustomer) return;

              if (paymentMode === "payment") {
                makePayment(
                  paymentCustomer.id,
                  data.amount,
                  data.note,
                  data.addDate,
                  data.vaultId,
                  data.method,
                );
              } else {
                addDebt({
                  customerId: paymentCustomer.id,
                  amount: data.amount,
                  note: data.note,
                  addDate: data.addDate,
                  dueDate: data.dueDate,
                });
              }
            }}
          />

          {/* CHANGELOG MODAL */}
          <ModalBase
            open={showChangelog}
            title={t("changelog_title")}
            onClose={() => setShowChangelog(false)}
            zIndex={2000}
          >
            <Changelog language={lang} />
          </ModalBase>

          <VaultDetailModal
            open={vaultDetailOpen}
            onClose={() => setVaultDetailOpen(false)}
            vault={state.vaults.find((k) => k.id === selectedVaultId)}
            onRenameVault={renameVault}
            payments={state.payments}
            jobs={state.jobs}
            activeVaultId={state.activeVaultId}
            setVaultDeleteConfirm={setVaultDeleteConfirm}
            setState={setState}
            zIndex={2000}
          />

          {/* VAULT LIST MODAL */}
          {vaultListOpen && (
            <ModalBase
              open={true}
              title={t("vaults")}
              onClose={() => setVaultListOpen(false)}
              zIndex={1800}
            >
              <div className="vault-list">
                {state.vaults.map((vault) => {
                  const isActive = vault.id === state.activeVaultId;

                  return (
                    <div
                      key={vault.id}
                      className="vault-list-item"
                      onClick={(e) => {
                        e.stopPropagation();

                        setSelectedVaultId(vault.id);
                        setVaultDetailOpen(true);
                      }}
                    >
                      <div>
                        <strong>{vault.name}</strong>

                        <div className="vault-balance">
                          {money(
                            getVaultTotals(vault.id).totalPayment,
                            vault.currency,
                          )}
                        </div>
                      </div>

                      {isActive && (
                        <span className="vault-active-badge">
                          {t("vault_active")}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* ADD NEW VAULT */}
                <button
                  className="btn add-vault-btn"
                  onClick={() => {
                    const id = uid();

                    setState((s) => ({
                      ...s,
                      vaults: [
                        ...(s.vaults || []),
                        {
                          id,
                          name: `${t("new_vault_name_prefix")} ${
                            s.vaults.length + 1
                          }`,
                          balance: 0,
                          currency: s.currency || "TRY",
                          createdAt: Date.now(),
                        },
                      ],
                    }));
                  }}
                >
                  {t("add_new_vault")}
                </button>
              </div>
            </ModalBase>
          )}

          <ProfileModal
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            user={user}
            profile={state.profile}
            setState={setState}
          />

          {/* CONFIRMATION MODAL (Delete) */}
          <ConfirmModal
            open={confirm.open}
            message={confirm.message}
            requireText={confirm.type === "customer"}
            onNo={() =>
              setConfirm({ open: false, type: null, id: null, message: "" })
            }
            onYes={() => {
              if (confirm.type === "job") {
                deleteJob(confirm.id);
              }

              if (confirm.type === "customer") {
                deleteCustomer(confirm.id);
              }

              if (confirm.type === "payment") {
                setState((s) => {
                  const nextPayments = (s.payments || []).filter(
                    (p) => p.id !== confirm.id,
                  );

                  const nextState = {
                    ...s,
                    payments: nextPayments,
                  };

                  return nextState;
                });
              }

              if (confirm.type === "duplicate_customer") {
                const customer = confirm.payload;

                setState((s) => {
                  const idx = s.customers.findIndex(
                    (c) => c.id === customer.id,
                  );

                  const nextCustomers =
                    idx >= 0
                      ? s.customers.map((c) =>
                          c.id === customer.id ? customer : c,
                        )
                      : [...s.customers, customer];

                  return {
                    ...s,
                    customers: nextCustomers,
                  };
                });
              }

              setConfirm({ open: false, type: null, id: null, message: "" });
            }}
          />

          <ModalBase
            open={advancedSettingsOpen}
            title={t("settings.advanced.title")}
            onClose={() => setAdvancedSettingsOpen(false)}
            zIndex={2000}
          >
            <AdvancedSettingsModal
              open={true} // internal open no longer matters
              onClose={() => setAdvancedSettingsOpen(false)}
              state={state}
              setState={setState}
              auth={auth}
              theme={theme}
              setTheme={applyTheme}
              jobs={state.jobs}
            />
          </ModalBase>

          {/* VAULT DELETE CONFIRM MODAL */}
          {vaultDeleteConfirm.open && (
            <ModalBase
              open={true}
              title={t("vault_delete_title")}
              onClose={() =>
                setVaultDeleteConfirm({
                  open: false,
                  vaultId: null,
                  text: "",
                  transactionCount: 0,
                })
              }
              zIndex={6000}
            >
              <p style={{ color: "var(--danger)", fontWeight: 600 }}>
                ⚠️ {t("vault_delete_warning")}
              </p>

              <p>{t("vault_delete_type_sil")}</p>

              <input
                value={vaultDeleteConfirm.text}
                onChange={(e) =>
                  setVaultDeleteConfirm((s) => ({
                    ...s,
                    text: e.target.value,
                  }))
                }
                placeholder={t("vault_delete_placeholder")}
              />

              <div className="btn-row">
                <button
                  className="btn btn-cancel"
                  onClick={() =>
                    setVaultDeleteConfirm({
                      open: false,
                      vaultId: null,
                      text: "",
                      transactionCount: 0,
                    })
                  }
                >
                  {t("cancel")}
                </button>

                <button
                  className="btn btn-delete"
                  disabled={
                    hasTransactions ||
                    vaultDeleteConfirm.text.trim().toUpperCase() !==
                      t("vault_delete_confirm_word").toUpperCase()
                  }
                  onClick={() => {
                    if (hasTransactions) {
                      alert(t("vault_cannot_delete_has_transactions"));
                      return;
                    }

                    const vaultId = vaultDeleteConfirm.vaultId;

                    setState((s) => {
                      const remainingVaults = s.vaults.filter(
                        (k) => k.id !== vaultId,
                      );

                      return {
                        ...s,
                        vaults: remainingVaults,
                        payments: (s.payments || []).filter(
                          (p) => p.vaultId !== vaultId,
                        ),
                        activeVaultId:
                          s.activeVaultId === vaultId
                            ? remainingVaults[0]?.id || null
                            : s.activeVaultId,
                      };
                    });

                    setVaultDeleteConfirm({
                      open: false,
                      vaultId: null,
                      text: "",
                      transactionCount: 0,
                    });
                  }}
                >
                  {t("delete_permanently")}
                </button>

                {hasTransactions && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "var(--danger)",
                      opacity: 0.85,
                      textAlign: "center",
                    }}
                  >
                    ⚠️ {t("vault_delete_blocked_reason")}
                  </div>
                )}
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

  onOpenActions, // ✅ ADD
  hideActions = false, // ✅ ADD THIS LINE
}) {
  const { t } = useLang();

  const c = customersById.get(job.customerId);

  const liveMs =
    job.isRunning && job.clockInAt ? Date.now() - job.clockInAt : 0;

  const hours =
    job.timeMode === "clock"
      ? clockHoursOf(job)
      : calcHoursWithBreak(job.start, job.end, job.breakMinutes);

  const partsTotal = partsTotalOf(job);

  const total = jobTotalOf(job);

  const jobStatusClass = `job-card ${
    job.isCompleted ? "job-completed" : "job-active"
  }`;

  return (
    <div className={jobStatusClass}>
      {/* Folder header row */}
      <div
        className="list-item"
        style={{ gap: 10, cursor: "pointer" }}
        onClick={() => toggleJobOpen(job.id)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="iconLike"
              title={t("folder_toggle_title")}
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

            <strong>{c ? `${c.name} ${c.surname}` : t("unknown")}</strong>

            <span
              className={`job-status-badge ${
                job.isCompleted ? "debt" : "active"
              }`}
            >
              {job.isCompleted ? t("job_status_debt") : t("job_status_active")}
            </span>

            {job.isRunning && <span className="badge">{t("working")}</span>}
          </div>

          <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
            {job.isRunning ? (
              <>
                <i className="fa-solid fa-clock"></i> {t("duration")}:{" "}
                <strong style={{ color: "var(--text)" }}>
                  {formatTimer(liveMs)}
                </strong>
              </>
            ) : (
              <>
                <span>{job.date || t("no_date")}</span> |{" "}
                {job.timeMode === "fixed" ? (
                  <span> {t("fixed_price")}</span>
                ) : (
                  <>
                    <span>
                      {job.start || "--:--"} - {job.end || "--:--"}
                    </span>{" "}
                    |{" "}
                    <span>
                      {hours.toFixed(2)} {t("duration_hours")}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            minWidth: 180,
          }}
        >
          {/* 1) Clock in  Clock out  */}
          {job.timeMode === "clock" && !job.isCompleted && (
            <>
              {!job.isRunning ? (
                <button
                  className="due-dismiss-btn start"
                  onClick={(e) => {
                    e.stopPropagation();
                    clockIn(job.id);
                  }}
                >
                  <i className="fa-solid fa-play"></i>
                  <span>{t("start")}</span>
                </button>
              ) : (
                <button
                  className="due-dismiss-btn stop"
                  onClick={(e) => {
                    e.stopPropagation();
                    clockOut(job.id);
                  }}
                >
                  <i className="fa-solid fa-stop"></i>
                  <span>{t("stop")}</span>
                </button>
              )}
            </>
          )}

          {/* 2) ⋮ menu */}
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

          {/* 3) price */}
          <strong className="job-amount" style={{ whiteSpace: "nowrap" }}>
            {money(total, c?.currency)}
          </strong>
        </div>
      </div>

      {job.isOpen && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            {job.timeMode === "fixed" ? (
              <div className="miniRow">
                <span>{t("fixed_price")}:</span>
                <strong>{money(job.fixedPrice, c?.currency)}</strong>
              </div>
            ) : (
              <>
                <div className="miniRow">
                  <span>{t("hourly_rate")}:</span>
                  <strong>{money(job.rate, c?.currency)}</strong>
                </div>

                <div className="miniRow">
                  <span>{t("labor")}:</span>
                  <strong>{money(hours * toNum(job.rate), c?.currency)}</strong>
                </div>
              </>
            )}

            <div className="miniRow">
              <span>{t("parts")}:</span>
              <strong>{money(partsTotal, c?.currency)}</strong>
            </div>

            {job.parts?.length ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {t("used_parts")}
                </div>

                {job.parts.map((p) => (
                  <div key={p.id} className="partLine">
                    <span>
                      {p.name || t("part_generic")}{" "}
                      {p.qty != null ? `× ${p.qty}` : ""}
                    </span>
                    <span>{money(partLineTotal(p), c?.currency)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                {" "}
                {t("no_parts")}
              </div>
            )}

            {job.notes && (
              <div style={{ marginTop: 8, color: "var(--text)" }}>
                <strong>{t("note_label")}:</strong> {job.notes}
              </div>
            )}

            {/* ⏱️ CLOCK IN / OUT HISTORY */}
            {job.timeMode === "clock" && (job.sessions || []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  <i className="fa-solid fa-clock"></i> {t("work_history")}
                </div>

                {(job.sessions || []).map((s, i) => {
                  const start = new Date(s.inAt);
                  const end = new Date(s.outAt);
                  const h = ((s.outAt - s.inAt) / 36e5).toFixed(2);

                  return (
                    <div
                      key={s.id || i}
                      className="miniRow"
                      style={{ fontSize: 12, color: "var(--muted)" }}
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

                      <strong>
                        {h} {t("duration_hours")}
                      </strong>
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
                  {t("complete_job_add_debt")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
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

function VaultDetailModal({
  open,
  onClose,
  vault,
  payments,
  jobs,
  onRenameVault,
  activeVaultId,
  setVaultDeleteConfirm,
  setState, // ✅ ADD
  zIndex = 2000, // ✅ DEFAULT
}) {
  const { t } = useLang();

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

  // ✅ ONLY payments
  const vaultPayments = (payments || []).filter(
    (p) => p.vaultId === vault.id && p.type === "payment",
  );

  const totalPayment = vaultPayments.reduce(
    (sum, p) => sum + toNum(p.amount),
    0,
  );

  const transactionCount = vaultPayments.length;

  const hasTransactions = transactionCount > 0;

  function printVault() {
    const html = printRef.current?.innerHTML;
    if (!html) return;

    const w = window.open("", "_blank");
    if (!w) {
      alert(t("popup_blocked"));
      return;
    }

    w.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>${t("vault_report_title")}</title>
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
        ${t("vault_print_button")}
      </button>

      ${html}
    </body>
    </html>
  `);

    w.document.close();
    w.focus();
  }

  return (
    <ModalBase
      open={open}
      title={t("vault_detail_title")}
      onClose={onClose}
      zIndex={zIndex} // ✅ THIS IS THE KEY
    >
      <div className="vault-detail-page">
        <div className="vault-detail-card">
          {/* HEADER */}
          <div className="card">
            {!editingName ? (
              <div className="vault-header-row">
                <h3 className="vault-title">{vault.name}</h3>

                <button
                  className="vault-edit-btn"
                  onClick={() => setEditingName(true)}
                >
                  <i className="fa-solid fa-pen"></i>
                  <span>{t("edit")}</span>
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
                  {t("save")}
                </button>
                <button
                  className="btn btn-cancel"
                  onClick={() => {
                    setVaultName(vault.name);
                    setEditingName(false);
                  }}
                >
                  {t("cancel")}
                </button>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <div
                style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}
              >
                {t("currency_label")}
              </div>

              <select
                value={vault.currency}
                onChange={(e) =>
                  onRenameVault(vault.id, { currency: e.target.value })
                }
                style={{
                  width: "100%",
                  height: 40,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
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
              <i className="fa-solid fa-print"></i> {t("vault_print")}
            </button>
          </div>

          {/* PRIMARY PAYMENT */}
          <div className="card vault-primary-payment">
            <div className="label">{t("total_payment")}</div>

            <div className="amount">
              +{totalPayment.toFixed(2)} {vault.currency}
            </div>

            <div className="hint">
              <i className="fa-solid fa-money-bill-1"></i> {t("cash_received")}
            </div>
          </div>

          {/* COUNT */}
          <div className="card vault-transaction-count">
            {t("total_transaction_count")} <strong>{transactionCount}</strong>
          </div>

          {/* TRANSACTIONS LIST */}
          <div className="card vault-transactions-list">
            <div className="vault-transactions-header">
              <strong>{t("transactions") || "Transactions"}</strong>
              <span className="vault-transactions-sub">
                {transactionCount} {t("total_transaction_count") || "total"}
              </span>
            </div>

            {vaultPayments.length === 0 ? (
              <div className="vault-empty">
                {t("no_transactions") || "No transactions"}
              </div>
            ) : (
              <div className="vault-transactions-scroll">
                {vaultPayments
                  .slice()
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                  .map((p) => {
                    const dateText =
                      p.date ||
                      (p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString("tr-TR")
                        : "-");

                    return (
                      <div key={p.id} className="vault-tx-row">
                        <div className="vault-tx-left">
                          <div className="vault-tx-note">{p.note || "-"}</div>
                          <div className="vault-tx-meta">
                            <span>{dateText}</span>
                            {p.method ? (
                              <span className="vault-tx-method">
                                {p.method}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="vault-tx-right">
                          <div className="vault-tx-amount">
                            +{toNum(p.amount).toFixed(2)} {vault.currency}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="hidden">
            <div ref={printRef}>
              <h1>{t("vault_report_title")}</h1>
              <div style={{ color: "var(--muted)", marginBottom: 8 }}>
                {t("vault_label")}: <b>{vault.name}</b>
                <br />
                {t("currency_label")}: <b>{vault.currency}</b>
                <br />
                {t("date_label")}: {new Date().toLocaleDateString("tr-TR")}
              </div>

              <hr />

              <table>
                <thead>
                  <tr>
                    <th>{t("date_label")}</th>
                    <th>{t("type_label")}</th>
                    <th>{t("description_label")}</th>
                    <th>{t("method_label")}</th>
                    <th className="right">{t("amount_label")}</th>
                  </tr>
                </thead>
                <tbody>
                  {vaultPayments
                    .filter((p) => p.type === "payment")
                    .map((p) => (
                      <tr key={p.id}>
                        <td>{p.date}</td>
                        <td>
                          {p.type === "payment" ? t("payment") : t("debt")}
                        </td>
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
                <b>{t("total_payment")}:</b> +{totalPayment.toFixed(2)}{" "}
                {vault.currency}
                <br />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          className="btn btn-delete"
          style={{ width: "100%" }}
          disabled={hasTransactions}
          onClick={() => {
            if (hasTransactions) {
              alert(t("vault_cannot_delete_has_transactions"));
              return;
            }

            if (vault.id === activeVaultId) {
              alert(t("active_vault_cannot_delete"));
              return;
            }

            setVaultDeleteConfirm({
              open: true,
              vaultId: vault.id,
              text: "",
              transactionCount, // ✅ PASS REAL COUNT
            });
          }}
        >
          <i className="fa-solid fa-trash"></i>{" "}
          {hasTransactions ? t("vault_has_transactions") : t("delete_vault")}
        </button>

        {vault.id !== activeVaultId && (
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button
              className="btn btn-save"
              style={{ width: "100%" }}
              onClick={() => {
                setState((s) => ({
                  ...s,
                  activeVaultId: vault.id,
                }));
                onClose();
              }}
            >
              {t("make_vault_active")}
            </button>
          </div>
        )}
      </div>
    </ModalBase>
  );
}
