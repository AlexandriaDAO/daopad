import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import type { Identity } from '@dfinity/agent';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Copy, AlertCircle, Shield, Lock } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { getOrbitGovernanceService } from '../services/backend';
import PermissionsPage from '../pages/PermissionsPage';
import SecurityDashboard from './security/SecurityDashboard';

interface DAOSettingsProps {
  tokenCanisterId: Principal | string;
  identity: Identity | null;
  stationId?: Principal | string;
  tokenSymbol?: string;
  tokenId?: Principal | string;
}

interface SystemInfo {
  name: string;
  raw_rand_successful: boolean;
  cycles: bigint;
  last_upgrade_timestamp: bigint;
  upgrader_id: string;
  cycles_top_up_strategy?: CycleStrategy;
}

type CycleStrategy =
  | { Disabled: null }
  | { MintFromNativeToken: { account_name?: [string]; account_id: string } }
  | { WithdrawFromCyclesLedger: { account_name?: [string]; account_id: string } };

const DAOSettings: React.FC<DAOSettingsProps> = ({ tokenCanisterId, identity, stationId, tokenSymbol, tokenId }) => {
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showPermissions, setShowPermissions] = useState<boolean>(false);
    const [showSecurity, setShowSecurity] = useState<boolean>(false);

    useEffect(() => {
        const fetchSystemInfo = async () => {
            if (!tokenCanisterId) {
                setError('No token canister ID provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const governanceService = getOrbitGovernanceService(identity);
                const result = await governanceService.getSystemInfo(stationId);

                // Handle service response
                if (result.success) {
                    setSystemInfo(result.data);
                } else {
                    setError(result.error || 'Failed to fetch system information');
                }
            } catch (err) {
                console.error('Failed to fetch system info:', err);
                const errorMessage = err instanceof Error ? err.message : 'Failed to fetch system information';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchSystemInfo();
    }, [tokenCanisterId]);

    const copyToClipboard = (text: string): void => {
        navigator.clipboard.writeText(text);
        // TODO: Add toast notification here
    };

    const formatCycles = (cycles: bigint | number | null): string => {
        if (!cycles) return '0';
        const tc = Number(cycles) / 1e12;
        return `${tc.toFixed(3)} TC`;
    };

    const formatCycleStrategy = (strategy: CycleStrategy | undefined): string => {
        if (!strategy) return 'Unknown';

        if ('Disabled' in strategy) {
            return 'Disabled';
        }
        if ('MintFromNativeToken' in strategy) {
            const data = strategy.MintFromNativeToken;
            return `Mint from ICP account '${data.account_name?.[0] || data.account_id}'`;
        }
        if ('WithdrawFromCyclesLedger' in strategy) {
            const data = strategy.WithdrawFromCyclesLedger;
            return `Withdraw from Cycles Ledger '${data.account_name?.[0] || data.account_id}'`;
        }
        return 'Unknown';
    };

    const formatDate = (timestamp: bigint | number | null): string => {
        if (!timestamp) return 'Never';
        return new Date(Number(timestamp)).toLocaleString();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!systemInfo) {
        return (
            <Alert>
                <AlertDescription>No system information available</AlertDescription>
            </Alert>
        );
    }

    const info = systemInfo.system_info;

    return (
        <div className="space-y-6">
            {/* Station Information Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Station Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-muted-foreground">Station Name</label>
                                <div className="font-medium">{info.name}</div>
                            </div>

                            <div>
                                <label className="text-sm text-muted-foreground">Version</label>
                                <div className="font-medium">{info.version}</div>
                            </div>

                            <div className="col-span-2">
                                <label className="text-sm text-muted-foreground">Station ID</label>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                        {systemInfo.station_id.toText()}
                                    </code>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => copyToClipboard(systemInfo.station_id.toText())}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="col-span-2">
                                <label className="text-sm text-muted-foreground">Upgrader ID</label>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                        {info.upgrader_id.toText()}
                                    </code>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => copyToClipboard(info.upgrader_id.toText())}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="font-medium mb-2">Cycle Information</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-muted-foreground">Station Cycles</label>
                                    <div className="font-medium">{formatCycles(info.cycles)}</div>
                                </div>
                                {info.upgrader_cycles && info.upgrader_cycles[0] && (
                                    <div>
                                        <label className="text-sm text-muted-foreground">Upgrader Cycles</label>
                                        <div className="font-medium">
                                            {formatCycles(info.upgrader_cycles[0])}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-2">
                                <label className="text-sm text-muted-foreground">Cycle Obtain Strategy</label>
                                <div className="font-medium">
                                    {formatCycleStrategy(info.cycle_obtain_strategy)}
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <label className="text-sm text-muted-foreground">Last Upgrade</label>
                            <div className="font-medium">{formatDate(info.last_upgrade_timestamp)}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Disaster Recovery Card */}
            {info.disaster_recovery && info.disaster_recovery[0] && (
                <Card>
                    <CardHeader>
                        <CardTitle>Disaster Recovery</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div>
                                <label className="text-sm text-muted-foreground">User Group</label>
                                <div className="font-medium">
                                    {info.disaster_recovery[0].user_group_name?.[0] || 'Unnamed Group'}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Group ID</label>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                        {info.disaster_recovery[0].committee.user_group_id}
                                    </code>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => copyToClipboard(info.disaster_recovery[0].committee.user_group_id)}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Quorum Required</label>
                                <div className="font-medium">
                                    {info.disaster_recovery[0].committee.quorum} approval(s)
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Permissions Section (Collapsible) */}
            {stationId && tokenId && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                <CardTitle>Permissions</CardTitle>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPermissions(!showPermissions)}
                            >
                                {showPermissions ? 'Hide' : 'Load'} Permissions
                            </Button>
                        </div>
                        <CardDescription>
                            User groups, roles, and access control settings
                        </CardDescription>
                    </CardHeader>
                    {showPermissions && (
                        <CardContent>
                            <PermissionsPage
                                tokenId={tokenId}
                                stationId={stationId}
                                identity={identity}
                            />
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Security Section (Collapsible) */}
            {stationId && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Lock className="h-5 w-5" />
                                <CardTitle>Security Audit</CardTitle>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowSecurity(!showSecurity)}
                            >
                                {showSecurity ? 'Hide' : 'Run'} Security Checks
                            </Button>
                        </div>
                        <CardDescription>
                            Comprehensive DAO security analysis and admin controls
                        </CardDescription>
                    </CardHeader>
                    {showSecurity && (
                        <CardContent>
                            <SecurityDashboard
                                stationId={stationId}
                                tokenSymbol={tokenSymbol}
                                identity={identity}
                                tokenId={tokenId}
                            />
                        </CardContent>
                    )}
                </Card>
            )}
        </div>
    );
};

export default DAOSettings;