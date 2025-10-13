import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, Users } from 'lucide-react';

export default function UserGroupsList({ stationId, actor }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (stationId && actor) {
      loadUserGroups();
    }
  }, [stationId, actor]);

  async function loadUserGroups() {
    setLoading(true);
    setError(null);

    try {
      // This would query Orbit Station for user groups
      // For now, show placeholder/default groups

      setGroups([
        {
          id: '00000000-0000-4000-8000-000000000000',
          name: 'Admin',
          type: 'System',
          userCount: 1,
          description: 'System administrators with full access'
        },
        {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Operator',
          type: 'System',
          userCount: 0,
          description: 'Operators with elevated privileges'
        },
      ]);
    } catch (err) {
      console.error('Failed to load user groups:', err);
      setError(err.message || 'Failed to load user groups');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-destructive text-sm">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Groups
        </CardTitle>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <div className="text-center text-muted-foreground p-6">
            No user groups found
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(group => (
              <div key={group.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                <div className="flex-1 space-y-1">
                  <div className="font-medium">{group.name}</div>
                  <div className="text-sm text-muted-foreground">{group.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {group.userCount} {group.userCount === 1 ? 'member' : 'members'}
                  </div>
                </div>
                <Badge variant="secondary">{group.type}</Badge>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            User groups control access to different permissions in the Orbit Station. VP-based groups will be added automatically when voting power sync is implemented.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
