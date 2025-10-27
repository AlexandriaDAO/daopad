import React, { useState, useCallback, useEffect } from 'react';
import { useIdentity } from '@/hooks/useIdentity';
import { useStationService } from '@/hooks/useStationService';
import { useActiveStation } from '@/hooks/useActiveStation';
import { getProposalService, getAdminService } from '@/services';
import { Principal } from '@dfinity/principal';
import { DialogLayout } from '@/components/shared/DialogLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Calendar,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { formatDateTime, formatPrincipalShort } from '@/utils/format';
import { cn } from '@/lib/utils';
import { RequestOperationView } from './RequestOperationView';

export function RequestDialog({ open, requestId, tokenId, onClose, onApproved }) {
  const { toast } = useToast();
  const { identity } = useIdentity();
  const { activeStation } = useActiveStation();
  const stationService = useStationService();
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Local state for request data
  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mutation states
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Proposal state for DAOPad governance
  const [proposal, setProposal] = useState(null);
  const [loadingProposal, setLoadingProposal] = useState(false);
  const [proposalError, setProposalError] = useState(null);
  const [userVotingPower, setUserVotingPower] = useState(null);

  // Fetch request details
  const fetchRequest = useCallback(async () => {
    if (!requestId || !stationService || !open) {
      setRequest(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await stationService.getRequest({ request_id: requestId });
      setRequest(result);
    } catch (err) {
      console.error('Failed to fetch request:', err);
      setError(err.message || 'Failed to fetch request');
    } finally {
      setIsLoading(false);
    }
  }, [requestId, stationService, open]);

  // Fetch on mount and when requestId or open state changes
  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  // Auto-refresh every 5 seconds when dialog is open
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      fetchRequest();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchRequest, open]);

  // Fetch proposal data for this request
  const fetchProposal = useCallback(async () => {
    if (!requestId || !tokenId || !open || !identity) {
      setProposal(null);
      return;
    }

    setLoadingProposal(true);
    setProposalError(null);

    try {
      const proposalService = getProposalService(identity);

      // Check if proposal exists for this request
      const result = await proposalService.getOrbitRequestProposal(tokenId, requestId);

      if (result.success && result.data) {
        setProposal(result.data);
      } else if (result.success && !result.data) {
        // No proposal exists yet - this is normal for new requests
        console.log('No proposal found for request:', requestId);
      } else {
        setProposalError(result.error || 'Failed to fetch proposal');
      }
    } catch (err) {
      console.error('Failed to fetch proposal:', err);
      setProposalError(err.message);
    } finally {
      setLoadingProposal(false);
    }
  }, [requestId, tokenId, open, identity]);

  // Fetch user's voting power
  const fetchUserVotingPower = useCallback(async () => {
    if (!tokenId || !open || !identity) {
      setUserVotingPower(null);
      return;
    }

    try {
      const daopadBackend = getProposalService(identity);
      const tokenPrincipal = typeof tokenId === 'string'
        ? Principal.fromText(tokenId)
        : tokenId;

      const result = await daopadBackend.getMyVotingPowerForToken(tokenPrincipal);
      if (result.success) {
        setUserVotingPower(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch voting power:', err);
    }
  }, [tokenId, open, identity]);

  // Fetch proposal when dialog opens
  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  // Fetch user's voting power when dialog opens
  useEffect(() => {
    fetchUserVotingPower();
  }, [fetchUserVotingPower]);

  // Vote on request (liquid democracy)
  const handleVote = async (vote) => {
    const setLoading = vote ? setIsApproving : setIsRejecting;
    setLoading(true);

    try {
      // Convert tokenId to Principal if it's a string
      const tokenPrincipal = typeof tokenId === 'string'
        ? Principal.fromText(tokenId)
        : tokenId;

      // Try admin canister first (migration path), fallback to backend
      try {
        const adminService = getAdminService(identity);
        await adminService.voteOnProposal(
          tokenPrincipal.toString(),
          requestId,
          vote
        );

        toast.success(`Vote ${vote ? 'Yes' : 'No'} recorded via admin`, {
          description: 'Your vote has been counted. Refreshing proposal data...'
        });
      } catch (adminError) {
        console.warn('[RequestDialog] Admin vote failed, trying backend fallback:', adminError);

        const daopadBackend = getProposalService(identity);
        const result = await daopadBackend.voteOnOrbitRequest(
          tokenPrincipal,
          requestId,
          vote
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to vote');
        }

        toast.success(`Vote ${vote ? 'Yes' : 'No'} recorded via backend`, {
          description: 'Your vote has been counted. Refreshing proposal data...'
        });
      }

      // Refresh both request and proposal data
      await Promise.all([
        fetchRequest(),
        fetchProposal()
      ]);

      // Notify parent component
      if (onApproved) onApproved();
    } catch (error) {
      console.error('Vote error:', error);

      // Show specific error message
      toast.error('Vote failed', {
        description: error.message || 'Failed to submit vote'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusMap = {
      Created: { icon: Clock, color: 'bg-blue-100 text-blue-800', label: 'Pending' },
      Approved: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Approved' },
      Rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Rejected' },
      Processing: { icon: Loader2, color: 'bg-yellow-100 text-yellow-800', label: 'Processing' },
      Completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Completed' },
      Failed: { icon: AlertCircle, color: 'bg-red-100 text-red-800', label: 'Failed' },
    };

    const config = statusMap[status] || { icon: AlertCircle, color: 'bg-gray-100 text-gray-800', label: status };
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className={cn('h-3 w-3 mr-1', status === 'Processing' && 'animate-spin')} />
        {config.label}
      </Badge>
    );
  };

  // Calculate approval progress
  const getApprovalProgress = () => {
    if (!request || !request.approvals_required) return 0;
    const approved = request.approvals_count || 0;
    const required = request.approvals_required;
    return (approved / required) * 100;
  };

  // Helper functions for proposal display
  const getOperationTypeName = (requestType) => {
    if (typeof requestType === 'string') return requestType;
    if (typeof requestType === 'object' && requestType !== null) {
      const key = Object.keys(requestType)[0];
      return key;
    }
    return 'Unknown';
  };

  const getThresholdPercentage = (requestType) => {
    const typeName = getOperationTypeName(requestType);

    const thresholds = {
      'SystemUpgrade': 90, 'SystemRestore': 90, 'SetDisasterRecovery': 90, 'ManageSystemInfo': 90,
      'Transfer': 75, 'AddAccount': 75, 'EditAccount': 75,
      'EditPermission': 70, 'AddRequestPolicy': 70, 'EditRequestPolicy': 70, 'RemoveRequestPolicy': 70,
      'CreateExternalCanister': 60, 'ConfigureExternalCanister': 60, 'ChangeExternalCanister': 60,
      'CallExternalCanister': 60, 'FundExternalCanister': 60, 'MonitorExternalCanister': 60,
      'SnapshotExternalCanister': 60, 'RestoreExternalCanister': 60, 'PruneExternalCanister': 60,
      'AddNamedRule': 60, 'EditNamedRule': 60, 'RemoveNamedRule': 60,
      'AddUser': 50, 'EditUser': 50, 'RemoveUser': 50, 'AddUserGroup': 50, 'EditUserGroup': 50, 'RemoveUserGroup': 50,
      'AddAsset': 40, 'EditAsset': 40, 'RemoveAsset': 40,
      'AddAddressBookEntry': 30, 'EditAddressBookEntry': 30, 'RemoveAddressBookEntry': 30,
    };

    return thresholds[typeName] || 75;
  };

  const getRiskLevel = (requestType) => {
    const threshold = getThresholdPercentage(requestType);
    if (threshold >= 90) return 'CRITICAL';
    if (threshold >= 70) return 'HIGH';
    if (threshold >= 60) return 'MEDIUM-HIGH';
    if (threshold >= 50) return 'MEDIUM';
    if (threshold >= 40) return 'LOW';
    return 'VERY LOW';
  };

  const getRiskLevelColor = (requestType) => {
    const level = getRiskLevel(requestType);
    const colors = {
      'CRITICAL': 'bg-red-100 text-red-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'MEDIUM-HIGH': 'bg-yellow-100 text-yellow-800',
      'MEDIUM': 'bg-blue-100 text-blue-800',
      'LOW': 'bg-green-100 text-green-800',
      'VERY LOW': 'bg-gray-100 text-gray-800',
    };
    return colors[level] || colors['MEDIUM'];
  };

  const getVotingProgress = (proposal) => {
    const totalVP = Number(proposal.total_voting_power);
    const yesVotes = Number(proposal.yes_votes);
    const threshold = getThresholdPercentage(proposal.request_type);

    if (totalVP === 0) return 0;

    const requiredVotes = (totalVP * threshold) / 100;
    const progress = (yesVotes / requiredVotes) * 100;

    return Math.min(100, progress);
  };

  const getVotingProgressText = (proposal) => {
    const totalVP = Number(proposal.total_voting_power);
    const yesVotes = Number(proposal.yes_votes);
    const threshold = getThresholdPercentage(proposal.request_type);
    const requiredVotes = Math.ceil((totalVP * threshold) / 100);

    const remaining = Math.max(0, requiredVotes - yesVotes);

    if (remaining === 0) {
      return 'Threshold reached! Awaiting execution.';
    }

    return `${remaining.toLocaleString()} more votes needed to reach ${threshold}% threshold`;
  };

  const footer = (
    <Button variant="outline" onClick={onClose}>
      Close
    </Button>
  );

  return (
    <DialogLayout
      open={open}
      onOpenChange={onClose}
      title={
        <div className="flex items-center justify-between w-full">
          <span>Request Details</span>
          {request && getStatusBadge(request.status)}
        </div>
      }
      footer={footer}
      maxWidth="max-w-3xl"
      maxHeight="max-h-[90vh]"
    >
      {isLoading && !request ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : request ? (
        <ScrollArea className="max-h-[60vh]">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="approvals">Approvals</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Request Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Request ID</Label>
                      <p className="font-mono text-sm">{formatPrincipalShort(requestId)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Created</Label>
                      <p className="text-sm">{formatDateTime(request.created_at)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Requester</Label>
                      <p className="font-mono text-sm">{formatPrincipalShort(request.requester)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Expiration</Label>
                      <p className="text-sm">{formatDateTime(request.expiration_dt)}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Title</Label>
                    <p className="text-sm font-medium">{request.title || 'No title'}</p>
                  </div>

                  {request.summary && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Summary</Label>
                      <p className="text-sm">{request.summary}</p>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Approval Progress</Label>
                    <div className="space-y-2">
                      <Progress value={getApprovalProgress()} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {request.approvals_count || 0} of {request.approvals_required} approvals
                      </p>
                    </div>
                  </div>

                  {proposal && (
                    <>
                      <Separator />

                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          Community Voting (DAOPad Governance)
                        </Label>

                        <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Operation Type:</span>
                            <Badge variant="outline">
                              {getOperationTypeName(proposal.request_type)}
                            </Badge>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Required Threshold:</span>
                            <span className="font-mono">
                              {getThresholdPercentage(proposal.request_type)}%
                            </span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Risk Level:</span>
                            <Badge className={getRiskLevelColor(proposal.request_type)}>
                              {getRiskLevel(proposal.request_type)}
                            </Badge>
                          </div>

                          <Separator className="my-2" />

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-center p-2 bg-green-50 rounded">
                              <div className="font-bold text-green-700">
                                {Number(proposal.yes_votes).toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">Yes Votes</div>
                            </div>

                            <div className="text-center p-2 bg-red-50 rounded">
                              <div className="font-bold text-red-700">
                                {Number(proposal.no_votes).toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">No Votes</div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Progress
                              value={getVotingProgress(proposal)}
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground text-center">
                              {getVotingProgressText(proposal)}
                            </p>
                          </div>

                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Expires:</span>
                            <span>{formatDateTime(proposal.expires_at)}</span>
                          </div>
                        </div>

                        {proposal.status && Object.keys(proposal.status)[0] === 'Active' && userVotingPower && userVotingPower > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs text-center text-muted-foreground">
                              Your voting power: <strong>{Number(userVotingPower).toLocaleString()} VP</strong>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                onClick={() => handleVote(true)}
                                disabled={isApproving || isRejecting}
                                variant="default"
                                size="sm"
                              >
                                {isApproving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                <ThumbsUp className="mr-2 h-3 w-3" />
                                Vote Yes
                              </Button>

                              <Button
                                onClick={() => handleVote(false)}
                                disabled={isApproving || isRejecting}
                                variant="destructive"
                                size="sm"
                              >
                                {isRejecting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                <ThumbsDown className="mr-2 h-3 w-3" />
                                Vote No
                              </Button>
                            </div>
                          </div>
                        )}

                        {proposal.status && Object.keys(proposal.status)[0] === 'Active' && (!userVotingPower || userVotingPower === 0) && (
                          <Alert variant="default" className="mt-3">
                            <AlertDescription className="text-xs">
                              You need voting power to vote. Lock LP tokens in Kong Locker to participate.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {request.operation && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Operation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RequestOperationView operation={request.operation} />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="approvals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  {request.approvals && request.approvals.length > 0 ? (
                    <div className="space-y-2">
                      {request.approvals.map((approval, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{formatPrincipalShort(approval.approver)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(approval.decided_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No approvals yet
                    </p>
                  )}
                </CardContent>
              </Card>

              {request.status === 'Created' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Your Action</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="approval-comment">Comment (Optional)</Label>
                      <Textarea
                        id="approval-comment"
                        placeholder="Add a comment with your approval..."
                        value={approvalComment}
                        onChange={(e) => setApprovalComment(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <Button
                      onClick={() => handleVote(true)}
                      disabled={isApproving}
                      className="w-full"
                    >
                      {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <ThumbsUp className="mr-2 h-4 w-4" />
                      Vote Yes
                    </Button>

                    <Separator />

                    <div>
                      <Label htmlFor="rejection-reason">Vote No Comment (Optional)</Label>
                      <Textarea
                        id="rejection-reason"
                        placeholder="Add a comment with your No vote..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <Button
                      onClick={() => handleVote(false)}
                      disabled={isRejecting}
                      variant="destructive"
                      className="w-full"
                    >
                      {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <ThumbsDown className="mr-2 h-4 w-4" />
                      Vote No
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Activity History</CardTitle>
                </CardHeader>
                <CardContent>
                  {request.history && request.history.length > 0 ? (
                    <div className="space-y-3">
                      {request.history.map((event, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="rounded-full bg-muted p-1">
                              <Calendar className="h-3 w-3" />
                            </div>
                            {idx < request.history.length - 1 && (
                              <div className="w-px h-full bg-border" />
                            )}
                          </div>
                          <div className="flex-1 pb-3">
                            <p className="text-sm font-medium">{event.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(event.timestamp)}
                            </p>
                            {event.details && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {event.details}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No history available
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      ) : null}
    </DialogLayout>
  );
}
