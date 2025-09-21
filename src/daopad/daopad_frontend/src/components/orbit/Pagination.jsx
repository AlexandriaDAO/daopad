import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '../ui/button';

export default function Pagination({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onNext,
  onPrevious,
  onFirst,
  onLast,
}) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);

    let start = Math.max(0, currentPage - halfVisible);
    let end = Math.min(totalPages - 1, currentPage + halfVisible);

    // Adjust if we're near the beginning or end
    if (currentPage < halfVisible) {
      end = Math.min(totalPages - 1, maxVisible - 1);
    }
    if (currentPage >= totalPages - halfVisible - 1) {
      start = Math.max(0, totalPages - maxVisible);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center gap-1">
      {/* First Page */}
      <Button
        variant="outline"
        size="icon"
        onClick={onFirst}
        disabled={!hasPreviousPage}
        className="h-8 w-8"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>

      {/* Previous Page */}
      <Button
        variant="outline"
        size="icon"
        onClick={onPrevious}
        disabled={!hasPreviousPage}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers[0] > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(0)}
              className="h-8 w-8 p-0"
            >
              1
            </Button>
            {pageNumbers[0] > 1 && (
              <span className="px-1 text-muted-foreground">...</span>
            )}
          </>
        )}

        {pageNumbers.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page)}
            className="h-8 w-8 p-0"
          >
            {page + 1}
          </Button>
        ))}

        {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 2 && (
              <span className="px-1 text-muted-foreground">...</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages - 1)}
              className="h-8 w-8 p-0"
            >
              {totalPages}
            </Button>
          </>
        )}
      </div>

      {/* Next Page */}
      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={!hasNextPage}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Last Page */}
      <Button
        variant="outline"
        size="icon"
        onClick={onLast}
        disabled={!hasNextPage}
        className="h-8 w-8"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}