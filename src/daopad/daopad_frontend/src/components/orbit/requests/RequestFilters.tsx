import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X } from 'lucide-react';

export function RequestFilters({ filters, onChange, requestsData }) {
  const handleFilterChange = (key, value) => {
    onChange(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    onChange({
      search: '',
      status: 'all',
      operation_type: 'all',
      requester: '',
      date_range: 'all'
    });
  };

  const activeFiltersCount = Object.entries(filters)
    .filter(([key, value]) => value && value !== 'all')
    .length;

  // Get unique operation types from requests
  const operationTypes = requestsData?.requests
    ? [...new Set(requestsData.requests.map(r => r.operation_type))].filter(Boolean)
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-7 text-xs"
            >
              Clear all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search" className="text-xs">Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              type="text"
              placeholder="Search requests..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status" className="text-xs">Status</Label>
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger id="status" className="h-9">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="executed">Executed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Operation Type */}
        {operationTypes.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="operation_type" className="text-xs">Operation Type</Label>
            <Select value={filters.operation_type} onValueChange={(value) => handleFilterChange('operation_type', value)}>
              <SelectTrigger id="operation_type" className="h-9">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {operationTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/([A-Z])/g, ' $1').trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date Range */}
        <div className="space-y-2">
          <Label htmlFor="date_range" className="text-xs">Date Range</Label>
          <Select value={filters.date_range} onValueChange={(value) => handleFilterChange('date_range', value)}>
            <SelectTrigger id="date_range" className="h-9">
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Past week</SelectItem>
              <SelectItem value="month">Past month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requester */}
        <div className="space-y-2">
          <Label htmlFor="requester" className="text-xs">Requester Principal</Label>
          <Input
            id="requester"
            type="text"
            placeholder="Enter principal..."
            value={filters.requester}
            onChange={(e) => handleFilterChange('requester', e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        {/* Filter Summary */}
        {activeFiltersCount > 0 && (
          <div className="pt-2 border-t">
            <div className="flex flex-wrap gap-1">
              {filters.search && (
                <Badge variant="secondary" className="text-xs">
                  Search: {filters.search}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-3 w-3 p-0 ml-1"
                    onClick={() => handleFilterChange('search', '')}
                  >
                    <X className="w-2 h-2" />
                  </Button>
                </Badge>
              )}
              {filters.status !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Status: {filters.status}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-3 w-3 p-0 ml-1"
                    onClick={() => handleFilterChange('status', 'all')}
                  >
                    <X className="w-2 h-2" />
                  </Button>
                </Badge>
              )}
              {filters.operation_type !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Type: {filters.operation_type}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-3 w-3 p-0 ml-1"
                    onClick={() => handleFilterChange('operation_type', 'all')}
                  >
                    <X className="w-2 h-2" />
                  </Button>
                </Badge>
              )}
              {filters.date_range !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Date: {filters.date_range}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-3 w-3 p-0 ml-1"
                    onClick={() => handleFilterChange('date_range', 'all')}
                  >
                    <X className="w-2 h-2" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}