import { useEffect, useRef } from "react";
import { useLang } from "../i18n/LanguageContext";

export function ModalBase({
  open,
  title,
  onClose,
  children,
  className = "",
  zIndex = 1000,
}) {
  const isClosingRef = useRef(false);
  const didPushRef = useRef(false);
  const { t } = useLang();

  useEffect(() => {
    if (!open) {
      didPushRef.current = false;
      return;
    }

    isClosingRef.current = false;

    // ✅ PUSH HISTORY ONLY ONCE
    if (!didPushRef.current) {
      window.history.pushState({ modal: true }, "");
      didPushRef.current = true;
    }

    const handleBack = () => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;
      onClose();
    };

    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, [open, onClose]);

  if (!open) return null;

  const requestClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    onClose();

    if (window.history.state?.modal) {
      window.history.back();
    }
  };

  return (
    <div
      className={`modal ${className}`}
      style={{ zIndex }}
      onClick={requestClose}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>

          <button
            onClick={requestClose}
            aria-label={t("close")}
            className="modal-close-btn"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
