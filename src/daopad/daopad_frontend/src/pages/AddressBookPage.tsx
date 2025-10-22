import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus } from 'lucide-react';
import { getOrbitAddressBookService } from '../services/backend';
import AddressBookDialog from '../components/address-book/AddressBookDialog';
import AddressBookTable from '../components/address-book/AddressBookTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { ExecutiveCard } from '@/components/ui/executive-card';

const AddressBookPage = ({ identity }) => {
  // Initialize service instance with identity
  const [addressBookService, setAddressBookService] = useState(null);

  useEffect(() => {
    if (identity) {
      const service = getOrbitAddressBookService(identity);
      setAddressBookService(service);
    }
  }, [identity]);

  // State management - Lines 155-170 in Vue component
  const [entries, setEntries] = useState([]);
  const [privileges, setPrivileges] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [forceReload, setForceReload] = useState(0);
  const [disableRefresh, setDisableRefresh] = useState(false);
  const [error, setError] = useState(null);

  // Pagination state - Lines 122-129 in Vue component
  const [pagination, setPagination] = useState({
    selectedPage: 1,
    totalPages: 0,
    limit: 100,  // DEFAULT_ENTRIES_LIMIT from service (Line 36)
    offset: 0,
    total: 0
  });

  // For now, mock permissions - in production, these would come from auth context
  const hasPermission = (permission) => {
    // Mock implementation - replace with actual permission check
    return true;
  };

  const canCreate = hasPermission('AddressBook.Create');
  const canList = hasPermission('AddressBook.List');

  // Track initial load to prevent duplicate calls on mount
  const initialLoadRef = useRef(false);

  // Fetch data function - Lines 177-198 in Vue component
  const fetchList = useCallback(async () => {
    if (!canList || !addressBookService) return;

    setLoading(true);
    setError(null);
    try {
      const input = {
        search_term: searchTerm || undefined,
        paginate: {
          offset: pagination.offset,
          limit: pagination.limit
        }
      };

      const result = await addressBookService.listEntries(input);
      if (result.success) {
        setEntries(result.data.address_book_entries);
        setPrivileges(
          result.data.privileges.reduce((acc, priv) => {
            acc[priv.id] = priv;
            return acc;
          }, {})
        );
        setPagination(prev => ({
          ...prev,
          total: result.data.total,
          totalPages: Math.ceil(result.data.total / prev.limit),
          next_offset: result.data.next_offset
        }));
      } else {
        setError(result.error || 'Failed to load address book entries');
      }
    } catch (error) {
      console.error('Error loading address book:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, pagination.offset, pagination.limit, canList, addressBookService]);

  // Effect 1: Initial load only (runs once on mount)
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  // Effect 2: Auto-refresh interval (stable reference)
  useEffect(() => {
    if (!disableRefresh && initialLoadRef.current) {
      const interval = setInterval(() => {
        fetchList();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchList, disableRefresh]);

  // Effect 3: Manual reload trigger only when forceReload increments
  useEffect(() => {
    if (forceReload > 0) {
      fetchList();
    }
  }, [forceReload, fetchList]);

  // Copy to clipboard - Lines 89-94 in Vue component
  const handleCopy = (address) => {
    navigator.clipboard.writeText(address);
    // TODO: Show toast notification when toast system is implemented
  };

  // Permission helpers - Lines 101-102, 108-111 in Vue component
  const hasEditPrivilege = (id) => privileges[id]?.can_edit || false;
  const hasDeletePrivilege = (id) => privileges[id]?.can_delete || false;

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      selectedPage: newPage,
      offset: (newPage - 1) * prev.limit
    }));
  };

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({
      ...prev,
      selectedPage: 1,
      offset: 0
    }));
  };

  // Handle entry deletion
  const handleDelete = async (entry) => {
    if (!hasDeletePrivilege(entry.id) || !addressBookService) return;

    if (window.confirm(`Are you sure you want to delete the address book entry for ${entry.address_owner}?`)) {
      try {
        const result = await addressBookService.removeEntry(entry.id);
        if (result.success) {
          // Refresh the list
          setForceReload(prev => prev + 1);
        } else {
          setError(result.error || 'Failed to delete entry');
        }
      } catch (error) {
        console.error('Error deleting entry:', error);
        setError(error.message || 'Failed to delete entry');
      }
    }
  };

  // Table headers matching Vue component structure
  const headers = [
    { key: 'blockchain', label: 'Blockchain', width: '120px' },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'address', label: 'Address' },
    { key: 'actions', label: 'Actions', width: '120px', align: 'right' }
  ];

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          {canList && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-executive-gold/70" />
              <Input
                type="text"
                placeholder="Search addresses..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 border-executive-gold/40 focus:border-executive-gold focus:ring-executive-gold/30 transition-all duration-200"
              />
            </div>
          )}
        </div>

        {canCreate && (
          <AddressBookDialog
            trigger={
              <Button
                size="sm"
                className="border-executive-gold/30 hover:border-executive-gold hover:bg-executive-gold/10 transition-all duration-300"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Address
              </Button>
            }
            identity={identity}
            onOpenChange={setDisableRefresh}
            onSuccess={() => setForceReload(prev => prev + 1)}
          />
        )}
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <ExecutiveCard variant="default" hover={false}>
        <CardContent className="p-0">
          {loading && entries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                No address book entries found.
                {canCreate && " Click 'New Address' to add your first entry."}
              </p>
            </div>
          ) : (
            <AddressBookTable
              entries={entries}
              privileges={privileges}
              loading={loading}
              onCopy={handleCopy}
              onEdit={(entry) => {
                // TODO: Implement edit dialog
              }}
              onDelete={handleDelete}
              onView={(entry) => {
                // TODO: Implement view dialog
              }}
              className="[&_tr]:hover:bg-executive-gold/5 [&_tr]:transition-colors [&_tr]:duration-150"
            />
          )}
        </CardContent>
      </ExecutiveCard>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between py-2">
          <div className="text-sm text-muted-foreground">
            Showing {pagination.offset + 1} to{' '}
            {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handlePageChange(pagination.selectedPage - 1)}
              disabled={pagination.selectedPage === 1}
              size="sm"
              variant="outline"
            >
              Previous
            </Button>
            <span className="flex items-center px-3 text-sm">
              Page {pagination.selectedPage} of {pagination.totalPages}
            </span>
            <Button
              onClick={() => handlePageChange(pagination.selectedPage + 1)}
              disabled={pagination.selectedPage === pagination.totalPages}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressBookPage;