import React from 'react';
import { Globe, Coins, Bitcoin, type LucideIcon } from 'lucide-react';

interface BlockchainConfig {
  name: string;
  symbol: string;
  color: string;
  icon: LucideIcon;
}

const BLOCKCHAIN_CONFIG: Record<string, BlockchainConfig> = {
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

interface BlockchainIconProps {
  blockchain: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const BlockchainIcon: React.FC<BlockchainIconProps> = ({ blockchain, size = 'md', showLabel = false, className = '' }) => {
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