import React, { useEffect, useMemo, useRef, useState } from "react";

import { ModalBase } from "./ModalBase";

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

import { useLang } from "../i18n/LanguageContext";

export function ChangePasswordModal({ open, onClose, auth }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordRepeat("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  async function submit() {
    try {
      setError("");
      setLoading(true);

      if (!currentPassword || !newPassword || !newPasswordRepeat) {
        throw new Error(t("fill_all_fields"));
      }

      if (newPassword.length < 6) {
        throw new Error(t("password_min_length"));
      }

      if (newPassword !== newPasswordRepeat) {
        throw new Error(t("passwords_not_match"));
      }

      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error(t("session_not_found"));
      }

      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      alert(t("password_update_success"));

      onClose();
    } catch (err) {
      if (err.code === "auth/wrong-password") {
        setError(t("wrong_password"));
      } else if (err.code === "auth/too-many-requests") {
        setError(t("too_many_requests"));
      } else if (err.code === "auth/requires-recent-login") {
        setError(t("recent_login_required"));
      } else {
        setError(err.message || t("password_update_failed"));
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <ModalBase
      open={open}
      title={t("change_password_title")}
      onClose={onClose}
      zIndex={3000}
    >
      <div className="form-group">
        <label>{t("current_password")}</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>{t("new_password")}</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>{t("new_password_repeat")}</label>
        <input
          type="password"
          value={newPasswordRepeat}
          onChange={(e) => setNewPasswordRepeat(e.target.value)}
        />
      </div>

      {error && (
        <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>
          {error}
        </div>
      )}

      <div className="btn-row" style={{ marginTop: 14 }}>
        <button className="btn btn-cancel" onClick={onClose}>
          {t("cancel")}
        </button>

        <button className="btn btn-save" disabled={loading} onClick={submit}>
          {loading ? t("saving") : t("update_password")}
        </button>
      </div>
    </ModalBase>
  );
}
