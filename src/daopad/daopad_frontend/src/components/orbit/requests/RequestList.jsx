import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle, User, Calendar, Hash } from 'lucide-react';
import { formatDateTime, formatPrincipalShort } from '@/utils/format';
import { cn } from '@/lib/utils';

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-50', label: 'Pending' },
  approved: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-50', label: 'Rejected' },
  executed: { icon: CheckCircle, color: 'text-blue-500', bgColor: 'bg-blue-50', label: 'Executed' },
  failed: { icon: AlertCircle, color: 'text-orange-500', bgColor: 'bg-orange-50', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'text-gray-500', bgColor: 'bg-gray-50', label: 'Cancelled' }
};

const operationTypeLabels = {
  AddUser: 'Add User',
  EditUser: 'Edit User',
  RemoveUser: 'Remove User',
  Transfer: 'Transfer',
  AddAccount: 'Add Account',
  EditAccount: 'Edit Account',
  AddAsset: 'Add Asset',
  EditAsset: 'Edit Asset',
  CallExternalCanister: 'External Call',
  CreateRequest: 'Create Request',
  EditRequestPolicy: 'Edit Policy',
  ManageSystemInfo: 'System Info',
  SetDisasterRecovery: 'Disaster Recovery'
};

export function RequestList({
  requests = [],
  privileges = [],
  loading = false,
  onOpenRequest,
  emptyMessage = "No requests found"
}) {
  const canApprove = (request) => {
    // Check if user has approval privileges for this request type
    return privileges.some(p =>
      p.operation_type === request.operation_type &&
      p.can_approve
    );
  };

  const canView = (request) => {
    // Check if user has view privileges
    return privileges.some(p =>
      p.operation_type === request.operation_type &&
      (p.can_view || p.can_approve)
    );
  };

  const getOperationLabel = (operationType) => {
    return operationTypeLabels[operationType] || operationType;
  };

  const getApprovalProgress = (request) => {
    if (!request.approval_threshold) return 0;
    const approvals = request.approvals?.length || 0;
    return (approvals / request.approval_threshold) * 100;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!requests.length) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((request) => {
        const statusInfo = statusConfig[request.status] || statusConfig.pending;
        const StatusIcon = statusInfo.icon;
        const approvalProgress = getApprovalProgress(request);
        const hasUserApproved = request.approvals?.some(a => a.is_current_user);

        return (
          <Card
            key={request.id}
            className={cn(
              "transition-all hover:shadow-md cursor-pointer",
              statusInfo.bgColor,
              "bg-opacity-5"
            )}
            onClick={() => onOpenRequest(request)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg", statusInfo.bgColor)}>
                      <StatusIcon className={cn("w-4 h-4", statusInfo.color)} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">
                          {request.title || `Request #${request.id}`}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {getOperationLabel(request.operation_type)}
                        </Badge>
                      </div>

                      {request.summary && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {request.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      <span>{request.id}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{formatPrincipalShort(request.requester)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDateTime(request.created_at)}</span>
                    </div>
                  </div>

                  {/* Approval Progress */}
                  {request.status === 'pending' && request.approval_threshold > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Approvals: {request.approvals?.length || 0} / {request.approval_threshold}
                        </span>
                        {hasUserApproved && (
                          <Badge variant="secondary" className="text-xs">
                            You approved
                          </Badge>
                        )}
                      </div>
                      <Progress value={approvalProgress} className="h-1.5" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        request.status === 'approved' ? 'success' :
                        request.status === 'rejected' ? 'destructive' :
                        request.status === 'executed' ? 'default' :
                        'secondary'
                      }
                    >
                      {statusInfo.label}
                    </Badge>

                    {request.status === 'pending' && canApprove(request) && !hasUserApproved && (
                      <Badge variant="outline" className="text-xs">
                        Action needed
                      </Badge>
                    )}

                    {request.execution_failure && (
                      <Badge variant="destructive" className="text-xs">
                        Execution failed
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenRequest(request);
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}