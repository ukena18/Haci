import React, { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useLang } from "../i18n/LanguageContext";

// helpers (same ones you already use in App.jsx)
import {
  computeCustomerBalance,
  money,
  toNum,
  calcHours,
  partsTotalOf,
  jobTotalOf,
  partLineTotal,
  clockHoursOf,
} from "../utils/helpers";

export function SettingsPage({
  // auth/user
  auth,
  user,
  signOut,

  // state
  state,
  setState,

  // ui state
  setProfileOpen,
  setSelectedVaultId,
  setVaultDetailOpen,
  setVaultListOpen,

  editingVaultId,
  setEditingVaultId,
  editingVaultName,
  setEditingVaultName,

  showChangelog,
  setShowChangelog,

  // helpers
  uid,
  money,
  getVaultTotals,

  // components
  Changelog,
  setAdvancedSettingsOpen,
}) {
  const { lang, changeLanguage, t } = useLang();

  return (
    <div className="settings-dashboard">
      {/* ADMIN HEADER */}
      <div className="settings-admin-card">
        <div className="admin-left">
          <div className="admin-avatar">
            {user?.email?.[0]?.toUpperCase() || "A"}
          </div>

          <div className="admin-info">
            <strong className="admin-name">
              {state.profile?.name ||
                user?.displayName ||
                t("settings.adminFallback")}
            </strong>

            <div className="admin-email">
              {user?.email || "admin@example.com"}
            </div>

            <span className="admin-role">ADMIN</span>
          </div>
        </div>

        <div className="admin-right">
          {state.profile?.phone && (
            <div className="admin-meta">
              <i className="fa-solid fa-phone"></i> {state.profile.phone}
            </div>
          )}

          {state.profile?.address && (
            <div className="admin-meta address">
              <i className="fa-solid fa-location-dot"></i>
              {state.profile.address}
            </div>
          )}

          <button className="logout-btn" onClick={() => signOut(auth)}>
            <i className="fa-solid fa-right-from-bracket"></i>{" "}
            {t("settings.logout")}
          </button>
        </div>
      </div>

      <div className="settings-grid">
        {/* VAULTS */}
        <button
          className="settings-card"
          onClick={() => setVaultListOpen(true)}
          type="button"
        >
          <div className="settings-icon blue">
            <i className="fa-solid fa-vault"></i>
          </div>

          <div className="settings-content">
            <h3>{t("settings.vaults.title")}</h3>
            <p>{t("settings.vaults.desc")}</p>
          </div>

          <i className="fa-solid fa-chevron-right arrow"></i>
        </button>

        {/* PROFILE */}
        <button
          className="settings-card"
          onClick={() => setProfileOpen(true)}
          type="button"
        >
          <div className="settings-icon green">
            <i className="fa-solid fa-user-gear"></i>
          </div>

          <div className="settings-content">
            <h3>{t("settings.profile.title")}</h3>
            <p>{t("settings.profile.desc")}</p>
          </div>

          <i className="fa-solid fa-chevron-right arrow"></i>
        </button>

        {/* UPDATES */}
        <button
          className="settings-card"
          onClick={() => setShowChangelog(true)}
          type="button"
        >
          <div className="settings-icon orange">
            <i className="fa-solid fa-box-open"></i>
          </div>

          <div className="settings-content">
            <h3>{t("settings.updates.title")}</h3>
            <p>{t("settings.updates.desc")}</p>
          </div>

          <i className="fa-solid fa-chevron-right arrow"></i>
        </button>

        {/* Advanced settings */}
        <button
          className="settings-card"
          onClick={() => setAdvancedSettingsOpen(true)}
          type="button"
        >
          <div className="settings-icon gray">
            <i className="fa-solid fa-sliders"></i>
          </div>

          <div className="settings-content">
            <h3>{t("settings.advanced.title")}</h3>
            <p>{t("settings.advanced.desc")}</p>
          </div>

          <i className="fa-solid fa-chevron-right arrow"></i>
        </button>
      </div>
    </div>
  );
}
