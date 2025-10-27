import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';

// All 8 status codes from Orbit Station
const ALL_STATUSES = [
  { value: 'Created', label: 'Created', color: 'default' },
  { value: 'Scheduled', label: 'Scheduled', color: 'default' },
  { value: 'Processing', label: 'Processing', color: 'default' },
  { value: 'Approved', label: 'Approved', color: 'default' },
  { value: 'Completed', label: 'Completed', color: 'default' },
  { value: 'Rejected', label: 'Rejected', color: 'destructive' },
  { value: 'Cancelled', label: 'Cancelled', color: 'secondary' },
  { value: 'Failed', label: 'Failed', color: 'destructive' }
];

interface RequestStatusFilterProps {
  selectedStatuses: string[];
  onChange: (statuses: string[]) => void;
}

export default function RequestStatusFilter({ selectedStatuses, onChange }: RequestStatusFilterProps) {
  const handleToggle = (status: string) => {
    // If status already selected, remove it; otherwise add it
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];

    // Ensure at least one status is selected
    if (newStatuses.length > 0) {
      onChange(newStatuses);
    }
  };

  const handleSelectAll = () => {
    onChange(ALL_STATUSES.map(s => s.value));
  };

  const handleReset = () => {
    // Default to active statuses
    onChange(['Created', 'Approved', 'Processing', 'Scheduled']);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Status ({selectedStatuses.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-3">
          <div className="flex justify-between">
            <h4 className="font-medium text-sm">Filter by Status</h4>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                All
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {ALL_STATUSES.map(status => (
              <label key={status.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedStatuses.includes(status.value)}
                  onCheckedChange={() => handleToggle(status.value)}
                />
                <Badge variant={status.color as any} className="text-xs">
                  {status.label}
                </Badge>
              </label>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
