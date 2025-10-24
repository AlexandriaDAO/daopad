import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Shield, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { OrbitPermissionService } from '../../services/backend/orbit/permissions/OrbitPermissionService';
import { toast } from 'sonner';

export default function PermissionFixActions({ tokenId, stationId, identity }) {
    const isAnonymous = !identity;
    const [permissions, setPermissions] = useState([]);
    const [criticalIssues, setCriticalIssues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fixing, setFixing] = useState(false);

    useEffect(() => {
        loadPermissions();
    }, [tokenId, identity]);

    async function loadPermissions() {
        if (!tokenId || !identity) return;

        setLoading(true);
        try {
            const service = new OrbitPermissionService(identity);
            const result = await service.listPermissions(tokenId);

            if (result.success) {
                const critical = service.identifyCriticalPermissions(result.data);
                setCriticalIssues(critical);
                setPermissions(result.data);
            } else {
                console.error('Error loading permissions:', result.error);
                toast.error('Error Loading Permissions', {
                    description: result.error
                });
            }
        } catch (error) {
            console.error('Failed to load permissions:', error);
            toast.error('Failed to load permissions');
        } finally {
            setLoading(false);
        }
    }

    async function handleFixPermission(permission) {
        setFixing(true);
        const service = new OrbitPermissionService(identity);

        try {
            const result = await service.removePermissionFromOperator(
                tokenId,
                permission.resource
            );

            if (result.success) {
                toast.success('Proposal Created', {
                    description: `Permission fix proposal created for ${permission.formattedResource}. Vote in Governance tab. Request ID: ${result.data.requestId}`
                });

                // Refresh permissions list
                await loadPermissions();
            } else {
                toast.error('Error', {
                    description: result.error
                });
            }
        } catch (error) {
            toast.error('Error', {
                description: error.message
            });
        } finally {
            setFixing(false);
        }
    }

    async function handleFixAll() {
        const confirmed = window.confirm(
            `Create ${criticalIssues.length} proposals to fix all critical permissions?\n\n` +
            `This will remove Operator group access from:\n` +
            criticalIssues.map(p => `• ${p.formattedResource}`).join('\n')
        );

        if (!confirmed) return;

        setFixing(true);
        const service = new OrbitPermissionService(identity);

        try {
            const result = await service.fixCriticalPermissions(tokenId);

            if (result.success) {
                const { summary } = result;
                toast.success('Proposals Created', {
                    description: `Created ${summary.success} proposal(s). ${summary.failed > 0 ? `${summary.failed} failed.` : ''} Vote in Governance tab.`
                });

                // Show detailed results if there were failures
                if (summary.failed > 0) {
                    const failures = result.data.filter(r => !r.success);
                    failures.forEach(f => {
                        toast.error(`Failed: ${f.resource}`, {
                            description: f.error
                        });
                    });
                }

                // Refresh permissions list
                await loadPermissions();
            } else {
                toast.error('Failed to create proposals');
            }
        } catch (error) {
            toast.error('Error', {
                description: error.message
            });
        } finally {
            setFixing(false);
        }
    }

    // Don't show for anonymous users
    if (isAnonymous) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Fix Dangerous Permissions
                </CardTitle>
                <CardDescription>
                    Remove dangerous permissions from Operator group
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-4">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                ) : criticalIssues.length > 0 ? (
                    <div>
                        <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>{criticalIssues.length} critical permissions</strong> found on Operator group.
                                These allow non-admin users to perform dangerous operations.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2 mb-4">
                            {criticalIssues.map((perm, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 border rounded">
                                    <span className="font-mono text-sm">{perm.formattedResource}</span>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleFixPermission(perm)}
                                        disabled={fixing || !identity}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <Button
                            onClick={handleFixAll}
                            disabled={fixing || !identity}
                            className="w-full"
                            variant="default"
                        >
                            {fixing ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Proposals...
                                </>
                            ) : (
                                <>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Fix All Critical Permissions
                                </>
                            )}
                        </Button>

                        {!identity && (
                            <Alert className="mt-4">
                                <AlertDescription>
                                    Connect your wallet to fix permissions
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                ) : (
                    <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>
                            No dangerous permissions found on Operator group
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}