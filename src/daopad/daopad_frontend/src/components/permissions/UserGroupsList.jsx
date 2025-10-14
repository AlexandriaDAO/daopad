import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Users, Info } from 'lucide-react';

export default function UserGroupsList({ stationId, actor }) {
  const systemGroups = [
    {
      id: '00000000-e400-0000-4d8f-480000000000',
      name: 'Admin',
      type: 'System',
      description: 'DAOPad backend with full treasury control'
    },
    {
      id: '00000000-e400-0000-4d8f-480000000001',
      name: 'Operator',
      type: 'System',
      description: 'Reserved for future operational roles'
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          System Groups
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {systemGroups.map(group => (
            <div key={group.id} className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex-1 space-y-1">
                <div className="font-medium">{group.name}</div>
                <div className="text-sm text-muted-foreground">{group.description}</div>
              </div>
              <Badge variant="secondary">{group.type}</Badge>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Governance Model:</strong> DAOPad backend is the only Orbit Station admin.
              Individual users vote on proposals in DAOPad, weighted by Kong Locker voting power.
              When threshold is met, backend executes approved actions in Orbit.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
