import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const getStatusText = (status) => {
  if (typeof status === 'object') {
    return Object.keys(status)[0];
  }
  return 'Unknown';
};

const getStatusColor = (status) => {
  if (typeof status === 'object') {
    const key = Object.keys(status)[0];
    switch(key) {
      case 'Created': return '#007bff';
      case 'Approved': return '#28a745';
      case 'Rejected': return '#dc3545';
      case 'Completed': return '#28a745';
      case 'Failed': return '#dc3545';
      case 'Cancelled': return '#6c757d';
      case 'Scheduled': return '#ffc107';
      case 'Processing': return '#17a2b8';
      default: return '#6c757d';
    }
  }
  return '#6c757d';
};

const ProposalDetailsModal = ({ proposal, onClose }) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Proposal Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">ID</Label>
                  <div className="font-mono text-sm break-all">{proposal.id}</div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Title</Label>
                  <div>{proposal.title || 'Untitled'}</div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge
                    variant="outline"
                    style={{ backgroundColor: getStatusColor(proposal.status), color: 'white' }}
                  >
                    {getStatusText(proposal.status)}
                  </Badge>
                </div>

                <div>
                  <Label className="text-muted-foreground">Requested by</Label>
                  <div className="font-mono text-sm break-all">{proposal.requested_by}</div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <div className="font-mono text-sm">{formatDate(proposal.created_at)}</div>
                </div>

                {proposal.expiration_dt && (
                  <div>
                    <Label className="text-muted-foreground">Expires</Label>
                    <div className="font-mono text-sm">{formatDate(proposal.expiration_dt)}</div>
                  </div>
                )}
              </div>

              {proposal.summary && (
                <div>
                  <Label className="text-muted-foreground">Summary</Label>
                  <div className="mt-1">{proposal.summary}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval Status</CardTitle>
            </CardHeader>
            <CardContent>
              {proposal.approvals && proposal.approvals.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium">
                    Approval Decisions ({proposal.approvals.length})
                  </div>
                  <div className="space-y-2">
                    {proposal.approvals.map((approval, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="font-mono text-xs text-muted-foreground">
                                {approval.approver_id?.substring(0, 8)}...
                              </div>
                              <Badge variant={approval.status?.Approved ? 'default' : 'destructive'}>
                                {approval.status?.Approved ? 'Approved' : 'Rejected'}
                              </Badge>
                            </div>
                            <div className="text-right space-y-1">
                              <div className="font-mono text-xs text-muted-foreground">
                                {formatDate(approval.decided_at)}
                              </div>
                              {approval.status_reason && (
                                <div className="text-xs text-muted-foreground max-w-xs">
                                  {approval.status_reason}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No approval decisions yet</p>
              )}
            </CardContent>
          </Card>

          {proposal.operation && (
            <Card>
              <CardHeader>
                <CardTitle>Operation Details</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
                  {JSON.stringify(proposal.operation, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProposalDetailsModal;