import { useRef } from "react";

export default function BeneficiaryTable({
  beneficiaries,
  onEdit,
  onDelete,
  onCall,
  onAttend,
  onEmpowermentTypeChange,
  callLoadingId,
  attendLoadingId,
  attendLabel = "Attended",
  noDataMessage,
  showDateCalled,
  showPassport = true,
  showEmpowermentType = false,
  showAttendedColumn = false,
}) {
  const hasActions = Boolean(onEdit || onDelete || onCall);
  const canEditEmpowermentType = Boolean(onEmpowermentTypeChange);
  const wrapperRef = useRef(null);

  const handleKeyDown = (event) => {
    const el = wrapperRef.current;
    if (!el) return;

    const stepY = 80; // vertical scroll step for arrow keys
    const stepX = 200; // horizontal scroll step for arrow keys
    const pageStep = Math.max(el.clientHeight - 40, 200);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        el.scrollTop += stepY;
        break;
      case "ArrowUp":
        event.preventDefault();
        el.scrollTop -= stepY;
        break;
      case "ArrowRight":
        event.preventDefault();
        el.scrollLeft += stepX;
        break;
      case "ArrowLeft":
        event.preventDefault();
        el.scrollLeft -= stepX;
        break;
      case "PageDown":
        event.preventDefault();
        el.scrollTop = Math.min(el.scrollTop + pageStep, el.scrollHeight);
        break;
      case "PageUp":
        event.preventDefault();
        el.scrollTop = Math.max(el.scrollTop - pageStep, 0);
        break;
      case "Home":
        event.preventDefault();
        el.scrollTop = 0;
        el.scrollLeft = 0;
        break;
      case "End":
        event.preventDefault();
        el.scrollTop = el.scrollHeight;
        el.scrollLeft = el.scrollWidth;
        break;
      default:
        break;
    }
  };
  if (!beneficiaries || beneficiaries.length === 0) {
    return (
      <div className="table-empty">
        {noDataMessage || "No beneficiaries found."}
      </div>
    );
  }

  // Keep the beneficiaries in the order provided by the parent
  const sortedBeneficiaries = [...beneficiaries];

  return (
    <div
      className="table-container"
      ref={wrapperRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Beneficiaries table"
    >
      <div className="table-scroll">
        <div className="table-hint" aria-hidden>
          Focus here and use arrow keys, PageUp/PageDown, Home/End to navigate
        </div>
        <table className="beneficiary-table" style={{ tableLayout: "fixed" }}>
          <colgroup>
            {showPassport && (
              <col className="col-passport" style={{ width: "70px" }} />
            )}
            <col className="col-name" style={{ width: "220px" }} />
            <col className="col-phone" style={{ width: "140px" }} />
            <col className="col-category" style={{ width: "150px" }} />
            <col className="col-date-added" style={{ width: "130px" }} />
            {showEmpowermentType && (
              <col className="col-empowerment" style={{ width: "230px" }} />
            )}
            {showDateCalled && (
              <col className="col-date-called" style={{ width: "170px" }} />
            )}
            <col className="col-status" style={{ width: "110px" }} />
            {showAttendedColumn && (
              <col className="col-attended" style={{ width: "130px" }} />
            )}
            {hasActions && (
              <col className="col-actions" style={{ width: "260px" }} />
            )}
          </colgroup>
          <thead>
            <tr>
              {showPassport && <th className="passport-header">Passport</th>}
              <th className="name-header">Name</th>
              <th className="phone-header">Phone</th>
              <th className="category-header">Category</th>
              <th className="date-added-header">Date Added</th>
              {showEmpowermentType && (
                <th className="empowerment-header">
                  <span>Empowerment</span>
                  <span>Type</span>
                </th>
              )}
              {showDateCalled && (
                <th className="date-called-header">Date Called</th>
              )}
              <th className="status-header">Status</th>
              {showAttendedColumn && (
                <th className="attended-header">Attended</th>
              )}
              {hasActions && <th className="actions-header">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sortedBeneficiaries.map((beneficiary, index) => (
              <tr
                key={beneficiary.id}
                className={index % 2 === 0 ? "stripe-light" : "stripe-dark"}
              >
                {showPassport && (
                  <td className="avatar-cell">
                    {beneficiary.passport ? (
                      <img
                        src={beneficiary.passport}
                        alt={`${beneficiary.fullName} passport`}
                      />
                    ) : (
                      <div className="avatar-placeholder">—</div>
                    )}
                  </td>
                )}
                <td className="cell-text name-cell">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span>{beneficiary.fullName}</span>
                    {((beneficiary.repeatCount &&
                      beneficiary.repeatCount > 0) ||
                      beneficiary.previouslyAssisted) && (
                      <span
                        className="previously-assisted-dot"
                        title={
                          beneficiary.repeatCount
                            ? `Previously assisted (${beneficiary.repeatCount})`
                            : "Previously assisted"
                        }
                        aria-label="Previously assisted"
                      />
                    )}
                  </div>
                </td>
                <td className="cell-text phone-cell">{beneficiary.phone}</td>
                <td className="cell-text category-cell">
                  {beneficiary.category}
                </td>
                <td className="cell-text date-added-cell">
                  {new Date(beneficiary.dateAdded).toLocaleDateString()}
                </td>
                {showEmpowermentType && (
                  <td className="cell-text empowerment-cell">
                    {canEditEmpowermentType ? (
                      <input
                        className="empowerment-input"
                        value={beneficiary.empowermentType || ""}
                        onChange={(event) =>
                          onEmpowermentTypeChange(
                            beneficiary.id,
                            event.target.value,
                          )
                        }
                        placeholder="Type here"
                      />
                    ) : (
                      beneficiary.empowermentType || "—"
                    )}
                  </td>
                )}
                {showDateCalled && (
                  <td className="cell-text date-called-cell">
                    {beneficiary.calledAt
                      ? new Date(beneficiary.calledAt).toLocaleString()
                      : "—"}
                  </td>
                )}
                <td className="cell-status">
                  <span
                    className={`status-badge ${
                      beneficiary.category === "Past Beneficiary"
                        ? "attended"
                        : beneficiary.called
                          ? "called"
                          : "pending"
                    }`}
                  >
                    {beneficiary.category === "Past Beneficiary"
                      ? "Attended"
                      : beneficiary.called
                        ? "Called"
                        : "Pending"}
                  </span>
                </td>
                {showAttendedColumn && (
                  <td className="cell-action">
                    {onAttend ? (
                      <button
                        type="button"
                        className="action-btn action-btn-secondary"
                        onClick={() => onAttend(beneficiary)}
                        disabled={attendLoadingId === beneficiary.id}
                      >
                        {attendLoadingId === beneficiary.id
                          ? "Saving..."
                          : attendLabel}
                      </button>
                    ) : (
                      <span className="empty-cell">—</span>
                    )}
                  </td>
                )}
                {hasActions && (
                  <td className="actions-cell">
                    <div className="button-group">
                      {onEdit && (
                        <button
                          type="button"
                          className="action-btn icon-btn action-btn-primary"
                          onClick={() => onEdit(beneficiary)}
                          title="Edit beneficiary"
                          aria-label="Edit beneficiary"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden
                          >
                            <path
                              d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
                              fill="currentColor"
                            />
                            <path
                              d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          className="action-btn icon-btn action-btn-danger"
                          onClick={() => onDelete(beneficiary)}
                          title="Delete beneficiary"
                          aria-label="Delete beneficiary"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden
                          >
                            <path
                              d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7z"
                              fill="currentColor"
                            />
                            <path
                              d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      )}
                      {onCall && !beneficiary.called && (
                        <button
                          type="button"
                          className="action-btn icon-btn action-btn-success"
                          onClick={() => onCall(beneficiary)}
                          disabled={callLoadingId === beneficiary.id}
                          title={
                            callLoadingId === beneficiary.id
                              ? "Marking as called"
                              : "Mark as called"
                          }
                          aria-label="Mark as called"
                        >
                          {callLoadingId === beneficiary.id ? (
                            "Calling..."
                          ) : (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              aria-hidden
                            >
                              <path
                                d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.07 21 3 13.93 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.24 1.01l-2.2 2.21z"
                                fill="currentColor"
                              />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
