import React, { useEffect, useRef } from "react";

export function ModalBase({
  open,
  title,
  onClose,
  children,
  className = "",
  zIndex = 1000,
}) {
  const isClosingRef = useRef(false);

  // 📱 HANDLE PHONE / BROWSER BACK BUTTON
  useEffect(() => {
    if (!open) return;

    isClosingRef.current = false;

    // push history entry when modal opens
    window.history.pushState({ modal: true }, "");

    const handleBack = () => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;
      onClose();
    };

    window.addEventListener("popstate", handleBack);

    return () => {
      window.removeEventListener("popstate", handleBack);
    };
  }, [open, onClose]);

  if (!open) return null;

  // unified close handler
  const requestClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    onClose();

    // pop history only if modal pushed it
    if (window.history.state?.modal) {
      window.history.back();
    }
  };

  return (
    <div
      className={`modal ${className}`}
      style={{ zIndex }}
      onClick={requestClose} // click outside closes
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()} // prevent inside clicks
      >
        {/* HEADER */}
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>

          <button className="modal-x" onClick={requestClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
