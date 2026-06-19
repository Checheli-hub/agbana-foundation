import { useMemo, useState } from "react";
import { formatDateKey } from "../utils/storage.js";
import {
  isValidName,
  isValidPhone,
  normalizePhone,
} from "../utils/validators.js";

const getInitialFormData = (initialData) => ({
  fullName: initialData?.fullName || "",
  phone: initialData?.phone || "",
  passport: initialData?.passport || "",
  passportFile: null,
  category: initialData?.category || "New Beneficiary",
  dateAdded: initialData?.dateAdded || formatDateKey(new Date()),
  empowermentType: initialData?.empowermentType || "",
});

export default function BeneficiaryForm({
  initialData,
  onCancel,
  onSubmit,
  submitLabel,
  existingBeneficiaries = [],
  isSaving = false,
}) {
  const [formData, setFormData] = useState(() =>
    getInitialFormData(initialData),
  );
  const [errors, setErrors] = useState({});

  const isValid = useMemo(() => {
    const requiresPassport = formData.category === "New Beneficiary";
    return (
      formData.fullName.trim() &&
      isValidPhone(formData.phone) &&
      (!requiresPassport || formData.passport || formData.passportFile) &&
      formData.dateAdded &&
      formData.empowermentType
    );
  }, [formData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    let normalizedValue = value;

    if (name === "phone") {
      normalizedValue = normalizePhone(value);
    }

    setFormData((prev) => ({ ...prev, [name]: normalizedValue }));
  };

  const handlePassportUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        passport: "File size must be less than 5MB.",
      }));
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        passport: "Please upload a valid image file.",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        passport: reader.result,
        passportFile: file,
      }));
      setErrors((prev) => {
        const { passport, ...rest } = prev;
        void passport;
        return rest;
      });
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const nextErrors = {};
    const requiresPassport = formData.category === "New Beneficiary";

    if (!formData.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    } else if (!isValidName(formData.fullName)) {
      nextErrors.fullName = "Full name must be 2-100 characters.";
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    } else if (!isValidPhone(formData.phone)) {
      nextErrors.phone = "Enter a valid phone number (at least 7 digits).";
    }

    if (requiresPassport && !formData.passport && !formData.passportFile) {
      nextErrors.passport = "Passport photo is required for new beneficiaries.";
    }

    if (!formData.dateAdded) {
      nextErrors.dateAdded = "Date added is required.";
    }

    if (!formData.empowermentType) {
      nextErrors.empowermentType = "Empowerment type is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const isEditingExistingNewBeneficiary = Boolean(
    initialData && initialData.category === "New Beneficiary",
  );

  const normalizeText = (value) =>
    (value || "")
      .trim()
      .replace(/\s+/g, " ")
      .normalize("NFD")
      .replace(/--/g, "")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9 ]/gi, "")
      .toLowerCase();

  const previousMatchesCount = useMemo(() => {
    const nameNorm = normalizeText(formData.fullName);
    const phoneNorm = normalizePhone(formData.phone || "");
    if (!nameNorm || !phoneNorm) return 0;

    const currentId = initialData?.id;
    return (existingBeneficiaries || []).reduce((count, beneficiary) => {
      if (currentId && beneficiary.id === currentId) return count;
      if (beneficiary.category !== "Past Beneficiary") return count;

      const bName = normalizeText(beneficiary.fullName);
      const bPhone = normalizePhone(beneficiary.phone || "");
      return bName === nameNorm && bPhone === phoneNorm ? count + 1 : count;
    }, 0);
  }, [formData.fullName, formData.phone, existingBeneficiaries, initialData]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    onSubmit({
      fullName: formData.fullName.trim(),
      phone: normalizePhone(formData.phone),
      passport: formData.passport,
      passportFile: formData.passportFile,
      category: formData.category,
      dateAdded: formData.dateAdded,
      empowermentType: formData.empowermentType,
      previousMatchesCount,
    });
  };

  return (
    <form className="beneficiary-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          Full Name
          <input
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Enter full name"
          />
          {errors.fullName && (
            <span className="field-error">{errors.fullName}</span>
          )}
        </label>

        <label>
          Phone Number
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter phone number"
          />
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </label>

        <label>
          Category
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            <option>New Beneficiary</option>
            <option>Past Beneficiary</option>
          </select>
        </label>

        <label>
          Empowerment Type
          <select
            name="empowermentType"
            value={formData.empowermentType}
            onChange={handleChange}
            disabled={isEditingExistingNewBeneficiary}
          >
            <option value="">Select type</option>
            <option>Food</option>
            <option>Skills Acquisition</option>
            <option>Cash Support</option>
            <option>Training</option>
            <option>Other</option>
          </select>
          <span className="field-note">
            {isEditingExistingNewBeneficiary
              ? "Empowerment type cannot be changed for an existing new beneficiary."
              : formData.category === "Past Beneficiary"
                ? "Select the type of empowerment given."
                : "Optional now; this will be recorded if the beneficiary becomes past."}
          </span>
          {errors.empowermentType && (
            <span className="field-error">{errors.empowermentType}</span>
          )}
        </label>

        <label>
          Date Added
          <input
            type="date"
            name="dateAdded"
            value={formData.dateAdded}
            onChange={handleChange}
          />
          {errors.dateAdded && (
            <span className="field-error">{errors.dateAdded}</span>
          )}
        </label>
      </div>

      <label className="passport-upload">
        Passport Photo
        <input type="file" accept="image/*" onChange={handlePassportUpload} />
        <span className="field-note">
          {formData.category === "New Beneficiary"
            ? "Required for new applicants. Max file size: 5MB."
            : "Optional for past beneficiary records. Max file size: 5MB."}
        </span>
        {errors.passport && (
          <span className="field-error">{errors.passport}</span>
        )}
      </label>

      <div className="form-preview">
        <p>Passport preview</p>
        <div className="preview-image">
          {formData.passport ? (
            <img src={formData.passport} alt="Passport preview" />
          ) : (
            <span>No image uploaded yet.</span>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="button-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="button-primary"
          disabled={!isValid || isSaving}
        >
          {submitLabel}
        </button>
      </div>
      {previousMatchesCount > 0 && (
        <div className="duplicate-warning" role="status">
          <strong>⚠️ WARNING:</strong> This beneficiary already exists in the
          system and has previously received assistance. ({previousMatchesCount}{" "}
          previous record
          {previousMatchesCount > 1 ? "s" : ""})
        </div>
      )}
    </form>
  );
}
