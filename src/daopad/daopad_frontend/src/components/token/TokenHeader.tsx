import React from 'react';
import TokenLogo from './TokenLogo';
import TokenInfo from './TokenInfo';
import VotingPowerDisplay from './VotingPowerDisplay';

/**
 * TokenHeader Component
 *
 * Unified header displaying token logo, info, and voting power
 *
 * @param {object} token - Current token object
 * @param {object|null} tokenMetadata - Token metadata
 * @param {array|null} tokens - Array of all tokens
 * @param {number} activeTokenIndex - Index of active token
 * @param {function|null} onTokenChange - Token selection callback
 * @param {object|null} tokenVotingPowers - Voting powers by token ID
 * @param {object} tokenUsdValues - USD values by token ID
 * @param {number} totalUsdValue - Total USD value
 * @param {number} votingPower - User's voting power
 * @param {number|null} totalVotingPower - Total network voting power
 * @param {string|null} vpPercentage - Ownership percentage
 * @param {function} formatUsdValue - USD formatting function
 * @param {object|null} orbitStation - Orbit station info
 * @param {string|null} daoStatus - DAO status
 */
const TokenHeader = ({
  token,
  tokenMetadata,
  tokens,
  activeTokenIndex,
  onTokenChange,
  tokenVotingPowers,
  tokenUsdValues,
  totalUsdValue,
  votingPower,
  totalVotingPower,
  vpPercentage,
  formatUsdValue,
  orbitStation,
  daoStatus
}) => {
  return (
    <header className="flex items-center gap-4 pb-4 border-b">
      <TokenLogo token={token} tokenMetadata={tokenMetadata} />

      <TokenInfo
        token={token}
        tokenMetadata={tokenMetadata}
        tokens={tokens}
        activeTokenIndex={activeTokenIndex}
        onTokenChange={onTokenChange}
        tokenVotingPowers={tokenVotingPowers}
        tokenUsdValues={tokenUsdValues}
        formatUsdValue={formatUsdValue}
      />

      <VotingPowerDisplay
        totalUsdValue={totalUsdValue}
        votingPower={votingPower}
        totalVotingPower={totalVotingPower}
        vpPercentage={vpPercentage}
        formatUsdValue={formatUsdValue}
        orbitStation={orbitStation}
        daoStatus={daoStatus}
      />
    </header>
  );
};

export default TokenHeader;
