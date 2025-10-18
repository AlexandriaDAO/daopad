import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  User,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  FileText
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const RequestList = ({ requests, loading, error, onApprove, onReject, onRetry }) => {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleReject = (requestId) => {
    setRejectingId(requestId);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (rejectingId) {
      onReject(rejectingId, rejectReason || null);
    }
    setRejectDialogOpen(false);
    setRejectingId(null);
    setRejectReason('');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Created':
        return <Clock className="h-4 w-4" />;
      case 'Approved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4" />;
      case 'Processing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'Scheduled':
        return <Calendar className="h-4 w-4" />;
      case 'Completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'Failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Created':
        return 'warning';
      case 'Approved':
        return 'success';
      case 'Rejected':
        return 'destructive';
      case 'Processing':
        return 'secondary';
      case 'Scheduled':
        return 'info';
      case 'Completed':
        return 'default';
      case 'Failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status) => status || 'Unknown';

  const formatExpiration = (expirationDt) => {
    const expDate = new Date(expirationDt);
    const now = new Date();
    const hoursRemaining = (expDate - now) / (1000 * 60 * 60);

    if (hoursRemaining < 0) {
      return { text: 'Expired', urgent: true };
    }
    if (hoursRemaining < 24) {
      return { text: `Expires ${formatDistanceToNow(expDate, { addSuffix: true })}`, urgent: true };
    }
    return { text: `Expires ${formatDistanceToNow(expDate, { addSuffix: true })}`, urgent: false };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Alert>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No requests found</p>
        <p className="text-sm">Adjust your filters or check back later</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => {
          const expiration = formatExpiration(request.expiration_dt);
          const canApprove = ['Created', 'Scheduled'].includes(request.status);
          const approvals = request.approvals || [];
          const approvalCounts = approvals.reduce(
            (acc, approval) => {
              if (approval.status === 'Approved') acc.approved += 1;
              if (approval.status === 'Rejected') acc.rejected += 1;
              return acc;
            },
            { approved: 0, rejected: 0 }
          );

          return (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    {request.summary && (
                      <CardDescription className="mt-1">
                        {request.summary}
                      </CardDescription>
                    )}
                    {request.status_detail && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {request.status_detail}
                      </p>
                    )}
                  </div>
                  <Badge variant={getStatusColor(request.status)} className="ml-4">
                    {getStatusIcon(request.status)}
                    <span className="ml-1">{getStatusLabel(request.status)}</span>
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {/* Request metadata */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>Requested by {request.requester_name || request.requested_by}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Created {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${expiration.urgent ? 'text-destructive font-medium' : ''}`}>
                      <Clock className="h-3 w-3" />
                      <span>{expiration.text}</span>
                    </div>
                  </div>

                  {/* Approval status */}
                  {approvals.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Approvals:</span>
                      <div className="flex gap-1">
                        {approvals.map((approval, idx) => (
                          <Badge
                            key={idx}
                            variant={approval.status === 'Approved' ? 'success' : 'destructive'}
                            className="text-xs"
                          >
                            {approval.status === 'Approved' ? (
                              <ThumbsUp className="h-3 w-3" />
                            ) : (
                              <ThumbsDown className="h-3 w-3" />
                            )}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ({approvalCounts.approved} of {approvals.length})
                      </span>
                    </div>
                  )}

                  {/* Tags */}
                  {request.tags && request.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {request.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>

              {canApprove && (
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(request.id)}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onApprove(request.id)}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this request (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Reason</Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter your reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              <XCircle className="h-4 w-4 mr-1" />
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RequestList;
