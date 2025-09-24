import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Settings, Shield, ChevronDown, ChevronUp, RefreshCw, ExternalLink } from 'lucide-react';
import { DAOPadBackendService } from '../../services/daopadBackend';

const SecurityDashboard = ({ stationId, tokenSymbol, identity }) => {
    const [securityData, setSecurityData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedChecks, setExpandedChecks] = useState(new Set());

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
        }
    }, [stationId, identity]);

    const toggleExpanded = (checkIndex) => {
        const newExpanded = new Set(expandedChecks);
        if (newExpanded.has(checkIndex)) {
            newExpanded.delete(checkIndex);
        } else {
            newExpanded.add(checkIndex);
        }
        setExpandedChecks(newExpanded);
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'Pass': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'Warn': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'Fail': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'Error': return <Settings className="w-5 h-5 text-gray-500" />;
            default: return null;
        }
    };

    const getOverallBadge = (status) => {
        const variants = {
            'secure': {
                className: 'bg-green-100 text-green-800 border-green-200',
                label: 'SECURE DAO',
                icon: <Shield className="w-4 h-4" />
            },
            'warnings': {
                className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                label: 'MINOR ISSUES',
                icon: <AlertTriangle className="w-4 h-4" />
            },
            'critical': {
                className: 'bg-red-100 text-red-800 border-red-200',
                label: 'SECURITY RISKS',
                icon: <XCircle className="w-4 h-4" />
            },
            'error': {
                className: 'bg-gray-100 text-gray-800 border-gray-200',
                label: 'UNABLE TO VERIFY',
                icon: <Settings className="w-4 h-4" />
            }
        };

        const variant = variants[status] || variants.error;

        return (
            <Badge className={`${variant.className} border px-3 py-1 flex items-center gap-1`}>
                {variant.icon}
                {variant.label}
            </Badge>
        );
    };

    const getSeverityColor = (severity) => {
        if (!severity) return 'text-gray-600';
        switch(severity) {
            case 'Critical': return 'text-red-600 font-semibold';
            case 'High': return 'text-orange-600 font-semibold';
            case 'Medium': return 'text-yellow-600';
            case 'Low': return 'text-blue-600';
            default: return 'text-gray-600';
        }
    };

    if (loading) {
        return (
            <Card className="border shadow-sm">
                <CardContent className="py-8">
                    <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                        <span className="text-gray-600">Verifying security status...</span>
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

    // Group checks by severity
    const criticalChecks = securityData.checks.filter(c => c.severity === 'Critical');
    const highChecks = securityData.checks.filter(c => c.severity === 'High');
    const mediumChecks = securityData.checks.filter(c => c.severity === 'Medium');
    const lowChecks = securityData.checks.filter(c => c.severity === 'Low' || c.severity === 'None');

    const SecurityCheckItem = ({ check, index }) => {
        const isExpanded = expandedChecks.has(index);
        const hasDetails = check.details || check.recommendation;

        return (
            <div className={`border rounded-lg ${check.status === 'Fail' ? 'border-red-200 bg-red-50/50' : 'border-gray-200'}`}>
                <div
                    className={`p-3 ${hasDetails ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => hasDetails && toggleExpanded(index)}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1">
                            {getStatusIcon(check.status)}
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{check.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                        check.category === 'User Management' ? 'bg-blue-100 text-blue-700' :
                                        check.category === 'Permissions' ? 'bg-purple-100 text-purple-700' :
                                        check.category === 'Policies' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                        {check.category}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{check.message}</p>
                            </div>
                        </div>
                        {hasDetails && (
                            <div className="ml-2">
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                        )}
                    </div>
                </div>

                {isExpanded && hasDetails && (
                    <div className="border-t px-3 pb-3">
                        {check.details && (
                            <div className="mt-3">
                                <span className="text-xs font-medium text-gray-500">DETAILS:</span>
                                <p className="text-sm text-gray-700 mt-1 font-mono bg-gray-50 p-2 rounded">
                                    {check.details}
                                </p>
                            </div>
                        )}
                        {check.recommendation && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                                <div className="flex items-start gap-2">
                                    <span className="text-blue-500 text-xl">💡</span>
                                    <p className="text-sm text-blue-700">{check.recommendation}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Card className="border shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Shield className="w-5 h-5 text-gray-600" />
                            {tokenSymbol} Treasury Security
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Last checked: {new Date(Number(securityData.last_checked) / 1000000).toLocaleString()}
                        </p>
                    </div>
                    {getOverallBadge(securityData.overall_status)}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Summary Alert */}
                {securityData.overall_status === 'critical' && (
                    <Alert className="border-red-200 bg-red-50">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription>
                            Critical security issues detected. Your treasury may be at risk.
                            Review the issues below and take action to secure your DAO.
                        </AlertDescription>
                    </Alert>
                )}

                {securityData.overall_status === 'warnings' && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription>
                            Minor security issues detected. Your treasury is functional but could be more secure.
                        </AlertDescription>
                    </Alert>
                )}

                {securityData.overall_status === 'secure' && (
                    <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription>
                            Your treasury is properly secured with DAO-controlled governance.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Critical Issues */}
                {criticalChecks.length > 0 && (
                    <div>
                        <h4 className="font-medium mb-3 text-red-600">⚠️ Critical Security Issues</h4>
                        <div className="space-y-2">
                            {criticalChecks.map((check, idx) => (
                                <SecurityCheckItem key={`critical-${idx}`} check={check} index={`critical-${idx}`} />
                            ))}
                        </div>
                    </div>
                )}

                {/* High Priority Issues */}
                {highChecks.length > 0 && (
                    <div>
                        <h4 className="font-medium mb-3 text-orange-600">High Priority</h4>
                        <div className="space-y-2">
                            {highChecks.map((check, idx) => (
                                <SecurityCheckItem key={`high-${idx}`} check={check} index={`high-${idx}`} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Medium Priority */}
                {mediumChecks.length > 0 && (
                    <div>
                        <h4 className="font-medium mb-3 text-yellow-600">Configuration Warnings</h4>
                        <div className="space-y-2">
                            {mediumChecks.map((check, idx) => (
                                <SecurityCheckItem key={`medium-${idx}`} check={check} index={`medium-${idx}`} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Low Priority / Info */}
                {lowChecks.length > 0 && (
                    <div>
                        <h4 className="font-medium mb-3 text-gray-600">Information</h4>
                        <div className="space-y-2">
                            {lowChecks.map((check, idx) => (
                                <SecurityCheckItem key={`low-${idx}`} check={check} index={`low-${idx}`} />
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="flex justify-between border-t pt-4">
                <Button
                    onClick={fetchSecurityStatus}
                    variant="outline"
                    disabled={loading}
                    className="flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Status
                </Button>
                <a
                    href={`https://orbitstation.org/station/${stationId?.toString()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                    View in Orbit Station
                    <ExternalLink className="w-3 h-3" />
                </a>
            </CardFooter>
        </Card>
    );
};

export default SecurityDashboard;