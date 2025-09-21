import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStationService } from '@/hooks/useStationService';
import { useActiveStation } from '@/hooks/useActiveStation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  Hash,
  FileText,
  Shield,
  ThumbsUp,
  ThumbsDown,
  Play,
  Ban
} from 'lucide-react';
import { formatDateTime, formatPrincipalShort } from '@/utils/format';
import { cn } from '@/lib/utils';
import { RequestOperationView } from './RequestOperationView';

export function RequestDialog({ open, requestId, onClose, onApproved }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeStation } = useActiveStation();
  const stationService = useStationService();
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Query for request details
  const requestQuery = useQuery({
    queryKey: ['station', activeStation?.station_id, 'request', requestId],
    queryFn: async () => {
      if (!requestId || !stationService) return null;
      return stationService.getRequest({ request_id: requestId });
    },
    enabled: !!requestId && !!stationService && open,
    refetchInterval: open ? 5000 : false
  });

  // Approval mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      return stationService.approveRequest({
        request_id: requestId,
        comment: approvalComment || null
      });
    },
    onSuccess: () => {
      toast({
        title: 'Request approved',
        description: 'Your approval has been recorded'
      });
      queryClient.invalidateQueries(['station', activeStation?.station_id, 'requests']);
      queryClient.invalidateQueries(['station', activeStation?.station_id, 'request', requestId]);
      if (onApproved) onApproved();
    },
    onError: (error) => {
      toast({
        title: 'Approval failed',
        description: error.message || 'Failed to approve request',
        variant: 'destructive'
      });
    }
  });

  // Rejection mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      return stationService.rejectRequest({
        request_id: requestId,
        reason: rejectionReason || 'Request rejected'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Request rejected',
        description: 'The request has been rejected'
      });
      queryClient.invalidateQueries(['station', activeStation?.station_id, 'requests']);
      queryClient.invalidateQueries(['station', activeStation?.station_id, 'request', requestId]);
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Rejection failed',
        description: error.message || 'Failed to reject request',
        variant: 'destructive'
      });
    }
  });

  // Execute mutation
  const executeMutation = useMutation({
    mutationFn: async () => {
      return stationService.executeRequest({ request_id: requestId });
    },
    onSuccess: () => {
      toast({
        title: 'Request executed',
        description: 'The request has been executed successfully'
      });
      queryClient.invalidateQueries(['station', activeStation?.station_id, 'requests']);
      queryClient.invalidateQueries(['station', activeStation?.station_id, 'request', requestId]);
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Execution failed',
        description: error.message || 'Failed to execute request',
        variant: 'destructive'
      });
    }
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      return stationService.cancelRequest({ request_id: requestId });
    },
    onSuccess: () => {
      toast({
        title: 'Request cancelled',
        description: 'The request has been cancelled'
      });
      queryClient.invalidateQueries(['station', activeStation?.station_id, 'requests']);
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Cancellation failed',
        description: error.message || 'Failed to cancel request',
        variant: 'destructive'
      });
    }
  });

  const request = requestQuery.data;
  const loading = requestQuery.isLoading;
  const isProcessing = approveMutation.isLoading || rejectMutation.isLoading ||
                       executeMutation.isLoading || cancelMutation.isLoading;

  if (!open) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock;
      case 'approved': return CheckCircle;
      case 'rejected': return XCircle;
      case 'executed': return CheckCircle;
      case 'failed': return AlertCircle;
      case 'cancelled': return Ban;
      default: return Clock;
    }
  };

  const StatusIcon = request ? getStatusIcon(request.status) : Clock;
  const approvalProgress = request && request.approval_threshold > 0
    ? (request.approvals?.length || 0) / request.approval_threshold * 100
    : 0;

  const userHasApproved = request?.approvals?.some(a => a.is_current_user);
  const canApprove = request?.status === 'pending' && !userHasApproved && request?.can_approve;
  const canReject = request?.status === 'pending' && request?.can_reject;
  const canExecute = request?.status === 'approved' && request?.can_execute;
  const canCancel = request?.status === 'pending' && request?.is_requester;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Request Details
            {request && (
              <Badge variant="outline" className="ml-2">
                #{request.id}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : request ? (
          <ScrollArea className="flex-1 px-1">
            <div className="space-y-6">
              {/* Status Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <StatusIcon className={cn(
                      "w-5 h-5",
                      request.status === 'approved' ? "text-green-500" :
                      request.status === 'rejected' ? "text-red-500" :
                      request.status === 'executed' ? "text-blue-500" :
                      request.status === 'failed' ? "text-orange-500" :
                      request.status === 'cancelled' ? "text-gray-500" :
                      "text-yellow-500"
                    )} />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        request.status === 'approved' ? 'success' :
                        request.status === 'rejected' ? 'destructive' :
                        request.status === 'executed' ? 'default' :
                        'secondary'
                      }
                      className="text-sm"
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>

                    {request.execution_failure && (
                      <Badge variant="destructive">
                        Execution failed
                      </Badge>
                    )}
                  </div>

                  {request.status === 'pending' && request.approval_threshold > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Approvals: {request.approvals?.length || 0} / {request.approval_threshold}</span>
                        <span className="text-muted-foreground">{Math.round(approvalProgress)}%</span>
                      </div>
                      <Progress value={approvalProgress} />
                    </div>
                  )}

                  {request.execution_failure && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {request.execution_failure}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Request Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Request Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Title</p>
                      <p className="font-medium">{request.title || 'Untitled Request'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Operation Type</p>
                      <Badge variant="outline">
                        {request.operation_type?.replace(/([A-Z])/g, ' $1').trim()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Requester</p>
                      <p className="font-mono text-xs">{formatPrincipalShort(request.requester)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Created</p>
                      <p>{formatDateTime(request.created_at)}</p>
                    </div>
                    {request.summary && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground mb-1">Summary</p>
                        <p>{request.summary}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tabs for Operation Details and Approvals */}
              <Tabs defaultValue="operation" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="operation">Operation Details</TabsTrigger>
                  <TabsTrigger value="approvals">
                    Approvals ({request.approvals?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="operation" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <RequestOperationView
                        operationType={request.operation_type}
                        operationData={request.operation}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="approvals" className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      {request.approvals?.length > 0 ? (
                        <div className="space-y-3">
                          {request.approvals.map((approval, index) => (
                            <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                              <div className="p-2 rounded-lg bg-green-50">
                                <ThumbsUp className="w-4 h-4 text-green-500" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-xs">
                                    {formatPrincipalShort(approval.approver)}
                                  </span>
                                  {approval.is_current_user && (
                                    <Badge variant="secondary" className="text-xs">You</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(approval.approved_at)}
                                </p>
                                {approval.comment && (
                                  <p className="text-sm mt-2">{approval.comment}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground">No approvals yet</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Actions Section */}
              {(canApprove || canReject) && request.status === 'pending' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {canApprove && (
                      <div className="space-y-2">
                        <Label htmlFor="approval-comment">Approval Comment (Optional)</Label>
                        <Textarea
                          id="approval-comment"
                          placeholder="Add a comment with your approval..."
                          value={approvalComment}
                          onChange={(e) => setApprovalComment(e.target.value)}
                          rows={3}
                        />
                      </div>
                    )}

                    {canReject && (
                      <div className="space-y-2">
                        <Label htmlFor="rejection-reason">Rejection Reason</Label>
                        <Textarea
                          id="rejection-reason"
                          placeholder="Provide a reason for rejection..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={3}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load request details</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          {request && (
            <>
              {canCancel && (
                <Button
                  variant="outline"
                  onClick={() => cancelMutation.mutate()}
                  disabled={isProcessing}
                >
                  {cancelMutation.isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Ban className="w-4 h-4 mr-2" />
                  )}
                  Cancel Request
                </Button>
              )}

              {canReject && (
                <Button
                  variant="destructive"
                  onClick={() => rejectMutation.mutate()}
                  disabled={isProcessing || !rejectionReason}
                >
                  {rejectMutation.isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ThumbsDown className="w-4 h-4 mr-2" />
                  )}
                  Reject
                </Button>
              )}

              {canApprove && (
                <Button
                  variant="default"
                  onClick={() => approveMutation.mutate()}
                  disabled={isProcessing}
                >
                  {approveMutation.isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ThumbsUp className="w-4 h-4 mr-2" />
                  )}
                  Approve
                </Button>
              )}

              {canExecute && (
                <Button
                  variant="default"
                  onClick={() => executeMutation.mutate()}
                  disabled={isProcessing}
                >
                  {executeMutation.isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Execute
                </Button>
              )}
            </>
          )}

          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}