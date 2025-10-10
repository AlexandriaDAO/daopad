import React, { useState, useEffect, memo } from 'react';
import { Principal } from '@dfinity/principal';
import { DAOPadBackendService } from '@/services/daopadBackend';
import { EmptyStates } from '../ui/EmptyState';
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
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Zap,
} from 'lucide-react';

const RequestsTable = memo(function RequestsTable({ tokenId, identity }) {
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
    if (tokenId && identity) {
      loadRequests();
    }
  }, [tokenId, identity, showOnlyPending]);

  const loadRequests = async () => {
    if (!identity || !tokenId) return;

    setLoading(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(tokenId);

      const result = await daopadService.listOrbitRequests(tokenPrincipal, !showOnlyPending);

      if (result.success) {
        const response = result.data || {};
        const normalized = (response.requests || []).map((req) => ({
          ...req,
          summary: Array.isArray(req.summary)
            ? (req.summary[0] ?? null)
            : req.summary ?? null,
          requester_name: Array.isArray(req.requester_name)
            ? (req.requester_name[0] ?? null)
            : req.requester_name ?? null,
          status_detail: Array.isArray(req.status_detail)
            ? (req.status_detail[0] ?? null)
            : req.status_detail ?? null,
          approvals: (req.approvals || []).map((approval) => ({
            ...approval,
            status_detail: Array.isArray(approval.status_detail)
              ? (approval.status_detail[0] ?? null)
              : approval.status_detail ?? null,
          })),
        }));
        setRequests(normalized);
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
    if (!identity || !tokenId) return;

    setApprovingRequest(requestId);
    setError('');
    setSuccess('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(tokenId);

      const result = await daopadService.approveOrbitRequest(tokenPrincipal, requestId);

      if (result.success) {
        setSuccess(`Request ${requestId} approved successfully`);
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
    if (!identity || !tokenId) return;

    setRejectingRequest(requestId);
    setError('');
    setSuccess('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(tokenId);

      const result = await daopadService.rejectOrbitRequest(tokenPrincipal, requestId);

      if (result.success) {
        setSuccess(`Request ${requestId} rejected successfully`);
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
    if (!identity || !tokenId || selectedRequests.length === 0) return;

    setBatchApproving(true);
    setError('');
    setSuccess('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(tokenId);

      const result = await daopadService.batchApproveRequests(tokenPrincipal, selectedRequests);

      if (result.success) {
        const successCount = result.data.filter(r => r.includes('✓')).length;
        const failCount = result.data.filter(r => r.includes('✗')).length;
        setSuccess(`Batch approval complete: ${successCount} succeeded, ${failCount} failed`);
        setSelectedRequests([]);
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
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-800">Pending</Badge>;
    }
    if (statusLower.includes('approved')) {
      return <Badge variant="outline" className="bg-green-50 text-green-800">Approved</Badge>;
    }
    if (statusLower.includes('rejected')) {
      return <Badge variant="outline" className="bg-red-50 text-red-800">Rejected</Badge>;
    }
    if (statusLower.includes('completed')) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-800">Completed</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const pendingRequests = requests.filter(r =>
    r.status.toLowerCase().includes('created') ||
    r.status.toLowerCase().includes('pending')
  );

  if (!tokenId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No token configured
      </div>
    );
  }

  if (loading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <>
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

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlyPending}
              onChange={(e) => setShowOnlyPending(e.target.checked)}
            />
            <span className="text-sm">Pending only</span>
          </label>
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
                  Approve {selectedRequests.length}
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
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-xl font-bold">{requests.length}</p>
        </div>
        <div className="p-3 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-700">Pending</p>
          <p className="text-xl font-bold text-yellow-900">{pendingRequests.length}</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <EmptyStates.NoRequests />
      ) : (
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
              <TableHead className="w-[100px]">Actions</TableHead>
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
                      <div className="font-medium">{request.title}</div>
                      {request.summary && (
                        <div className="text-sm text-muted-foreground">{request.summary}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{request.operation_type}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-sm">{request.requester_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
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
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if tokenId changes
  return prevProps.tokenId === nextProps.tokenId;
  // identity is excluded because it's a stable object
});

export default RequestsTable;
