import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import {
  BarChart3,
  TrendingUp,
  Users,
  Info,
  Activity,
  PieChart,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { Principal } from '@dfinity/principal';

const VotingAnalytics = ({ tokenId, actor }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('current'); // current, historical

  // Mock data for demonstration - would be fetched from backend
  const mockAnalyticsData = {
    current: {
      totalUsers: 156,
      totalVotingPower: 1234567,
      tierDistribution: {
        whales: { count: 5, percentage: 3.2, totalVP: 850000 },
        dolphins: { count: 23, percentage: 14.7, totalVP: 300000 },
        members: { count: 48, percentage: 30.8, totalVP: 80000 },
        none: { count: 80, percentage: 51.3, totalVP: 4567 }
      },
      topHolders: [
        { principal: 'xyz...abc', tier: 'Whale', votingPower: 250000, percentage: 20.3 },
        { principal: 'abc...def', tier: 'Whale', votingPower: 180000, percentage: 14.6 },
        { principal: 'def...ghi', tier: 'Whale', votingPower: 150000, percentage: 12.2 },
        { principal: 'ghi...jkl', tier: 'Whale', votingPower: 120000, percentage: 9.7 },
        { principal: 'jkl...mno', tier: 'Whale', votingPower: 100000, percentage: 8.1 }
      ],
      thresholdProximity: [
        { principal: 'aaa...bbb', currentVP: 950, targetTier: 'Dolphin', vpNeeded: 50, progress: 95 },
        { principal: 'ccc...ddd', currentVP: 9500, targetTier: 'Whale', vpNeeded: 500, progress: 95 },
        { principal: 'eee...fff', currentVP: 85, targetTier: 'Member', vpNeeded: 15, progress: 85 },
        { principal: 'ggg...hhh', currentVP: 2800, targetTier: 'Whale', vpNeeded: 7200, progress: 28 }
      ],
      averageVP: 7913,
      medianVP: 450,
      giniCoefficient: 0.72, // Wealth concentration metric
      activeParticipation: 48.7 // % of VP holders who voted recently
    },
    trends: {
      last30Days: {
        newWhales: 2,
        newDolphins: 5,
        newMembers: 12,
        totalNewUsers: 25,
        vpGrowth: 15.3,
        tierChanges: [
          { from: 'Dolphin', to: 'Whale', count: 2 },
          { from: 'Member', to: 'Dolphin', count: 5 },
          { from: 'None', to: 'Member', count: 12 }
        ]
      }
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [tokenId, actor, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // In production, fetch from backend
      // const result = await actor.get_voting_analytics(Principal.fromText(tokenId));

      // Using mock data for now
      setTimeout(() => {
        setAnalyticsData(mockAnalyticsData);
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
      setLoading(false);
    }
  };

  const getGiniInterpretation = (gini) => {
    if (gini < 0.3) return { label: 'Low concentration', color: 'text-green-600' };
    if (gini < 0.6) return { label: 'Moderate concentration', color: 'text-yellow-600' };
    return { label: 'High concentration', color: 'text-red-600' };
  };

  const getTierColor = (tier) => {
    const colors = {
      Whale: 'bg-blue-500',
      Dolphin: 'bg-cyan-500',
      Member: 'bg-green-500',
      None: 'bg-gray-400'
    };
    return colors[tier] || 'bg-gray-400';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <Activity className="h-5 w-5 animate-pulse text-blue-500" />
            <span className="text-gray-600">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!analyticsData) return null;

  const { current, trends } = analyticsData;
  const giniInterpretation = getGiniInterpretation(current.giniCoefficient);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{current.totalUsers}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  {trends.last30Days.totalNewUsers} new
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total VP</p>
                <p className="text-2xl font-bold">{(current.totalVotingPower / 1000).toFixed(0)}K</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  {trends.last30Days.vpGrowth}% growth
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Rate</p>
                <p className="text-2xl font-bold">{current.activeParticipation}%</p>
                <p className="text-xs text-gray-500 mt-1">Recent voters</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Gini Index</p>
                <p className="text-2xl font-bold">{current.giniCoefficient}</p>
                <p className={`text-xs mt-1 ${giniInterpretation.color}`}>
                  {giniInterpretation.label}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Voting Power Analytics
          </CardTitle>
          <CardDescription>
            Detailed breakdown of voting power distribution and trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="distribution" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="topholders">Top Holders</TabsTrigger>
              <TabsTrigger value="proximity">Near Threshold</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            {/* Distribution Tab */}
            <TabsContent value="distribution" className="space-y-4">
              <div className="space-y-4">
                {/* Tier Distribution */}
                <div className="space-y-3">
                  <h4 className="font-medium">Tier Distribution</h4>
                  {Object.entries(current.tierDistribution).map(([tier, data]) => (
                    <div key={tier} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {tier === 'whales' ? '🐋' : tier === 'dolphins' ? '🐬' : tier === 'members' ? '👥' : '👤'}
                          </span>
                          <span className="font-medium capitalize">{tier}</span>
                          <Badge variant="secondary" className="text-xs">
                            {data.count} users
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{(data.totalVP / 1000).toFixed(0)}K VP</p>
                          <p className="text-xs text-gray-500">{data.percentage}% of users</p>
                        </div>
                      </div>
                      <Progress value={data.percentage} className="h-2" />
                    </div>
                  ))}
                </div>

                {/* VP Statistics */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-600">Average VP</p>
                    <p className="text-xl font-bold">{current.averageVP.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Median VP</p>
                    <p className="text-xl font-bold">{current.medianVP.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Top Holders Tab */}
            <TabsContent value="topholders" className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-medium">Top 5 VP Holders</h4>
                {current.topHolders.map((holder, idx) => (
                  <Card key={idx} className="border-l-4" style={{ borderLeftColor: idx === 0 ? '#f59e0b' : '#3b82f6' }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold text-gray-400">#{idx + 1}</div>
                          <div>
                            <p className="font-mono text-sm">{holder.principal}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={idx === 0 ? 'default' : 'secondary'}>
                                {holder.tier}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {holder.percentage}% of total VP
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{(holder.votingPower / 1000).toFixed(0)}K VP</p>
                          <p className="text-xs text-gray-500">${(holder.votingPower / 100).toFixed(0)} locked</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Proximity Tab */}
            <TabsContent value="proximity" className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  These users are close to reaching the next tier threshold.
                  Consider reaching out to encourage additional LP locking.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {current.thresholdProximity.map((user, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-sm">{user.principal}</p>
                          <Badge className={getTierColor(user.targetTier)}>
                            → {user.targetTier}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Progress to {user.targetTier}</span>
                            <span className="font-medium">{user.progress}%</span>
                          </div>
                          <Progress value={user.progress} className="h-2" />
                          <p className="text-xs text-gray-500">
                            Current: {user.currentVP} VP • Needs: {user.vpNeeded} more VP (${(user.vpNeeded / 100).toFixed(2)})
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">Last 30 Days</h4>

                {/* New Tier Members */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="border-blue-200">
                    <CardContent className="p-4 text-center">
                      <span className="text-2xl">🐋</span>
                      <p className="text-2xl font-bold text-blue-600">+{trends.last30Days.newWhales}</p>
                      <p className="text-xs text-gray-600">New Whales</p>
                    </CardContent>
                  </Card>
                  <Card className="border-cyan-200">
                    <CardContent className="p-4 text-center">
                      <span className="text-2xl">🐬</span>
                      <p className="text-2xl font-bold text-cyan-600">+{trends.last30Days.newDolphins}</p>
                      <p className="text-xs text-gray-600">New Dolphins</p>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200">
                    <CardContent className="p-4 text-center">
                      <span className="text-2xl">👥</span>
                      <p className="text-2xl font-bold text-green-600">+{trends.last30Days.newMembers}</p>
                      <p className="text-xs text-gray-600">New Members</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tier Transitions */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Tier Transitions</h5>
                  {trends.last30Days.tierChanges.map((change, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{change.from}</Badge>
                        <ArrowUp className="h-4 w-4 text-green-500" />
                        <Badge className={getTierColor(change.to)}>{change.to}</Badge>
                      </div>
                      <span className="text-sm font-medium">{change.count} users</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default VotingAnalytics;