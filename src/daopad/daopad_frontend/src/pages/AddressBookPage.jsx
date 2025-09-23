import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Copy, Pencil, Trash2, Eye, MoreHorizontal } from 'lucide-react';
import { addressBookService } from '../services/addressBookService';
import AddressBookDialog from '../components/address-book/AddressBookDialog';
import AddressBookTable from '../components/address-book/AddressBookTable';

const AddressBookPage = ({ identity }) => {
  // Initialize service with identity
  useEffect(() => {
    if (identity) {
      addressBookService.setIdentity(identity);
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

  // Fetch data function - Lines 177-198 in Vue component
  const fetchList = useCallback(async () => {
    if (!canList) return;

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

      const result = await addressBookService.listAddressBookEntries(input);
      if (result.Ok) {
        setEntries(result.Ok.address_book_entries);
        setPrivileges(
          result.Ok.privileges.reduce((acc, priv) => {
            acc[priv.id] = priv;
            return acc;
          }, {})
        );
        setPagination(prev => ({
          ...prev,
          total: result.Ok.total,
          totalPages: Math.ceil(result.Ok.total / prev.limit),
          next_offset: result.Ok.next_offset
        }));
      } else {
        setError(result.Err?.message || 'Failed to load address book entries');
      }
    } catch (error) {
      console.error('Error loading address book:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, pagination.offset, pagination.limit, canList]);

  // Auto-refresh every 5 seconds - Line 35 in Vue component
  useEffect(() => {
    if (!disableRefresh) {
      const interval = setInterval(fetchList, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchList, disableRefresh]);

  // Initial load
  useEffect(() => {
    fetchList();
  }, [forceReload]);

  // Copy to clipboard - Lines 89-94 in Vue component
  const handleCopy = (address) => {
    navigator.clipboard.writeText(address);
    // Show a toast notification (implement toast later)
    console.log(`Copied: ${address}`);
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
    if (!hasDeletePrivilege(entry.id)) return;

    if (window.confirm(`Are you sure you want to delete the address book entry for ${entry.address_owner}?`)) {
      try {
        const result = await addressBookService.removeAddressBookEntry(entry.id);
        if (result.Ok) {
          // Refresh the list
          setForceReload(prev => prev + 1);
        } else {
          setError(result.Err?.message || 'Failed to delete entry');
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Address Book
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage saved addresses for easy transfers
        </p>
      </div>

      {/* Main content card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {/* Toolbar */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Search input */}
              {canList && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search addresses..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="pl-10 pr-4 py-2 w-64 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Add button */}
            {canCreate && (
              <AddressBookDialog
                trigger={
                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <Plus className="mr-2 h-4 w-4" />
                    New Address
                  </button>
                }
                onOpenChange={setDisableRefresh}
                onSuccess={() => setForceReload(prev => prev + 1)}
              />
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Table */}
        {loading && entries.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
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
              // Will implement edit dialog later
              console.log('Edit:', entry);
            }}
            onDelete={handleDelete}
            onView={(entry) => {
              // Will implement view dialog later
              console.log('View:', entry);
            }}
          />
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {pagination.offset + 1} to{' '}
                {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.selectedPage - 1)}
                  disabled={pagination.selectedPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {pagination.selectedPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.selectedPage + 1)}
                  disabled={pagination.selectedPage === pagination.totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddressBookPage;