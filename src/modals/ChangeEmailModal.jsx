import React, { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
} from "firebase/auth";

import { useLang } from "../i18n/LanguageContext";
import { ModalBase } from "./ModalBase";

export default function ChangeEmailModal({ open, onClose, auth }) {
  const { t } = useLang();

  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleChangeEmail() {
    setError("");
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error("no_user");
      }

      // 🔐 Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, password);

      await reauthenticateWithCredential(user, credential);

      // ✉️ SEND VERIFICATION + UPDATE EMAIL
      await verifyBeforeUpdateEmail(user, newEmail);

      alert(t("email_verification_sent"));
      onClose();
    } catch (err) {
      console.error(err);

      if (err.code === "auth/wrong-password") {
        setError(t("wrong_password"));
      } else if (err.code === "auth/invalid-email") {
        setError(t("invalid_email"));
      } else if (err.code === "auth/email-already-in-use") {
        setError(t("email_already_in_use"));
      } else {
        setError(t("email_update_failed"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalBase
      open={open}
      title={t("change_email")}
      onClose={onClose}
      zIndex={5000}
    >
      <div className="form-group">
        <label>{t("new_email")}</label>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="new@email.com"
        />
      </div>

      <div className="form-group">
        <label>{t("current_password")}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>}

      <div className="btn-row">
        <button className="btn btn-cancel" onClick={onClose}>
          {t("cancel")}
        </button>

        <button
          className="btn btn-save"
          onClick={handleChangeEmail}
          disabled={loading || !newEmail || !password}
        >
          {loading ? t("saving") : t("confirm")}
        </button>
      </div>
    </ModalBase>
  );
}
