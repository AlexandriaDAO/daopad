import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { DAOPadBackendService } from '../services/daopadBackend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserPlus,
  UserMinus,
  RefreshCw,
  Copy,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const OrbitUserManager = ({ token, identity, orbitStation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add user dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUserPrincipal, setNewUserPrincipal] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserStatus, setNewUserStatus] = useState('Active');
  const [newUserGroups, setNewUserGroups] = useState([]);
  const [adding, setAdding] = useState(false);

  // User groups
  const [availableGroups, setAvailableGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Remove user confirmation dialog
  const [userToRemove, setUserToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (orbitStation?.station_id) {
      loadUsers();
      loadGroups();
    }
  }, [orbitStation]);

  const loadUsers = async () => {
    if (!identity || !token) return;

    setLoading(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const result = await daopadService.listOrbitUsers(tokenPrincipal);

      if (result.success) {
        setUsers(result.data || []);
      } else {
        setError(result.error || 'Failed to load users');
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    if (!identity) return;

    setLoadingGroups(true);
    try {
      const daopadService = new DAOPadBackendService(identity);
      // First try to get predefined groups
      const predefinedResult = await daopadService.getPredefinedGroups();

      if (predefinedResult.success) {
        setAvailableGroups(predefinedResult.data || []);
      } else {
        // Fallback to hardcoded groups if the call fails
        setAvailableGroups([
          { id: '00000000-e400-0000-4d8f-480000000000', name: 'Admin' },
          { id: '00000000-e400-0000-4d8f-480000000001', name: 'Operator' }
        ]);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
      // Use hardcoded groups as fallback
      setAvailableGroups([
        { id: '00000000-e400-0000-4d8f-480000000000', name: 'Admin' },
        { id: '00000000-e400-0000-4d8f-480000000001', name: 'Operator' }
      ]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserPrincipal.trim() || !newUserName.trim()) {
      setError('Please enter both principal and name');
      return;
    }

    // Validate principal
    try {
      Principal.fromText(newUserPrincipal.trim());
    } catch (err) {
      setError('Invalid principal ID format');
      return;
    }

    setAdding(true);
    setError('');
    setSuccess('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const userPrincipal = Principal.fromText(newUserPrincipal.trim());

      // Prepare status object
      const statusObj = newUserStatus === 'Active'
        ? { 'Active': null }
        : { 'Inactive': null };

      const result = await daopadService.addUserToOrbit(
        tokenPrincipal,
        userPrincipal,
        newUserName.trim(),
        newUserGroups, // Array of group UUIDs
        statusObj
      );

      if (result.success) {
        setSuccess(`User addition request created: ${result.data}`);
        setShowAddDialog(false);
        setNewUserPrincipal('');
        setNewUserName('');
        setNewUserStatus('Active');
        setNewUserGroups([]);
        // Reload users after a delay to allow the request to process
        setTimeout(() => loadUsers(), 3000);
      } else {
        setError(result.error || 'Failed to add user');
      }
    } catch (err) {
      console.error('Error adding user:', err);
      setError('Failed to add user');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!userToRemove) return;

    setRemoving(true);
    setError('');
    setSuccess('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);

      const result = await daopadService.removeUserFromOrbit(
        tokenPrincipal,
        userToRemove.id
      );

      if (result.success) {
        setSuccess(`User removal request created: ${result.data}`);
        setUserToRemove(null);
        // Reload users after a delay
        setTimeout(() => loadUsers(), 3000);
      } else {
        setError(result.error || 'Failed to remove user');
      }
    } catch (err) {
      console.error('Error removing user:', err);
      setError('Failed to remove user');
    } finally {
      setRemoving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (!orbitStation?.station_id) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Orbit Station Members
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={loadUsers}
              size="sm"
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowAddDialog(true)}
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Add Member
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
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

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-executive-mediumGray text-executive-lightGray px-1 py-0.5 rounded">
                        {user.identities[0] ?
                          `${user.identities[0].toString().slice(0, 6)}...${user.identities[0].toString().slice(-4)}` :
                          'N/A'}
                      </code>
                      {user.identities[0] && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(user.identities[0].toString())}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.groups.length > 0 ? user.groups.join(', ') : 'None'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setUserToRemove(user)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-executive-lightGray/60 py-4">No members found</p>
        )}
      </CardContent>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member to Orbit Station</DialogTitle>
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
                value={newUserPrincipal}
                onChange={(e) => setNewUserPrincipal(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="w-full px-3 py-2 border border-executive-mediumGray bg-executive-darkGray text-executive-lightGray rounded-md focus:outline-none focus:ring-2 focus:ring-executive-gold"
                value={newUserStatus}
                onChange={(e) => setNewUserStatus(e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groups">Groups</Label>
              <div className="space-y-2">
                {loadingGroups ? (
                  <p className="text-sm text-executive-lightGray/60">Loading groups...</p>
                ) : availableGroups.length > 0 ? (
                  availableGroups.map(group => (
                    <label key={group.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={group.id}
                        checked={newUserGroups.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewUserGroups([...newUserGroups, group.id]);
                          } else {
                            setNewUserGroups(newUserGroups.filter(g => g !== group.id));
                          }
                        }}
                        className="rounded border-executive-mediumGray text-executive-gold focus:ring-executive-gold"
                      />
                      <span className="text-sm">{group.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-executive-lightGray/60">No groups available</p>
                )}
                {newUserGroups.length === 0 && (
                  <p className="text-xs text-executive-lightGray/60 mt-1">
                    Note: User will have basic access without any groups
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={adding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={adding || !newUserPrincipal.trim() || !newUserName.trim()}
            >
              {adding ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Confirmation Dialog */}
      <Dialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {userToRemove?.name} from the Orbit Station?
              This will set their status to Inactive.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUserToRemove(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveUser}
              disabled={removing}
            >
              {removing ? 'Removing...' : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default OrbitUserManager;