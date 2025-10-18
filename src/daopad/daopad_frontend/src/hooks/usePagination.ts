import { useState, useCallback, useMemo, useEffect } from 'react';

/**
 * Custom hook for managing pagination state and logic
 * @param {Object} config - Configuration object
 * @param {number} config.pageSize - Number of items per page (default: 25)
 * @param {number} config.initialPage - Initial page number (default: 0)
 * @returns {Object} Pagination state and controls
 */
export function usePagination(config = {}) {
  const { pageSize = 25, initialPage = 0 } = config;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / pageSize);
  }, [totalItems, pageSize]);

  const offset = useMemo(() => {
    return currentPage * pageSize;
  }, [currentPage, pageSize]);

  const hasNextPage = currentPage < totalPages - 1;
  const hasPreviousPage = currentPage > 0;

  const goToPage = useCallback((page) => {
    const validPage = Math.max(0, Math.min(page, totalPages - 1));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [hasPreviousPage]);

  const firstPage = useCallback(() => {
    setCurrentPage(0);
  }, []);

  const lastPage = useCallback(() => {
    setCurrentPage(totalPages - 1);
  }, [totalPages]);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setTotalItems(0);
  }, [initialPage]);

  // For display purposes
  const pageInfo = useMemo(() => {
    const start = offset + 1;
    const end = Math.min(offset + pageSize, totalItems);
    return {
      start,
      end,
      total: totalItems,
      currentPage: currentPage + 1, // 1-indexed for display
      totalPages,
      displayText: totalItems > 0
        ? `Showing ${start} to ${end} of ${totalItems}`
        : 'No items',
    };
  }, [offset, pageSize, totalItems, currentPage, totalPages]);

  // Bindings for pagination components
  const bindings = {
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    onPageChange: goToPage,
    onNext: nextPage,
    onPrevious: previousPage,
    onFirst: firstPage,
    onLast: lastPage,
  };

  return {
    // State
    currentPage,
    pageSize,
    offset,
    limit: pageSize,
    totalItems,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    pageInfo,

    // Actions
    setCurrentPage,
    setTotalItems,
    setTotal: setTotalItems, // Alias
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    reset,

    // Component bindings
    bindings,
  };
}

/**
 * Hook for managing pagination with URL state synchronization
 * Keeps pagination state in sync with URL query parameters
 */
export function useUrlPagination(config = {}) {
  const { pageSize = 25, pageParam = 'page' } = config;

  // Parse page from URL
  const getPageFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const page = parseInt(params.get(pageParam) || '1', 10);
    return Math.max(1, page) - 1; // Convert to 0-indexed
  }, [pageParam]);

  const [currentPage, setCurrentPageState] = useState(getPageFromUrl);
  const [totalItems, setTotalItems] = useState(0);

  // Update URL when page changes
  const setCurrentPage = useCallback((page) => {
    const validPage = typeof page === 'function' ? page(currentPage) : page;
    setCurrentPageState(validPage);

    // Update URL
    const params = new URLSearchParams(window.location.search);
    if (validPage === 0) {
      params.delete(pageParam);
    } else {
      params.set(pageParam, (validPage + 1).toString());
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, '', newUrl);
  }, [currentPage, pageParam]);

  // Listen for back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPageState(getPageFromUrl());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getPageFromUrl]);

  // Use base pagination hook with custom setCurrentPage
  const pagination = usePagination({
    pageSize,
    initialPage: currentPage
  });

  return {
    ...pagination,
    currentPage,
    setCurrentPage,
    setTotalItems,
  };
}

export default usePagination;