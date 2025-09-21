import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search, Filter, RefreshCw, Users, UserPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { usePagination } from '../../hooks/usePagination';
import { useListFilters } from '../../hooks/useFilter';
import { useActiveStationService } from '../../hooks/useStationService';
import {
  fetchUsersThunk,
  selectStationUsers,
  selectCurrentUserPrivileges,
} from '../../features/station/stationSlice';
import {
  formatUserStatus,
  formatPrincipal,
  formatTimestamp,
  getStatusColor,
} from '../../utils/orbit-helpers';
import UserDialog from './UserDialog';
import Pagination from './Pagination';

export default function UsersPage({ tokenId }) {
  const dispatch = useDispatch();
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogMode, setDialogMode] = useState('view'); // 'view', 'edit', 'create'
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const users = useSelector(selectStationUsers);
  const privileges = useSelector(selectCurrentUserPrivileges);
  const { identity } = useSelector((state) => state.auth);

  const { service, hasStation, stationId } = useActiveStationService(tokenId, identity);

  // Pagination
  const pagination = usePagination({ pageSize: 25 });

  // Filters
  const filters = useListFilters({
    initialSearch: '',
    initialStatuses: [],
    initialGroups: [],
  });

  // Check if user can create/edit users
  const canCreateUser = privileges?.some((p) =>
    typeof p === 'string' ? p === 'AddUser' : 'AddUser' in p
  );
  const canEditUser = privileges?.some((p) =>
    typeof p === 'string' ? p === 'EditUser' : 'EditUser' in p
  );

  // Fetch users when filters or pagination change
  useEffect(() => {
    if (hasStation && stationId && identity) {
      const params = {
        ...filters.filterParams,
        paginate: {
          offset: pagination.offset,
          limit: pagination.limit,
        },
      };

      dispatch(
        fetchUsersThunk({
          stationId,
          identity,
          params,
        })
      );
    }
  }, [
    hasStation,
    stationId,
    identity,
    filters.filterParams,
    pagination.offset,
    pagination.limit,
    dispatch,
  ]);

  // Update pagination total when users change
  useEffect(() => {
    pagination.setTotalItems(users.total || 0);
  }, [users.total]);

  const handleRefresh = async () => {
    if (!hasStation || !stationId || !identity) return;

    setIsRefreshing(true);
    try {
      await dispatch(
        fetchUsersThunk({
          stationId,
          identity,
          params: {
            ...filters.filterParams,
            paginate: {
              offset: pagination.offset,
              limit: pagination.limit,
            },
          },
        })
      ).unwrap();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setDialogMode('view');
    setIsDialogOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setDialogMode('edit');
    setIsDialogOpen(true);
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setDialogMode('create');
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDialogSubmit = () => {
    handleDialogClose();
    handleRefresh();
  };

  if (!hasStation) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>No Station Connected</CardTitle>
          <CardDescription>
            This token doesn't have an Orbit Station treasury configured yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage users and their permissions in the Orbit Station
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            disabled={isRefreshing || users.loading}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          {canCreateUser && (
            <Button onClick={handleCreateUser}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={filters.searchTerm}
                  onChange={(e) => filters.setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Status
                    {filters.statuses.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {filters.statuses.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => filters.toggleStatus('Active')}
                    className="cursor-pointer"
                  >
                    <span
                      className={
                        filters.statuses.includes('Active') ? 'font-semibold' : ''
                      }
                    >
                      Active
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => filters.toggleStatus('Inactive')}
                    className="cursor-pointer"
                  >
                    <span
                      className={
                        filters.statuses.includes('Inactive') ? 'font-semibold' : ''
                      }
                    >
                      Inactive
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => filters.toggleStatus('Archived')}
                    className="cursor-pointer"
                  >
                    <span
                      className={
                        filters.statuses.includes('Archived') ? 'font-semibold' : ''
                      }
                    >
                      Archived
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {filters.hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={filters.clearAll}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead>Identities</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Loading users...
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.error ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-destructive">
                      Error loading users: {users.error.message}
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {filters.hasActiveFilters
                        ? 'No users found matching your filters'
                        : 'No users found'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.items.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewUser(user)}
                  >
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(user.status)}>
                        {formatUserStatus(user.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.groups?.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {user.groups.map((group) => (
                            <Badge key={group.id} variant="outline">
                              {group.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No groups</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.identities?.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {user.identities.slice(0, 2).map((identity, idx) => (
                            <code key={idx} className="text-xs">
                              {formatPrincipal(identity)}
                            </code>
                          ))}
                          {user.identities.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{user.identities.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No identities</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatTimestamp(user.last_modification_timestamp, {
                        relative: true,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewUser(user);
                            }}
                          >
                            View Details
                          </DropdownMenuItem>
                          {canEditUser && user.privileges?.can_edit && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditUser(user);
                              }}
                            >
                              Edit User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {users.total > 0 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">{pagination.pageInfo.displayText}</div>
          <Pagination {...pagination.bindings} />
        </div>
      )}

      {/* User Dialog */}
      <UserDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        onSubmit={handleDialogSubmit}
        user={selectedUser}
        mode={dialogMode}
        stationId={stationId}
        identity={identity}
      />
    </div>
  );
}