import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { X, Save, UserPlus, User, Shield, Hash, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from '../ui/toaster';
import { createUserThunk, editUserThunk } from '../../features/station/stationSlice';
import { formatPrincipal, formatTimestamp } from '../../utils/orbit-helpers';
import { Principal } from '@dfinity/principal';

export default function UserDialog({
  open,
  onClose,
  onSubmit,
  user,
  mode, // 'view', 'edit', 'create'
  stationId,
  identity,
}) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    status: 'Active',
    identities: [],
    groups: [],
  });

  const [newIdentity, setNewIdentity] = useState('');
  const [identityError, setIdentityError] = useState('');

  // Initialize form data when user or mode changes
  useEffect(() => {
    if (mode === 'create') {
      setFormData({
        name: '',
        status: 'Active',
        identities: [],
        groups: [],
      });
    } else if (user) {
      setFormData({
        name: user.name || '',
        status: user.status || 'Active',
        identities: user.identities || [],
        groups: user.groups || [],
      });
    }
  }, [user, mode]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validatePrincipal = (principalStr) => {
    try {
      Principal.fromText(principalStr);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddIdentity = () => {
    if (!newIdentity) {
      setIdentityError('Principal is required');
      return;
    }

    if (!validatePrincipal(newIdentity)) {
      setIdentityError('Invalid principal format');
      return;
    }

    if (formData.identities.some((id) => id.toString() === newIdentity)) {
      setIdentityError('Principal already added');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      identities: [...prev.identities, Principal.fromText(newIdentity)],
    }));
    setNewIdentity('');
    setIdentityError('');
  };

  const handleRemoveIdentity = (index) => {
    setFormData((prev) => ({
      ...prev,
      identities: prev.identities.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'User name is required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.identities.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one identity is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === 'create') {
        // Create new user
        const userInput = {
          name: formData.name,
          status: { [formData.status]: null },
          identities: formData.identities,
          groups: formData.groups.map((g) => g.id),
        };

        await dispatch(
          createUserThunk({
            stationId,
            identity,
            userInput,
          })
        ).unwrap();

        toast({
          title: 'Success',
          description: 'User creation request submitted',
        });
      } else if (mode === 'edit') {
        // Edit existing user
        const updates = {
          name: [formData.name],
          status: [{ [formData.status]: null }],
          identities: [formData.identities],
          groups: [formData.groups.map((g) => g.id)],
        };

        await dispatch(
          editUserThunk({
            stationId,
            identity,
            userId: user.id,
            updates,
          })
        ).unwrap();

        toast({
          title: 'Success',
          description: 'User update request submitted',
        });
      }

      onSubmit();
    } catch (error) {
      console.error('Error submitting user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit user request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create New User';
      case 'edit':
        return 'Edit User';
      default:
        return 'User Details';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'create':
        return 'Add a new user to the Orbit Station';
      case 'edit':
        return 'Update user information and permissions';
      default:
        return 'View user details and permissions';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="identities">Identities</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {/* User ID (view only) */}
            {mode !== 'create' && user?.id && (
              <div className="space-y-2">
                <Label htmlFor="userId">
                  <Hash className="inline h-3 w-3 mr-1" />
                  User ID
                </Label>
                <Input
                  id="userId"
                  value={user.id}
                  disabled
                  className="font-mono text-xs"
                />
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                <User className="inline h-3 w-3 mr-1" />
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={mode === 'view'}
                placeholder="Enter user name"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">
                <Shield className="inline h-3 w-3 mr-1" />
                Status
              </Label>
              {mode === 'view' ? (
                <div>
                  <Badge variant={formData.status === 'Active' ? 'success' : 'secondary'}>
                    {formData.status}
                  </Badge>
                </div>
              ) : (
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                  disabled={mode === 'view'}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Groups */}
            <div className="space-y-2">
              <Label>Groups</Label>
              {formData.groups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.groups.map((group) => (
                    <Badge key={group.id} variant="outline">
                      {group.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No groups assigned</p>
              )}
            </div>

            {/* Last Modified (view only) */}
            {mode !== 'create' && user?.last_modification_timestamp && (
              <div className="space-y-2">
                <Label>
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Last Modified
                </Label>
                <p className="text-sm">
                  {formatTimestamp(user.last_modification_timestamp, { format: 'long' })}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="identities" className="space-y-4">
            {/* Add Identity (edit/create only) */}
            {mode !== 'view' && (
              <div className="space-y-2">
                <Label htmlFor="newIdentity">Add Identity (Principal)</Label>
                <div className="flex gap-2">
                  <Input
                    id="newIdentity"
                    value={newIdentity}
                    onChange={(e) => {
                      setNewIdentity(e.target.value);
                      setIdentityError('');
                    }}
                    placeholder="Enter principal ID"
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    onClick={handleAddIdentity}
                    variant="secondary"
                  >
                    Add
                  </Button>
                </div>
                {identityError && (
                  <p className="text-sm text-destructive">{identityError}</p>
                )}
              </div>
            )}

            {/* Identities List */}
            <div className="space-y-2">
              <Label>Identities</Label>
              {formData.identities.length > 0 ? (
                <div className="space-y-2">
                  {formData.identities.map((identity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <code className="text-xs">{formatPrincipal(identity)}</code>
                      {mode !== 'view' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveIdentity(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No identities assigned. Add at least one identity.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {mode !== 'view' && (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                'Submitting...'
              ) : mode === 'create' ? (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create User
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}