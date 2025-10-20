import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const VP_TO_USD_RATIO = 100;

/**
 * VotingPowerDisplay Component
 *
 * Displays voting power, USD value, and ownership percentage with tooltip
 *
 * @param {number} totalUsdValue - Total USD value of LP positions
 * @param {number} votingPower - User's voting power
 * @param {number|null} totalVotingPower - Total network voting power
 * @param {string|null} vpPercentage - Ownership percentage (formatted)
 * @param {function} formatUsdValue - Function to format USD values
 * @param {object|null} orbitStation - Orbit station info (if linked)
 * @param {string|null} daoStatus - DAO status: 'real', 'pseudo', or 'invalid'
 */
const VotingPowerDisplay = ({
  totalUsdValue,
  votingPower,
  totalVotingPower,
  vpPercentage,
  formatUsdValue,
  orbitStation,
  daoStatus
}) => {
  return (
    <div className="text-right flex-shrink-0">
      {/* Primary: USD Value with Ownership Percentage */}
      <div className="flex flex-col items-end gap-1">
        <div className="text-2xl font-bold text-green-600">
          {formatUsdValue(totalUsdValue)}
          {vpPercentage && (
            <span className="text-base font-normal text-muted-foreground ml-2">
              ({vpPercentage}%)
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          LP Value
          {vpPercentage && (
            <span className="ml-1">• {vpPercentage}% ownership</span>
          )}
        </div>
      </div>

      {/* Secondary: VP with tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mt-2">
              <div className="text-lg font-mono cursor-help border-b border-dotted border-muted-foreground inline-block">
                {votingPower.toLocaleString()} VP
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Voting Power = USD Value × 100</p>
            <p className="text-xs text-muted-foreground">
              ${((votingPower || 0) / VP_TO_USD_RATIO).toLocaleString()} × 100 = {votingPower.toLocaleString()} VP
            </p>
            {totalVotingPower && (
              <p className="text-xs text-muted-foreground mt-1">
                Total network VP: {totalVotingPower.toLocaleString()}
              </p>
            )}
            {vpPercentage && (
              <p className="text-xs text-muted-foreground mt-1">
                Your ownership: {vpPercentage}% of total
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* DAO Status Badge */}
      {orbitStation && daoStatus && (
        <div className="mt-2">
          {daoStatus === 'real' && <Badge className="bg-green-100 text-green-800">✓ Decentralized</Badge>}
          {daoStatus === 'pseudo' && <Badge className="bg-yellow-100 text-yellow-800">⚠️ Pseudo-DAO</Badge>}
          {daoStatus === 'invalid' && <Badge className="bg-red-100 text-red-800">✗ Invalid</Badge>}
        </div>
      )}
    </div>
  );
};

export default VotingPowerDisplay;
