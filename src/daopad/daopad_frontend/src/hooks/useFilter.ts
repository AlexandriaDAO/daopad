import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDebounce } from './useDebounce';

/**
 * Hook for managing filter state with debouncing support
 * @param {Object} initialFilters - Initial filter values
 * @param {number} debounceMs - Debounce delay in milliseconds (default: 300)
 */
export function useFilter(initialFilters = {}, debounceMs = 300) {
  const [filters, setFilters] = useState(initialFilters);
  const debouncedFilters = useDebounce(filters, debounceMs);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const setMultipleFilters = useCallback((updates) => {
    setFilters((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const clearFilter = useCallback((key) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some((key) => {
      const value = filters[key];
      return value !== undefined && value !== '' && value !== null &&
        (Array.isArray(value) ? value.length > 0 : true);
    });
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).filter((key) => {
      const value = filters[key];
      return value !== undefined && value !== '' && value !== null &&
        (Array.isArray(value) ? value.length > 0 : true);
    }).length;
  }, [filters]);

  return {
    filters,
    debouncedFilters,
    setFilter,
    setMultipleFilters,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
    activeFilterCount,
    reset: clearAllFilters,
  };
}

/**
 * Hook for managing list filters specific to Orbit Station queries
 */
export function useListFilters(config = {}) {
  const {
    initialSearch = '',
    initialStatuses = [],
    initialGroups = [],
    initialLabels = [],
    debounceMs = 300,
  } = config;

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statuses, setStatuses] = useState(initialStatuses);
  const [groups, setGroups] = useState(initialGroups);
  const [labels, setLabels] = useState(initialLabels);

  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  const toggleStatus = useCallback((status) => {
    setStatuses((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      }
      return [...prev, status];
    });
  }, []);

  const toggleGroup = useCallback((group) => {
    setGroups((prev) => {
      if (prev.includes(group)) {
        return prev.filter((g) => g !== group);
      }
      return [...prev, group];
    });
  }, []);

  const toggleLabel = useCallback((label) => {
    setLabels((prev) => {
      if (prev.includes(label)) {
        return prev.filter((l) => l !== label);
      }
      return [...prev, label];
    });
  }, []);

  const clearAll = useCallback(() => {
    setSearchTerm('');
    setStatuses([]);
    setGroups([]);
    setLabels([]);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm !== '' ||
      statuses.length > 0 ||
      groups.length > 0 ||
      labels.length > 0
    );
  }, [searchTerm, statuses, groups, labels]);

  const filterParams = useMemo(() => {
    const params = {};

    if (debouncedSearchTerm) {
      params.search_term = debouncedSearchTerm;
    }
    if (statuses.length > 0) {
      params.statuses = statuses;
    }
    if (groups.length > 0) {
      params.groups = groups;
    }
    if (labels.length > 0) {
      params.labels = labels;
    }

    return params;
  }, [debouncedSearchTerm, statuses, groups, labels]);

  return {
    // Individual filter states
    searchTerm,
    statuses,
    groups,
    labels,
    debouncedSearchTerm,

    // Actions
    setSearchTerm,
    setStatuses,
    setGroups,
    setLabels,
    toggleStatus,
    toggleGroup,
    toggleLabel,
    clearAll,

    // Computed
    hasActiveFilters,
    filterParams,
  };
}

/**
 * Hook for managing request-specific filters
 */
export function useRequestFilters(config = {}) {
  const baseFilters = useListFilters(config);
  const [operationTypes, setOperationTypes] = useState(config.initialOperationTypes || []);
  const [approvers, setApprovers] = useState(config.initialApprovers || []);
  const [createdFrom, setCreatedFrom] = useState(config.initialCreatedFrom || null);
  const [createdTo, setCreatedTo] = useState(config.initialCreatedTo || null);
  const [sortBy, setSortBy] = useState(config.initialSortBy || 'creation_time_desc');

  const toggleOperationType = useCallback((type) => {
    setOperationTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  }, []);

  const clearAll = useCallback(() => {
    baseFilters.clearAll();
    setOperationTypes([]);
    setApprovers([]);
    setCreatedFrom(null);
    setCreatedTo(null);
    setSortBy('creation_time_desc');
  }, [baseFilters]);

  const filterParams = useMemo(() => {
    const params = { ...baseFilters.filterParams };

    if (operationTypes.length > 0) {
      params.operation_types = operationTypes;
    }
    if (approvers.length > 0) {
      params.approvers = approvers;
    }
    if (createdFrom) {
      params.created_from_dt = createdFrom;
    }
    if (createdTo) {
      params.created_to_dt = createdTo;
    }
    if (sortBy) {
      params.sort_by = sortBy;
    }

    return params;
  }, [baseFilters.filterParams, operationTypes, approvers, createdFrom, createdTo, sortBy]);

  const hasActiveFilters = useMemo(() => {
    return (
      baseFilters.hasActiveFilters ||
      operationTypes.length > 0 ||
      approvers.length > 0 ||
      createdFrom !== null ||
      createdTo !== null ||
      sortBy !== 'creation_time_desc'
    );
  }, [baseFilters.hasActiveFilters, operationTypes, approvers, createdFrom, createdTo, sortBy]);

  return {
    ...baseFilters,
    operationTypes,
    approvers,
    createdFrom,
    createdTo,
    sortBy,

    setOperationTypes,
    setApprovers,
    setCreatedFrom,
    setCreatedTo,
    setSortBy,
    toggleOperationType,

    clearAll,
    filterParams,
    hasActiveFilters,
  };
}

export default useFilter;