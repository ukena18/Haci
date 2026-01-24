import React from "react";

export function ModalBase({
  open,
  title,
  onClose,
  children,
  className = "",
  zIndex = 1000,
}) {
  if (!open) return null;

  return (
    <div
      className={`modal ${className}`}
      style={{ zIndex }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 10 }}
        >
          <h3 style={{ margin: 0 }}>{title}</h3>
        </div>

        <div style={{ marginTop: 14 }}>{children}</div>
      </div>
    </div>
  );
}
