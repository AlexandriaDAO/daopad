import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * OrbitTable - Base table component with common functionality
 * Provides sorting, filtering, pagination, and custom rendering
 *
 * @param {Array} data - Array of data items to display
 * @param {Array} columns - Column configuration
 * @param {Function} renderRow - Custom row renderer function
 * @param {Function} onRowClick - Callback when row is clicked
 * @param {boolean} sortable - Enable sorting
 * @param {boolean} paginated - Enable pagination
 * @param {boolean} filterable - Enable filtering
 * @param {number} pageSize - Items per page
 * @param {string} emptyMessage - Message when no data
 * @param {string} className - Additional CSS classes
 * @param {Object} initialSort - Initial sort configuration
 */
export function OrbitTable({
  data = [],
  columns = [],
  renderRow,
  onRowClick,
  sortable = true,
  paginated = true,
  filterable = true,
  pageSize = 10,
  emptyMessage = "No data available",
  className = "",
  initialSort = { key: null, direction: 'asc' },
  stickyHeader = false,
  showRowNumbers = false,
  selectable = false,
  onSelectionChange,
  selectedRows = [],
}) {
  const [sortConfig, setSortConfig] = useState(initialSort);
  const [currentPage, setCurrentPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [localSelectedRows, setLocalSelectedRows] = useState(selectedRows);

  // Helper to get nested values from objects
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortable || !sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aVal = getNestedValue(a, sortConfig.key);
      const bVal = getNestedValue(b, sortConfig.key);

      // Handle null/undefined values
      if (aVal == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bVal == null) return sortConfig.direction === 'asc' ? -1 : 1;

      // Compare values
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, sortable]);

  // Filtering logic
  const filteredData = useMemo(() => {
    if (!filterable || !filter) return sortedData;

    const searchLower = filter.toLowerCase();
    return sortedData.filter(item =>
      columns.some(col => {
        if (col.searchable === false) return false;
        const value = getNestedValue(item, col.key);
        return String(value ?? '').toLowerCase().includes(searchLower);
      })
    );
  }, [sortedData, filter, filterable, columns]);

  // Pagination logic
  const paginatedData = useMemo(() => {
    if (!paginated) return filteredData;

    const start = currentPage * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize, paginated]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Handle sorting
  const handleSort = (columnKey) => {
    if (!sortable) return;

    setSortConfig(prev => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle selection
  const handleSelectAll = () => {
    if (!selectable) return;

    const allSelected = paginatedData.every(item =>
      localSelectedRows.some(selected => selected.id === item.id)
    );

    let newSelection;
    if (allSelected) {
      // Deselect all on current page
      newSelection = localSelectedRows.filter(selected =>
        !paginatedData.some(item => item.id === selected.id)
      );
    } else {
      // Select all on current page
      const currentPageIds = paginatedData.map(item => item.id);
      newSelection = [
        ...localSelectedRows.filter(selected =>
          !currentPageIds.includes(selected.id)
        ),
        ...paginatedData
      ];
    }

    setLocalSelectedRows(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSelectRow = (row) => {
    if (!selectable) return;

    const isSelected = localSelectedRows.some(selected => selected.id === row.id);
    let newSelection;

    if (isSelected) {
      newSelection = localSelectedRows.filter(selected => selected.id !== row.id);
    } else {
      newSelection = [...localSelectedRows, row];
    }

    setLocalSelectedRows(newSelection);
    onSelectionChange?.(newSelection);
  };

  // Sort indicator component
  const SortIndicator = ({ column }) => {
    if (!sortable) return null;

    const isActive = sortConfig.key === column.key;

    if (!isActive) {
      return <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }

    return sortConfig.direction === 'asc'
      ? <ChevronUp className="ml-1 h-3 w-3" />
      : <ChevronDown className="ml-1 h-3 w-3" />;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter input */}
      {filterable && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter..."
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setCurrentPage(0); // Reset to first page on filter
            }}
            className="max-w-sm"
          />
          {filter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter('')}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className={stickyHeader ? "overflow-auto max-h-96" : ""}>
        <Table>
          <TableHeader className={stickyHeader ? "sticky top-0 bg-background z-10" : ""}>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={paginatedData.length > 0 && paginatedData.every(item =>
                      localSelectedRows.some(selected => selected.id === item.id)
                    )}
                    onChange={handleSelectAll}
                    className="cursor-pointer"
                  />
                </TableHead>
              )}
              {showRowNumbers && (
                <TableHead className="w-12">#</TableHead>
              )}
              {columns.map(column => (
                <TableHead
                  key={column.key}
                  className={`${sortable && column.sortable !== false ? "cursor-pointer select-none" : ""} ${column.className || ''}`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable !== false && <SortIndicator column={column} />}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0) + (showRowNumbers ? 1 : 0)}
                  className="text-center py-8 text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, idx) => {
                const isSelected = localSelectedRows.some(selected => selected.id === item.id);
                const rowNumber = currentPage * pageSize + idx + 1;

                if (renderRow) {
                  // Custom row renderer
                  return renderRow(item, idx, {
                    isSelected,
                    onSelect: () => handleSelectRow(item),
                    rowNumber
                  });
                }

                // Default row renderer
                return (
                  <TableRow
                    key={item.id || idx}
                    className={`${onRowClick ? "cursor-pointer hover:bg-muted/50" : ""} ${isSelected ? "bg-muted/30" : ""}`}
                    onClick={() => onRowClick?.(item)}
                  >
                    {selectable && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(item)}
                          onClick={(e) => e.stopPropagation()}
                          className="cursor-pointer"
                        />
                      </TableCell>
                    )}
                    {showRowNumbers && (
                      <TableCell className="text-muted-foreground">
                        {rowNumber}
                      </TableCell>
                    )}
                    {columns.map(column => (
                      <TableCell key={column.key} className={column.cellClassName}>
                        {column.render
                          ? column.render(getNestedValue(item, column.key), item)
                          : getNestedValue(item, column.key)
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {currentPage * pageSize + 1} to{' '}
            {Math.min((currentPage + 1) * pageSize, filteredData.length)} of{' '}
            {filteredData.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages - 1)}
              disabled={currentPage === totalPages - 1}
            >
              Last
            </Button>
          </div>
        </div>
      )}

      {/* Selection summary */}
      {selectable && localSelectedRows.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {localSelectedRows.length} item{localSelectedRows.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}

export default OrbitTable;