import React, { useEffect, useMemo, useRef, useState } from "react";

import { ModalBase } from "./ModalBase";

import { useLang } from "../i18n/LanguageContext";

export function ConfirmModal({ open, message, onYes, onNo, requireText }) {
  const [typed, setTyped] = useState("");
  const { t } = useLang();

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const canConfirm = !requireText || typed === t("delete_confirm_word");

  return (
    <ModalBase
      open={open}
      title={t("delete_confirmation")}
      onClose={onNo}
      className="confirm-modal"
      zIndex={4000}
    >
      <p style={{ marginTop: 0 }}>{message}</p>

      {requireText && (
        <div className="form-group">
          <label>
            {t("type_to_delete")} <b>{t("delete_confirm_word")}</b>
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={t("delete_confirm_word")}
          />
        </div>
      )}

      <div className="btn-row">
        <button className="btn btn-cancel" onClick={onNo}>
          {t("no")}
        </button>

        <button
          className="btn btn-delete"
          disabled={!canConfirm}
          style={{ opacity: canConfirm ? 1 : 0.5 }}
          onClick={onYes}
        >
          {t("yes")}
        </button>
      </div>
    </ModalBase>
  );
}
