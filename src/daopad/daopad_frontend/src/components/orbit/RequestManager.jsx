import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { DAOPadBackendService } from '../../services/daopadBackend';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Zap
} from 'lucide-react';

const RequestManager = ({ token, identity }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approvingRequest, setApprovingRequest] = useState(null);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [batchApproving, setBatchApproving] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [showOnlyPending, setShowOnlyPending] = useState(true);

  useEffect(() => {
    if (token?.canister_id && identity) {
      loadRequests();
    }
  }, [token, identity, showOnlyPending]);

  const loadRequests = async () => {
    if (!identity || !token?.canister_id) return;

    setLoading(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);

      const result = await daopadService.listOrbitRequests(tokenPrincipal, !showOnlyPending);

      if (result.success) {
        setRequests(result.data || []);
      } else {
        setError(result.error || 'Failed to load requests');
      }
    } catch (err) {
      console.error('Error loading requests:', err);
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId) => {
    if (!identity || !token?.canister_id) return;

    setApprovingRequest(requestId);
    setError('');
    setSuccess('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);

      const result = await daopadService.approveOrbitRequest(tokenPrincipal, requestId);

      if (result.success) {
        setSuccess(`Request approved: ${result.data}`);
        // Reload requests after a delay
        setTimeout(() => loadRequests(), 2000);
      } else {
        setError(result.error || 'Failed to approve request');
      }
    } catch (err) {
      console.error('Error approving request:', err);
      setError('Failed to approve request');
    } finally {
      setApprovingRequest(null);
    }
  };

  const rejectRequest = async (requestId) => {
    if (!identity || !token?.canister_id) return;

    setRejectingRequest(requestId);
    setError('');
    setSuccess('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);

      const result = await daopadService.rejectOrbitRequest(tokenPrincipal, requestId);

      if (result.success) {
        setSuccess(`Request rejected: ${result.data}`);
        // Reload requests after a delay
        setTimeout(() => loadRequests(), 2000);
      } else {
        setError(result.error || 'Failed to reject request');
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError('Failed to reject request');
    } finally {
      setRejectingRequest(null);
    }
  };

  const batchApproveRequests = async () => {
    if (!identity || !token?.canister_id || selectedRequests.length === 0) return;

    setBatchApproving(true);
    setError('');
    setSuccess('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);

      const result = await daopadService.batchApproveRequests(tokenPrincipal, selectedRequests);

      if (result.success) {
        const successCount = result.data.filter(r => r.includes('✓')).length;
        const failCount = result.data.filter(r => r.includes('✗')).length;
        setSuccess(`Batch approval complete: ${successCount} succeeded, ${failCount} failed`);
        setSelectedRequests([]);
        // Reload requests after a delay
        setTimeout(() => loadRequests(), 2000);
      } else {
        setError(result.error || 'Failed to batch approve requests');
      }
    } catch (err) {
      console.error('Error batch approving:', err);
      setError('Failed to batch approve requests');
    } finally {
      setBatchApproving(false);
    }
  };

  const toggleRequestSelection = (requestId) => {
    setSelectedRequests(prev =>
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const getStatusBadge = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('created') || statusLower.includes('pending')) {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
    if (statusLower.includes('approved')) {
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    }
    if (statusLower.includes('rejected')) {
      return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
    }
    if (statusLower.includes('completed')) {
      return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  const pendingRequests = requests.filter(r =>
    r.status.toLowerCase().includes('created') ||
    r.status.toLowerCase().includes('pending')
  );

  const permissionRequests = requests.filter(r =>
    r.operation_type.toLowerCase().includes('permission') ||
    r.title.toLowerCase().includes('permission')
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Request Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Request Manager
        </CardTitle>
        <CardDescription>
          Review and approve Orbit Station requests directly from DAOPad
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={showOnlyPending ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyPending(true)}
              >
                Pending Only
              </Button>
              <Button
                variant={!showOnlyPending ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyPending(false)}
                disabled={true}
                title="Showing completed requests is temporarily disabled due to a backend issue"
              >
                All Requests (Disabled)
              </Button>
            </div>
            <div className="flex gap-2">
              {selectedRequests.length > 0 && (
                <Button
                  onClick={batchApproveRequests}
                  disabled={batchApproving}
                  variant="default"
                  size="sm"
                >
                  {batchApproving ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Approve {selectedRequests.length} Selected
                    </>
                  )}
                </Button>
              )}
              <Button onClick={loadRequests} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-xl font-bold">{requests.length}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-700">Pending</p>
              <p className="text-xl font-bold text-yellow-900">{pendingRequests.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">Permission Requests</p>
              <p className="text-xl font-bold text-blue-900">{permissionRequests.length}</p>
            </div>
          </div>

          {/* Requests Table */}
          {requests.length === 0 ? (
            <Alert>
              <AlertDescription>
                No requests found. Permission requests will appear here once created.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedRequests.length === pendingRequests.length && pendingRequests.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRequests(pendingRequests.map(r => r.id));
                          } else {
                            setSelectedRequests([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Request</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Votes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const isPending = request.status.toLowerCase().includes('created') ||
                                     request.status.toLowerCase().includes('pending');
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedRequests.includes(request.id)}
                            onChange={() => toggleRequestSelection(request.id)}
                            disabled={!isPending}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.title}</p>
                            {request.summary && (
                              <p className="text-sm text-muted-foreground">{request.summary}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.operation_type}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{request.requester_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">👍 {request.approval_count}</span>
                            <span className="text-red-600">👎 {request.rejection_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isPending && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => approveRequest(request.id)}
                                disabled={approvingRequest === request.id}
                              >
                                {approvingRequest === request.id ? (
                                  <Clock className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ThumbsUp className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => rejectRequest(request.id)}
                                disabled={rejectingRequest === request.id}
                              >
                                {rejectingRequest === request.id ? (
                                  <Clock className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ThumbsDown className="h-4 w-4 text-red-600" />
                                )}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestManager;