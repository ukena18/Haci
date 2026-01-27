import React, { useEffect, useMemo, useRef, useState } from "react";

import { ModalBase } from "./ModalBase";

import { updateProfile } from "firebase/auth";

import { saveUserData } from "../firestoreService";

import { useLang } from "../i18n/LanguageContext";

export function ProfileModal({ open, onClose, user, profile, setState }) {
  const [name, setName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const { t } = useLang();

  useEffect(() => {
    if (!open) return;

    setName(user?.displayName || "");

    // ✅ LOAD FROM FIRESTORE
    setPhone(profile?.phone || "");
    setAddress(profile?.address || "");
  }, [open, user, profile]);

  async function save() {
    try {
      await updateProfile(user, { displayName: name });

      await saveUserData(user.uid, {
        profile: {
          ...(profile || {}),
          phone,
          address,
        },
      });

      setState((s) => ({
        ...s,
        profile: {
          ...(s.profile || {}),
          phone,
          address,
        },
      }));

      onClose();
    } catch (err) {
      console.error(err);
    }
  }

  if (!open) return null;

  return (
    <ModalBase
      open={open}
      title={t("profile_settings")}
      onClose={onClose}
      zIndex={3000}
    >
      <div className="form-group">
        <label>{t("name_or_title")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("your_name")}
        />
      </div>

      <div className="form-group">
        <label>{t("phone")}</label>
        <input
          type="tel"
          placeholder="+90 5xx xxx xx xx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>{t("address")}</label>
        <textarea
          rows={2}
          placeholder={t("address")}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <hr />

      <div className="btn-row">
        <button className="btn btn-cancel" onClick={onClose}>
          {t("cancel")}
        </button>

        <button className="btn btn-save" onClick={save}>
          {t("save")}
        </button>
      </div>
    </ModalBase>
  );
}
