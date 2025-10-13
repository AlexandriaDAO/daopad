import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, User, Hash, Shield, AlertCircle, Plus, X } from 'lucide-react';
import { formatPrincipalShort } from '@/utils/format';

export function RuleBuilder({
  value = { type: 'Quorum', min_approved: 1, approvers: [] },
  onChange,
  disabled = false,
  availableUsers = [],
  availableGroups = []
}) {
  const [ruleType, setRuleType] = useState(value.type || 'Quorum');
  const [selectedApprovers, setSelectedApprovers] = useState(new Set(value.approvers || []));
  const [minApproved, setMinApproved] = useState(value.min_approved || 1);
  const [thresholdMin, setThresholdMin] = useState(value.min || 0);
  const [thresholdMax, setThresholdMax] = useState(value.max || '');
  const [allowList, setAllowList] = useState(value.allowed || []);
  const [newAllowedUser, setNewAllowedUser] = useState('');

  useEffect(() => {
    // Update local state when value prop changes
    if (value) {
      setRuleType(value.type);
      if (value.type === 'Quorum') {
        setMinApproved(value.min_approved || 1);
        setSelectedApprovers(new Set(value.approvers || []));
      } else if (value.type === 'Threshold') {
        setThresholdMin(value.min || 0);
        setThresholdMax(value.max || '');
      } else if (value.type === 'AllowListed') {
        setAllowList(value.allowed || []);
      }
    }
  }, [value]);

  const handleRuleTypeChange = (newType) => {
    if (disabled) return;
    setRuleType(newType);

    // Initialize with default values for the new type
    switch (newType) {
      case 'Quorum':
        onChange({
          type: 'Quorum',
          min_approved: 1,
          approvers: []
        });
        setMinApproved(1);
        setSelectedApprovers(new Set());
        break;
      case 'Threshold':
        onChange({
          type: 'Threshold',
          min: 0,
          max: undefined
        });
        setThresholdMin(0);
        setThresholdMax('');
        break;
      case 'Anyone':
        onChange({ type: 'Anyone' });
        break;
      case 'AllowListed':
        onChange({
          type: 'AllowListed',
          allowed: []
        });
        setAllowList([]);
        break;
    }
  };

  const handleQuorumUpdate = (updates) => {
    if (disabled) return;
    const newRule = {
      type: 'Quorum',
      min_approved: updates.min_approved !== undefined ? updates.min_approved : minApproved,
      approvers: updates.approvers !== undefined ? updates.approvers : Array.from(selectedApprovers)
    };
    onChange(newRule);
  };

  const handleThresholdUpdate = (updates) => {
    if (disabled) return;
    const newRule = {
      type: 'Threshold',
      min: updates.min !== undefined ? updates.min : thresholdMin,
      max: updates.max !== undefined ? (updates.max === '' ? undefined : updates.max) : (thresholdMax === '' ? undefined : thresholdMax)
    };
    onChange(newRule);
  };

  const handleAllowListUpdate = (newList) => {
    if (disabled) return;
    setAllowList(newList);
    onChange({
      type: 'AllowListed',
      allowed: newList
    });
  };

  const toggleApprover = (id) => {
    if (disabled) return;
    const newSet = new Set(selectedApprovers);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedApprovers(newSet);
    handleQuorumUpdate({ approvers: Array.from(newSet) });
  };

  const addToAllowList = () => {
    if (!newAllowedUser.trim() || disabled) return;
    const newList = [...allowList, newAllowedUser.trim()];
    handleAllowListUpdate(newList);
    setNewAllowedUser('');
  };

  const removeFromAllowList = (index) => {
    if (disabled) return;
    const newList = allowList.filter((_, i) => i !== index);
    handleAllowListUpdate(newList);
  };

  return (
    <Tabs value={ruleType} onValueChange={handleRuleTypeChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="Quorum" disabled={disabled}>
          <Users className="w-4 h-4 mr-2" />
          Quorum
        </TabsTrigger>
        <TabsTrigger value="Threshold" disabled={disabled}>
          <Hash className="w-4 h-4 mr-2" />
          Threshold
        </TabsTrigger>
        <TabsTrigger value="Anyone" disabled={disabled}>
          <User className="w-4 h-4 mr-2" />
          Anyone
        </TabsTrigger>
        <TabsTrigger value="AllowListed" disabled={disabled}>
          <Shield className="w-4 h-4 mr-2" />
          Allow List
        </TabsTrigger>
      </TabsList>

      <TabsContent value="Quorum" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="min-approved">Minimum Approvals Required</Label>
          <Input
            id="min-approved"
            type="number"
            min="1"
            value={minApproved}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 1;
              setMinApproved(value);
              handleQuorumUpdate({ min_approved: value });
            }}
            disabled={disabled}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            The minimum number of approvals needed to execute the request
          </p>
        </div>

        <div className="space-y-2">
          <Label>Specific Approvers (Optional)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            If specified, only these users/groups can approve. Leave empty for any authorized user.
          </p>

          {(availableUsers.length > 0 || availableGroups.length > 0) ? (
            <Card>
              <ScrollArea className="h-[200px]">
                <CardContent className="pt-4 space-y-3">
                  {availableGroups.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Groups</p>
                      {availableGroups.map(group => (
                        <div key={group.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={selectedApprovers.has(group.id)}
                            onCheckedChange={() => toggleApprover(group.id)}
                            disabled={disabled}
                          />
                          <label
                            htmlFor={`group-${group.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            <Badge variant="secondary" className="mr-2">Group</Badge>
                            {group.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {availableUsers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Users</p>
                      {availableUsers.map(user => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={selectedApprovers.has(user.id)}
                            onCheckedChange={() => toggleApprover(user.id)}
                            disabled={disabled}
                          />
                          <label
                            htmlFor={`user-${user.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {user.name}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {formatPrincipalShort(user.principal)}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </ScrollArea>
            </Card>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No users or groups available. Any authorized user will be able to approve.
              </AlertDescription>
            </Alert>
          )}

          {selectedApprovers.size > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Array.from(selectedApprovers).map(id => {
                const group = availableGroups.find(g => g.id === id);
                const user = availableUsers.find(u => u.id === id);
                return (
                  <Badge key={id} variant="secondary" className="text-xs">
                    {group ? `Group: ${group.name}` : user?.name || id}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="Threshold" className="space-y-4 mt-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Threshold rules apply to transfer amounts or numerical values in requests.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="threshold-min">Minimum Amount</Label>
          <Input
            id="threshold-min"
            type="number"
            min="0"
            step="0.01"
            value={thresholdMin}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              setThresholdMin(value);
              handleThresholdUpdate({ min: value });
            }}
            disabled={disabled}
            className="w-48"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="threshold-max">Maximum Amount (Optional)</Label>
          <Input
            id="threshold-max"
            type="number"
            min="0"
            step="0.01"
            value={thresholdMax}
            onChange={(e) => {
              const value = e.target.value;
              setThresholdMax(value);
              handleThresholdUpdate({ max: value ? parseFloat(value) : undefined });
            }}
            disabled={disabled}
            placeholder="No maximum"
            className="w-48"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty for no maximum limit
          </p>
        </div>
      </TabsContent>

      <TabsContent value="Anyone" className="mt-4">
        <Alert>
          <User className="h-4 w-4" />
          <AlertDescription>
            Any user with the appropriate permissions can approve requests of this type.
            This is the least restrictive option.
          </AlertDescription>
        </Alert>
      </TabsContent>

      <TabsContent value="AllowListed" className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label>Allowed Principals</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Only these specific principals can approve requests of this type.
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="Enter principal ID..."
              value={newAllowedUser}
              onChange={(e) => setNewAllowedUser(e.target.value)}
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={addToAllowList}
              disabled={disabled || !newAllowedUser.trim()}
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>

          {allowList.length > 0 && (
            <Card>
              <ScrollArea className="h-[150px]">
                <CardContent className="pt-4 space-y-2">
                  {allowList.map((principal, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                      <code className="text-xs">{formatPrincipalShort(principal)}</code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromAllowList(index)}
                        disabled={disabled}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </ScrollArea>
            </Card>
          )}

          {allowList.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No principals in the allow list. Add principals to restrict who can approve.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}