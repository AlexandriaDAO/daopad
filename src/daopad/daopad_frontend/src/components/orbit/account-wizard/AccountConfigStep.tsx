import React, { useState, useEffect } from 'react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { AlertCircle } from 'lucide-react';
import { DAOPadBackendService } from '../../../services/backend';

export const AccountConfigStep = ({
  accountConfig,
  setAccountConfig,
  assets,
  tokenId
}) => {
  const [nameError, setNameError] = useState('');
  const [validatingName, setValidatingName] = useState(false);

  // Debounced name validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (accountConfig.name) {
        validateName(accountConfig.name);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [accountConfig.name, tokenId]);

  const validateName = async (name) => {
    if (!name || name.length === 0) {
      setNameError('Account name is required');
      return;
    }

    if (name.length > 64) {
      setNameError('Account name must be 64 characters or less');
      return;
    }

    setValidatingName(true);
    try {
      const backend = new DAOPadBackendService();
      const result = await backend.validateAccountName(tokenId, name);

      if (result.success && !result.isValid) {
        setNameError('This account name already exists');
      } else {
        setNameError('');
      }
    } catch (error) {
      console.error('Error validating name:', error);
      setNameError('');
    }
    setValidatingName(false);
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setAccountConfig(prev => ({ ...prev, name }));
  };

  const handleAssetToggle = (assetId) => {
    setAccountConfig(prev => {
      const assetIds = prev.assetIds.includes(assetId)
        ? prev.assetIds.filter(id => id !== assetId)
        : [...prev.assetIds, assetId];
      return { ...prev, assetIds };
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="account-name">Account Name</Label>
        <Input
          id="account-name"
          placeholder="e.g., Main Treasury, Operations Fund"
          value={accountConfig.name}
          onChange={handleNameChange}
          maxLength={64}
          className={nameError ? 'border-red-500' : ''}
        />
        <div className="flex justify-between items-center mt-1">
          <div>
            {nameError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {nameError}
              </p>
            )}
            {validatingName && (
              <p className="text-sm text-gray-500">Checking name availability...</p>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {accountConfig.name.length}/64
          </span>
        </div>
      </div>

      <div>
        <Label>Assets</Label>
        <p className="text-sm text-gray-500 mb-3">
          Select which assets this account can hold
        </p>
        <div className="space-y-2">
          {assets.length > 0 ? (
            assets.map(asset => (
              <div key={asset.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <Checkbox
                  checked={accountConfig.assetIds.includes(asset.id)}
                  onCheckedChange={() => handleAssetToggle(asset.id)}
                />
                <div className="flex-1">
                  <div className="font-medium">{asset.symbol}</div>
                  <div className="text-sm text-gray-500">{asset.name}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 p-3 border rounded-lg">
              No assets available. ICP will be selected by default.
            </div>
          )}
        </div>
      </div>

      <div>
        <Label>Account Type (Optional)</Label>
        <Select
          value={accountConfig.metadata.find(m => m.key === 'type')?.value || 'none'}
          onValueChange={(value) => {
            setAccountConfig(prev => {
              const metadata = prev.metadata.filter(m => m.key !== 'type');
              if (value && value !== 'none') {
                metadata.push({ key: 'type', value });
              }
              return { ...prev, metadata };
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select account type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="main">Main Treasury</SelectItem>
            <SelectItem value="operations">Operations</SelectItem>
            <SelectItem value="development">Development</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="reserves">Reserves</SelectItem>
            <SelectItem value="rewards">Rewards Pool</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};