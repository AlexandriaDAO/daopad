import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  // Query requests from Orbit
  const { data: requests, isLoading, error, refetch } = useQuery({
    queryKey: ['orbit-transfer-requests', tokenId],
    queryFn: async () => {
      const backend = new DAOPadBackendService(identity);
      const result = await backend.getTransferRequests(tokenId);

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!tokenId && !!identity,
  });

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

        // Invalidate cache to refetch
        queryClient.invalidateQueries(['orbit-transfer-requests', tokenId]);
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

        queryClient.invalidateQueries(['orbit-transfer-requests', tokenId]);
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
    const statusConfig = {
      Created: { icon: Clock, variant: "secondary", label: "Pending" },
      Approved: { icon: CheckCircle2, variant: "success", label: "Approved" },
      Rejected: { icon: XCircle, variant: "destructive", label: "Rejected" },
      Completed: { icon: CheckCircle2, variant: "default", label: "Executed" },
      Failed: { icon: AlertCircle, variant: "destructive", label: "Failed" },
      Processing: { icon: RefreshCw, variant: "warning", label: "Processing" },
    };

    const config = statusConfig[status] || statusConfig.Created;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatAmount = (amount, decimals = 8) => {
    const val = Number(amount) / Math.pow(10, decimals);
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transfer Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transfer Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load transfer requests: {error.message}
            </AlertDescription>
          </Alert>
          <Button onClick={() => refetch()} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // For now, display the status messages as the API returns string array
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Transfer Requests</CardTitle>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests && requests.length > 0 ? (
              requests.map((message, index) => (
                <div key={index} className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{message}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No status information available
              </div>
            )}

            <div className="mt-6 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
              <h4 className="font-semibold mb-2">Next Steps for Full Integration</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Complex Orbit Station request parsing is being implemented</li>
                <li>• Transfer request creation validates voting power (100+ required)</li>
                <li>• View complete requests directly in <a href="https://app.orbit.global" target="_blank" rel="noopener noreferrer" className="underline">Orbit Station</a></li>
                <li>• Full request approval workflow coming in next update</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}