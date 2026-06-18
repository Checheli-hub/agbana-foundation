import { loadFromStorage, saveToStorage } from "../utils/storage.js";
import { exportToCsv, importCsvFile } from "../utils/csv.js";
import {
  handleFetchResponse,
  parseErrorMessage,
  logError,
  retryAsync,
} from "../utils/errorHandler.js";

const STORAGE_KEY = "ngo-beneficiaries";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const hasBackend = () => Boolean(API_BASE_URL);

async function requestBackend(path, options) {
  try {
    return await retryAsync(
      async () => {
        const response = await fetch(`${API_BASE_URL}${path}`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          ...options,
        });

        return await handleFetchResponse(response);
      },
      2,
      500,
    ); // 2 retries with 500ms delay for GET requests, 1 retry for POST/PUT/DELETE
  } catch (error) {
    logError(error, `API Request: ${path}`);
    const message = parseErrorMessage(error);
    const err = new Error(message);
    err.originalError = error;
    throw err;
  }
}

function localGetAllBeneficiaries() {
  return loadFromStorage(STORAGE_KEY, []);
}

function localSaveAllBeneficiaries(items) {
  saveToStorage(STORAGE_KEY, items);
}

/**
 * Fetch beneficiaries with pagination support
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {object} Paginated beneficiaries and metadata
 */
export async function fetchBeneficiariesPaginated(page = 1, limit = 20) {
  if (!hasBackend()) {
    const allItems = localGetAllBeneficiaries();
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return {
      beneficiaries: allItems.slice(startIndex, endIndex),
      pagination: {
        page,
        limit,
        total: allItems.length,
        totalPages: Math.ceil(allItems.length / limit),
      },
    };
  }

  return requestBackend(`/beneficiaries?page=${page}&limit=${limit}`);
}

export async function fetchAllBeneficiaries() {
  if (!hasBackend()) {
    return localGetAllBeneficiaries();
  }

  // Backend paginates responses (default limit 20, max 100). Fetch all pages
  const pageSize = 100;
  const first = await requestBackend(`/beneficiaries?page=1&limit=${pageSize}`);

  if (first && first.beneficiaries && Array.isArray(first.beneficiaries)) {
    let all = [...first.beneficiaries];
    const totalPages = first.pagination?.totalPages || 1;

    if (totalPages > 1) {
      const requests = [];
      for (let p = 2; p <= totalPages; p += 1) {
        requests.push(
          requestBackend(`/beneficiaries?page=${p}&limit=${pageSize}`),
        );
      }

      const results = await Promise.all(requests);
      for (const res of results) {
        if (res && res.beneficiaries && Array.isArray(res.beneficiaries)) {
          all = all.concat(res.beneficiaries);
        } else if (Array.isArray(res)) {
          all = all.concat(res);
        }
      }
    }

    return all;
  }

  // Fallback: if response is already an array, return it
  if (Array.isArray(first)) return first;

  return [];
}

export async function createBeneficiary(item) {
  if (!hasBackend()) {
    const current = localGetAllBeneficiaries();
    const newItem = {
      ...item,
      id: crypto.randomUUID(),
    };
    localSaveAllBeneficiaries([newItem, ...current]);
    return newItem;
  }

  return requestBackend("/beneficiaries", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export async function updateBeneficiary(id, updates) {
  if (!hasBackend()) {
    const current = localGetAllBeneficiaries();
    const updated = current.map((item) =>
      item.id === id ? { ...item, ...updates } : item,
    );
    localSaveAllBeneficiaries(updated);
    return updated.find((item) => item.id === id);
  }

  return requestBackend(`/beneficiaries/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteBeneficiary(id) {
  if (!hasBackend()) {
    const current = localGetAllBeneficiaries();
    const updated = current.filter((item) => item.id !== id);
    localSaveAllBeneficiaries(updated);
    return { id };
  }

  return requestBackend(`/beneficiaries/${id}`, {
    method: "DELETE",
  });
}

export function exportBeneficiariesCsv(beneficiaries) {
  const blob = exportToCsv(beneficiaries);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "beneficiaries-export.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function importBeneficiariesFromFile(file) {
  const imported = (await importCsvFile(file))
    .map((item) => ({
      ...item,
      category: "Past Beneficiary",
    }))
    .filter(Boolean);

  if (!imported.length) {
    throw new Error(
      "No valid beneficiary rows found. Make sure your file has columns like Full Name and Phone Number.",
    );
  }

  if (!hasBackend()) {
    const existing = localGetAllBeneficiaries();
    const merged = [...existing, ...imported];
    localSaveAllBeneficiaries(merged);
    return imported;
  }

  return requestBackend("/beneficiaries/import", {
    method: "POST",
    body: JSON.stringify(imported),
  });
}

/**
 * Batch delete beneficiaries
 * @param {array} ids - Array of beneficiary IDs to delete
 * @returns {object} Deletion result
 */
export async function batchDeleteBeneficiaries(ids) {
  if (!hasBackend()) {
    const current = localGetAllBeneficiaries();
    const updated = current.filter((item) => !ids.includes(item.id));
    localSaveAllBeneficiaries(updated);
    return { deletedCount: ids.length };
  }

  return requestBackend("/beneficiaries/batch/delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

/**
 * Batch update status for beneficiaries
 * @param {array} ids - Array of beneficiary IDs
 * @param {string} status - New status (Active, Inactive, Closed)
 * @returns {object} Update result
 */
export async function batchUpdateBeneficiaryStatus(ids, status) {
  if (!hasBackend()) {
    const current = localGetAllBeneficiaries();
    const updated = current.map((item) =>
      ids.includes(item.id) ? { ...item, status } : item,
    );
    localSaveAllBeneficiaries(updated);
    return { modifiedCount: ids.length };
  }

  return requestBackend("/beneficiaries/batch/status", {
    method: "POST",
    body: JSON.stringify({ ids, status }),
  });
}

/**
 * Search beneficiaries with filters
 * @param {string} query - Search query
 * @param {string} status - Filter by status
 * @param {string} category - Filter by category
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {object} Filtered beneficiaries and pagination
 */
export async function searchBeneficiaries(
  query = "",
  status = "",
  category = "",
  page = 1,
  limit = 20,
) {
  if (!hasBackend()) {
    let results = localGetAllBeneficiaries();

    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        (item) =>
          item.fullName.toLowerCase().includes(lowerQuery) ||
          item.phone.includes(lowerQuery),
      );
    }

    if (status) {
      results = results.filter((item) => item.status === status);
    }

    if (category) {
      results = results.filter((item) => item.category === category);
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, limit);
    const skip = (pageNum - 1) * limitNum;

    return {
      beneficiaries: results.slice(skip, skip + limitNum),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: results.length,
        totalPages: Math.ceil(results.length / limitNum),
      },
    };
  }

  const params = new URLSearchParams();
  if (query) params.append("query", query);
  if (status) params.append("status", status);
  if (category) params.append("category", category);
  params.append("page", page);
  params.append("limit", limit);

  return requestBackend(`/beneficiaries/search/query?${params}`);
}
