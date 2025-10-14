import React, { useState, useCallback, useEffect } from 'react';
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
  const { activeStation } = useActiveStation();
  const stationService = useStationService();
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Local state for request data (replacing React Query)
  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mutation states
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

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

  // Approve request
  const handleApprove = async () => {
    setIsApproving(true);

    try {
      await stationService.approveRequest({
        request_id: requestId,
        comment: approvalComment || null
      });

      toast.success('Request approved', {
        description: 'Your approval has been recorded'
      });

      // Refresh request details
      fetchRequest();

      if (onApproved) {
        onApproved();
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Approval failed', {
        description: error.message || 'Failed to approve request'
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Reject request
  const handleReject = async () => {
    setIsRejecting(true);

    try {
      await stationService.rejectRequest({
        request_id: requestId,
        reason: rejectionReason || 'Request rejected'
      });

      toast.success('Request rejected', {
        description: 'The request has been rejected'
      });

      // Refresh request details
      fetchRequest();

      onClose();
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Rejection failed', {
        description: error.message || 'Failed to reject request'
      });
    } finally {
      setIsRejecting(false);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Request Details</span>
            {request && getStatusBadge(request.status)}
          </DialogTitle>
        </DialogHeader>

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
                        onClick={handleApprove}
                        disabled={isApproving}
                        className="w-full"
                      >
                        {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        Approve Request
                      </Button>

                      <Separator />

                      <div>
                        <Label htmlFor="rejection-reason">Rejection Reason</Label>
                        <Textarea
                          id="rejection-reason"
                          placeholder="Provide a reason for rejection..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <Button
                        onClick={handleReject}
                        disabled={isRejecting}
                        variant="destructive"
                        className="w-full"
                      >
                        {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <ThumbsDown className="mr-2 h-4 w-4" />
                        Reject Request
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
