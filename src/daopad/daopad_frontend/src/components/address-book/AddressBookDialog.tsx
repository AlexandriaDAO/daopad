import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import AddressBookForm from './AddressBookForm';
import { getOrbitAddressBookService } from '../../services/backend';

const AddressBookDialog = ({
  trigger,
  entry = null,
  mode = 'create', // 'create', 'edit', 'view'
  onOpenChange,
  onSuccess
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Notify parent of open state changes
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(open);
    }
  }, [open, onOpenChange]);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      let result;

      if (mode === 'create') {
        // Create new entry
        result = await getOrbitAddressBookService.createAddressBookEntry(formData);
      } else if (mode === 'edit' && entry) {
        // Edit existing entry
        const editData = {
          address_book_entry_id: entry.id,
          address_owner: formData.address_owner !== entry.address_owner ? formData.address_owner : undefined,
          labels: formData.labels,
          change_metadata: formData.metadata ? {
            ReplaceAllBy: formData.metadata
          } : undefined
        };
        result = await getOrbitAddressBookService.editAddressBookEntry(editData);
      }

      if (result?.Ok) {
        // Success
        setOpen(false);
        if (onSuccess) {
          onSuccess(result.Ok);
        }
      } else {
        // Error
        setError(result?.Err?.message || 'An error occurred');
      }
    } catch (err) {
      console.error('Error submitting address book entry:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getDialogTitle = () => {
    switch (mode) {
      case 'create':
        return 'Add New Address';
      case 'edit':
        return 'Edit Address';
      case 'view':
        return 'View Address Details';
      default:
        return 'Address Book';
    }
  };

  return (
    <>
      {/* Trigger element */}
      <div onClick={() => setOpen(true)}>
        {trigger}
      </div>

      {/* Dialog modal */}
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setOpen(false)}
          />

          {/* Dialog content */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getDialogTitle()}
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Form content */}
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
                <AddressBookForm
                  initialData={entry}
                  mode={mode}
                  onSubmit={handleSubmit}
                  loading={loading}
                />
              </div>

              {/* Footer with actions */}
              {mode !== 'view' && (
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="address-book-form"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : mode === 'create' ? 'Add Address' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddressBookDialog;