import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { OrbitSecurityService } from '../../services/backend/orbit/security/OrbitSecurityService';
import DAOTransitionChecklist from './DAOTransitionChecklist';

const SecurityDashboard = ({ stationId, tokenSymbol, identity, tokenId }) => {
    const [securityData, setSecurityData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('user-friendly'); // 'user-friendly' or 'technical'
    const [progressData, setProgressData] = useState({
        // Existing 8 checks
        admin_control: null,
        treasury_control: null,
        governance_permissions: null,
        proposal_policies: null,
        external_canisters: null,
        asset_management: null,
        system_configuration: null,
        operational_permissions: null,

        // NEW: 8 additional bypass detection checks
        controller_manipulation: null,
        external_canister_calls: null,
        system_restore: null,
        addressbook_injection: null,
        monitoring_drain: null,
        snapshot_operations: null,
        named_rule_bypass: null,
        remove_operations: null,
    });
    const [completedCount, setCompletedCount] = useState(0);

    const fetchSecurityStatus = async () => {
        if (!stationId || !identity) return;

        setLoading(true);
        setError(null);
        setCompletedCount(0);
        setProgressData({
            admin_control: null,
            treasury_control: null,
            governance_permissions: null,
            proposal_policies: null,
            external_canisters: null,
            asset_management: null,
            system_configuration: null,
            operational_permissions: null,
        });

        try {
            const securityService = new OrbitSecurityService(identity);

            // Progress callback to update UI as checks complete
            const onProgress = (progress) => {
                setProgressData(prev => ({
                    ...prev,
                    [progress.category]: progress,
                }));
                setCompletedCount(prev => prev + 1);
            };

            const result = await securityService.performComprehensiveSecurityCheck(
                stationId,
                onProgress
            );

            if (result.success) {
                setSecurityData(result.data);
            } else {
                setError(result.error || 'Failed to verify security status');
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
        }
    }, [stationId, identity]);


    if (loading) {
        return (
            <Card className="border shadow-sm">
                <CardContent className="py-8">
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                            <span className="text-gray-600">
                                Analyzing DAO security... ({completedCount}/16 checks complete)
                            </span>
                        </div>

                        {/* Show categories as they complete */}
                        <div className="max-w-md mx-auto space-y-2">
                            {Object.entries(progressData).map(([category, data]) => (
                                <div key={category} className="flex items-center gap-2 text-sm">
                                    {data ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            <span className="text-gray-700">
                                                {category.replace(/_/g, ' ')} ✓
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 animate-pulse" />
                                            <span className="text-gray-400">
                                                {category.replace(/_/g, ' ')}
                                            </span>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
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

    // Security dashboard showing DAO transition checklist
    return (
        <div className="w-full space-y-4">
            <DAOTransitionChecklist
                securityData={securityData}
                stationId={stationId}
                tokenSymbol={tokenSymbol}
                onRefresh={fetchSecurityStatus}
            />
        </div>
    );
};

export default SecurityDashboard;