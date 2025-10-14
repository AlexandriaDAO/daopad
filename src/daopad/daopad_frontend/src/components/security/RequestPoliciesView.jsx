import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Shield, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { OrbitSecurityService } from '../../services/backend/orbit/security/OrbitSecurityService';
import { useAuth } from '../../providers/AuthProvider/IIProvider';
import { toast } from 'sonner';

const RequestPoliciesView = ({ stationId }) => {
    const { identity } = useAuth();
    const [policies, setPolicies] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'list'
    const [expandedCategories, setExpandedCategories] = useState(new Set());

    useEffect(() => {
        if (stationId) {
            fetchPolicies();
        }
    }, [stationId]);

    const fetchPolicies = async () => {
        if (!identity) {
            console.log('No identity available');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const securityService = new OrbitSecurityService(identity);
            const result = await securityService.getRequestPoliciesDetails(stationId);

            if (result.success) {
                // Group policies by category
                const grouped = groupPoliciesByCategory(result.data.policies);
                setPolicies({
                    raw: result.data.policies,
                    grouped: grouped,
                    stats: {
                        total: result.data.total_count,
                        autoApproved: result.data.auto_approved_count,
                        bypasses: result.data.bypass_count
                    }
                });
            } else {
                toast.error('Failed to fetch policies: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to fetch policies:', error);
            toast.error('Failed to fetch request policies');
        } finally {
            setLoading(false);
        }
    };

    const groupPoliciesByCategory = (policies) => {
        const categories = {
            accounts: [],
            transfers: [],
            users: [],
            system: [],
            assets: [],
            canisters: [],
            governance: [],
            other: []
        };

        policies.forEach(policy => {
            const op = policy.operation.toLowerCase();

            if (op.includes('account') && !op.includes('transfer')) {
                categories.accounts.push(policy);
            } else if (op.includes('transfer')) {
                categories.transfers.push(policy);
            } else if (op.includes('user')) {
                categories.users.push(policy);
            } else if (op.includes('system')) {
                categories.system.push(policy);
            } else if (op.includes('asset')) {
                categories.assets.push(policy);
            } else if (op.includes('canister')) {
                categories.canisters.push(policy);
            } else if (op.includes('rule') || op.includes('policy') || op.includes('permission')) {
                categories.governance.push(policy);
            } else {
                categories.other.push(policy);
            }
        });

        return categories;
    };

    const toggleCategory = (category) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    const getApprovalIcon = (approvalRule) => {
        const rule = approvalRule.toLowerCase();

        if (rule.includes('no approval') || rule.includes('auto-approved')) {
            return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
        }
        if (rule.includes('admin')) {
            return <Shield className="w-4 h-4 text-blue-500" />;
        }
        if (rule.includes('operator')) {
            return <CheckCircle className="w-4 h-4 text-green-500" />;
        }
        if (rule.includes('any user')) {
            return <AlertTriangle className="w-4 h-4 text-orange-500" />;
        }
        return <Info className="w-4 h-4 text-gray-500" />;
    };

    const PolicyRow = ({ policy }) => {
        return (
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-2">
                    {getApprovalIcon(policy.approval_rule)}
                    <span className="font-medium text-sm">{policy.operation}</span>
                </div>
                <span className="text-xs text-gray-600 max-w-md truncate">
                    {policy.approval_rule}
                </span>
            </div>
        );
    };

    const CategorySection = ({ category, items, title }) => {
        const isExpanded = expandedCategories.has(category);

        if (items.length === 0) return null;

        return (
            <div className="border rounded-lg p-3 mb-3">
                <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex justify-between items-center hover:bg-gray-50 rounded p-1 -m-1"
                >
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold capitalize text-sm">{title}</h4>
                        <Badge variant="secondary" className="text-xs">
                            {items.length}
                        </Badge>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                </button>
                {isExpanded && (
                    <div className="space-y-1 mt-3">
                        {items.map((policy, idx) => (
                            <PolicyRow key={idx} policy={policy} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <Card className="w-full">
                <CardContent className="p-6">
                    <div className="text-center text-gray-500">Loading request policies...</div>
                </CardContent>
            </Card>
        );
    }

    if (!policies) {
        return (
            <Card className="w-full">
                <CardContent className="p-6">
                    <div className="text-center text-gray-500">No policies data available</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Request Approval Policies
                </CardTitle>

                {/* Stats badges */}
                <div className="flex gap-2 mt-2">
                    <Badge variant="default" className="text-xs">
                        {policies.stats.total} Total Policies
                    </Badge>
                    {policies.stats.autoApproved > 0 && (
                        <Badge variant="warning" className="text-xs">
                            {policies.stats.autoApproved} Auto-Approved
                        </Badge>
                    )}
                    {policies.stats.bypasses > 0 && (
                        <Badge variant="destructive" className="text-xs">
                            {policies.stats.bypasses} Bypasses
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {/* View mode toggle */}
                <div className="flex justify-end mb-4">
                    <div className="flex gap-1 bg-gray-100 rounded p-1">
                        <Button
                            size="sm"
                            variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                            onClick={() => setViewMode('grouped')}
                            className="text-xs px-2 py-1"
                        >
                            Grouped
                        </Button>
                        <Button
                            size="sm"
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            onClick={() => setViewMode('list')}
                            className="text-xs px-2 py-1"
                        >
                            List
                        </Button>
                    </div>
                </div>

                {viewMode === 'grouped' ? (
                    // Grouped view by category
                    <div>
                        <CategorySection
                            category="transfers"
                            items={policies.grouped.transfers}
                            title="Transfers"
                        />
                        <CategorySection
                            category="accounts"
                            items={policies.grouped.accounts}
                            title="Accounts"
                        />
                        <CategorySection
                            category="users"
                            items={policies.grouped.users}
                            title="Users"
                        />
                        <CategorySection
                            category="governance"
                            items={policies.grouped.governance}
                            title="Governance"
                        />
                        <CategorySection
                            category="canisters"
                            items={policies.grouped.canisters}
                            title="External Canisters"
                        />
                        <CategorySection
                            category="assets"
                            items={policies.grouped.assets}
                            title="Assets"
                        />
                        <CategorySection
                            category="system"
                            items={policies.grouped.system}
                            title="System"
                        />
                        <CategorySection
                            category="other"
                            items={policies.grouped.other}
                            title="Other"
                        />
                    </div>
                ) : (
                    // Simple list view
                    <div className="space-y-1">
                        {policies.raw.map((policy, idx) => (
                            <PolicyRow key={idx} policy={policy} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RequestPoliciesView;