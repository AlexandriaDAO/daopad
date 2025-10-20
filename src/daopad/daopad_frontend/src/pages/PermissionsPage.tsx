import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Shield, Info, Users } from 'lucide-react';
import { PermissionsTable } from '../components/permissions';
import { DAOPadBackendService } from '../services/daopadBackend';
import { Principal } from '@dfinity/principal';
import { Badge } from '../components/ui/badge';

const PermissionsPage = ({ tokenId, stationId, identity }) => {
  const isAuthenticated = !!identity;
  const [actor, setActor] = useState(null);
  const [loadingActor, setLoadingActor] = useState(true);
  const [userGroups, setUserGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    async function setupActor() {
      if (identity) {
        setLoadingActor(true);
        try {
          const daopadService = new DAOPadBackendService(identity);
          const backendActor = await daopadService.getActor();
          console.log('[PermissionsPage] Actor created successfully');
          setActor(backendActor);
        } catch (error) {
          console.error('[PermissionsPage] Failed to create actor:', error);
          setActor(null);
        } finally {
          setLoadingActor(false);
        }
      } else {
        setActor(null);
        setLoadingActor(false);
      }
    }

    setupActor();
  }, [identity]);

  useEffect(() => {
    async function fetchUserGroups() {
      if (!actor || !stationId) {
        setLoadingGroups(false);
        return;
      }

      setLoadingGroups(true);
      try {
        const stationPrincipal = typeof stationId === 'string'
          ? Principal.fromText(stationId)
          : stationId;

        console.log('[PermissionsPage] Fetching user groups for station:', stationPrincipal.toString());
        const result = await actor.list_station_user_groups(stationPrincipal);

        if (result.Ok) {
          console.log('[PermissionsPage] User groups fetched:', result.Ok);
          setUserGroups(result.Ok);
        } else if (result.Err) {
          console.error('[PermissionsPage] Failed to fetch user groups:', result.Err);
          setUserGroups([]);
        }
      } catch (error) {
        console.error('[PermissionsPage] Error fetching user groups:', error);
        setUserGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    }

    fetchUserGroups();
  }, [actor, stationId]);

  if (!isAuthenticated) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissions
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

  if (loadingActor) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Setting up connection...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Groups Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Groups ({userGroups.length})
          </CardTitle>
          <CardDescription>
            Roles and groups configured in this Orbit Station
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingGroups ? (
            <p className="text-muted-foreground">Loading groups...</p>
          ) : userGroups.length === 0 ? (
            <p className="text-muted-foreground">No groups found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {userGroups.map(group => (
                <div key={group.id} className="flex items-center gap-2 p-3 border rounded-lg">
                  {/* Badge for default groups */}
                  {group.id === '00000000-0000-4000-8000-000000000000' && (
                    <Badge variant="destructive">Admin</Badge>
                  )}
                  {group.id === '00000000-0000-4000-8000-000000000001' && (
                    <Badge className="bg-blue-600">Operator</Badge>
                  )}
                  {/* Group name */}
                  <span className="font-medium">{group.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main permissions table */}
      <PermissionsTable
        stationId={stationId}
        actor={actor}
        userGroups={userGroups}
        loadingGroups={loadingGroups}
      />

      {/* Compact system info - collapsible */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-4 w-4" />
          System Information
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="text-sm text-muted-foreground p-4 space-y-2">
              <p>Backend manages this treasury as the sole Orbit Station admin.</p>
              <p>Proposals are voted on using Kong Locker voting power (1 VP = $1 locked LP).</p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default PermissionsPage;