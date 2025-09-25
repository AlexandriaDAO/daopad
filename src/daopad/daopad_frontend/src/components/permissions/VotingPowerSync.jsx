import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  RefreshCw,
  Users,
  CheckCircle,
  AlertCircle,
  Info,
  Copy,
  ExternalLink,
  Shield
} from 'lucide-react';
import { Principal } from '@dfinity/principal';

const VotingPowerSync = ({ tokenId, actor, stationId }) => {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedCommand, setCopiedCommand] = useState(null);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const result = await actor.sync_voting_power_permissions(
        Principal.fromText(tokenId)
      );

      if (result && result.length > 0) {
        const [whalesCount, dolphinsCount, membersCount] = result[0];
        setSyncResult({
          whales: Number(whalesCount),
          dolphins: Number(dolphinsCount),
          members: Number(membersCount),
          total: Number(whalesCount) + Number(dolphinsCount) + Number(membersCount),
          timestamp: new Date().toLocaleString()
        });
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setError('Failed to sync voting power. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const copyToClipboard = (text, commandId) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(commandId);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const groupCreationSteps = [
    {
      id: 'whale-group',
      title: 'Create Whale Group',
      description: 'For users with ≥10,000 VP ($100+ locked)',
      command: 'Group Name: "Whale Tier"\nGroup ID: Will be auto-generated\nDescription: "Users with 10,000+ voting power"',
      permissions: ['Full governance rights', 'Treasury management', 'High-value proposals']
    },
    {
      id: 'dolphin-group',
      title: 'Create Dolphin Group',
      description: 'For users with ≥1,000 VP ($10+ locked)',
      command: 'Group Name: "Dolphin Tier"\nGroup ID: Will be auto-generated\nDescription: "Users with 1,000+ voting power"',
      permissions: ['Standard governance rights', 'Standard proposals', 'View treasury reports']
    },
    {
      id: 'member-group',
      title: 'Create Member Group',
      description: 'For users with ≥100 VP ($1+ locked)',
      command: 'Group Name: "Member Tier"\nGroup ID: Will be auto-generated\nDescription: "Users with 100+ voting power"',
      permissions: ['Basic governance rights', 'Vote on proposals', 'View DAO information']
    }
  ];

  return (
    <div className="space-y-4">
      {/* Sync Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Voting Power Synchronization
          </CardTitle>
          <CardDescription>
            Calculate and sync voting tiers from Kong Locker registrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleSync}
            disabled={syncing || !tokenId || !actor}
            className="w-full"
          >
            {syncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Calculating Voting Tiers...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Voting Power
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {syncResult && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Successfully calculated voting tiers for {syncResult.total} users
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-2xl">🐋</span>
                  <p className="text-2xl font-bold text-blue-600">{syncResult.whales}</p>
                  <p className="text-sm text-gray-600">Whales</p>
                </div>
                <div className="text-center p-3 bg-cyan-50 rounded-lg">
                  <span className="text-2xl">🐬</span>
                  <p className="text-2xl font-bold text-cyan-600">{syncResult.dolphins}</p>
                  <p className="text-sm text-gray-600">Dolphins</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <span className="text-2xl">👥</span>
                  <p className="text-2xl font-bold text-green-600">{syncResult.members}</p>
                  <p className="text-sm text-gray-600">Members</p>
                </div>
              </div>

              <p className="text-sm text-gray-500 text-center">
                Last synced: {syncResult.timestamp}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Group Setup Instructions */}
      {syncResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Manual Group Configuration Required
            </CardTitle>
            <CardDescription>
              Follow these steps to create voting tier groups in Orbit Station
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="instructions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="instructions">Setup Instructions</TabsTrigger>
                <TabsTrigger value="assignments">User Assignments</TabsTrigger>
              </TabsList>

              <TabsContent value="instructions" className="space-y-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Groups must be created manually in Orbit Station. The system calculates who should be in each group,
                    but cannot automatically create or modify groups due to Orbit API limitations.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  {groupCreationSteps.map((step) => (
                    <Card key={step.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{step.title}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(step.command, step.id)}
                          >
                            {copiedCommand === step.id ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                          {step.command}
                        </pre>
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-1">Permissions to assign:</p>
                          <div className="flex flex-wrap gap-1">
                            {step.permissions.map((perm, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex items-center justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`https://station.orbit.online/#/station/${stationId}/settings/user-groups`, '_blank')}
                  >
                    Open Orbit Station Settings
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="assignments" className="space-y-4">
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    After creating groups, manually add users to their appropriate tier based on the sync results.
                    The backend has calculated {syncResult.whales} whales, {syncResult.dolphins} dolphins,
                    and {syncResult.members} members who should be assigned.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Assignment Process:</h4>
                    <ol className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="font-medium">1.</span>
                        <span>Go to Orbit Station → Settings → User Groups</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">2.</span>
                        <span>Select the tier group (Whale/Dolphin/Member)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">3.</span>
                        <span>Click "Manage Members" and add users based on their VP</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">4.</span>
                        <span>Use the Kong Locker dashboard to verify user VP amounts</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium">5.</span>
                        <span>Repeat for each tier group</span>
                      </li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Card className="border-blue-200">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <span className="text-3xl">🐋</span>
                          <p className="text-xl font-bold mt-2">{syncResult.whales}</p>
                          <p className="text-sm text-gray-600">Users to add to Whale tier</p>
                          <p className="text-xs text-gray-500 mt-1">≥10,000 VP</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-cyan-200">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <span className="text-3xl">🐬</span>
                          <p className="text-xl font-bold mt-2">{syncResult.dolphins}</p>
                          <p className="text-sm text-gray-600">Users to add to Dolphin tier</p>
                          <p className="text-xs text-gray-500 mt-1">≥1,000 VP</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-green-200">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <span className="text-3xl">👥</span>
                          <p className="text-xl font-bold mt-2">{syncResult.members}</p>
                          <p className="text-sm text-gray-600">Users to add to Member tier</p>
                          <p className="text-xs text-gray-500 mt-1">≥100 VP</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VotingPowerSync;