import React from 'react';
import { Globe, Coins, Bitcoin } from 'lucide-react';

const BLOCKCHAIN_CONFIG = {
  icp: {
    name: 'Internet Computer',
    symbol: 'ICP',
    color: '#29ABE2',
    icon: Globe
  },
  eth: {
    name: 'Ethereum',
    symbol: 'ETH',
    color: '#627EEA',
    icon: Coins
  },
  btc: {
    name: 'Bitcoin',
    symbol: 'BTC',
    color: '#F7931A',
    icon: Bitcoin
  }
};

const BlockchainIcon = ({ blockchain, size = 'md', showLabel = false, className = '' }) => {
  const config = BLOCKCHAIN_CONFIG[blockchain] || BLOCKCHAIN_CONFIG.icp;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Icon
        className={sizeClasses[size]}
        style={{ color: config.color }}
      />
      {showLabel && (
        <span className="text-sm font-medium">
          {config.symbol}
        </span>
      )}
    </div>
  );
};

export default BlockchainIcon;