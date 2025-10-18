import React from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ExternalLink, Copy, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useState } from 'react';

const OrbitSetupInstructions = ({ backendStatus, onRetryCheck, isChecking }) => {
  const [copiedPrincipal, setCopiedPrincipal] = useState(false);

  const copyPrincipal = async () => {
    try {
      await navigator.clipboard.writeText(backendStatus.backend_principal);
      setCopiedPrincipal(true);
      setTimeout(() => setCopiedPrincipal(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openOrbitStation = () => {
    if (backendStatus.station_id) {
      window.open(`https://${backendStatus.station_id}.icp0.io`, '_blank');
    }
  };

  if (backendStatus.is_member) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          DAOPad is connected to your Orbit Station and ready to manage your treasury!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          Setup Required
        </CardTitle>
        <CardDescription>
          DAOPad needs permission to manage your treasury. Follow these steps to complete the setup:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Info */}
        <div className="bg-white rounded-lg p-4 border border-orange-200">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">DAOPad Backend Principal:</span>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                  {backendStatus.backend_principal ?
                    `${backendStatus.backend_principal.slice(0, 8)}...${backendStatus.backend_principal.slice(-6)}` :
                    'Loading...'
                  }
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyPrincipal}
                  className="h-7 w-7 p-0"
                >
                  {copiedPrincipal ?
                    <CheckCircle className="h-4 w-4 text-green-600" /> :
                    <Copy className="h-4 w-4" />
                  }
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Your Orbit Station:</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                {backendStatus.station_id || 'Loading...'}
              </code>
            </div>
          </div>
        </div>

        {/* Step-by-step Instructions */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Setup Steps:</h4>

          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-2">
                  Open your Orbit Station
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openOrbitStation}
                  className="gap-2"
                >
                  Open Orbit Station
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  Navigate to the <strong>Members</strong> section in the left sidebar
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-2">
                  Click <strong>Add Member</strong> and paste the DAOPad backend principal
                </p>
                <div className="bg-gray-100 p-3 rounded-md">
                  <code className="text-xs font-mono text-gray-800 break-all">
                    {backendStatus.backend_principal}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyPrincipal}
                    className="ml-2"
                  >
                    {copiedPrincipal ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                4
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  Set the role to <strong>Admin</strong> or <strong>Operator</strong> to grant full permissions
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This allows DAOPad to create treasury accounts and manage proposals on your behalf
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                5
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  Submit the proposal and wait for approval (may auto-approve if you're an admin)
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Why is this needed */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2 text-sm">Why is this needed?</h4>
          <p className="text-sm text-blue-800">
            DAOPad acts as your treasury management interface. To create accounts, transfer funds,
            and submit proposals, it needs to be registered as a member of your Orbit Station.
            This is a one-time setup that gives DAOPad permission to interact with your DAO's treasury.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={onRetryCheck}
            disabled={isChecking}
            className="flex-1"
          >
            {isChecking ? 'Checking...' : 'I\'ve Added DAOPad - Check Again'}
          </Button>
          <Button
            variant="outline"
            onClick={openOrbitStation}
            className="gap-2"
          >
            Open Orbit Station
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Error message if any */}
        {backendStatus.error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Error:</strong> {backendStatus.error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default OrbitSetupInstructions;