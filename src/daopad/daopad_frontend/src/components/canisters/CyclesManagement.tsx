import React, { useState, useEffect } from 'react';
import { canisterService } from '../../services/canisterService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Switch } from '../ui/switch';
import { Progress } from '../ui/progress';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Zap,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Activity,
  Settings,
  RefreshCw
} from 'lucide-react';

export default function CyclesManagement({ canisters, orbitStationId, onRefresh }) {
  const [stats, setStats] = useState({
    totalCycles: 0n,
    totalCanisters: 0,
    lowBalanceCount: 0,
    averageCycles: 0n
  });
  const [monitoringRules, setMonitoringRules] = useState([]);
  const [selectedCanister, setSelectedCanister] = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    calculateStats();
  }, [canisters]);

  const calculateStats = () => {
    if (!canisters || canisters.length === 0) return;

    let total = 0n;
    let lowCount = 0;
    const threshold = BigInt(1e12); // 1T cycles

    canisters.forEach(canister => {
      if (canister.cycles) {
        total += BigInt(canister.cycles);
        if (BigInt(canister.cycles) < threshold) {
          lowCount++;
        }
      }
    });

    const avg = canisters.length > 0 ? total / BigInt(canisters.length) : 0n;

    setStats({
      totalCycles: total,
      totalCanisters: canisters.length,
      lowBalanceCount: lowCount,
      averageCycles: avg
    });
  };

  const formatCycles = (cycles) => {
    if (!cycles) return '0 T';
    const trillion = Number(cycles) / 1e12;
    return `${trillion.toFixed(3)} T`;
  };

  const handleFundCanister = async () => {
    if (!selectedCanister || !fundAmount) {
      setError('Please select a canister and enter an amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cycles = BigInt(parseFloat(fundAmount) * 1e12);
      const result = await canisterService.fundCanister(
        orbitStationId,
        selectedCanister.id,
        cycles
      );

      if (result.Ok) {
        alert('Funding request created successfully');
        setFundAmount('');
        setSelectedCanister(null);
        onRefresh();
      } else {
        setError(result.Err?.message || 'Failed to fund canister');
      }
    } catch (err) {
      console.error('Funding error:', err);
      setError('Failed to create funding request');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkFund = async () => {
    const lowBalanceCanisters = canisters.filter(c =>
      c.cycles && BigInt(c.cycles) < BigInt(1e12)
    );

    if (lowBalanceCanisters.length === 0) {
      alert('No canisters with low balance');
      return;
    }

    if (!confirm(`Fund ${lowBalanceCanisters.length} canisters with low balance?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fundAmount = BigInt(5e12); // 5T cycles each
      const promises = lowBalanceCanisters.map(canister =>
        canisterService.fundCanister(orbitStationId, canister.id, fundAmount)
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      alert(`Created ${successful} funding requests`);
      onRefresh();
    } catch (err) {
      console.error('Bulk funding error:', err);
      setError('Failed to create funding requests');
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for charts
  const pieData = canisters.map(c => ({
    name: c.name,
    value: Number(c.cycles || 0) / 1e12
  }));

  const barData = canisters
    .sort((a, b) => Number(b.cycles || 0) - Number(a.cycles || 0))
    .slice(0, 10)
    .map(c => ({
      name: c.name.substring(0, 15),
      cycles: Number(c.cycles || 0) / 1e12
    }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cycles</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCycles(stats.totalCycles)}</div>
            <p className="text-xs text-muted-foreground">
              Across {stats.totalCanisters} canisters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCycles(stats.averageCycles)}</div>
            <p className="text-xs text-muted-foreground">
              Per canister
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Balance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowBalanceCount}</div>
            <p className="text-xs text-muted-foreground">
              Below 1T cycles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">~0.5 T</div>
            <p className="text-xs text-muted-foreground">
              Based on usage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cycles Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Cycles Distribution</CardTitle>
            <CardDescription>
              How cycles are distributed across canisters
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={entry => `${entry.name}: ${entry.value.toFixed(1)}T`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(2)}T`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Canisters by Cycles */}
        <Card>
          <CardHeader>
            <CardTitle>Top Canisters by Balance</CardTitle>
            <CardDescription>
              Canisters with highest cycles balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toFixed(2)}T`} />
                  <Bar dataKey="cycles" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manual Funding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Manual Funding
          </CardTitle>
          <CardDescription>
            Send cycles to specific canisters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="canister-select">Select Canister</Label>
              <select
                id="canister-select"
                className="w-full mt-2 p-2 border rounded"
                value={selectedCanister?.id || ''}
                onChange={(e) => {
                  const canister = canisters.find(c => c.id === e.target.value);
                  setSelectedCanister(canister);
                }}
              >
                <option value="">Choose a canister...</option>
                {canisters.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({formatCycles(c.cycles)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="fund-amount">Amount (in T)</Label>
              <Input
                id="fund-amount"
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="5"
                step="0.1"
                className="mt-2"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleFundCanister}
                disabled={loading || !selectedCanister || !fundAmount}
                className="w-full"
              >
                <Zap className="h-4 w-4 mr-2" />
                Fund Canister
              </Button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleBulkFund}
              disabled={loading || stats.lowBalanceCount === 0}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Fund All Low Balance Canisters ({stats.lowBalanceCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Auto-Funding Rules
          </CardTitle>
          <CardDescription>
            Configure automatic cycles monitoring and funding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {canisters.map(canister => (
              <div key={canister.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{canister.name}</p>
                  <p className="text-sm text-gray-600">
                    Current: {formatCycles(canister.cycles)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    {canister.monitoring?.strategy || 'Not configured'}
                  </div>
                  <Switch
                    checked={!!canister.monitoring}
                    onCheckedChange={(checked) => {
                      // TODO: Configure monitoring
                      console.log('Configure monitoring for', canister.id, checked);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded">
            <h4 className="font-medium mb-2">Available Strategies</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Always:</strong> Top up immediately when below threshold</li>
              <li>• <strong>Below Threshold:</strong> Top up when cycles fall below minimum</li>
              <li>• <strong>Estimated Runtime:</strong> Top up based on burn rate</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}