import React, { useState, useEffect } from 'react';
import { User, Link, Globe, Tag, Plus, X } from 'lucide-react';
import { addressBookService } from '../../services/addressBookService';
import BlockchainIcon from './BlockchainIcon';

// Validation constants from models/address_book.rs Lines 120-124
const ADDRESS_OWNER_MIN = 1;
const ADDRESS_OWNER_MAX = 255;
const ADDRESS_MIN = 1;
const ADDRESS_MAX = 255;
const MAX_LABELS = 10;
const MAX_LABEL_LENGTH = 150;

// Blockchain options from models/blockchain.rs Lines 9-13
const BLOCKCHAIN_OPTIONS = [
  { value: 'icp', label: 'Internet Computer', native: 'ICP' },
  { value: 'eth', label: 'Ethereum', native: 'ETH' },
  { value: 'btc', label: 'Bitcoin', native: 'BTC' }
];

// Address formats from models/account.rs Lines 57-62
const ADDRESS_FORMATS = {
  icp: [
    { value: 'icp_account_identifier', label: 'ICP Account Identifier' },
    { value: 'icrc1_account', label: 'ICRC1 Account' }
  ],
  eth: [
    { value: 'ethereum_address', label: 'Ethereum Address' }
  ],
  btc: [
    { value: 'bitcoin_address_p2wpkh', label: 'Bitcoin P2WPKH' },
    { value: 'bitcoin_address_p2tr', label: 'Bitcoin P2TR' }
  ]
};

const AddressBookForm = ({
  initialData = null,
  mode = 'create',
  onSubmit,
  loading = false
}) => {
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit' && initialData;

  // Form state
  const [formData, setFormData] = useState({
    blockchain: initialData?.blockchain || '',
    address_owner: initialData?.address_owner || '',
    address: initialData?.address || '',
    address_format: initialData?.address_format || '',
    labels: initialData?.labels || [],
    metadata: initialData?.metadata || []
  });

  const [errors, setErrors] = useState({});
  const [newLabel, setNewLabel] = useState('');
  const [detectedFormat, setDetectedFormat] = useState('');

  // Auto-detect address format - Line 136-143 in Vue component
  useEffect(() => {
    if (formData.blockchain && formData.address && !isEditMode) {
      const detected = addressBookService.detectAddressFormat(formData.address, formData.blockchain);
      if (detected) {
        setDetectedFormat(detected);
        setFormData(prev => ({ ...prev, address_format: detected }));
      }
    }
  }, [formData.blockchain, formData.address, isEditMode]);

  // Validation
  const validateForm = () => {
    const newErrors = {};

    // Owner validation
    if (!formData.address_owner || formData.address_owner.length < ADDRESS_OWNER_MIN) {
      newErrors.address_owner = `Name must be at least ${ADDRESS_OWNER_MIN} character`;
    } else if (formData.address_owner.length > ADDRESS_OWNER_MAX) {
      newErrors.address_owner = `Name cannot exceed ${ADDRESS_OWNER_MAX} characters`;
    }

    // Address validation (only for new entries, addresses can't be edited)
    if (!isEditMode) {
      if (!formData.address || formData.address.length < ADDRESS_MIN) {
        newErrors.address = `Address must be at least ${ADDRESS_MIN} character`;
      } else if (formData.address.length > ADDRESS_MAX) {
        newErrors.address = `Address cannot exceed ${ADDRESS_MAX} characters`;
      } else if (formData.address_format) {
        // Validate address format
        if (!addressBookService.validateAddress(formData.address, formData.address_format, formData.blockchain)) {
          newErrors.address = 'Invalid address format';
        }
      }

      // Blockchain validation
      if (!formData.blockchain) {
        newErrors.blockchain = 'Please select a blockchain';
      }

      // Address format validation
      if (!formData.address_format) {
        newErrors.address_format = 'Please select an address format';
      }
    }

    // Labels validation
    if (formData.labels.length > MAX_LABELS) {
      newErrors.labels = `Cannot have more than ${MAX_LABELS} labels`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm() && onSubmit) {
      onSubmit(formData);
    }
  };

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // Handle label addition
  const handleAddLabel = () => {
    if (newLabel && newLabel.length <= MAX_LABEL_LENGTH) {
      if (formData.labels.length < MAX_LABELS) {
        handleChange('labels', [...formData.labels, newLabel]);
        setNewLabel('');
      }
    }
  };

  // Handle label removal
  const handleRemoveLabel = (index) => {
    const newLabels = formData.labels.filter((_, i) => i !== index);
    handleChange('labels', newLabels);
  };

  // Handle metadata changes
  const handleMetadataChange = (index, field, value) => {
    const newMetadata = [...formData.metadata];
    newMetadata[index] = { ...newMetadata[index], [field]: value };
    handleChange('metadata', newMetadata);
  };

  const handleAddMetadata = () => {
    handleChange('metadata', [...formData.metadata, { key: '', value: '' }]);
  };

  const handleRemoveMetadata = (index) => {
    const newMetadata = formData.metadata.filter((_, i) => i !== index);
    handleChange('metadata', newMetadata);
  };

  return (
    <form id="address-book-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Blockchain selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Globe className="inline h-4 w-4 mr-1" />
          Blockchain
        </label>
        <select
          value={formData.blockchain}
          onChange={(e) => handleChange('blockchain', e.target.value)}
          disabled={isViewMode || isEditMode}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
        >
          <option value="">Select a blockchain</option>
          {BLOCKCHAIN_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label} ({opt.native})
            </option>
          ))}
        </select>
        {errors.blockchain && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.blockchain}</p>
        )}
      </div>

      {/* Owner name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <User className="inline h-4 w-4 mr-1" />
          Owner Name
        </label>
        <input
          type="text"
          value={formData.address_owner}
          onChange={(e) => handleChange('address_owner', e.target.value)}
          disabled={isViewMode}
          maxLength={ADDRESS_OWNER_MAX}
          placeholder="e.g., Alice Smith"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
        />
        {errors.address_owner && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.address_owner}</p>
        )}
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Link className="inline h-4 w-4 mr-1" />
          Address
        </label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          disabled={isViewMode || isEditMode}
          maxLength={ADDRESS_MAX}
          placeholder={
            formData.blockchain === 'eth' ? '0x...' :
            formData.blockchain === 'btc' ? 'bc1...' :
            'Enter address'
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.address}</p>
        )}
        {detectedFormat && !isEditMode && (
          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
            Detected format: {detectedFormat.replace(/_/g, ' ')}
          </p>
        )}
      </div>

      {/* Address format */}
      {formData.blockchain && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Address Format
          </label>
          <select
            value={formData.address_format}
            onChange={(e) => handleChange('address_format', e.target.value)}
            disabled={isViewMode || isEditMode}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
          >
            <option value="">Select format</option>
            {ADDRESS_FORMATS[formData.blockchain]?.map(format => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </select>
          {errors.address_format && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.address_format}</p>
          )}
        </div>
      )}

      {/* Labels */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Tag className="inline h-4 w-4 mr-1" />
          Labels ({formData.labels.length}/{MAX_LABELS})
        </label>
        <div className="space-y-2">
          {/* Existing labels */}
          <div className="flex flex-wrap gap-2">
            {formData.labels.map((label, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {label}
                {!isViewMode && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLabel(index)}
                    className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>

          {/* Add new label */}
          {!isViewMode && formData.labels.length < MAX_LABELS && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
                maxLength={MAX_LABEL_LENGTH}
                placeholder="Add a label"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddLabel}
                disabled={!newLabel}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        {errors.labels && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.labels}</p>
        )}
      </div>

      {/* Metadata (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Metadata (Optional)
        </label>
        <div className="space-y-2">
          {formData.metadata.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item.key}
                onChange={(e) => handleMetadataChange(index, 'key', e.target.value)}
                disabled={isViewMode}
                maxLength={100}
                placeholder="Key"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
              />
              <input
                type="text"
                value={item.value}
                onChange={(e) => handleMetadataChange(index, 'value', e.target.value)}
                disabled={isViewMode}
                maxLength={2000}
                placeholder="Value"
                className="flex-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
              />
              {!isViewMode && (
                <button
                  type="button"
                  onClick={() => handleRemoveMetadata(index)}
                  className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          {!isViewMode && (
            <button
              type="button"
              onClick={handleAddMetadata}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              + Add metadata field
            </button>
          )}
        </div>
      </div>
    </form>
  );
};

export default AddressBookForm;