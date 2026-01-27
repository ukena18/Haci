import React, { useEffect, useMemo, useRef, useState } from "react";

import { ModalBase } from "./ModalBase";

import ChangeEmailModal from "./ChangeEmailModal";
import { ChangePasswordModal } from "./ChangePasswordModal";

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

export function AdvancedSettingsModal({
  open,
  onClose,
  state,
  setState,
  auth,

  // 🔹 STEP 6 — Dark mode props
  theme,
  setTheme,
  jobs = [], // ✅ ADD
}) {
  if (!open) return null;

  const showCalendar = state.profile?.settings?.showCalendar !== false;

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);

  const { lang, changeLanguage, t } = useLang();

  const activeJobsCount = React.useMemo(() => {
    return (jobs || []).filter((j) => j.isCompleted !== true).length;
  }, [jobs]);

  function toggleCalendar() {
    setState((s) => ({
      ...s,
      profile: {
        ...s.profile,
        settings: {
          ...s.profile?.settings,
          showCalendar: !showCalendar,
        },
      },
    }));
  }

  function normalizeImportedState(raw) {
    if (!raw || typeof raw !== "object") {
      throw new Error("Invalid file format");
    }

    return {
      customers: Array.isArray(raw.customers) ? raw.customers : [],
      jobs: Array.isArray(raw.jobs) ? raw.jobs : [],
      payments: Array.isArray(raw.payments) ? raw.payments : [],
      vaults: Array.isArray(raw.vaults) ? raw.vaults : [],
      reservations: Array.isArray(raw.reservations) ? raw.reservations : [],

      profile: {
        ...(raw.profile || {}),
        settings: {
          ...(raw.profile?.settings || {}),
        },
      },

      activeVaultId: raw.activeVaultId ?? null,

      // always update timestamp
      updatedAt: Date.now(),
    };
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);

        const normalized = normalizeImportedState(parsed);

        const ok = window.confirm(
          t("import_confirm_replace") ||
            "This will replace your current data. Continue?",
        );

        if (!ok) return;

        // 🔥 SINGLE SOURCE OF TRUTH
        setState(normalized);

        alert(t("import_success") || "Import completed successfully.");
        onClose();
      } catch (err) {
        console.error(err);
        alert(t("import_failed") || "Import failed. Invalid file.");
      }
    };

    reader.readAsText(file);
  }

  function exportData() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "usta-app-export.json";
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <ModalBase
      open={open}
      title={t("advanced_settings")}
      onClose={onClose}
      zIndex={2000}
    >
      <div className="settings-section">
        <h4>{t("app_section")}</h4>
        {/* =========================
    DARK MODE
========================= */}
        <button
          className="settings-card"
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {/* LEFT ICON */}
          <div className="settings-icon gray">
            <i
              className={`fa-solid ${theme === "dark" ? "fa-moon" : "fa-sun"}`}
            ></i>
          </div>

          {/* CENTER CONTENT */}
          <div className="settings-content">
            <h3>{t("settings.theme.title") || "Dark Mode"}</h3>
            <p>
              {t("settings.theme.desc") ||
                "Switch between light and dark appearance"}
            </p>
          </div>

          {/* RIGHT TOGGLE */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: "flex", alignItems: "center" }}
          >
            <label className="switch">
              <input
                type="checkbox"
                checked={theme === "dark"}
                onChange={(e) => setTheme(e.target.checked ? "dark" : "light")}
              />
              <span className="slider" />
            </label>
          </div>
        </button>

        <button
          className="settings-card"
          type="button"
          onClick={toggleCalendar}
        >
          {/* LEFT ICON */}
          <div className="settings-icon blue">
            <i className="fa-solid fa-calendar-days"></i>
          </div>

          {/* CENTER CONTENT */}
          <div className="settings-content">
            <h3>{t("settings.calendar.title")}</h3>
            <p>{t("settings.calendar.desc")}</p>
          </div>

          {/* RIGHT TOGGLE */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: "flex", alignItems: "center" }}
          >
            <label className="switch">
              <input
                type="checkbox"
                checked={showCalendar}
                onChange={toggleCalendar}
              />
              <span className="slider" />
            </label>
          </div>
        </button>

        {/* =========================
    JOB SYSTEM TOGGLE
========================= */}
        <button
          className="settings-card"
          type="button"
          onClick={() => {
            const currentlyEnabled =
              state.profile?.settings?.enableJobs !== false;

            // ❌ BLOCK disabling if active jobs exist
            if (currentlyEnabled && activeJobsCount > 0) {
              alert(
                `You have ${activeJobsCount} active job(s).\n` +
                  `Please complete them before disabling job tracking.`,
              );
              return;
            }

            // ✅ SAFE TO TOGGLE
            setState((s) => ({
              ...s,
              profile: {
                ...s.profile,
                settings: {
                  ...s.profile?.settings,
                  enableJobs: !currentlyEnabled,
                },
              },
            }));
          }}
        >
          {/* LEFT ICON */}
          <div className="settings-icon gray">
            <i className="fa-solid fa-briefcase"></i>
          </div>

          {/* CENTER CONTENT */}
          <div className="settings-content">
            <h3>{t("settings.jobs.title")}</h3>
            <p>{t("settings.jobs.desc")}</p>
          </div>

          {/* RIGHT TOGGLE */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: "flex", alignItems: "center" }}
          >
            <label className="switch">
              <input
                type="checkbox"
                checked={state.profile?.settings?.enableJobs !== false}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  const currentlyEnabled =
                    state.profile?.settings?.enableJobs !== false;

                  // ❌ BLOCK disabling if active jobs exist
                  if (!enabled && currentlyEnabled && activeJobsCount > 0) {
                    alert(
                      `You have ${activeJobsCount} active job(s).\n` +
                        `Please complete them before disabling job tracking.`,
                    );
                    return;
                  }

                  // ✅ SAFE UPDATE
                  setState((s) => ({
                    ...s,
                    profile: {
                      ...s.profile,
                      settings: {
                        ...s.profile?.settings,
                        enableJobs: enabled,
                      },
                    },
                  }));
                }}
              />
              <span className="slider" />
            </label>
          </div>
        </button>

        {/* LANGUAGE */}
        <button
          className="settings-card"
          type="button"
          onClick={() => {
            // optional: open language selector programmatically if you want
            // document.getElementById("language-select").focus();
          }}
        >
          {/* LEFT ICON */}
          <div className="settings-icon purple">
            <i className="fa-solid fa-language"></i>
          </div>

          {/* CENTER CONTENT */}
          <div className="settings-content">
            <h3>{t("settings.language.title")}</h3>
            <p>{t("settings.language.desc")}</p>
          </div>

          {/* RIGHT CONTROL */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: "flex", alignItems: "center" }}
          >
            <div className="language-select-wrapper compact">
              <select
                id="language-select"
                value={lang}
                onChange={(e) => changeLanguage(e.target.value)}
                className="language-select compact"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>
        </button>
      </div>

      <div className="settings-section">
        <h4>{t("security_section")}</h4>
        <button
          className="settings-card"
          onClick={() => setChangePasswordOpen(true)}
          type="button"
        >
          <div className="settings-icon gray">
            <i className="fa-solid fa-key"></i>
          </div>

          <div className="settings-content">
            <h3>{t("change_password")}</h3>
            <p>{t("change_password_desc")}</p>
          </div>

          <i className="fa-solid fa-chevron-right arrow"></i>
        </button>

        <button
          className="settings-card"
          onClick={() => setChangeEmailOpen(true)}
          type="button"
        >
          <div className="settings-icon gray">
            <i className="fa-solid fa-envelope"></i>
          </div>

          <div className="settings-content">
            <h3>{t("change_email")}</h3>
            <p>{t("change_email_desc")}</p>
          </div>

          <i className="fa-solid fa-chevron-right arrow"></i>
        </button>
      </div>

      <div className="settings-section">
        <h4>{t("data_section")}</h4>

        <button className="settings-card" onClick={exportData} type="button">
          <div className="settings-icon blue">
            <i className="fa-solid fa-file-export"></i>
          </div>
          <div className="settings-content">
            <h3>{t("export_data")}</h3>
            <p>{t("export_data_desc")}</p>
          </div>

          <i className="fa-solid fa-chevron-right arrow"></i>
        </button>
      </div>

      <button
        className="settings-card"
        type="button"
        onClick={() => document.getElementById("import-json-input").click()}
      >
        <div className="settings-icon green">
          <i className="fa-solid fa-file-import"></i>
        </div>

        <div className="settings-content">
          <h3>{t("settings.import.title")}</h3>
          <p>{t("settings.import.desc")}</p>
        </div>

        <i className="fa-solid fa-chevron-right arrow"></i>
      </button>

      <input
        id="import-json-input"
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={handleImportFile}
      />

      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        auth={auth}
      />
      <ChangeEmailModal
        open={changeEmailOpen}
        onClose={() => setChangeEmailOpen(false)}
        auth={auth}
      />
    </ModalBase>
  );
}
