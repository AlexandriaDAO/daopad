import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Shield, Info } from 'lucide-react';
import { PermissionsTable } from '../components/permissions';
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8" />
          Permissions
        </h1>
        <p className="text-gray-600 mt-2">
          View and manage treasury access controls
        </p>
      </div>

      {/* Main permissions table - no tabs */}
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