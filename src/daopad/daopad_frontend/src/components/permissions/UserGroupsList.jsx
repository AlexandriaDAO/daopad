import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, UserPlus, Shield, ChevronRight, Edit, Trash2 } from "lucide-react";
import { DAOPadBackendService } from '@/services/daopadBackend';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const UserGroupsList = ({ tokenId, stationId }) => {
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const { identity } = useAuth();

  useEffect(() => {
    if (tokenId && identity) {
      fetchUserGroups();
    }
  }, [tokenId, identity]);

  const fetchUserGroups = async () => {
    setLoading(true);
    try {
      const service = new DAOPadBackendService(identity);
      const result = await service.listUserGroups(tokenId, null);

      if (result.Ok) {
        setUserGroups(result.Ok.user_groups || []);
      } else {
        console.error('Failed to fetch user groups:', result.Err);
        toast({
          title: "Failed to load user groups",
          description: result.Err?.message || "Unknown error",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching user groups:', error);
      toast({
        title: "Error",
        description: "Failed to connect to backend",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetails = async (groupId) => {
    setDetailsLoading(true);
    try {
      const service = new DAOPadBackendService(identity);
      const result = await service.getUserGroup(tokenId, groupId);

      if (result.Ok) {
        setGroupDetails(result.Ok.user_group);
      } else {
        console.error('Failed to fetch group details:', result.Err);
        toast({
          title: "Failed to load group details",
          description: result.Err?.message || "Unknown error",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      toast({
        title: "Error",
        description: "Failed to connect to backend",
        variant: "destructive"
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleGroupClick = async (group) => {
    setSelectedGroup(group);
    await fetchGroupDetails(group.id);
  };

  const getGroupIcon = (groupName) => {
    const name = groupName.toLowerCase();
    if (name === 'admin') return '👑';
    if (name === 'operator') return '⚙️';
    if (name.includes('member')) return '👥';
    if (name.includes('whale')) return '🐋';
    if (name.includes('dolphin')) return '🐬';
    return '👤';
  };

  const getGroupVariant = (groupName) => {
    const name = groupName.toLowerCase();
    if (name === 'admin') return 'destructive';
    if (name === 'operator') return 'secondary';
    return 'default';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Groups
              </CardTitle>
              <CardDescription>
                Manage user groups and their members
              </CardDescription>
            </div>
            <Button disabled title="Coming soon">
              <UserPlus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userGroups.length > 0 ? (
              userGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => handleGroupClick(group)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getGroupIcon(group.name)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{group.name}</h3>
                        <Badge variant={getGroupVariant(group.name)}>
                          {group.id === '00000000-0000-4000-8000-000000000000' ? 'System' :
                           group.id === '00000000-0000-4000-8000-000000000001' ? 'System' :
                           'Custom'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ID: {group.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement edit
                      }}
                      disabled
                      title="Coming soon"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No user groups found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Group Details Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedGroup && getGroupIcon(selectedGroup.name)}
              {selectedGroup?.name}
            </DialogTitle>
            <DialogDescription>
              Group ID: {selectedGroup?.id}
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : groupDetails ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Members ({groupDetails.users.length})</h4>
                {groupDetails.users.length > 0 ? (
                  <div className="space-y-2">
                    {groupDetails.users.map((userId) => (
                      <div key={userId} className="flex items-center justify-between p-2 rounded border">
                        <span className="text-sm">{userId}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement remove user
                          }}
                          disabled
                          title="Coming soon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No members in this group</p>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedGroup(null)}
                >
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button
                    disabled
                    title="Coming soon"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Members
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load group details
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserGroupsList;