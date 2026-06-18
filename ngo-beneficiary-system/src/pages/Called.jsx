import { useEffect, useMemo, useRef, useState } from "react";
import BeneficiaryTable from "../components/BeneficiaryTable.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Toast from "../components/Toast.jsx";
import { createSearchMatcher } from "../utils/search.js";
import {
  generateCalledBeneficiariesPdf,
  printCalledBeneficiariesPdf,
} from "../utils/pdf.js";
import {
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
} from "../services/beneficiaryService.js";
import { loadFromStorage, saveToStorage } from "../utils/storage.js";

export default function Called({
  beneficiaries,
  setBeneficiaries,
  currentRole,
}) {
  const [searchText, setSearchText] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [toast, setToast] = useState({ message: "", variant: "success" });
  const [attendLoadingId, setAttendLoadingId] = useState(null);
  const deleteTimerRef = useRef(null);
  const undoItemRef = useRef(null);
  const toastTimerRef = useRef(null);

  const calledBeneficiaries = useMemo(
    () =>
      beneficiaries.filter(
        (item) => item.category === "New Beneficiary" && item.called,
      ),
    [beneficiaries],
  );

  const filteredCallLog = useMemo(() => {
    const matcher = createSearchMatcher(searchText);
    return calledBeneficiaries.filter((item) => {
      if (!item.calledAt) return false;
      return matcher(item);
    });
  }, [calledBeneficiaries, searchText]);

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

  const handleAttend = async (beneficiary) => {
    setAttendLoadingId(beneficiary.id);
    try {
      const updatedItem = await updateBeneficiary(beneficiary.id, {
        category: "Past Beneficiary",
      });
      setBeneficiaries(
        beneficiaries.map((item) =>
          item.id === beneficiary.id ? updatedItem : item,
        ),
      );
      showToast(`${beneficiary.fullName} marked as attended.`);
    } catch (error) {
      showToast(
        error.message || "Unable to mark beneficiary as attended.",
        "error",
      );
    } finally {
      setAttendLoadingId(null);
    }
  };

  const handleDelete = (beneficiary) => {
    // only Admin receives this handler from parent
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

    showToast(
      `${deletedItem.fullName} deleted from call log.`,
      "success",
      "Undo",
      handleUndo,
      5000,
    );
  };

  const handleCancelDelete = () => setPendingDelete(null);

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

  const pageTitle = `Called beneficiaries (${filteredCallLog.length})`;

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Call log</p>
          <h1>{pageTitle}</h1>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="button-secondary"
            onClick={() =>
              generateCalledBeneficiariesPdf(
                "Agbana Foundation",
                filteredCallLog,
              )
            }
          >
            Generate PDF
          </button>
          <button
            type="button"
            className="button-primary"
            onClick={() =>
              printCalledBeneficiariesPdf("Agbana Foundation", filteredCallLog)
            }
          >
            Print PDF
          </button>
        </div>
      </div>

      <div className="list-panel">
        <div className="search-row">
          <input
            type="search"
            placeholder="Type 2+ letters to search by name or phone"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <BeneficiaryTable
          beneficiaries={filteredCallLog}
          onAttend={currentRole === "Admin" ? handleAttend : undefined}
          attendLoadingId={attendLoadingId}
          onDelete={currentRole === "Admin" ? handleDelete : undefined}
          attendLabel="Attended"
          showEmpowermentType
          showAttendedColumn={currentRole === "Admin"}
          showDateCalled
          noDataMessage="No called beneficiaries found."
        />
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete from call log"
        message={`Are you sure you want to delete ${pendingDelete?.fullName} from the call log? You can undo this for a short time after deleting.`}
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
