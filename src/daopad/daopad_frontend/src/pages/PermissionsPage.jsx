import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Shield, Users, BarChart3, FileText, Settings } from 'lucide-react';
import {
  VotingTierDisplay,
  PermissionRequestHelper,
  VotingAnalytics,
  PermissionsTable,
  UserGroupsList
} from '../components/permissions';
import { DAOPadBackendService } from '../services/daopadBackend';

const PermissionsPage = ({ tokenId, stationId, identity }) => {
  const isAuthenticated = !!identity;
  const [actor, setActor] = useState(null);

  React.useEffect(() => {
    if (identity) {
      const daopadService = new DAOPadBackendService(identity);
      setActor(daopadService.actor);
    }
  }, [identity]);

  if (!isAuthenticated) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissions & Voting Power
          </CardTitle>
          <CardDescription>
            Connect your wallet to view and manage permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Please connect your wallet to access permission management features.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-500" />
          Permissions & Voting Power
        </h1>
        <p className="text-gray-600 mt-2">
          Manage DAO permissions based on Kong Locker voting power tiers
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="groups">User Groups</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <VotingTierDisplay tokenId={tokenId} actor={actor} identity={identity} />
            <Card>
              <CardHeader>
                <CardTitle>Permission Categories</CardTitle>
                <CardDescription>Orbit Station resource types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Treasury</span>
                    <span className="text-sm">Accounts, Assets, Transfers</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Canisters</span>
                    <span className="text-sm">Deploy, Fund, Manage</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Users</span>
                    <span className="text-sm">View, Create (Admin only)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">System</span>
                    <span className="text-sm">Upgrade, Configure</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    View the "Permissions" tab to see detailed access controls for each resource type.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <PermissionsTable tokenId={tokenId} actor={actor} />
        </TabsContent>

        {/* User Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <UserGroupsList tokenId={tokenId} actor={actor} />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <VotingAnalytics tokenId={tokenId} actor={actor} />
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4">
          <div className="grid gap-4">
            <PermissionRequestHelper
              tokenId={tokenId}
              actor={actor}
              stationId={stationId}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PermissionsPage;