import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { DAOPadBackendService } from '@/services/daopadBackend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  UserPlus,
  UserMinus,
  ShieldOff,
  RefreshCw,
  Copy,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Search,
  AlertTriangle,
} from 'lucide-react';
import MembershipStatus from '../MembershipStatus';

export default function MembersTable({ stationId, identity, token }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [backendPrincipal, setBackendPrincipal] = useState('');
  const [userVotingPower, setUserVotingPower] = useState(0);
  const [loadingVotingPower, setLoadingVotingPower] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Add member dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMemberPrincipal, setNewMemberPrincipal] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberStatus, setNewMemberStatus] = useState('Active');
  const [newMemberGroups, setNewMemberGroups] = useState([]);
  const [adding, setAdding] = useState(false);

  // Remove/modify member state
  const [memberToModify, setMemberToModify] = useState(null);
  const [modifyAction, setModifyAction] = useState('');
  const [modifying, setModifying] = useState(false);

  const availableGroups = [
    { id: '00000000-e400-0000-4d8f-480000000000', name: 'Admin' },
    { id: '00000000-e400-0000-4d8f-480000000001', name: 'Operator' }
  ];

  useEffect(() => {
    if (stationId && identity) {
      loadBackendPrincipal();
      loadMembers();
      loadVotingPower();
    }
  }, [stationId, identity]);

  const loadVotingPower = async () => {
    if (!identity || !token) return;

    setLoadingVotingPower(true);
    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const result = await daopadService.getMyVotingPowerForToken(tokenPrincipal);
      if (result.success) {
        setUserVotingPower(result.data);
      }
    } catch (err) {
      console.error('Error loading voting power:', err);
    } finally {
      setLoadingVotingPower(false);
    }
  };

  const loadBackendPrincipal = async () => {
    try {
      const daopadService = new DAOPadBackendService(identity);
      const result = await daopadService.getBackendPrincipal();
      if (result.success) {
        setBackendPrincipal(result.data.toString());
      }
    } catch (err) {
      console.error('Error loading backend principal:', err);
    }
  };

  const loadMembers = async () => {
    if (!identity || !token) return;

    setLoading(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);

      const [usersResult, adminResult] = await Promise.all([
        daopadService.listOrbitUsers(tokenPrincipal),
        daopadService.getAdminCount(tokenPrincipal)
      ]);

      if (usersResult.success && adminResult.success) {
        const allMembers = [];

        if (adminResult.data?.admin_list) {
          adminResult.data.admin_list.forEach(admin => {
            const existingUser = usersResult.data?.find(u => u.id === admin.id);
            allMembers.push({
              ...admin,
              ...existingUser,
              is_daopad_backend: admin.is_daopad_backend,
              groups: existingUser?.groups || (admin.is_daopad_backend ? ['Admin'] : [])
            });
          });
        }

        if (usersResult.data) {
          usersResult.data.forEach(user => {
            if (!allMembers.find(m => m.id === user.id)) {
              allMembers.push(user);
            }
          });
        }

        setMembers(allMembers);
      }
    } catch (err) {
      console.error('Error loading members:', err);
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberPrincipal.trim() || !newMemberName.trim()) {
      setError('Please enter both principal and name');
      return;
    }

    try {
      Principal.fromText(newMemberPrincipal.trim());
    } catch (err) {
      setError('Invalid principal ID format');
      return;
    }

    setAdding(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const userPrincipal = Principal.fromText(newMemberPrincipal.trim());

      const statusObj = newMemberStatus === 'Active' ? { 'Active': null } : { 'Inactive': null };

      const result = await daopadService.addUserToOrbit(
        tokenPrincipal,
        userPrincipal,
        newMemberName.trim(),
        newMemberGroups,
        statusObj
      );

      if (result.success) {
        // Member operations are auto-approved and executed immediately
        // since the backend is an admin
        setSuccess(`Member "${newMemberName.trim()}" successfully added to the Orbit Station.`);
        setShowAddDialog(false);
        setNewMemberPrincipal('');
        setNewMemberName('');
        setNewMemberStatus('Active');
        setNewMemberGroups([]);
        // Refresh member list after a short delay to allow Orbit to process
        setTimeout(loadMembers, 1500);
      } else {
        setError(result.error || 'Failed to add member');
      }
    } catch (err) {
      console.error('Error adding member:', err);
      setError('Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleModifyMember = async () => {
    if (!memberToModify) return;

    setModifying(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);

      let result;
      if (modifyAction === 'downgrade') {
        result = await daopadService.downgradeToOperator(tokenPrincipal, memberToModify.id);
      } else if (modifyAction === 'remove') {
        if (memberToModify.groups?.includes('Admin')) {
          result = await daopadService.removeAdminRole(tokenPrincipal, memberToModify.id);
        } else {
          result = await daopadService.removeUserFromOrbit(tokenPrincipal, memberToModify.id);
        }
      }

      if (result.success) {
        // For member operations, the request is auto-approved and executed immediately
        // since the backend is an admin. Show success and refresh immediately.
        const actionText = modifyAction === 'downgrade' ? 'downgraded to Operator role' :
                          'deactivated (set to Inactive status)';
        setSuccess(`Member successfully ${actionText}. They no longer have access to the Orbit Station.`);
        setMemberToModify(null);
        setModifyAction('');
        // Refresh member list after a short delay to allow Orbit to process
        setTimeout(loadMembers, 1500);
      } else {
        setError(result.error || 'Failed to modify member');
      }
    } catch (err) {
      console.error('Error modifying member:', err);
      setError('Failed to modify member');
    } finally {
      setModifying(false);
    }
  };

  const filteredMembers = members
    .filter(member => {
      // Filter by search query
      const matchesSearch = member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.identities?.[0]?.toString().includes(searchQuery) ||
        member.id?.includes(searchQuery);

      // Filter by active/inactive status
      const isActive = member.status === 'Active';
      const shouldShow = showInactive || isActive;

      return matchesSearch && shouldShow;
    })
    .sort((a, b) => {
      // Sort inactive members to the bottom
      const aActive = a.status === 'Active';
      const bActive = b.status === 'Active';

      if (aActive && !bActive) return -1;  // Active before inactive
      if (!aActive && bActive) return 1;   // Inactive after active

      // Within the same status group, sort by name
      return (a.name || '').localeCompare(b.name || '');
    });

  const daopadCount = members.filter(m => m.is_daopad_backend).length;
  const humanAdmins = members.filter(m => !m.is_daopad_backend && m.groups?.includes('Admin')).length;
  const inactiveCount = members.filter(m => m.status === 'Inactive').length;

  if (!stationId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No treasury station configured
      </div>
    );
  }

  if (loading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <>
      {/* Membership Status */}
      {!loadingVotingPower && userVotingPower !== null && (
        <MembershipStatus
          identity={identity}
          token={token}
          members={members}
          votingPower={userVotingPower}
          onMembershipChange={() => {
            loadMembers();
            loadVotingPower();
          }}
        />
      )}

      {/* Status Alert */}
      {!loading && (
        <div className="mb-4">
          {daopadCount === 0 ? (
            <Alert className="border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Backend Not Admin</AlertTitle>
              <AlertDescription className="text-red-700">
                DAOPad backend must be added as an admin. Backend Principal:
                <code className="ml-1 text-xs">{backendPrincipal}</code>
              </AlertDescription>
            </Alert>
          ) : humanAdmins > 0 ? (
            <Alert className="border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Transition In Progress</AlertTitle>
              <AlertDescription className="text-yellow-700">
                Remove human admins to complete the transition to full DAO governance.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Fully Decentralized</AlertTitle>
              <AlertDescription className="text-green-700">
                DAOPad backend is the sole admin. All decisions now require community voting.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {error && (
        <Alert className="mb-4 border-red-200">
          <XCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">
              Show inactive {!showInactive && inactiveCount > 0 && `(${inactiveCount})`}
            </span>
          </label>
          <Button onClick={loadMembers} size="sm" variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Principal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Groups</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMembers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No members found
              </TableCell>
            </TableRow>
          ) : (
            filteredMembers.map((member) => {
              const type = member.is_daopad_backend ? 'DAOPad Backend' :
                          member.groups?.includes('Admin') ? 'Human Admin' :
                          member.groups?.includes('Operator') ? 'Operator' : 'Member';
              const variant = member.is_daopad_backend ? 'default' :
                             member.groups?.includes('Admin') ? 'destructive' : 'secondary';
              const principal = member.identities?.[0]?.toString() || member.id;
              const truncated = principal ? `${principal.slice(0, 6)}...${principal.slice(-4)}` : 'N/A';

              return (
                <TableRow key={member.id} className={member.status === 'Inactive' ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>
                    <Badge variant={variant}>{type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs">{truncated}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigator.clipboard.writeText(principal)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.status === 'Active' ? 'default' : 'secondary'}
                      className={member.status === 'Inactive' ? 'opacity-60' : ''}
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.groups?.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {member.groups.map((group, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {group}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!member.is_daopad_backend && member.status === 'Active' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {member.groups?.includes('Admin') && (
                            <DropdownMenuItem onClick={() => {
                              setMemberToModify(member);
                              setModifyAction('downgrade');
                            }}>
                              <ShieldOff className="mr-2 h-4 w-4" />
                              Downgrade to Operator
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setMemberToModify(member);
                              setModifyAction('remove');
                            }}
                            className="text-red-600"
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Deactivate Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Add a new member to the {token.symbol} Treasury Orbit Station.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="principal">User Principal ID</Label>
              <Input
                id="principal"
                placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                value={newMemberPrincipal}
                onChange={(e) => setNewMemberPrincipal(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="w-full px-3 py-2 border rounded-md"
                value={newMemberStatus}
                onChange={(e) => setNewMemberStatus(e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Groups</Label>
              <div className="space-y-2">
                {availableGroups.map(group => (
                  <label key={group.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={group.id}
                      checked={newMemberGroups.includes(group.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewMemberGroups([...newMemberGroups, group.id]);
                        } else {
                          setNewMemberGroups(newMemberGroups.filter(g => g !== group.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{group.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={adding}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={adding || !newMemberPrincipal.trim() || !newMemberName.trim()}>
              {adding ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modify Member Dialog */}
      <Dialog open={!!memberToModify} onOpenChange={() => setMemberToModify(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modifyAction === 'downgrade' ? 'Downgrade Admin' : 'Deactivate Member'}
            </DialogTitle>
            <DialogDescription>
              {modifyAction === 'downgrade' ?
                `Downgrade ${memberToModify?.name} from Admin to Operator role?` :
                `This will deactivate ${memberToModify?.name} by setting their status to Inactive. They will lose all access to the Orbit Station but their record will be preserved.`
              }
            </DialogDescription>
          </DialogHeader>

          {modifyAction === 'remove' && memberToModify?.groups?.includes('Admin') && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will remove all admin privileges. Make sure DAOPad backend remains as an admin.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToModify(null)} disabled={modifying}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleModifyMember} disabled={modifying}>
              {modifying ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}