import React from 'react';
import { Copy, Eye, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import BlockchainIcon from './BlockchainIcon';
import ShortenedAddress from './ShortenedAddress';

const AddressBookTable = ({
  entries,
  privileges,
  loading,
  onCopy,
  onEdit,
  onDelete,
  onView
}) => {
  // Helper function to check permissions
  const hasEditPrivilege = (id) => privileges[id]?.can_edit || false;
  const hasDeletePrivilege = (id) => privileges[id]?.can_delete || false;

  // Table headers
  const headers = [
    { key: 'blockchain', label: 'Blockchain', width: '100px' },
    { key: 'name', label: 'Name', width: '200px' },
    { key: 'address', label: 'Address' },
    { key: 'labels', label: 'Labels', width: '200px' },
    { key: 'actions', label: 'Actions', width: '120px', align: 'right' }
  ];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            {headers.map((header) => (
              <th
                key={header.key}
                style={{ width: header.width }}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                  header.align === 'right' ? 'text-right' : ''
                }`}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              {/* Blockchain */}
              <td className="px-6 py-4 whitespace-nowrap">
                <BlockchainIcon blockchain={entry.blockchain} size="sm" showLabel={true} />
              </td>

              {/* Name */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {entry.address_owner}
                </div>
                {entry.last_modification_timestamp && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Modified: {new Date(entry.last_modification_timestamp).toLocaleDateString()}
                  </div>
                )}
              </td>

              {/* Address */}
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <ShortenedAddress
                    address={entry.address}
                    format={entry.address_format}
                    maxLength={20}
                  />
                  <button
                    onClick={() => onCopy(entry.address)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Copy address"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Format: {entry.address_format.replace(/_/g, ' ')}
                </div>
              </td>

              {/* Labels */}
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {entry.labels && entry.labels.length > 0 ? (
                    entry.labels.slice(0, 3).map((label, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        {label}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">
                      No labels
                    </span>
                  )}
                  {entry.labels && entry.labels.length > 3 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      +{entry.labels.length - 3}
                    </span>
                  )}
                </div>
              </td>

              {/* Actions */}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onView(entry)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {hasEditPrivilege(entry.id) && (
                    <button
                      onClick={() => onEdit(entry)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Edit entry"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}

                  {hasDeletePrivilege(entry.id) && (
                    <button
                      onClick={() => onDelete(entry)}
                      className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                      title="Delete entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  {/* Dropdown menu for additional actions */}
                  <div className="relative inline-block text-left">
                    <button
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="More actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {/* Dropdown menu content will be implemented later */}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      )}
    </div>
  );
};

export default AddressBookTable;