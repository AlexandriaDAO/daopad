import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { DAOPadBackendService } from '../services/daopadBackend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  ShieldOff,
  CheckCircle2,
  AlertCircle,
  UserMinus,
  UserCheck,
  RefreshCw,
  Copy,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

const DAOTransitionManager = ({ token, identity, orbitStation }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Permission status
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [checkingPermissions, setCheckingPermissions] = useState(false);

  // Admin list
  const [adminCount, setAdminCount] = useState(null);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Transition status
  const [isSoleAdmin, setIsSoleAdmin] = useState(false);
  const [verifyingStatus, setVerifyingStatus] = useState(false);

  // Removal dialog
  const [adminToRemove, setAdminToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [downgradeToOperator, setDowngradeToOperator] = useState(false);

  // Backend principal
  const [backendPrincipal, setBackendPrincipal] = useState('');

  useEffect(() => {
    if (orbitStation?.station_id && identity) {
      loadBackendPrincipal();
      checkPermissions();
      loadAdminCount();
      verifyAdminStatus();
    }
  }, [orbitStation, identity]);

  const loadBackendPrincipal = async () => {
    try {
      const daopadService = new DAOPadBackendService(identity);
      const result = await daopadService.getBackendPrincipal();
      if (result.success) {
        setBackendPrincipal(result.data.toString());
      }
    } catch (err) {
      console.error('Error loading backend principal:', err);
    }
  };

  const checkPermissions = async () => {
    if (!identity || !token) return;

    setCheckingPermissions(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const result = await daopadService.verifyPermissions(tokenPrincipal);

      if (result.success) {
        setPermissionStatus(result.data);
      } else {
        setError(result.error || 'Failed to check permissions');
      }
    } catch (err) {
      console.error('Error checking permissions:', err);
      setError('Failed to check permissions');
    } finally {
      setCheckingPermissions(false);
    }
  };

  const loadAdminCount = async () => {
    if (!identity || !token) return;

    setLoadingAdmins(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const result = await daopadService.getAdminCount(tokenPrincipal);

      if (result.success) {
        setAdminCount(result.data);
      } else {
        setError(result.error || 'Failed to load admin count');
      }
    } catch (err) {
      console.error('Error loading admin count:', err);
      setError('Failed to load admin count');
    } finally {
      setLoadingAdmins(false);
    }
  };

  const verifyAdminStatus = async () => {
    if (!identity || !token) return;

    setVerifyingStatus(true);

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const result = await daopadService.verifySoleAdmin(tokenPrincipal);

      if (result.success) {
        setIsSoleAdmin(result.data);
      }
    } catch (err) {
      console.error('Error verifying admin status:', err);
    } finally {
      setVerifyingStatus(false);
    }
  };

  const getPermissionInstructions = async () => {
    if (!identity || !token) return;

    setLoading(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const result = await daopadService.grantSelfPermissions(tokenPrincipal);

      if (result.success) {
        setSuccess(result.data);
      } else {
        setError(result.error || 'Failed to get permission instructions');
      }
    } catch (err) {
      console.error('Error getting permission instructions:', err);
      setError('Failed to get permission instructions');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!adminToRemove || !identity || !token) return;

    setRemoving(true);
    setError('');
    setSuccess('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);

      let result;
      if (downgradeToOperator) {
        result = await daopadService.downgradeToOperator(tokenPrincipal, adminToRemove.id);
      } else {
        result = await daopadService.removeAdminRole(tokenPrincipal, adminToRemove.id);
      }

      if (result.success) {
        setSuccess(`Admin ${downgradeToOperator ? 'downgrade' : 'removal'} request created: ${result.data}`);
        setAdminToRemove(null);
        setDowngradeToOperator(false);
        // Reload data after a delay
        setTimeout(() => {
          loadAdminCount();
          verifyAdminStatus();
        }, 3000);
      } else {
        setError(result.error || 'Failed to modify admin');
      }
    } catch (err) {
      console.error('Error modifying admin:', err);
      setError('Failed to modify admin');
    } finally {
      setRemoving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getTransitionProgress = () => {
    if (!adminCount) return 0;
    if (isSoleAdmin) return 100;
    if (adminCount.daopad_backend === 0) return 0;
    if (adminCount.human_admins === 0) return 90;

    // Calculate progress based on reduction of human admins
    const progress = (1 - (adminCount.human_admins / adminCount.total)) * 80;
    return Math.min(80, Math.max(20, progress));
  };

  if (!orbitStation?.station_id) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Transition Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            DAO Transition Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Transition Progress</span>
              <span>{getTransitionProgress().toFixed(0)}%</span>
            </div>
            <Progress value={getTransitionProgress()} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-executive-lightGray/70">Total Admins</p>
              <p className="text-2xl font-bold">
                {loadingAdmins ? '-' : adminCount?.total || 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-executive-lightGray/70">DAOPad Backend</p>
              <p className="text-2xl font-bold text-green-600">
                {loadingAdmins ? '-' : adminCount?.daopad_backend || 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-executive-lightGray/70">Human Admins</p>
              <p className="text-2xl font-bold text-orange-600">
                {loadingAdmins ? '-' : adminCount?.human_admins || 0}
              </p>
            </div>
          </div>

          {isSoleAdmin ? (
            <Alert className="border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Fully Decentralized</AlertTitle>
              <AlertDescription className="text-green-700">
                DAOPad backend is the sole admin. All decisions now require community voting.
              </AlertDescription>
            </Alert>
          ) : adminCount?.daopad_backend === 0 ? (
            <Alert className="border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Backend Not Admin</AlertTitle>
              <AlertDescription className="text-red-700">
                DAOPad backend must be added as an admin before transition can proceed.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Transition In Progress</AlertTitle>
              <AlertDescription className="text-yellow-700">
                Remove human admins to complete the transition to full DAO governance.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Permission Status Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Backend Permissions
            </CardTitle>
            <Button
              onClick={checkPermissions}
              size="sm"
              variant="outline"
              disabled={checkingPermissions}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${checkingPermissions ? 'animate-spin' : ''}`} />
              Check
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {checkingPermissions ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : permissionStatus ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Admin Status</span>
                <Badge variant={permissionStatus.is_admin ? 'default' : 'destructive'}>
                  {permissionStatus.is_admin ? 'Admin' : 'Not Admin'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">User Management</span>
                <Badge variant={permissionStatus.has_user_management ? 'default' : 'destructive'}>
                  {permissionStatus.has_user_management ? 'Granted' : 'Not Granted'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">System Management</span>
                <Badge variant={permissionStatus.has_system_management ? 'default' : 'destructive'}>
                  {permissionStatus.has_system_management ? 'Granted' : 'Not Granted'}
                </Badge>
              </div>
              {permissionStatus.privileges && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-executive-lightGray/70 mb-2">Available Privileges:</p>
                  <div className="flex flex-wrap gap-1">
                    {permissionStatus.privileges.map((priv, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {priv}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-executive-lightGray/70">
                Check backend permissions to ensure proper configuration.
              </p>
              <Button
                onClick={getPermissionInstructions}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                Get Setup Instructions
              </Button>
            </div>
          )}

          {backendPrincipal && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-executive-lightGray/70 mb-1">Backend Principal:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-executive-mediumGray text-executive-lightGray px-2 py-1 rounded flex-1 truncate">
                  {backendPrincipal}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(backendPrincipal)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Management Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5" />
              Admin Management
            </CardTitle>
            <Button
              onClick={loadAdminCount}
              size="sm"
              variant="outline"
              disabled={loadingAdmins}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingAdmins ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 whitespace-pre-wrap">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {loadingAdmins ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : adminCount?.admin_list && adminCount.admin_list.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminCount.admin_list.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>
                      <Badge variant={admin.is_daopad_backend ? 'default' : 'secondary'}>
                        {admin.is_daopad_backend ? 'DAOPad Backend' : 'Human Admin'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.status === 'Active' ? 'default' : 'secondary'}>
                        {admin.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!admin.is_daopad_backend && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setAdminToRemove(admin)}
                          disabled={adminCount.daopad_backend === 0}
                        >
                          <UserMinus className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-executive-lightGray/60 py-4">No admins found</p>
          )}

          {adminCount?.daopad_backend === 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                DAOPad backend must be added as an admin before you can remove human admins.
                Use the Orbit Station Members component to add the backend as an admin first.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Remove Admin Dialog */}
      <Dialog open={!!adminToRemove} onOpenChange={() => setAdminToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Admin: {adminToRemove?.name}</DialogTitle>
            <DialogDescription>
              Choose how to handle this admin during the DAO transition.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This action will create a request in Orbit Station that needs to be approved.
                Make sure DAOPad backend remains as an admin.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="radio"
                  name="removeOption"
                  checked={!downgradeToOperator}
                  onChange={() => setDowngradeToOperator(false)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Remove Completely</p>
                  <p className="text-sm text-executive-lightGray/70">
                    Remove all admin privileges and groups
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-3">
                <input
                  type="radio"
                  name="removeOption"
                  checked={downgradeToOperator}
                  onChange={() => setDowngradeToOperator(true)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Downgrade to Operator</p>
                  <p className="text-sm text-executive-lightGray/70">
                    Keep as operator for view-only access
                  </p>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAdminToRemove(null);
                setDowngradeToOperator(false);
              }}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveAdmin}
              disabled={removing}
            >
              {removing ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DAOTransitionManager;