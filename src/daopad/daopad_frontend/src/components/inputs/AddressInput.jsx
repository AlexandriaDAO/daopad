import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import {
  validateAddress,
  detectAddressFormat,
  BlockchainType,
  AddressFormat
} from '../../utils/addressValidation';
import { Check, AlertCircle, Copy } from 'lucide-react';
import { Button } from '../ui/button';

/**
 * AddressInput component - Replicates Orbit Station's address input functionality
 *
 * Features:
 * - Auto-detects address format (ICRC1 or Account Identifier)
 * - Real-time validation
 * - Format detection display
 * - Copy to clipboard functionality
 * - Clear error messaging
 */
export default function AddressInput({
  value,
  onChange,
  placeholder = "Enter recipient address (Principal or Account ID)",
  label = "Recipient Address",
  required = false,
  disabled = false,
  blockchain = BlockchainType.InternetComputer,
  helperText = null,
  className = "",
  error = null,
  onValidationChange = null // Callback for validation state changes
}) {
  const [inputValue, setInputValue] = useState(value || '');
  const [validationState, setValidationState] = useState({
    isValid: false,
    error: null,
    format: null
  });
  const [isFocused, setIsFocused] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  // Validate address whenever input changes
  useEffect(() => {
    if (!inputValue || inputValue.trim() === '') {
      setValidationState({
        isValid: false,
        error: required ? 'Address is required' : null,
        format: null
      });
      return;
    }

    const validationResult = validateAddress(blockchain, inputValue);
    const detectedFormat = detectAddressFormat(blockchain, inputValue);

    const newState = {
      isValid: validationResult === true,
      error: validationResult !== true ? validationResult : null,
      format: detectedFormat
    };

    setValidationState(newState);

    // Notify parent component of validation state
    if (onValidationChange) {
      onValidationChange(newState);
    }
  }, [inputValue, blockchain, required, onValidationChange]);

  const handleInputChange = (e) => {
    const newValue = e.target.value.trim();
    setInputValue(newValue);

    if (onChange) {
      // Only call onChange with valid addresses or empty string
      if (newValue === '' || validateAddress(blockchain, newValue) === true) {
        onChange(newValue);
      } else {
        // Still update parent with the value but indicate it's invalid
        onChange(newValue);
      }
    }
  };

  const handleCopyAddress = async () => {
    if (inputValue) {
      await navigator.clipboard.writeText(inputValue);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const getFormatLabel = (format) => {
    switch (format) {
      case AddressFormat.ICRC1Account:
        return 'ICRC-1 Account (Principal)';
      case AddressFormat.ICPAccountIdentifier:
        return 'ICP Account Identifier';
      default:
        return 'Unknown Format';
    }
  };

  const getFormatColor = (format) => {
    switch (format) {
      case AddressFormat.ICRC1Account:
        return 'text-blue-600 dark:text-blue-400';
      case AddressFormat.ICPAccountIdentifier:
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const hasError = (error || validationState.error) && inputValue && !isFocused;
  const showSuccess = validationState.isValid && inputValue && !isFocused;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor="address-input" className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        <div className="relative">
          <Input
            id="address-input"
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              pr-20 font-mono text-sm
              ${hasError ? 'border-red-500 focus:ring-red-500' : ''}
              ${showSuccess ? 'border-green-500 focus:ring-green-500' : ''}
            `}
          />

          {/* Status icons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {showCopied && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Copied!
              </span>
            )}

            {inputValue && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyAddress}
                className="h-6 w-6 p-0"
                title="Copy address"
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}

            {showSuccess && (
              <Check className="h-4 w-4 text-green-500" />
            )}

            {hasError && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>

        {/* Helper text or validation feedback */}
        <div className="mt-1">
          {helperText && !inputValue && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {helperText}
            </p>
          )}

          {validationState.format && !hasError && (
            <p className={`text-xs ${getFormatColor(validationState.format)}`}>
              ✓ Detected: {getFormatLabel(validationState.format)}
            </p>
          )}

          {hasError && (
            <p className="text-xs text-red-500">
              {error || validationState.error}
            </p>
          )}
        </div>
      </div>

      {/* Format information box */}
      {!inputValue && !disabled && (
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-xs">
            <strong>Accepted formats:</strong>
            <ul className="mt-1 space-y-1">
              <li>• <strong>Principal:</strong> e.g., rrkah-fqaaa-aaaaa-aaaaq-cai</li>
              <li>• <strong>Principal with subaccount:</strong> e.g., rrkah-fqaaa-aaaaa-aaaaq-cai.1234abcd...</li>
              <li>• <strong>Account Identifier:</strong> e.g., 7caeefd91b68995cefb180f2397d8792af13a78d43f0c682eafcac7deede79bf</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}