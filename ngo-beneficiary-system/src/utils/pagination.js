/**
 * Pagination utilities
 * Helps manage paginated data and state
 */

/**
 * Calculate pagination values
 * @param {number} totalItems - Total number of items
 * @param {number} itemsPerPage - Items to display per page
 * @param {number} currentPage - Current page number (1-indexed)
 * @returns {object} Pagination metadata
 */
export const calculatePagination = (
  totalItems,
  itemsPerPage,
  currentPage = 1,
) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const validPage = Math.max(1, Math.min(currentPage, totalPages || 1));

  return {
    totalItems,
    itemsPerPage,
    currentPage: validPage,
    totalPages,
    hasNextPage: validPage < totalPages,
    hasPreviousPage: validPage > 1,
    startIndex: (validPage - 1) * itemsPerPage,
    endIndex: Math.min(validPage * itemsPerPage, totalItems),
  };
};

/**
 * Get items for current page
 * @param {array} items - Array of items to paginate
 * @param {number} itemsPerPage - Items per page
 * @param {number} currentPage - Current page (1-indexed)
 * @returns {array} Items for the current page
 */
export const getPaginatedItems = (items, itemsPerPage, currentPage = 1) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const pagination = calculatePagination(
    items.length,
    itemsPerPage,
    currentPage,
  );
  return items.slice(pagination.startIndex, pagination.endIndex);
};

/**
 * Create pagination state object
 * @param {number} itemsPerPage - Items to show per page
 * @returns {object} Initial pagination state
 */
export const createPaginationState = (itemsPerPage = 20) => {
  return {
    currentPage: 1,
    itemsPerPage,
  };
};

/**
 * Handle page change
 * @param {number} newPage - New page number
 * @param {number} totalPages - Total number of pages
 * @returns {number} Valid page number
 */
export const handlePageChange = (newPage, totalPages) => {
  return Math.max(1, Math.min(newPage, Math.max(1, totalPages)));
};

/**
 * Generate page numbers for pagination UI
 * @param {number} currentPage - Current page
 * @param {number} totalPages - Total pages
 * @param {number} windowSize - Number of pages to show (e.g., 5)
 * @returns {array} Array of page numbers and ellipsis indicators
 */
export const generatePageNumbers = (
  currentPage,
  totalPages,
  windowSize = 5,
) => {
  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const halfWindow = Math.floor(windowSize / 2);
  let startPage = Math.max(1, currentPage - halfWindow);
  let endPage = Math.min(totalPages, currentPage + halfWindow);

  // Adjust if at boundaries
  if (startPage === 1) {
    endPage = Math.min(totalPages, startPage + windowSize - 1);
  } else if (endPage === totalPages) {
    startPage = Math.max(1, endPage - windowSize + 1);
  }

  const pages = [];

  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) {
      pages.push("...");
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push("...");
    }
    pages.push(totalPages);
  }

  return pages;
};

/**
 * Default items per page options
 */
export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

/**
 * Get default items per page
 */
export const DEFAULT_ITEMS_PER_PAGE = 20;
