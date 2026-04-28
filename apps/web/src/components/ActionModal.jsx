export const ActionModal = ({
  open,
  title,
  message,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
  confirmDisabled = false,
  busy = false
}) => {
  if (!open) return null;

  const handleCancel = () => {
    if (busy) return;
    onCancel?.();
  };

  return (
    <div className="action-modal-overlay" onClick={handleCancel}>
      <div
        className="action-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-modal-title"
      >
        <div className="action-modal__header">
          <h3 id="action-modal-title">{title}</h3>
        </div>
        <div className="action-modal__body">
          {message ? <p>{message}</p> : null}
          {children}
        </div>
        <div className="action-modal__footer">
          <button className="btn btn-secondary" type="button" onClick={handleCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${confirmVariant === "danger" ? "btn-danger" : "btn-primary"}`}
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled || busy}
          >
            {busy ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
