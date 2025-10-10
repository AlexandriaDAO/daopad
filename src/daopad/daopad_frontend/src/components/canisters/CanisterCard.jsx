import { useState, useEffect } from 'react';
import { canisterService } from '../../services/canisterService';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ArrowUpCircle, Settings, Activity, AlertCircle } from 'lucide-react';

export default function CanisterCard({ canister, onTopUp, onConfigure }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canister?.canister_id) {
      fetchStatus();
    }
  }, [canister?.canister_id]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      // Use Principal for IC management canister calls
      const result = await canisterService.getCanisterStatus(
        canister.canister_id  // This is the Principal
      );
      if (result.success) {
        setStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCycles = (cycles) => {
    if (!cycles) return '0 T';
    const trillion = Number(BigInt(cycles)) / 1e12;
    return `${trillion.toFixed(2)} T`;
  };

  const getCyclesColor = (cycles) => {
    const trillion = Number(BigInt(cycles || 0)) / 1e12;
    if (trillion < 1) return 'text-red-500';
    if (trillion < 5) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getCyclesBadgeVariant = (cycles) => {
    const trillion = Number(BigInt(cycles || 0)) / 1e12;
    if (trillion < 1) return 'destructive';
    if (trillion < 5) return 'warning';
    return 'default';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {canister.name}
            </CardTitle>
            <p className="text-xs text-gray-500 font-mono mt-1">
              ID: {canister.id?.substring(0, 8)}...
            </p>
          </div>
          <Badge variant={(canister.state && 'Active' in canister.state) ? 'default' : 'secondary'}>
            {(canister.state && 'Active' in canister.state) ? 'Active' : 'Archived'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Canister Principal */}
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Canister Principal:</p>
          <p className="text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
            {canister.canister_id}
          </p>
        </div>

        {/* Cycles Display */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">Cycles</span>
            {loading ? (
              <span className="text-sm animate-pulse">Loading...</span>
            ) : (
              <span className={`text-sm font-semibold ${getCyclesColor(status?.cycles)}`}>
                {formatCycles(status?.cycles)}
              </span>
            )}
          </div>
          {status && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  getCyclesColor(status.cycles).replace('text-', 'bg-')
                }`}
                style={{
                  width: `${Math.min(100, (Number(BigInt(status.cycles || 0)) / 1e13) * 100)}%`
                }}
              />
            </div>
          )}
        </div>

        {/* Memory & Status */}
        {status && (
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>Memory: {(Number(BigInt(status.memory_size || 0)) / 1e6).toFixed(2)} MB</span>
            </div>
            {status.module_hash && (
              <p className="font-mono">Module: {
                typeof status.module_hash === 'string'
                  ? status.module_hash.substring(0, 8)
                  : Array.isArray(status.module_hash) && status.module_hash.length > 0
                    ? status.module_hash[0].substring(0, 8)
                    : 'unknown'
              }...</p>
            )}
          </div>
        )}

        {/* Monitoring Status */}
        {canister.monitoring && (
          <div className="flex items-center gap-1 text-xs">
            <AlertCircle className="h-3 w-3 text-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Auto-funding enabled
            </span>
          </div>
        )}

        {/* Labels */}
        {canister.labels?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {canister.labels.map(label => (
              <Badge key={label} variant="outline" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          onClick={onTopUp}
          size="sm"
          className="flex-1"
          variant="outline"
        >
          <ArrowUpCircle className="h-4 w-4 mr-1" />
          Top Up
        </Button>
        <Button
          onClick={onConfigure}
          size="sm"
          className="flex-1"
        >
          <Settings className="h-4 w-4 mr-1" />
          Manage
        </Button>
      </CardFooter>
    </Card>
  );
}