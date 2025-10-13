import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStationService } from '@/hooks/useStationService';
import { useActiveStation } from '@/hooks/useActiveStation';
import { PageLayout } from '@/components/orbit/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Shield,
  Activity,
  DollarSign,
  Coins
} from 'lucide-react';
import { RecentRequests } from '@/components/orbit/RecentRequests';
import { GovernanceMetrics } from '@/components/orbit/dashboard/GovernanceMetrics';
import { TreasuryOverview } from '@/components/orbit/dashboard/TreasuryOverview';
import { ActivityFeed } from '@/components/orbit/dashboard/ActivityFeed';
import { cn } from '@/lib/utils';

export function DashboardPage() {
  const navigate = useNavigate();
  const { activeStation, isLoading: stationLoading } = useActiveStation();
  const stationService = useStationService();

  // Local state for dashboard data (replacing React Query)
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    if (!activeStation?.station_id || !stationService) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch multiple data points in parallel
      const [assets, metrics, recentActivity] = await Promise.all([
        stationService.listDashboardAssets(),
        stationService.getGovernanceMetrics(),
        stationService.getRecentActivity({ limit: BigInt(10) })
      ]);

      setDashboardData({
        assets: assets || [],
        metrics: metrics || {},
        recentActivity: recentActivity || []
      });
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [activeStation?.station_id, stationService]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Refetch every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboard();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Calculate aggregated metrics
  const aggregatedMetrics = useMemo(() => {
    if (!dashboardData) {
      return {
        totalValue: 0,
        totalAccounts: 0,
        activeAssets: 0,
        pendingRequests: 0,
        approvalRate: 0,
        avgApprovalTime: 0
      };
    }

    const { assets, metrics } = dashboardData;

    // Calculate total value across all assets
    const totalValue = assets.reduce((sum, asset) => {
      return sum + (Number(asset.totalBalance || 0) * Number(asset.price || 0));
    }, 0);

    // Count unique accounts
    const uniqueAccounts = new Set();
    assets.forEach(asset => {
      asset.accountAssets?.forEach(aa => {
        uniqueAccounts.add(aa.account.id);
      });
    });

    return {
      totalValue,
      totalAccounts: uniqueAccounts.size,
      activeAssets: assets.filter(a => a.totalBalance > 0).length,
      pendingRequests: metrics.pendingRequests || 0,
      approvalRate: metrics.approvalRate || 0,
      avgApprovalTime: metrics.avgApprovalTime || 0
    };
  }, [dashboardData]);

  if (!activeStation) {
    return (
      <PageLayout title="Dashboard">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Please select a token with an Orbit Station to view the dashboard
            </p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const loading = stationLoading || isLoading;
  const data = dashboardData;

  return (
    <PageLayout title="Dashboard">
      {/* Recent Requests Widget */}
      <RecentRequests domain="All" />

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Treasury Value"
          value={`$${aggregatedMetrics.totalValue.toLocaleString()}`}
          icon={DollarSign}
          trend={data?.metrics?.treasuryTrend}
          loading={loading}
        />
        <MetricCard
          title="Active Assets"
          value={aggregatedMetrics.activeAssets}
          icon={Coins}
          description={`Across ${aggregatedMetrics.totalAccounts} accounts`}
          loading={loading}
        />
        <MetricCard
          title="Pending Requests"
          value={aggregatedMetrics.pendingRequests}
          icon={Activity}
          trend={data?.metrics?.requestTrend}
          loading={loading}
        />
        <MetricCard
          title="Approval Rate"
          value={`${Math.round(aggregatedMetrics.approvalRate)}%`}
          icon={Shield}
          description="Last 30 days"
          loading={loading}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="treasury" className="space-y-4">
        <TabsList>
          <TabsTrigger value="treasury">Treasury</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="treasury" className="space-y-4">
          <TreasuryOverview
            assets={data?.assets || []}
            loading={loading}
            onTransfer={(account, asset) => {
              navigate(`/accounts/${account.id}/transfer`, {
                state: { asset }
              });
            }}
            onViewAccount={(account) => {
              navigate(`/accounts/${account.id}`);
            }}
          />
        </TabsContent>

        <TabsContent value="governance" className="space-y-4">
          <GovernanceMetrics
            metrics={data?.metrics || {}}
            loading={loading}
            onViewRequests={() => navigate('/requests')}
            onViewPolicies={() => navigate('/settings/policies')}
          />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <ActivityFeed
            activities={data?.recentActivity || []}
            loading={loading}
            onViewDetails={(activity) => {
              if (activity.type === 'request') {
                navigate(`/requests/${activity.id}`);
              } else if (activity.type === 'transfer') {
                navigate(`/transfers/${activity.id}`);
              }
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/transfers/new')}
            >
              <Wallet className="w-4 h-4 mr-2" />
              New Transfer
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/users/new')}
            >
              <Users className="w-4 h-4 mr-2" />
              Add User
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/accounts/new')}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Add Account
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/settings')}
            >
              <Shield className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}

// Metric Card Component
function MetricCard({ title, value, icon: Icon, trend, description, loading }) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-lg",
            trend > 0 ? "bg-green-50" :
            trend < 0 ? "bg-red-50" :
            "bg-muted"
          )}>
            <Icon className={cn(
              "w-5 h-5",
              trend > 0 ? "text-green-600" :
              trend < 0 ? "text-red-600" :
              "text-muted-foreground"
            )} />
          </div>
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className="flex items-center gap-1 mt-2">
            {trend > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={cn(
              "text-xs font-medium",
              trend > 0 ? "text-green-600" : "text-red-600"
            )}>
              {Math.abs(trend)}%
            </span>
            <span className="text-xs text-muted-foreground">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}