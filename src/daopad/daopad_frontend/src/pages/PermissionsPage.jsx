import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Shield, Info } from 'lucide-react';
import { PermissionsTable } from '../components/permissions';
import { DAOPadBackendService } from '../services/daopadBackend';

const PermissionsPage = ({ tokenId, stationId, identity }) => {
  const isAuthenticated = !!identity;
  const [actor, setActor] = useState(null);
  const [loadingActor, setLoadingActor] = useState(true);

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
      {/* Main permissions table */}
      <PermissionsTable stationId={stationId} actor={actor} />

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