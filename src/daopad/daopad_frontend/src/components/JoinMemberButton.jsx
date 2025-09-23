import React, { useState } from 'react';
import { Principal } from '@dfinity/principal';
import { DAOPadBackendService } from '../services/daopadBackend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, AlertCircle } from 'lucide-react';

const JoinMemberButton = ({ identity, token, votingPower, onSuccess }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('Please enter a display name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);

      const result = await daopadService.joinOrbitStation(tokenPrincipal, name.trim());

      if (result.success) {
        const response = result.data;
        const { request_id, auto_approved, status, failure_reason } = response;

        if (status === 'Failed') {
          setError(failure_reason || 'Failed to create membership request');
          return;
        }

        // Show success toast
        toast({
          title: auto_approved ? "Membership Approved!" : "Request Submitted",
          description: auto_approved
            ? "You are now a member of this treasury"
            : `Your request is pending approval`,
          variant: "default"
        });

        setShowDialog(false);
        setName('');

        if (onSuccess) {
          onSuccess(request_id);
        }

        // Refresh page if auto-approved to show new member status
        if (auto_approved) {
          setTimeout(() => window.location.reload(), 2000);
        }
      } else {
        setError(result.error || 'Failed to submit membership request');
      }
    } catch (err) {
      console.error('Error joining as member:', err);
      setError('An unexpected error occurred while submitting your request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)} className="w-full">
        <UserPlus className="h-4 w-4 mr-2" />
        Join as Member
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Treasury as Member</DialogTitle>
            <DialogDescription>
              Request membership in the {token.symbol} treasury to participate in governance decisions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center justify-between text-sm">
                <span>Your voting power:</span>
                <span className="font-mono font-bold">{votingPower.toLocaleString()} VP</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span>Required minimum:</span>
                <span className="font-mono">100 VP</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How you want to be identified"
                maxLength={50}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                This will be visible to other treasury members
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertDescription>
                This will create a membership request that may need admin approval.
                You'll be notified once your membership is active.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setName('');
                setError('');
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoin}
              disabled={loading || !name.trim()}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default JoinMemberButton;