import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Separator } from '../ui/separator';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

const RequestFiltersCompact = ({ filters, onFilterChange }) => {
  // Local state for filter changes (not applied immediately)
  const [localFilters, setLocalFilters] = useState(filters);
  const [isOpen, setIsOpen] = useState(false);

  // Sync local filters when props change (e.g., when filters are cleared externally)
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const statusOptions = [
    { value: 'Created', label: 'Pending', color: 'bg-yellow-500' },
    { value: 'Approved', label: 'Approved', color: 'bg-green-500' },
    { value: 'Rejected', label: 'Rejected', color: 'bg-red-500' },
    { value: 'Scheduled', label: 'Scheduled', color: 'bg-blue-500' },
    { value: 'Processing', label: 'Processing', color: 'bg-orange-500' },
    { value: 'Completed', label: 'Completed', color: 'bg-gray-500' },
    { value: 'Failed', label: 'Failed', color: 'bg-red-600' },
  ];

  const sortOptions = [
    { value: { field: 'CreatedAt', direction: 'Desc' }, label: 'Newest First' },
    { value: { field: 'CreatedAt', direction: 'Asc' }, label: 'Oldest First' },
    { value: { field: 'ExpirationDt', direction: 'Asc' }, label: 'Expiring Soon' },
    { value: { field: 'ExpirationDt', direction: 'Desc' }, label: 'Expiring Later' },
  ];

  const handleStatusChange = (status, checked) => {
    const newStatuses = checked
      ? [...localFilters.statuses, status]
      : localFilters.statuses.filter(s => s !== status);

    setLocalFilters({ ...localFilters, statuses: newStatuses });
  };

  const handleSortChange = (sortValue) => {
    setLocalFilters({ ...localFilters, sort_by: sortValue });
  };

  const handleDateChange = (field, date) => {
    setLocalFilters({ ...localFilters, [field]: date });
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters = {
      statuses: ['Created', 'Approved', 'Processing', 'Scheduled'],
      created_from: null,
      created_to: null,
      expiration_from: null,
      expiration_to: null,
      sort_by: { field: 'ExpirationDt', direction: 'Asc' },
      only_approvable: false,
    };
    setLocalFilters({ ...localFilters, ...resetFilters });
  };

  const handleCancel = () => {
    setLocalFilters(filters); // Reset to current applied filters
    setIsOpen(false);
  };

  // Count active filters for badge
  const activeFilterCount = () => {
    let count = 0;
    // Count non-default statuses
    const defaultStatuses = ['Created', 'Approved', 'Processing', 'Scheduled'];
    const statusDiff = localFilters.statuses.filter(s => !defaultStatuses.includes(s)).length +
                      defaultStatuses.filter(s => !localFilters.statuses.includes(s)).length;
    if (statusDiff > 0) count += 1;

    // Count date filters
    if (localFilters.created_from || localFilters.created_to) count += 1;
    if (localFilters.expiration_from || localFilters.expiration_to) count += 1;

    // Count only_approvable
    if (localFilters.only_approvable) count += 1;

    // Count non-default sort
    const defaultSort = JSON.stringify({ field: 'ExpirationDt', direction: 'Asc' });
    if (JSON.stringify(localFilters.sort_by) !== defaultSort) count += 1;

    return count;
  };

  const filterContent = (
    <div className="space-y-4">
      {/* Status Filter */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Status</Label>
        <div className="grid grid-cols-2 gap-2">
          {statusOptions.map(option => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${option.value}`}
                checked={localFilters.statuses.includes(option.value)}
                onCheckedChange={(checked) => handleStatusChange(option.value, checked)}
              />
              <label
                htmlFor={`status-${option.value}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1 cursor-pointer"
              >
                <span className={`w-2 h-2 rounded-full ${option.color}`} />
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Sort Options */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Sort By</Label>
        <RadioGroup
          value={JSON.stringify(localFilters.sort_by)}
          onValueChange={(value) => handleSortChange(JSON.parse(value))}
          className="grid grid-cols-2 gap-2"
        >
          {sortOptions.map(option => (
            <div key={JSON.stringify(option.value)} className="flex items-center space-x-2">
              <RadioGroupItem
                value={JSON.stringify(option.value)}
                id={`sort-${option.label}`}
              />
              <label
                htmlFor={`sort-${option.label}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {option.label}
              </label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      {/* Date Filters */}
      <div className="space-y-3">
        <Label className="text-sm font-medium block">Date Range</Label>

        <div>
          <Label className="text-xs text-muted-foreground mb-1">Creation Date</Label>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal",
                    !localFilters.created_from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {localFilters.created_from ? format(localFilters.created_from, "MM/dd/yy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.created_from}
                  onSelect={(date) => handleDateChange('created_from', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal",
                    !localFilters.created_to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {localFilters.created_to ? format(localFilters.created_to, "MM/dd/yy") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.created_to}
                  onSelect={(date) => handleDateChange('created_to', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1">Expiration Date</Label>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal",
                    !localFilters.expiration_from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {localFilters.expiration_from ? format(localFilters.expiration_from, "MM/dd/yy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.expiration_from}
                  onSelect={(date) => handleDateChange('expiration_from', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal",
                    !localFilters.expiration_to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1 h-3 w-3" />
                  {localFilters.expiration_to ? format(localFilters.expiration_to, "MM/dd/yy") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.expiration_to}
                  onSelect={(date) => handleDateChange('expiration_to', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <Separator />

      {/* Only Approvable */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="only-approvable"
          checked={localFilters.only_approvable}
          onCheckedChange={(checked) => setLocalFilters({ ...localFilters, only_approvable: checked })}
        />
        <label
          htmlFor="only-approvable"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          Only show requests I can approve
        </label>
      </div>
    </div>
  );

  const activeCount = activeFilterCount();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Requests</SheetTitle>
          <SheetDescription>
            Customize which requests are displayed. Changes will be applied when you click "Apply Filters".
          </SheetDescription>
        </SheetHeader>

        <div className="py-6">
          {filterContent}
        </div>

        <SheetFooter className="flex gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleReset} size="sm">
            Reset
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={handleCancel} size="sm">
            Cancel
          </Button>
          <Button onClick={handleApplyFilters} size="sm">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default RequestFiltersCompact;