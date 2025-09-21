import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatPrincipalShort, formatBalance } from '@/utils/format';
import { User, Wallet, ArrowRight, Shield, FileText, Settings, Database, Globe } from 'lucide-react';

export function RequestOperationView({ operationType, operationData }) {
  if (!operationType || !operationData) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No operation details available
      </div>
    );
  }

  // Render different views based on operation type
  switch (operationType) {
    case 'AddUser':
      return <AddUserView data={operationData} />;
    case 'EditUser':
      return <EditUserView data={operationData} />;
    case 'RemoveUser':
      return <RemoveUserView data={operationData} />;
    case 'Transfer':
      return <TransferView data={operationData} />;
    case 'AddAccount':
      return <AddAccountView data={operationData} />;
    case 'EditAccount':
      return <EditAccountView data={operationData} />;
    case 'AddAsset':
      return <AddAssetView data={operationData} />;
    case 'EditAsset':
      return <EditAssetView data={operationData} />;
    case 'CallExternalCanister':
      return <ExternalCanisterCallView data={operationData} />;
    case 'EditRequestPolicy':
      return <EditRequestPolicyView data={operationData} />;
    case 'ManageSystemInfo':
      return <ManageSystemInfoView data={operationData} />;
    default:
      return <GenericOperationView type={operationType} data={operationData} />;
  }
}

function AddUserView({ data }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-5 h-5 text-muted-foreground" />
        <h4 className="font-medium">Add New User</h4>
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Name</p>
          <p className="font-medium">{data.name || 'Unnamed User'}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Identities</p>
          <div className="space-y-1">
            {data.identities?.map((identity, idx) => (
              <code key={idx} className="block text-xs bg-muted px-2 py-1 rounded">
                {formatPrincipalShort(identity)}
              </code>
            )) || <span className="text-muted-foreground">No identities</span>}
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Groups</p>
          <div className="flex flex-wrap gap-1">
            {data.groups?.map((group, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {group}
              </Badge>
            )) || <span className="text-muted-foreground">No groups assigned</span>}
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Status</p>
          <Badge variant={data.status === 'Active' ? 'success' : 'secondary'}>
            {data.status || 'Unknown'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function EditUserView({ data }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-5 h-5 text-muted-foreground" />
        <h4 className="font-medium">Edit User</h4>
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">User ID</p>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {data.user_id || 'Unknown'}
          </code>
        </div>

        {data.name !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">New Name</p>
            <p className="font-medium">{data.name || 'No change'}</p>
          </div>
        )}

        {data.identities !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">New Identities</p>
            <div className="space-y-1">
              {data.identities?.map((identity, idx) => (
                <code key={idx} className="block text-xs bg-muted px-2 py-1 rounded">
                  {formatPrincipalShort(identity)}
                </code>
              )) || <span className="text-muted-foreground">No changes</span>}
            </div>
          </div>
        )}

        {data.groups !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">New Groups</p>
            <div className="flex flex-wrap gap-1">
              {data.groups?.map((group, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {group}
                </Badge>
              )) || <span className="text-muted-foreground">No changes</span>}
            </div>
          </div>
        )}

        {data.status !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">New Status</p>
            <Badge variant={data.status === 'Active' ? 'success' : 'secondary'}>
              {data.status || 'Unknown'}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

function RemoveUserView({ data }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-5 h-5 text-red-500" />
        <h4 className="font-medium">Remove User</h4>
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">User ID to Remove</p>
          <code className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
            {data.user_id || 'Unknown'}
          </code>
        </div>

        {data.reason && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Reason</p>
            <p className="text-sm">{data.reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TransferView({ data }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-muted-foreground" />
        <h4 className="font-medium">Transfer</h4>
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">From Account</p>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {data.from_account || 'Unknown'}
          </code>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">To</p>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {data.to ? formatPrincipalShort(data.to) : 'Unknown'}
          </code>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Amount</p>
          <p className="font-medium text-lg">
            {data.amount ? formatBalance(data.amount, data.decimals || 8) : '0'}
            {data.symbol && ` ${data.symbol}`}
          </p>
        </div>

        {data.memo && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Memo</p>
            <p className="text-sm">{data.memo}</p>
          </div>
        )}

        <div className="flex items-center justify-center py-2">
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function AddAccountView({ data }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-muted-foreground" />
        <h4 className="font-medium">Add Account</h4>
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Account Name</p>
          <p className="font-medium">{data.name || 'Unnamed Account'}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Blockchain</p>
          <Badge variant="outline">{data.blockchain || 'Unknown'}</Badge>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Standard</p>
          <Badge variant="secondary">{data.standard || 'Unknown'}</Badge>
        </div>

        {data.address && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Address</p>
            <code className="text-xs bg-muted px-2 py-1 rounded break-all">
              {data.address}
            </code>
          </div>
        )}

        <div>
          <p className="text-sm text-muted-foreground mb-1">Permissions</p>
          <div className="flex flex-wrap gap-1">
            {data.read_permission && (
              <Badge variant="secondary" className="text-xs">Read</Badge>
            )}
            {data.transfer_permission && (
              <Badge variant="secondary" className="text-xs">Transfer</Badge>
            )}
            {data.configs_permission && (
              <Badge variant="secondary" className="text-xs">Configs</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditAccountView({ data }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-muted-foreground" />
        <h4 className="font-medium">Edit Account</h4>
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Account ID</p>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {data.account_id || 'Unknown'}
          </code>
        </div>

        {data.name !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">New Name</p>
            <p className="font-medium">{data.name || 'No change'}</p>
          </div>
        )}

        {data.read_permission !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Updated Permissions</p>
            <div className="flex flex-wrap gap-1">
              {data.read_permission && (
                <Badge variant="secondary" className="text-xs">Read</Badge>
              )}
              {data.transfer_permission && (
                <Badge variant="secondary" className="text-xs">Transfer</Badge>
              )}
              {data.configs_permission && (
                <Badge variant="secondary" className="text-xs">Configs</Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddAssetView({ data }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-muted-foreground" />
        <h4 className="font-medium">Add Asset</h4>
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Asset ID</p>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {data.asset_id ? formatPrincipalShort(data.asset_id) : 'Unknown'}
          </code>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Name</p>
          <p className="font-medium">{data.name || 'Unnamed Asset'}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Symbol</p>
          <Badge variant="outline" className="text-sm">
            {data.symbol || 'N/A'}
          </Badge>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Decimals</p>
          <p className="font-mono">{data.decimals ?? 8}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Blockchain</p>
          <Badge variant="secondary">{data.blockchain || 'Unknown'}</Badge>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Standard</p>
          <Badge variant="secondary">{data.standard || 'Unknown'}</Badge>
        </div>
      </div>
    </div>
  );
}

function EditAssetView({ data }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-muted-foreground" />
        <h4 className="font-medium">Edit Asset</h4>
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Asset ID</p>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {data.asset_id ? formatPrincipalShort(data.asset_id) : 'Unknown'}
          </code>
        </div>

        {data.name !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">New Name</p>
            <p className="font-medium">{data.name || 'No change'}</p>
          </div>
        )}

        {data.symbol !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">New Symbol</p>
            <Badge variant="outline" className="text-sm">
              {data.symbol || 'No change'}
            </Badge>
          </div>
        )}

        {data.metadata !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Metadata Updates</p>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
              {JSON.stringify(data.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function ExternalCanisterCallView({ data }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-muted-foreground" />
        <h4 className="font-medium">External Canister Call</h4>
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Canister ID</p>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {data.canister_id ? formatPrincipalShort(data.canister_id) : 'Unknown'}
          </code>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Method</p>
          <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
            {data.method || 'Unknown'}
          </code>
        </div>

        {data.args && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Arguments</p>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
              {typeof data.args === 'string' ? data.args : JSON.stringify(data.args, null, 2)}
            </pre>
          </div>
        )}

        {data.cycles && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Cycles</p>
            <p className="font-mono">{data.cycles}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EditRequestPolicyView({ data }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-muted-foreground" />
        <h4 className="font-medium">Edit Request Policy</h4>
      </div>

      <div className="grid gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Policy ID</p>
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {data.policy_id || 'New Policy'}
          </code>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Specifier</p>
          <Badge variant="outline">
            {data.specifier || 'Unknown'}
          </Badge>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Rule</p>
          <Card className="p-3 bg-muted/50">
            {data.rule?.Quorum && (
              <div className="space-y-2">
                <p className="text-xs font-medium">Quorum Rule</p>
                <p className="text-xs">Min Approvals: {data.rule.Quorum.min_approved}</p>
                {data.rule.Quorum.approvers && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Approvers:</p>
                    {data.rule.Quorum.approvers.map((approver, idx) => (
                      <code key={idx} className="block text-xs bg-background px-1 py-0.5 rounded">
                        {formatPrincipalShort(approver)}
                      </code>
                    ))}
                  </div>
                )}
              </div>
            )}
            {data.rule?.Threshold && (
              <div className="space-y-2">
                <p className="text-xs font-medium">Threshold Rule</p>
                <p className="text-xs">Min: {data.rule.Threshold.min}</p>
                <p className="text-xs">Max: {data.rule.Threshold.max}</p>
              </div>
            )}
            {data.rule?.Anyone && (
              <p className="text-xs font-medium">Anyone Can Approve</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ManageSystemInfoView({ data }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <h4 className="font-medium">Manage System Info</h4>
      </div>

      <div className="grid gap-3">
        {data.name !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Station Name</p>
            <p className="font-medium">{data.name || 'No change'}</p>
          </div>
        )}

        {data.description !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{data.description || 'No change'}</p>
          </div>
        )}

        {data.fallback_controller !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Fallback Controller</p>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {data.fallback_controller ? formatPrincipalShort(data.fallback_controller) : 'None'}
            </code>
          </div>
        )}

        {data.upgrader !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Upgrader</p>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {data.upgrader ? formatPrincipalShort(data.upgrader) : 'None'}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

function GenericOperationView({ type, data }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-muted-foreground" />
        <h4 className="font-medium">{type.replace(/([A-Z])/g, ' $1').trim()}</h4>
      </div>

      <div className="bg-muted rounded p-3">
        <pre className="text-xs overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}