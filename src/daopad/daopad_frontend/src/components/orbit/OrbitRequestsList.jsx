import React, { useState, useEffect, useCallback } from 'react';
import { DAOPadBackendService } from '@/services/daopadBackend';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

export default function OrbitRequestsList({ tokenId, identity }) {
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const { toast } = useToast();

  // Local state (replacing React Query)
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    if (!tokenId || !identity) {
      setRequests([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const backend = new DAOPadBackendService(identity);
      const result = await backend.getTransferRequests(tokenId);

      if (result.success) {
        setRequests(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      setError(err.message || 'Failed to fetch requests');
    } finally {
      setIsLoading(false);
    }
  }, [tokenId, identity]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleApprove = async (requestId) => {
    setApprovingId(requestId);

    try {
      const backend = new DAOPadBackendService(identity);
      const result = await backend.approveTransferRequest(requestId, tokenId);

      if (result.success) {
        toast({
          title: "Approval Submitted",
          description: "Your approval has been recorded.",
        });

        // Refresh requests
        fetchRequests();
      } else {
        toast({
          title: "Approval Failed",
          description: result.error || "Could not submit approval",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error approving request:', err);
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (requestId) => {
    setRejectingId(requestId);

    try {
      const backend = new DAOPadBackendService(identity);
      const result = await backend.rejectTransferRequest(requestId, tokenId);

      if (result.success) {
        toast({
          title: "Rejection Submitted",
          description: "Your rejection has been recorded.",
        });

        // Refresh requests
        fetchRequests();
      } else {
        toast({
          title: "Rejection Failed",
          description: result.error || "Could not submit rejection",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setRejectingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      Created: { icon: Clock, color: 'bg-blue-100 text-blue-800' },
      Approved: { icon: CheckCircle2, color: 'bg-green-100 text-green-800' },
      Rejected: { icon: XCircle, color: 'bg-red-100 text-red-800' },
      Completed: { icon: CheckCircle2, color: 'bg-green-100 text-green-800' },
      Failed: { icon: AlertCircle, color: 'bg-red-100 text-red-800' },
    };

    const config = statusMap[status] || { icon: AlertCircle, color: 'bg-gray-100 text-gray-800' };
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Transfer Requests</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchRequests()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No transfer requests found
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-mono text-xs">
                    {request.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(request.status)}
                  </TableCell>
                  <TableCell>{request.amount}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {request.to?.substring(0, 12)}...
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {request.status === 'Created' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                            disabled={approvingId === request.id}
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(request.id)}
                            disabled={rejectingId === request.id}
                          >
                            <ThumbsDown className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
