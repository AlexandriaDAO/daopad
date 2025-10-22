import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const TreasuryShowcase = () => {
  const treasuries = useSelector(state => state.dao.publicDashboard.treasuries);
  const [searchTerm, setSearchTerm] = useState('');
  const hasPartialData = useSelector(state => state.dao.publicDashboard.hasPartialData);
  const isLoading = useSelector(state => state.dao.publicDashboard.isLoading);

  // Handle the actual tuple format [Principal, Principal] from the backend
  const filteredTreasuries = useMemo(() => {
    if (!treasuries || treasuries.length === 0) return [];

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = normalizedSearch
      ? treasuries.filter(({ tokenId }) =>
          (tokenId || '').toLowerCase().includes(normalizedSearch))
      : treasuries;

    return filtered.slice(0, 10);
  }, [treasuries, searchTerm]);

  return (
    <Card className="border-executive-gold/20">
      <CardHeader>
        <CardTitle className="font-display text-executive-ivory">
          Token Treasuries
        </CardTitle>
        <Input
          className="mt-2 bg-executive-darkGray border-executive-gold/30
                     text-executive-lightGray placeholder:text-executive-lightGray/40"
          placeholder="Search by token ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </CardHeader>
      <CardContent>
        {isLoading && !treasuries ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-executive-darkGray/30 rounded animate-pulse" />
            ))}
          </div>
        ) : hasPartialData && (!treasuries || treasuries.length === 0) ? (
          <p className="text-executive-lightGray/60 text-center py-8">
            Treasury data temporarily unavailable
          </p>
        ) : filteredTreasuries.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredTreasuries.map(({ tokenId, stationId }) => (
              <div
                key={tokenId}
                className="flex justify-between items-center p-2
                          bg-executive-darkGray/30 rounded
                          border border-executive-gold/10
                          hover:bg-executive-darkGray/50 transition-colors"
                data-testid="treasury-item"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-executive-lightGray">
                    Token: {tokenId.slice(0, 8)}...{tokenId.slice(-4)}
                  </span>
                  <span className="text-xs text-executive-lightGray/40">
                    Station: {stationId.slice(0, 8)}...
                  </span>
                </div>
                <Badge className="bg-executive-gold/20 text-executive-goldLight
                                border-executive-gold/30">
                  Active
                </Badge>
              </div>
            ))}
            {treasuries.length > 10 && (
              <p className="text-xs text-executive-lightGray/40 text-center pt-2">
                Showing 10 of {treasuries.length} treasuries
              </p>
            )}
          </div>
        ) : (
          <p className="text-executive-lightGray/60 text-center py-4">
            {searchTerm ? "No treasuries match your search" : "No treasuries created yet"}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TreasuryShowcase;
