import { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { debounce } from 'lodash';

export default function CanisterFilters({ onFiltersChange, initialFilters }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [labelFilters, setLabelFilters] = useState([]);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((term) => {
      // For name search, we'll need to handle this differently
      // as Orbit doesn't have a direct name filter
      const newFilters = {
        ...initialFilters,
        // Note: Orbit doesn't have name filtering in list_external_canisters
        // This would need to be handled client-side or through a different approach
        labels: term ? [term] : null  // Use labels as a workaround or filter client-side
      };
      onFiltersChange(newFilters);
    }, 300),
    [onFiltersChange, initialFilters]
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleStateFilterChange = (state) => {
    setStateFilter(state);

    const newFilters = {
      ...initialFilters,
      states: state !== 'all' ? [state] : null,
      labels: labelFilters.length > 0 ? labelFilters : null
    };
    onFiltersChange(newFilters);
  };

  const handleLabelToggle = (label) => {
    const newLabels = labelFilters.includes(label)
      ? labelFilters.filter(l => l !== label)
      : [...labelFilters, label];

    setLabelFilters(newLabels);

    const newFilters = {
      ...initialFilters,
      states: stateFilter !== 'all' ? [stateFilter] : null,
      labels: newLabels.length > 0 ? newLabels : null
    };
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStateFilter('all');
    setLabelFilters([]);
    onFiltersChange({
      ...initialFilters,
      canister_ids: null,
      labels: null,
      states: null
    });
  };

  const hasActiveFilters = searchTerm || stateFilter !== 'all' || labelFilters.length > 0;

  // Common labels (could be fetched from backend)
  const availableLabels = ['production', 'development', 'testing', 'monitoring', 'critical'];

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search canisters by name..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-9"
        />
      </div>

      {/* State Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            State: {stateFilter === 'all' ? 'All' : stateFilter}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Filter by State</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={stateFilter === 'all'}
            onCheckedChange={() => handleStateFilterChange('all')}
          >
            All States
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={stateFilter === 'Active'}
            onCheckedChange={() => handleStateFilterChange('Active')}
          >
            Active
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={stateFilter === 'Archived'}
            onCheckedChange={() => handleStateFilterChange('Archived')}
          >
            Archived
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Label Filters */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Labels {labelFilters.length > 0 && `(${labelFilters.length})`}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Filter by Labels</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableLabels.map(label => (
            <DropdownMenuCheckboxItem
              key={label}
              checked={labelFilters.includes(label)}
              onCheckedChange={() => handleLabelToggle(label)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
        >
          Clear Filters
        </Button>
      )}

      {/* Active Filter Badges */}
      {(stateFilter !== 'all' || labelFilters.length > 0) && (
        <div className="flex gap-1 flex-wrap">
          {stateFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              State: {stateFilter}
            </Badge>
          )}
          {labelFilters.map(label => (
            <Badge key={label} variant="secondary" className="text-xs">
              Label: {label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}