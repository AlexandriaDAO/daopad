import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../ui/card';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

const RequestFilters = ({ filters, onFilterChange }) => {
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
    { value: { CreatedAt: 'Desc' }, label: 'Newest First' },
    { value: { CreatedAt: 'Asc' }, label: 'Oldest First' },
    { value: { ExpirationDt: 'Asc' }, label: 'Expiring Soon' },
    { value: { ExpirationDt: 'Desc' }, label: 'Expiring Later' },
  ];

  const handleStatusChange = (status, checked) => {
    const newStatuses = checked
      ? [...filters.statuses, status]
      : filters.statuses.filter(s => s !== status);

    onFilterChange({ statuses: newStatuses });
  };

  const handleSortChange = (sortValue) => {
    onFilterChange({ sort_by: sortValue });
  };

  const handleDateChange = (field, date) => {
    onFilterChange({ [field]: date });
  };

  const clearFilters = () => {
    onFilterChange({
      statuses: ['Created', 'Approved', 'Processing', 'Scheduled'],
      created_from: null,
      created_to: null,
      expiration_from: null,
      expiration_to: null,
      sort_by: { ExpirationDt: 'Asc' },
      only_approvable: false,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Filters</span>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </CardTitle>
        <CardDescription>
          Refine the request list
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Filter */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Status</Label>
          <div className="space-y-2">
            {statusOptions.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${option.value}`}
                  checked={filters.statuses.includes(option.value)}
                  onCheckedChange={(checked) => handleStatusChange(option.value, checked)}
                />
                <label
                  htmlFor={`status-${option.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
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
          <Label className="text-sm font-medium mb-3 block">Sort By</Label>
          <RadioGroup
            value={JSON.stringify(filters.sort_by)}
            onValueChange={(value) => handleSortChange(JSON.parse(value))}
          >
            {sortOptions.map(option => (
              <div key={JSON.stringify(option.value)} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={JSON.stringify(option.value)}
                  id={`sort-${option.label}`}
                />
                <label
                  htmlFor={`sort-${option.label}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Separator />

        {/* Date Filters */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Creation Date</Label>
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.created_from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.created_from ? format(filters.created_from, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.created_from}
                    onSelect={(date) => handleDateChange('created_from', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.created_to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.created_to ? format(filters.created_to, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.created_to}
                    onSelect={(date) => handleDateChange('created_to', date)}
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
            checked={filters.only_approvable}
            onCheckedChange={(checked) => onFilterChange({ only_approvable: checked })}
          />
          <label
            htmlFor="only-approvable"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Only show requests I can approve
          </label>
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestFilters;