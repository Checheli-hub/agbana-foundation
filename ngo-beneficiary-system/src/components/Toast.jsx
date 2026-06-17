export default function Toast({
  message,
  variant = "success",
  actionLabel,
  onAction,
  onClose,
}) {
  if (!message) return null;

  const handleActionClick = () => {
    if (typeof onAction === "function") {
      onAction();
    }
  };

  return (
    <div className={`toast toast-${variant}`} role="status">
      <div className="toast-body">
        <span>{message}</span>
        {actionLabel && onAction ? (
          <button
            type="button"
            className="toast-action"
            onClick={handleActionClick}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <button type="button" onClick={onClose} aria-label="Dismiss toast">
        ×
      </button>
    </div>
  );
}
