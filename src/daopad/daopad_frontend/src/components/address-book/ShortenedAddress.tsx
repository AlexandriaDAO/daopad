import React, { useMemo, useState } from 'react';

interface ShortenedAddressProps {
  address: string;
  format: string;
  maxLength?: number;
  className?: string;
}

const ShortenedAddress: React.FC<ShortenedAddressProps> = ({ address, format, maxLength = 16, className = '' }) => {
  const [showFull, setShowFull] = useState(false);

  const shortened = useMemo(() => {
    if (!address) return '';
    if (address.length <= maxLength) return address;

    // Format-specific shortening based on account.rs Lines 86-117
    switch(format) {
      case 'icp_account_identifier':
      case 'icrc1_account':
        // Show first 8 and last 6 characters
        return `${address.slice(0, 8)}...${address.slice(-6)}`;

      case 'ethereum_address':
        // Show 0x + first 6 and last 4 characters
        return `${address.slice(0, 8)}...${address.slice(-4)}`;

      case 'bitcoin_address_p2wpkh':
      case 'bitcoin_address_p2tr':
        // Show first 10 and last 6 characters
        return `${address.slice(0, 10)}...${address.slice(-6)}`;

      default:
        // Generic shortening
        const half = Math.floor(maxLength / 2) - 2;
        return `${address.slice(0, half)}...${address.slice(-half)}`;
    }
  }, [address, format, maxLength]);

  return (
    <div className="relative inline-block">
      <span
        className={`font-mono text-sm cursor-pointer ${className}`}
        onClick={() => setShowFull(!showFull)}
        title={address}
      >
        {shortened}
      </span>

      {/* Tooltip showing full address */}
      {showFull && (
        <div className="absolute z-10 bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg max-w-xs break-all">
          <div className="font-mono">{address}</div>
          <div className="absolute bottom-0 left-4 transform translate-y-full">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortenedAddress;