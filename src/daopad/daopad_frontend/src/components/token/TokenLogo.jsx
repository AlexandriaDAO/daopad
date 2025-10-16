import React from 'react';

/**
 * TokenLogo Component
 *
 * Displays token logo with fallback to placeholder
 *
 * @param {object} token - Token object with canister_id and symbol
 * @param {object|null} tokenMetadata - Token metadata with logo and symbol
 */
const TokenLogo = ({ token, tokenMetadata }) => {
  // Special case for ALEX token
  if (token.canister_id === 'ysy5f-2qaaa-aaaap-qkmmq-cai') {
    return (
      <img
        src="/alex.png"
        alt="ALEX"
        className="w-12 h-12 rounded-lg object-contain flex-shrink-0"
      />
    );
  }

  // Token has valid logo
  if (tokenMetadata?.logo && tokenMetadata.logo !== 'data:image/svg+xml;base64,') {
    return (
      <img
        src={tokenMetadata.logo}
        alt={tokenMetadata?.symbol || token.symbol}
        className="w-12 h-12 rounded-lg object-contain flex-shrink-0"
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    );
  }

  // Fallback: Show first letter of symbol
  return (
    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
      <span className="text-xl font-bold">
        {(tokenMetadata?.symbol || token.symbol)?.charAt(0) || '?'}
      </span>
    </div>
  );
};

export default TokenLogo;
