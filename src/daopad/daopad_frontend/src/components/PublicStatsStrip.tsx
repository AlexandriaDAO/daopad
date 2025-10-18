import React from 'react';
import { useSelector } from 'react-redux';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface RootState {
  dao: {
    publicDashboard: {
      stats: any;
      isLoading: boolean;
      lastUpdated: number | null;
      hasPartialData: boolean;
    };
  };
}

interface StatCardProps {
  label: string;
  value: number | string;
  loading: boolean;
}

const PublicStatsStrip: React.FC = () => {
  const stats = useSelector((state: RootState) => state.dao.publicDashboard.stats);
  const isLoading = useSelector((state: RootState) => state.dao.publicDashboard.isLoading);
  const lastUpdated = useSelector((state: RootState) => state.dao.publicDashboard.lastUpdated);
  const hasPartialData = useSelector((state: RootState) => state.dao.publicDashboard.hasPartialData);

  const StatCard: React.FC<StatCardProps> = ({ label, value, loading }) => (
    <Card className="bg-executive-darkGray/50 border-executive-gold/20 p-4">
      <p className="text-xs text-executive-lightGray/60 uppercase tracking-wider mb-1">
        {label}
      </p>
      {loading ? (
        <Skeleton className="h-8 w-20 bg-executive-mediumGray" />
      ) : (
        <p className="text-2xl font-display text-executive-gold">
          {value.toLocaleString()}
        </p>
      )}
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Participants"
          value={stats?.participants || 0}
          loading={isLoading && !stats}
        />
        <StatCard
          label="Active Proposals"
          value={stats?.activeProposals || 0}
          loading={isLoading && !stats}
        />
        <StatCard
          label="Treasuries"
          value={stats?.treasuries || 0}
          loading={isLoading && !stats}
        />
        <StatCard
          label="Registered Voters"
          value={stats?.registeredVoters || 0}
          loading={isLoading && !stats}
        />
      </div>

      {lastUpdated && (
        <p className="text-xs text-executive-lightGray/40 text-center">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          {hasPartialData && " (some data unavailable)"}
        </p>
      )}
    </div>
  );
};

export default PublicStatsStrip;