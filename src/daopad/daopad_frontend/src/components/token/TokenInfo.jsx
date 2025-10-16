import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * TokenInfo Component
 *
 * Displays token name, selector (if multiple tokens), badges, and copy button
 *
 * @param {object} token - Current token object
 * @param {object|null} tokenMetadata - Token metadata
 * @param {array|null} tokens - Array of all tokens (for selector)
 * @param {number} activeTokenIndex - Index of active token
 * @param {function|null} onTokenChange - Callback when token selection changes
 * @param {object|null} tokenVotingPowers - Voting powers by token ID
 * @param {object} tokenUsdValues - USD values by token ID
 * @param {function} formatUsdValue - Function to format USD values
 */
const TokenInfo = ({
  token,
  tokenMetadata,
  tokens,
  activeTokenIndex,
  onTokenChange,
  tokenVotingPowers,
  tokenUsdValues,
  formatUsdValue
}) => {
  const [copyFeedback, setCopyFeedback] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token.canister_id);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex-1 min-w-0">
      {/* Token Name and Selector */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{tokenMetadata?.name || token.symbol}</h1>
        {tokens && tokens.length > 1 && (
          <Select
            value={activeTokenIndex?.toString() || "0"}
            onValueChange={(value) => onTokenChange && onTokenChange(Number(value))}
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tokens.map((t, index) => (
                <SelectItem key={t.canister_id} value={index.toString()}>
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span>{t.symbol}</span>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-mono">
                        {((tokenVotingPowers && tokenVotingPowers[t.canister_id]) || 0).toLocaleString()} VP
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatUsdValue(tokenUsdValues[t.canister_id] || 0)}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Badges and Copy Button */}
      <div className="flex items-center gap-2 mt-1">
        <Badge variant="outline">{tokenMetadata?.symbol || token.symbol}</Badge>
        <Badge variant="outline">{token.chain}</Badge>
        <code className="text-xs bg-muted px-2 py-1 rounded">{token.canister_id}</code>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 w-6 p-0"
          title="Copy canister ID"
        >
          {copyFeedback ? '✓' : '⧉'}
        </Button>
      </div>
    </div>
  );
};

export default TokenInfo;
