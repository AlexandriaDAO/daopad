import React, { useState } from 'react';
import { Principal } from '@dfinity/principal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle, CheckCircle, ExternalLink, Loader2, Info } from 'lucide-react';
import { daopad_backend } from '../../declarations/daopad_backend';
import { toast } from 'sonner';

interface Props {
    tokenId: Principal;
    stationId: Principal;
    onComplete: () => void;  // Callback to recheck status
}

type WizardStep = 'intro' | 'creating' | 'approving';

const AutoApprovedSetupWizard: React.FC<Props> = ({ tokenId, stationId, onComplete }) => {
    const [step, setStep] = useState<WizardStep>('intro');
    const [requestIds, setRequestIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleCreateRequests = async () => {
        setStep('creating');
        setError(null);

        try {
            // Convert tokenId to Principal if it's a string
            const tokenPrincipal = typeof tokenId === 'string' ? Principal.fromText(tokenId) : tokenId;
            const result = await daopad_backend.create_autoapprove_all_accounts(tokenPrincipal);

            if ('Ok' in result) {
                const ids = result.Ok;
                setRequestIds(ids);
                setStep('approving');
                toast.success(`Created ${ids.length} policy change request(s)`);
            } else {
                throw new Error(result.Err);
            }
        } catch (err) {
            console.error('Failed to create AutoApproved requests:', err);
            const errorMsg = err instanceof Error ? err.message : 'Failed to create requests';
            setError(errorMsg);
            setStep('intro');
            toast.error('Failed to create requests');
        }
    };

    const openOrbitStation = () => {
        window.open(`https://${stationId.toText()}.icp0.io`, '_blank');
    };

    if (step === 'intro') {
        return (
            <Card className="border-blue-200 bg-blue-50 mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-600" />
                        AutoApproved Setup Required
                    </CardTitle>
                    <CardDescription>
                        Your treasury accounts need AutoApproved policies for DAOPad to work.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Educational content */}
                    <div className="bg-white rounded-lg p-4 space-y-2">
                        <h4 className="font-medium text-gray-900">What is AutoApproved?</h4>
                        <ul className="text-sm text-gray-700 space-y-1.5 list-disc list-inside">
                            <li><strong>Community votes first</strong> - 50%+ voting power required to execute</li>
                            <li><strong>Backend can't self-approve</strong> - Orbit's separation of duties prevents it</li>
                            <li><strong>AutoApproved executes after vote</strong> - No redundant approval needed</li>
                            <li><strong>Secure by design</strong> - Real governance is the community vote, not Orbit approval</li>
                        </ul>
                    </div>

                    {/* Security reassurance */}
                    <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800 text-sm">
                            <strong>Security verified:</strong> AutoApproved is documented as safe and required
                            for liquid democracy. See <code>docs/SECURITY_AUTOAPPROVED.md</code> for analysis.
                        </AlertDescription>
                    </Alert>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                        <Button
                            onClick={handleCreateRequests}
                            className="flex-1"
                        >
                            Configure AutoApproved
                        </Button>
                        <Button
                            variant="outline"
                            onClick={openOrbitStation}
                            className="gap-2"
                        >
                            View Orbit
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Error display */}
                    {error && (
                        <Alert className="border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                                <strong>Error:</strong> {error}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        );
    }

    if (step === 'creating') {
        return (
            <Card className="border-blue-200 bg-blue-50 mb-6">
                <CardContent className="py-8">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p className="text-gray-700">Creating policy change requests...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (step === 'approving') {
        return (
            <Card className="border-orange-200 bg-orange-50 mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        Manual Approval Required
                    </CardTitle>
                    <CardDescription>
                        Created {requestIds.length} request(s). Now approve them in Orbit Station.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Explanation */}
                    <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-700">
                            Backend created the requests but <strong>can't approve them</strong> (Orbit's
                            separation of duties applies to policy changes too). Current policy holders
                            must approve via Orbit UI.
                        </p>
                    </div>

                    {/* Step-by-step guide */}
                    <ol className="space-y-3">
                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                1
                            </span>
                            <div className="flex-1">
                                <p className="text-sm text-gray-700 mb-2">Open Orbit Station</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={openOrbitStation}
                                    className="gap-2"
                                >
                                    Open Orbit <ExternalLink className="h-3 w-3" />
                                </Button>
                            </div>
                        </li>

                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                2
                            </span>
                            <p className="text-sm text-gray-700">
                                Navigate to <strong>Requests</strong> tab
                            </p>
                        </li>

                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                3
                            </span>
                            <div className="flex-1">
                                <p className="text-sm text-gray-700">
                                    Approve each <strong>"Enable AutoApproved"</strong> request
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    ({requestIds.length} request{requestIds.length !== 1 && 's'} to approve)
                                </p>
                            </div>
                        </li>

                        <li className="flex gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                4
                            </span>
                            <p className="text-sm text-gray-700">
                                Return here and recheck status
                            </p>
                        </li>
                    </ol>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-2">
                        <Button onClick={onComplete} className="flex-1">
                            I've Approved - Recheck Status
                        </Button>
                        <Button
                            variant="outline"
                            onClick={openOrbitStation}
                            className="gap-2"
                        >
                            Open Orbit <ExternalLink className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return null;
};

export default AutoApprovedSetupWizard;
