/**
 * Input validation utilities
 * Provides consistent validation patterns across the application
 */

const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[-+\d\s()]{7,}$/,
  name: /^[a-zA-Z\s\-']{2,100}$/,
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  return PATTERNS.email.test(email.toLowerCase());
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 7; // At least 7 digits
};

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean}
 */
export const isValidUsername = (username) => {
  if (!username || typeof username !== "string") return false;
  return PATTERNS.username.test(username) && username.length >= 3;
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with details
 */
export const validatePassword = (password) => {
  const result = {
    valid: false,
    errors: [],
  };

  if (!password) {
    result.errors.push("Password is required.");
    return result;
  }

  if (password.length < 8) {
    result.errors.push("Password must be at least 8 characters long.");
  }

  if (!/[a-z]/.test(password)) {
    result.errors.push("Password must contain lowercase letters.");
  }

  if (!/[A-Z]/.test(password)) {
    result.errors.push("Password must contain uppercase letters.");
  }

  if (!/\d/.test(password)) {
    result.errors.push("Password must contain numbers.");
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    result.errors.push("Password must contain special characters.");
  }

  result.valid = result.errors.length === 0;
  return result;
};

/**
 * Validate name format
 * @param {string} name - Name to validate
 * @returns {boolean}
 */
export const isValidName = (name) => {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
};

/**
 * Sanitize text input (prevent XSS)
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export const sanitizeInput = (text) => {
  if (!text || typeof text !== "string") return "";
  return text
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets
    .slice(0, 1000); // Limit length
};

/**
 * Normalize phone number (remove formatting)
 * @param {string} phone - Phone number to normalize
 * @returns {string} Normalized phone number (digits only)
 */
export const normalizePhone = (phone) => {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
};

/**
 * Validate form object against schema
 * @param {object} data - Data to validate
 * @param {object} schema - Validation schema (field: validator function)
 * @returns {object} Validation result with errors
 */
export const validateFormData = (data, schema) => {
  const errors = {};

  Object.entries(schema).forEach(([field, validator]) => {
    const error = validator(data[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Common field validators for use in validateFormData
 */
export const fieldValidators = {
  requiredString: (value, label = "This field") =>
    !value || !String(value).trim() ? `${label} is required.` : null,

  email: (value) =>
    !value
      ? "Email is required."
      : !isValidEmail(value)
        ? "Enter a valid email address."
        : null,

  phone: (value) =>
    !value
      ? "Phone number is required."
      : !isValidPhone(value)
        ? "Enter a valid phone number."
        : null,

  username: (value) =>
    !value
      ? "Username is required."
      : !isValidUsername(value)
        ? "Username must be 3-20 characters and contain only letters, numbers, and underscores."
        : null,

  password: (value) => {
    if (!value) return "Password is required.";
    const validation = validatePassword(value);
    return validation.valid ? null : validation.errors[0];
  },

  name: (value) =>
    !value
      ? "Name is required."
      : !isValidName(value)
        ? "Name must be 2-100 characters."
        : null,

  minLength: (minLen) => (value) =>
    !value || String(value).length < minLen
      ? `This field must be at least ${minLen} characters.`
      : null,

  maxLength: (maxLen) => (value) =>
    value && String(value).length > maxLen
      ? `This field must not exceed ${maxLen} characters.`
      : null,

  match:
    (otherValue, label = "values") =>
    (value) =>
      value !== otherValue ? `${label} do not match.` : null,
};

/**
 * Check if value is empty
 * @param {any} value - Value to check
 * @returns {boolean}
 */
export const isEmpty = (value) => {
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  return !value;
};
