import { useEffect, useMemo, useRef, useState } from "react";
import BeneficiaryTable from "../components/BeneficiaryTable.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Toast from "../components/Toast.jsx";
import { createSearchMatcher } from "../utils/search.js";
import { generatePastBeneficiariesPdf } from "../utils/pdf.js";
import {
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
} from "../services/beneficiaryService.js";
import { loadFromStorage, saveToStorage } from "../utils/storage.js";

export default function PastBeneficiaries({
  beneficiaries,
  setBeneficiaries,
  currentRole,
}) {
  const [searchText, setSearchText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [toast, setToast] = useState({ message: "", variant: "success" });
  const deleteTimerRef = useRef(null);
  const undoItemRef = useRef(null);
  const toastTimerRef = useRef(null);

  const pastBeneficiaries = useMemo(
    () => beneficiaries.filter((item) => item.category === "Past Beneficiary"),
    [beneficiaries],
  );

  const filtered = useMemo(() => {
    const matcher = createSearchMatcher(searchText);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return pastBeneficiaries.filter((item) => {
      if (!matcher(item)) return false;

      if (!start && !end) return true;

      const addedDate = item.dateAdded ? new Date(item.dateAdded) : null;
      if (!addedDate) return true;
      if (start && addedDate < start) return false;
      if (end && addedDate > new Date(end.getTime() + 86400000 - 1))
        return false;

      return true;
    });
  }, [pastBeneficiaries, searchText, startDate, endDate]);

  const showToast = (
    payload,
    variant = "success",
    actionLabel,
    onAction,
    duration = 2800,
  ) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    const toastData =
      typeof payload === "string"
        ? { message: payload, variant, actionLabel, onAction }
        : { ...payload };

    setToast(toastData);
    toastTimerRef.current = window.setTimeout(() => {
      setToast({ message: "", variant: "success" });
      toastTimerRef.current = null;
    }, duration);
  };

  const clearDeleteTimer = () => {
    if (deleteTimerRef.current) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  };

  const handleUndo = () => {
    (async () => {
      if (!undoItemRef.current) return;

      clearDeleteTimer();
      const restoredItem = undoItemRef.current;
      undoItemRef.current = null;
      setBeneficiaries((items) => [restoredItem, ...items]);
      try {
        const current = loadFromStorage();
        saveToStorage(undefined, [restoredItem, ...current]);
      } catch (e) {
        console.error("Failed to persist undo restore", e);
      }

      try {
        const created = await createBeneficiary(restoredItem);
        setBeneficiaries((items) =>
          items.map((it) => (it.id === restoredItem.id ? created : it)),
        );
        try {
          const current = loadFromStorage();
          const updated = current.map((it) =>
            it.id === restoredItem.id ? created : it,
          );
          saveToStorage(undefined, updated);
        } catch (e) {
          console.error(
            "Failed to update local storage after backend create",
            e,
          );
        }
      } catch (e) {
        console.error("Failed to persist undo to backend", e);
      }

      showToast(`${restoredItem.fullName} restored.`, "success");
    })();
  };

  const handleDelete = (beneficiary) => {
    setPendingDelete(beneficiary);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    clearDeleteTimer();
    const deletedItem = pendingDelete;
    setPendingDelete(null);
    setBeneficiaries((items) =>
      items.filter((item) => item.id !== deletedItem.id),
    );
    undoItemRef.current = deletedItem;

    // Persist deletion immediately so refresh does not restore the item.
    try {
      const current = loadFromStorage();
      const updated = current.filter((item) => item.id !== deletedItem.id);
      saveToStorage(undefined, updated);
    } catch (e) {
      console.error("Failed to persist deletion locally", e);
    }

    // Also call service (backend) immediately; keep an undo window to restore locally
    try {
      deleteBeneficiary(deletedItem.id).catch((err) => {
        console.error("Backend delete failed", err);
      });
    } catch (e) {
      console.error("Error calling deleteBeneficiary", e);
    }

    deleteTimerRef.current = window.setTimeout(() => {
      undoItemRef.current = null;
      deleteTimerRef.current = null;
    }, 5000);

    showToast("Past beneficiary removed.", "success", "Undo", handleUndo, 5000);
  };

  const handleEmpowermentTypeChange = async (id, empowermentType) => {
    try {
      const beneficiary = beneficiaries.find((item) => item.id === id);
      if (!beneficiary) return;

      const updatedItem = await updateBeneficiary(id, {
        empowermentType,
      });
      setBeneficiaries(
        beneficiaries.map((item) => (item.id === id ? updatedItem : item)),
      );
    } catch (error) {
      showToast(error.message || "Unable to update empowerment type.", "error");
    }
  };

  const handleCancelDelete = () => setPendingDelete(null);

  const handleDownloadPdf = async () => {
    try {
      await generatePastBeneficiariesPdf("Agbana Foundation", filtered);
    } catch (error) {
      console.error("Past beneficiaries PDF download failed", error);
      showToast("Unable to download PDF. Check console for details.", "error");
    }
  };

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        window.clearTimeout(deleteTimerRef.current);
      }
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Past beneficiaries</p>
          <h1>All past beneficiaries</h1>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button-secondary"
            onClick={handleDownloadPdf}
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="list-panel">
        <div className="summary-pill-row">
          <span>Total past beneficiaries: {pastBeneficiaries.length}</span>
        </div>

        <div className="section-note">
          {currentRole !== "Admin" && (
            <p className="role-note">
              You are signed in as a user. Remove past beneficiaries only as
              Admin.
            </p>
          )}
        </div>

        <div className="search-row">
          <input
            type="search"
            placeholder="Type 2+ letters to search by name or phone"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <div className="date-filter-row">
            <label>
              From date
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label>
              To date
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
            >
              Clear dates
            </button>
          </div>
        </div>

        <BeneficiaryTable
          beneficiaries={filtered}
          onDelete={currentRole === "Admin" ? handleDelete : undefined}
          onEmpowermentTypeChange={
            currentRole === "Admin" ? handleEmpowermentTypeChange : undefined
          }
          noDataMessage={
            searchText
              ? "No matching past beneficiaries found."
              : "No past beneficiaries available yet."
          }
          showDateCalled
          showPassport
          showEmpowermentType
        />
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete past beneficiary"
        message={`Are you sure you want to delete ${pendingDelete?.fullName}? You can undo this for a short time after deleting.`}
        onCancel={handleCancelDelete}
        onConfirm={confirmDelete}
      />

      <Toast
        message={toast.message}
        variant={toast.variant}
        actionLabel={toast.actionLabel}
        onAction={toast.onAction}
        onClose={() => setToast({ message: "", variant: "success" })}
      />
    </section>
  );
}
