import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { DAOPadBackendService } from '../../services/daopadBackend';
import DAOTransitionChecklist from './DAOTransitionChecklist';
import VotingTierDisplay from '../permissions/VotingTierDisplay';
import VotingPowerSync from '../permissions/VotingPowerSync';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const SecurityDashboard = ({ stationId, tokenSymbol, identity, tokenId }) => {
    const [securityData, setSecurityData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('user-friendly'); // 'user-friendly' or 'technical'
    const [actor, setActor] = useState(null);

    const fetchSecurityStatus = async () => {
        if (!stationId || !identity) return;

        setLoading(true);
        setError(null);

        try {
            const daopadService = new DAOPadBackendService(identity);
            const result = await daopadService.performSecurityCheck(stationId);

            if (result.success) {
                setSecurityData(result.data);
            } else {
                setError(result.message || 'Failed to verify security status');
            }
        } catch (err) {
            console.error('Security check failed:', err);
            setError('Failed to verify security status. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (stationId && identity) {
            fetchSecurityStatus();
            // Initialize actor for backend calls
            const daopadService = new DAOPadBackendService(identity);
            setActor(daopadService.actor);
        }
    }, [stationId, identity]);


    if (loading) {
        return (
            <Card className="border shadow-sm">
                <CardContent className="py-8">
                    <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                        <span className="text-gray-600">Analyzing your DAO transition status...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive" className="border-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!securityData) return null;

    // Enhanced security dashboard with voting tiers
    return (
        <Tabs defaultValue="transition" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="transition">DAO Transition</TabsTrigger>
                <TabsTrigger value="voting">Voting Tiers</TabsTrigger>
                <TabsTrigger value="sync">VP Sync</TabsTrigger>
            </TabsList>

            <TabsContent value="transition" className="space-y-4">
                <DAOTransitionChecklist
                    securityData={securityData}
                    stationId={stationId}
                    tokenSymbol={tokenSymbol}
                    onRefresh={fetchSecurityStatus}
                />
            </TabsContent>

            <TabsContent value="voting" className="space-y-4">
                <VotingTierDisplay
                    tokenId={tokenId}
                    actor={actor}
                    identity={identity}
                />
            </TabsContent>

            <TabsContent value="sync" className="space-y-4">
                <VotingPowerSync
                    tokenId={tokenId}
                    actor={actor}
                    stationId={stationId}
                />
            </TabsContent>
        </Tabs>
    );
};

export default SecurityDashboard;