import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { DAOPadBackendService } from '../services/daopadBackend';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';
import JoinMemberButton from './JoinMemberButton';

const MembershipStatus = ({ identity, token, members, votingPower, onMembershipChange }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const userPrincipal = identity?.getPrincipal?.().toString();

  useEffect(() => {
    if (userPrincipal && token) {
      loadPendingRequests();
    }
  }, [userPrincipal, token]);

  const loadPendingRequests = async () => {
    if (!identity || !token) return;

    setLoading(true);
    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const userPrincipalObj = Principal.fromText(userPrincipal);

      const result = await daopadService.getUserPendingRequests(tokenPrincipal, userPrincipalObj);
      if (result.success) {
        // Filter for AddUser requests that might be for this user
        const addUserRequests = result.data.filter(req =>
          req.title && req.title.toLowerCase().includes('member')
        );
        setPendingRequests(addUserRequests);
      }
    } catch (err) {
      console.error('Error loading pending requests:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check current membership
  const currentMember = members.find(m =>
    m.identities?.some(id => id.toString() === userPrincipal)
  );

  // Determine user state
  const getUserState = () => {
    if (currentMember) {
      const isAdmin = currentMember.groups?.includes('Admin');
      const isOperator = currentMember.groups?.includes('Operator');
      return {
        status: 'member',
        role: isAdmin ? 'Admin' : isOperator ? 'Operator' : 'Member',
        canJoin: false
      };
    }

    return {
      status: votingPower >= 100 ? 'eligible' : 'ineligible',
      role: null,
      canJoin: votingPower >= 100
    };
  };

  const state = getUserState();
  const hasPendingRequest = pendingRequests.length > 0;

  const navigateToRequest = (requestId) => {
    // This could navigate to a request details view
    toast({
      title: "Request Details",
      description: `Request ID: ${requestId}`,
    });
  };

  const handleJoinSuccess = (requestId) => {
    toast({
      title: "Request Submitted",
      description: `Your membership request has been submitted. Request ID: ${requestId}`,
    });
    loadPendingRequests();
    if (onMembershipChange) {
      onMembershipChange();
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Your Membership Status
          {loading && <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state.status === 'member' ? (
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="default" className="mb-2">
                Active {state.role}
              </Badge>
              <p className="text-sm text-muted-foreground">
                You are an active {state.role.toLowerCase()} of this treasury
              </p>
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700">Full access granted</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Your Voting Power</div>
              <div className="text-xl font-bold font-mono">
                {votingPower.toLocaleString()}
              </div>
            </div>
          </div>
        ) : state.status === 'eligible' ? (
          <div>
            <div className="flex items-start justify-between mb-3">
              <div>
                <Badge variant="outline" className="mb-2">
                  Eligible to Join
                </Badge>
                <p className="text-sm text-muted-foreground">
                  You have {votingPower.toLocaleString()} VP and are eligible to join as a member
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Voting Power</div>
                <div className="text-xl font-bold font-mono text-green-600">
                  {votingPower.toLocaleString()}
                </div>
              </div>
            </div>

            {hasPendingRequest ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <Badge variant="secondary">Request Pending</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Your membership request is being processed
                </p>
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div>
                      <p className="text-sm font-medium">{request.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Status: {request.status} • {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'Recently created'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigateToRequest(request.id)}
                    >
                      View Request
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <JoinMemberButton
                identity={identity}
                token={token}
                votingPower={votingPower}
                onSuccess={handleJoinSuccess}
              />
            )}
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="secondary" className="mb-2">
                Not Eligible
              </Badge>
              <p className="text-sm text-muted-foreground">
                You need at least 100 VP to join as a member
              </p>
              <div className="flex items-center gap-2 mt-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">
                  Current: {votingPower.toLocaleString()} VP (need 100+ VP)
                </span>
              </div>
              <Alert className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Lock more LP tokens in Kong Locker to increase your voting power and become eligible.
                </AlertDescription>
              </Alert>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Voting Power</div>
              <div className="text-xl font-bold font-mono text-red-600">
                {votingPower.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MembershipStatus;