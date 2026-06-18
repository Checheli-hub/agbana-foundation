import { useEffect, useMemo, useRef, useState } from "react";
import BeneficiaryForm from "../components/BeneficiaryForm.jsx";
import BeneficiaryTable from "../components/BeneficiaryTable.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Toast from "../components/Toast.jsx";
import { createSearchMatcher } from "../utils/search.js";
import {
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  importBeneficiariesFromFile,
  fetchAllBeneficiaries,
} from "../services/beneficiaryService.js";
import { loadFromStorage, saveToStorage } from "../utils/storage.js";

export default function Beneficiaries({
  beneficiaries,
  setBeneficiaries,
  currentRole,
}) {
  const [searchText, setSearchText] = useState("");
  const [editingBeneficiary, setEditingBeneficiary] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [toast, setToast] = useState({ message: "", variant: "success" });
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [callLoadingId, setCallLoadingId] = useState(null);
  const fileInputRef = useRef(null);
  const deleteTimerRef = useRef(null);
  const undoItemRef = useRef(null);
  const toastTimerRef = useRef(null);

  const newBeneficiaries = useMemo(
    () =>
      beneficiaries.filter(
        (item) => item.category === "New Beneficiary" && !item.called,
      ),
    [beneficiaries],
  );

  const totalNew = useMemo(
    () =>
      beneficiaries.filter((item) => item.category === "New Beneficiary")
        .length,
    [beneficiaries],
  );

  const pastBeneficiaries = useMemo(
    () => beneficiaries.filter((item) => item.category === "Past Beneficiary"),
    [beneficiaries],
  );

  const filteredNew = useMemo(() => {
    const matcher = createSearchMatcher(searchText);
    return newBeneficiaries.filter(matcher);
  }, [newBeneficiaries, searchText]);

  const summary = {
    total: beneficiaries.length,
    newCount: totalNew,
    pastCount: pastBeneficiaries.length,
    calledCount: beneficiaries.filter(
      (item) => item.category === "New Beneficiary" && item.called,
    ).length,
  };

  const showToast = (
    payload,
    variant = "success",
    actionLabel,
    onAction,
    duration = 2800,
  ) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    const toastData =
      typeof payload === "string"
        ? { message: payload, variant, actionLabel, onAction }
        : { ...payload };

    setToast(toastData);

    if (duration > 0) {
      toastTimerRef.current = window.setTimeout(() => {
        setToast({ message: "", variant: "success" });
        toastTimerRef.current = null;
      }, duration);
    }
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

      // Try to persist to backend when possible
      try {
        const created = await createBeneficiary(restoredItem);
        // Replace the temporary/restored item with backend-created item
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

  const handleImportFile = async (file) => {
    if (!file) return;
    setIsImporting(true);

    try {
      const importedItems = await importBeneficiariesFromFile(file);
      setBeneficiaries((items) => [...importedItems, ...items]);
      showToast("Past beneficiaries imported successfully.");
    } catch (error) {
      showToast(error.message || "Unable to import beneficiaries.", "error");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async (payload) => {
    setIsSaving(true);
    try {
      if (editingBeneficiary) {
        const updatedItem = await updateBeneficiary(editingBeneficiary.id, {
          ...payload,
        });
        setBeneficiaries(
          beneficiaries.map((item) =>
            item.id === editingBeneficiary.id ? updatedItem : item,
          ),
        );
        showToast("Beneficiary updated successfully.");
      } else {
        const newItem = await createBeneficiary({
          ...payload,
          called: false,
          calledAt: "",
          empowermentType: payload.empowermentType || "",
        });

        const repeatCount = payload.previousMatchesCount || 0;
        if (repeatCount > 0) {
          // Mark the created record with repeat indicator
          try {
            const updated = await updateBeneficiary(newItem.id, {
              ...newItem,
              previouslyAssisted: true,
              repeatCount,
            });
            setBeneficiaries([updated, ...beneficiaries]);
          } catch {
            // If update fails, still add the created item but attach flags locally
            newItem.previouslyAssisted = true;
            newItem.repeatCount = repeatCount;
            setBeneficiaries([newItem, ...beneficiaries]);
          }

          showToast(
            `Beneficiary added. This person has previously received assistance (${repeatCount} prior record${
              repeatCount > 1 ? "s" : ""
            }).`,
            "warning",
            undefined,
            undefined,
            0,
          );
        } else {
          setBeneficiaries([newItem, ...beneficiaries]);
          showToast("Beneficiary added successfully.");
        }
      }
    } catch (error) {
      showToast(error.message || "Unable to save beneficiary.", "error");
    } finally {
      setIsSaving(false);
      setIsFormOpen(false);
      setEditingBeneficiary(null);
    }
  };

  const handleEdit = (beneficiary) => {
    setEditingBeneficiary(beneficiary);
    setIsFormOpen(true);
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

    showToast(
      `${deletedItem.fullName} deleted.`,
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

  const handleCall = async (beneficiary) => {
    setCallLoadingId(beneficiary.id);
    try {
      const updatedItem = await updateBeneficiary(beneficiary.id, {
        called: true,
        calledAt: new Date().toISOString(),
      });
      setBeneficiaries(
        beneficiaries.map((item) =>
          item.id === beneficiary.id ? updatedItem : item,
        ),
      );
      showToast(`${beneficiary.fullName} marked as called.`);
    } catch (error) {
      showToast(
        error.message || "Unable to mark beneficiary as called.",
        "error",
      );
    } finally {
      setCallLoadingId(null);
    }
  };

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Beneficiary management</p>
          <h1>Manage beneficiaries</h1>
        </div>
        <div className="page-actions">
          {currentRole === "Admin" ? (
            <>
              <div>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={handleImportClick}
                  disabled={isImporting}
                >
                  {isImporting
                    ? "Importing..."
                    : "Import past beneficiaries (CSV)"}
                </button>
                <p className="import-help">
                  Upload a CSV file with columns like Full Name, Phone Number,
                  and Empowerment Type.
                </p>
              </div>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setIsFormOpen(true)}
              >
                Add beneficiary
              </button>
            </>
          ) : (
            <div className="role-note">
              You are signed in as a user. Add, edit, and delete actions are
              reserved for Admin.
            </div>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={(event) => handleImportFile(event.target.files?.[0])}
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          opacity: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      />

      <div className="list-panel">
        <div className="summary-pill-row">
          <span>Total: {summary.total}</span>
          <span>New: {summary.newCount}</span>
          <span>Past: {summary.pastCount}</span>
          <span>Called: {summary.calledCount}</span>
        </div>

        <div className="search-row">
          <input
            type="search"
            placeholder="Type 2+ letters to search by name or phone"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Pending new beneficiaries</h2>
              <p>
                These beneficiaries are waiting to be attended. After marking
                them attended, they will move to the Past Beneficiaries page.
              </p>
            </div>
            <span className="section-count">{filteredNew.length}</span>
          </div>
          <BeneficiaryTable
            beneficiaries={filteredNew}
            onEdit={currentRole === "Admin" ? handleEdit : undefined}
            onDelete={currentRole === "Admin" ? handleDelete : undefined}
            onCall={currentRole === "Admin" ? handleCall : undefined}
            callLoadingId={callLoadingId}
            noDataMessage={
              searchText
                ? "No matching new beneficiaries found."
                : "No new beneficiaries yet."
            }
            showEmpowermentType
          />
        </div>
      </div>

      {isFormOpen && (
        <div className="modal-panel">
          <div className="modal-card">
            <h2>
              {editingBeneficiary ? "Edit beneficiary" : "Add beneficiary"}
            </h2>
            {editingBeneficiary?.previouslyAssisted && (
              <div style={{ marginBottom: "0.5rem" }}>
                <span className="repeat-badge">
                  Previously Assisted
                  {editingBeneficiary.repeatCount
                    ? ` (${editingBeneficiary.repeatCount})`
                    : ""}
                </span>
              </div>
            )}
            <BeneficiaryForm
              key={editingBeneficiary?.id || "new-beneficiary"}
              initialData={editingBeneficiary}
              submitLabel={
                isSaving
                  ? editingBeneficiary
                    ? "Saving..."
                    : "Adding..."
                  : editingBeneficiary
                    ? "Save changes"
                    : "Add beneficiary"
              }
              isSaving={isSaving}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingBeneficiary(null);
              }}
              onSubmit={handleSave}
              existingBeneficiaries={beneficiaries}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete beneficiary"
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
