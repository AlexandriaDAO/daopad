import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { UserMinus, Users, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { OrbitUserService } from '../../services/backend/orbit/users/OrbitUserService';
import { useToast } from '@/hooks/use-toast';

const BACKEND_CANISTER = "lwsav-iiaaa-aaaap-qp2qq-cai";

export default function AdminRemovalActions({ tokenId, stationId, identity }) {
    const isAnonymous = !identity;
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [removing, setRemoving] = useState({});
    const { toast } = useToast();

    useEffect(() => {
        loadUsers();
    }, [tokenId, identity]);

    async function loadUsers() {
        if (!tokenId || !identity) return;

        setLoading(true);
        try {
            const userService = new OrbitUserService(identity);
            const result = await userService.listUsers(tokenId);

            if (result.success) {
                // Filter to show only non-backend admins
                const admins = result.data.filter(u =>
                    u.isAdmin &&
                    !u.identities.includes(BACKEND_CANISTER)
                );
                setUsers(admins);
            } else {
                toast.error('Error Loading Users', {
                    description: result.error
                });
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleRemoveAdmin(user) {
        setRemoving({ ...removing, [user.id]: true });

        try {
            const userService = new OrbitUserService(identity);
            const result = await userService.removeAdminUser(
                tokenId,
                user.id,
                user.name
            );

            if (result.success) {
                toast.success('Proposal Created', {
                    description: `Admin removal proposal created for ${user.name}. Vote in the Governance tab. Request ID: ${result.requestId}`
                });

                // Refresh user list
                await loadUsers();
            } else {
                toast.error('Error Creating Proposal', {
                    description: result.error
                });
            }
        } catch (error) {
            console.error('Remove admin failed:', error);
            toast.error('Error Removing Admin', {
                description: error.message
            });
        } finally {
            setRemoving({ ...removing, [user.id]: false });
        }
    }

    async function handleRemoveAllAdmins() {
        if (users.length === 0) return;

        const confirmed = window.confirm(
            `Create ${users.length} proposals to remove all non-backend admins? ` +
            `This will initiate community voting for: ${users.map(u => u.name).join(', ')}`
        );

        if (!confirmed) return;

        setLoading(true);
        try {
            const userService = new OrbitUserService(identity);
            const result = await userService.removeMultipleAdmins(tokenId, users);

            if (result.success) {
                const successCount = result.results.filter(r => r.success).length;
                const failCount = result.results.length - successCount;

                toast.success('Proposals Created', {
                    description: `${successCount} admin removal proposals created. ${failCount > 0 ? `${failCount} failed.` : ''}`
                });

                await loadUsers();
            } else {
                toast.error('Error Creating Proposals', {
                    description: result.error
                });
            }
        } catch (error) {
            console.error('Batch removal failed:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading && users.length === 0) {
        return (
            <Card className="border shadow-sm">
                <CardContent className="py-8">
                    <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                        <span className="text-gray-600">Loading users...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (users.length === 0) {
        return (
            <Alert className="border-green-500 bg-green-950/50">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <AlertDescription>
                    All non-backend admins removed! Only DAO Canister has admin rights.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Card className="border-2 border-orange-500 bg-orange-950/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-300">
                    <UserMinus className="w-5 h-5" />
                    Remove Non-Backend Admins
                </CardTitle>
                {isAnonymous && (
                    <Alert className="mt-2 border-yellow-500 bg-yellow-950/50">
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                        <AlertDescription className="text-yellow-200">
                            Read-only mode: Sign in to manage admin users
                        </AlertDescription>
                    </Alert>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert className="border-orange-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Action Required:</strong> Remove these users from Admin group to achieve true DAO governance.
                        Each removal creates a proposal requiring 50% voting power approval.
                    </AlertDescription>
                </Alert>

                {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                            <div className="font-semibold">{user.name}</div>
                            <div className="text-sm text-gray-400">
                                {user.identities[0]?.slice(0, 20)}...
                            </div>
                            <div className="text-xs text-gray-500">
                                Groups: {user.groups.map(g => g.name).join(', ')}
                            </div>
                        </div>
                        <Button
                            onClick={() => handleRemoveAdmin(user)}
                            disabled={isAnonymous || removing[user.id]}
                            variant="destructive"
                            size="sm"
                        >
                            {isAnonymous ? '🔒 Sign In to Remove' : (removing[user.id] ? 'Creating Proposal...' : 'Remove Admin')}
                        </Button>
                    </div>
                ))}

                {users.length > 1 && (
                    <Button
                        onClick={handleRemoveAllAdmins}
                        disabled={isAnonymous || loading}
                        variant="outline"
                        className="w-full border-orange-500 text-orange-300 hover:bg-orange-950"
                    >
                        <Users className="w-4 h-4 mr-2" />
                        {isAnonymous ? '🔒 Sign In to Remove All' : `Remove All ${users.length} Admins (Batch)`}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
