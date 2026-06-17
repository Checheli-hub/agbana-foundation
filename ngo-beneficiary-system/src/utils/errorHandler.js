/**
 * Centralized error handling utility
 * Provides consistent error messages and logging
 */

class APIError extends Error {
  constructor(message, statusCode, originalError) {
    super(message);
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.name = "APIError";
  }
}

/**
 * Parse error response from API
 * @param {Response|Error} response - Fetch response or Error object
 * @returns {string} User-friendly error message
 */
export const parseErrorMessage = (error) => {
  if (!error) return "An unexpected error occurred.";

  // Handle fetch errors (network issues, etc.)
  if (error instanceof TypeError) {
    if (error.message.includes("Failed to fetch")) {
      return "Connection failed. Please check your internet connection.";
    }
    return "Network error. Please try again.";
  }

  // Handle custom API errors
  if (error instanceof APIError) {
    return error.message;
  }

  // Handle error objects with message
  if (error.message) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred. Please try again.";
};

/**
 * Retry logic for failed requests
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} delayMs - Delay between attempts in milliseconds
 * @returns {Promise} Result of the function
 */
export const retryAsync = async (fn, maxAttempts = 3, delayMs = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      if (
        error.statusCode === 400 || // Bad request
        error.statusCode === 401 || // Unauthorized
        error.statusCode === 403 || // Forbidden
        error.statusCode === 404 // Not found
      ) {
        throw error;
      }

      // Don't retry on final attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
};

/**
 * Handle fetch response and throw APIError if not ok
 * @param {Response} response - Fetch response object
 * @returns {Promise<any>} Parsed JSON response
 */
export const handleFetchResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = response.statusText || "Request failed";
    let errorData;

    try {
      errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Response was not JSON, use status text
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text")) {
        errorMessage = await response.text();
      }
    }

    const statusMessages = {
      400: "Bad request. Please check your input.",
      401: "Unauthorized. Please login again.",
      403: "Access denied.",
      404: "Resource not found.",
      423: "Account locked. Please try again later.",
      429: "Too many requests. Please wait before trying again.",
      500: "Server error. Please try again later.",
      502: "Bad gateway. Please try again later.",
      503: "Service unavailable. Please try again later.",
    };

    const defaultMessage =
      statusMessages[response.status] ||
      `Error: ${response.status} ${response.statusText}`;
    const finalMessage =
      errorMessage !== response.statusText ? errorMessage : defaultMessage;

    throw new APIError(finalMessage, response.status);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new APIError("Failed to parse server response", 500, error);
  }
};

/**
 * Log error for debugging (can be extended to send to error tracking service)
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 */
export const logError = (error, context = "") => {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    context,
    name: error.name || "Error",
    message: error.message || String(error),
    stack: error.stack,
  };

  console.error(`[${timestamp}] ${context}:`, errorLog);

  // TODO: Send to error tracking service (e.g., Sentry, LogRocket)
  // captureException(error, { tags: { context } });
};

export { APIError };
