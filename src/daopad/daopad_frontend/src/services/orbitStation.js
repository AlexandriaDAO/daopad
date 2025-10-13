import { Actor, HttpAgent } from '@dfinity/agent';

// Default Orbit Station ID (Alexandria) - can be overridden in constructor
const DEFAULT_ORBIT_STATION_ID = "fec7w-zyaaa-aaaaa-qaffq-cai";

// Define the minimal IDL for list_requests
const orbitStationIDL = ({ IDL }) => {
  const UUID = IDL.Text;
  const TimestampRFC3339 = IDL.Text;
  const RequestStatusCode = IDL.Variant({
    Created: IDL.Null,
    Approved: IDL.Null,
    Rejected: IDL.Null,
    Cancelled: IDL.Null,
    Scheduled: IDL.Null,
    Processing: IDL.Null,
    Completed: IDL.Null,
    Failed: IDL.Null,
  });
  
  const ListRequestsOperationType = IDL.Variant({
    Transfer: IDL.Opt(UUID),
    EditAccount: IDL.Null,
    AddAccount: IDL.Null,
    AddUser: IDL.Null,
    EditUser: IDL.Null,
    AddAddressBookEntry: IDL.Null,
    EditAddressBookEntry: IDL.Null,
    RemoveAddressBookEntry: IDL.Null,
    AddUserGroup: IDL.Null,
    EditUserGroup: IDL.Null,
    RemoveUserGroup: IDL.Null,
    SystemUpgrade: IDL.Null,
    ChangeExternalCanister: IDL.Opt(IDL.Principal),
    ConfigureExternalCanister: IDL.Opt(IDL.Principal),
    CreateExternalCanister: IDL.Null,
    CallExternalCanister: IDL.Opt(IDL.Principal),
    FundExternalCanister: IDL.Opt(IDL.Principal),
    MonitorExternalCanister: IDL.Opt(IDL.Principal),
    SnapshotExternalCanister: IDL.Opt(IDL.Principal),
    RestoreExternalCanister: IDL.Opt(IDL.Principal),
    PruneExternalCanister: IDL.Opt(IDL.Principal),
    EditPermission: IDL.Null,
    AddRequestPolicy: IDL.Null,
    EditRequestPolicy: IDL.Null,
    RemoveRequestPolicy: IDL.Null,
    ManageSystemInfo: IDL.Null,
    SetDisasterRecovery: IDL.Null,
    AddAsset: IDL.Null,
    EditAsset: IDL.Null,
    RemoveAsset: IDL.Null,
    AddNamedRule: IDL.Null,
    EditNamedRule: IDL.Null,
    RemoveNamedRule: IDL.Null,
  });
  
  const SortByDirection = IDL.Variant({
    Asc: IDL.Null,
    Desc: IDL.Null,
  });
  
  const ListRequestsSortBy = IDL.Variant({
    CreatedAt: SortByDirection,
    ExpirationDt: SortByDirection,
    LastModificationDt: SortByDirection,
  });
  
  const PaginationInput = IDL.Record({
    offset: IDL.Opt(IDL.Nat64),
    limit: IDL.Opt(IDL.Nat16),
  });
  
  const ListRequestsInput = IDL.Record({
    requester_ids: IDL.Opt(IDL.Vec(UUID)),
    approver_ids: IDL.Opt(IDL.Vec(UUID)),
    statuses: IDL.Opt(IDL.Vec(RequestStatusCode)),
    operation_types: IDL.Opt(IDL.Vec(ListRequestsOperationType)),
    expiration_from_dt: IDL.Opt(TimestampRFC3339),
    expiration_to_dt: IDL.Opt(TimestampRFC3339),
    created_from_dt: IDL.Opt(TimestampRFC3339),
    created_to_dt: IDL.Opt(TimestampRFC3339),
    paginate: IDL.Opt(PaginationInput),
    sort_by: IDL.Opt(ListRequestsSortBy),
    only_approvable: IDL.Bool,
    with_evaluation_results: IDL.Bool,
  });
  
  // Define minimal Request type for display
  const RequestApprovalStatus = IDL.Variant({
    Approved: IDL.Null,
    Rejected: IDL.Null,
  });
  
  const RequestApproval = IDL.Record({
    approver_id: UUID,
    status: RequestApprovalStatus,
    status_reason: IDL.Opt(IDL.Text),
    decided_at: TimestampRFC3339,
  });
  
  const RequestStatus = IDL.Variant({
    Created: IDL.Null,
    Approved: IDL.Null,
    Rejected: IDL.Null,
    Cancelled: IDL.Record({ reason: IDL.Opt(IDL.Text) }),
    Scheduled: IDL.Record({ scheduled_at: TimestampRFC3339 }),
    Processing: IDL.Record({ started_at: TimestampRFC3339 }),
    Completed: IDL.Record({ completed_at: TimestampRFC3339 }),
    Failed: IDL.Record({ reason: IDL.Opt(IDL.Text) }),
  });
  
  const RequestExecutionSchedule = IDL.Variant({
    Immediate: IDL.Null,
    Scheduled: IDL.Record({ execution_time: TimestampRFC3339 }),
  });
  
  // Simplified RequestOperation - we'll use Unknown for most operations
  const RequestOperation = IDL.Unknown;
  
  const Request = IDL.Record({
    id: UUID,
    title: IDL.Text,
    summary: IDL.Opt(IDL.Text),
    operation: RequestOperation,
    requested_by: UUID,
    approvals: IDL.Vec(RequestApproval),
    created_at: TimestampRFC3339,
    status: RequestStatus,
    expiration_dt: TimestampRFC3339,
    execution_plan: RequestExecutionSchedule,
  });
  
  const RequestCallerPrivileges = IDL.Record({
    id: UUID,
    can_approve: IDL.Bool,
  });
  
  const RequestAdditionalInfo = IDL.Unknown;
  
  const Error = IDL.Record({
    code: IDL.Text,
    message: IDL.Opt(IDL.Text),
    details: IDL.Opt(IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))),
  });
  
  const ListRequestsResult = IDL.Variant({
    Ok: IDL.Record({
      requests: IDL.Vec(Request),
      total: IDL.Nat64,
      next_offset: IDL.Opt(IDL.Nat64),
      privileges: IDL.Vec(RequestCallerPrivileges),
      additional_info: IDL.Vec(RequestAdditionalInfo),
    }),
    Err: Error,
  });

  // User and member types for querying users
  const UserStatus = IDL.Variant({
    'Active': IDL.Null,
    'Inactive': IDL.Null,
  });

  const UserGroup = IDL.Record({
    'id': UUID,
    'name': IDL.Text,
  });

  const User = IDL.Record({
    'id': UUID,
    'name': IDL.Text,
    'status': UserStatus,
    'groups': IDL.Vec(UserGroup),
    'identities': IDL.Vec(IDL.Principal),
    'last_modification_timestamp': TimestampRFC3339,
  });

  const ListUsersInput = IDL.Record({
    'search_term': IDL.Opt(IDL.Text),
    'statuses': IDL.Opt(IDL.Vec(UserStatus)),
    'groups': IDL.Opt(IDL.Vec(UUID)),
    'paginate': IDL.Opt(PaginationInput),
  });

  const ListUsersResult = IDL.Variant({
    'Ok': IDL.Record({
      'users': IDL.Vec(User),
      'next_offset': IDL.Opt(IDL.Nat64),
      'total': IDL.Nat64,
    }),
    'Err': Error,
  });

  // System info returned by Orbit stations (we only consume a subset of fields)
  const SystemInfo = IDL.Record({
    'name': IDL.Text,
    'version': IDL.Text,
    'upgrader_id': IDL.Principal,
    'cycles': IDL.Nat64,
    'upgrader_cycles': IDL.Opt(IDL.Nat64),
    'last_upgrade_timestamp': TimestampRFC3339,
    'raw_rand_successful': IDL.Bool,
    'disaster_recovery': IDL.Opt(IDL.Unknown),
    'cycle_obtain_strategy': IDL.Unknown,
  });

  const SystemInfoResult = IDL.Variant({
    'Ok': IDL.Record({ system: SystemInfo }),
    'Err': Error,
  });

  return IDL.Service({
    list_requests: IDL.Func([ListRequestsInput], [ListRequestsResult], ['query']),
    list_users: IDL.Func([ListUsersInput], [ListUsersResult], ['query']),
    system_info: IDL.Func([], [SystemInfoResult], ['query']),
  });
};

export class OrbitStationService {
  constructor(identity = null, stationId = null) {
    this.stationId = stationId || DEFAULT_ORBIT_STATION_ID;
    const isLocal = import.meta.env.VITE_DFX_NETWORK === 'local';
    this.agent = new HttpAgent({ 
      identity,
      host: isLocal ? 'http://localhost:4943' : 'https://icp0.io'
    });
    
    // Fetch root key for local development
    if (isLocal) {
      this.agent.fetchRootKey().catch(console.error);
    }
    
    this.actor = Actor.createActor(orbitStationIDL, {
      agent: this.agent,
      canisterId: this.stationId,
    });
  }
  
  async listRequests(filter = {}) {
    try {
      // For optional fields in Candid, [] means None, [value] means Some(value)
      // For variants, we need to ensure they're properly formatted
      
      // Build status filter - wrap the array in another array for the optional
      let statusFilter = [];
      if (filter.status) {
        const statusVariant = {};
        statusVariant[filter.status] = null;
        // For IDL.Opt(IDL.Vec(...)), we need [[variant]] not [variant]
        statusFilter = [[statusVariant]];
        console.log('Status filter (for optional vec):', statusFilter);
      }
      
      // Build operation type variant similarly
      let typeFilter = [];
      if (filter.type) {
        const typeVariant = {};
        typeVariant[filter.type] = null;
        typeFilter = [[typeVariant]];
      }
      
      const input = {
        requester_ids: [],
        approver_ids: [],
        statuses: statusFilter,
        operation_types: typeFilter,
        expiration_from_dt: [],
        expiration_to_dt: [],
        created_from_dt: filter.fromDate ? [filter.fromDate] : [],
        created_to_dt: filter.toDate ? [filter.toDate] : [],
        paginate: [{ 
          offset: filter.offset ? [filter.offset] : [], 
          limit: filter.limit ? [filter.limit] : [100] 
        }],
        sort_by: [{ CreatedAt: { Desc: null } }],
        only_approvable: false,
        with_evaluation_results: false
      };
      
      console.log('Calling list_requests with:', input);
      const result = await this.actor.list_requests(input);
      console.log('Result:', result);
      
      if ('Ok' in result) {
        return {
          success: true,
          data: result.Ok.requests,
          total: result.Ok.total,
          next_offset: result.Ok.next_offset
        };
      } else {
        return {
          success: false,
          error: result.Err.message?.[0] || 'Failed to fetch requests',
          code: result.Err.code
        };
      }
    } catch (error) {
      console.error('Failed to list requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async listAllUsers() {
    try {
      const input = {
        search_term: [],
        statuses: [],
        groups: [],
        paginate: [{
          offset: [],
          limit: [100], // Get up to 100 users
        }],
      };

      const result = await this.actor.list_users(input);

      if ('Ok' in result) {
        return {
          success: true,
          data: {
            users: result.Ok.users,
            total: Number(result.Ok.total),
            hasMore: result.Ok.next_offset.length > 0,
          }
        };
      } else {
        return {
          success: false,
          error: result.Err.message || 'Failed to list users'
        };
      }
    } catch (error) {
      console.error('Failed to list users:', error);
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  }

  async getSystemInfo() {
    try {
      const result = await this.actor.system_info();

      if ('Ok' in result) {
        return {
          success: true,
          data: result.Ok.system,
        };
      }

      const errMessage = result.Err?.message?.[0] || result.Err?.code || 'Failed to get system info';
      return {
        success: false,
        error: errMessage,
      };
    } catch (error) {
      console.error('Failed to get system info:', error);
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  }

  // Helper method to get all members with their roles
  async getAllMembersWithRoles() {
    try {
      const [usersResult, systemResult] = await Promise.all([
        this.listAllUsers(),
        this.getSystemInfo()
      ]);

      if (!usersResult.success) {
        return usersResult;
      }

      // Get admin IDs for role detection
      const adminIds = new Set(
        systemResult.success && Array.isArray(systemResult.data?.admins)
          ? systemResult.data.admins.map(admin => admin.id)
          : []
      );

      // Standard group UUIDs from Orbit documentation
      const ADMIN_GROUP_ID = "00000000-0000-4000-8000-000000000000";
      const OPERATOR_GROUP_ID = "00000000-0000-4000-8000-000000000001";

      const membersWithRoles = usersResult.data.users.map(user => {
        const roles = [];

        // Check if user is in admin/operator groups
        user.groups.forEach(group => {
          if (group.id === ADMIN_GROUP_ID) {
            roles.push('Admin');
          } else if (group.id === OPERATOR_GROUP_ID) {
            roles.push('Operator');
          } else {
            roles.push(group.name); // Custom group name
          }
        });

        // Check if user is in system admins (from system_info)
        if (adminIds.has(user.id)) {
          roles.push('System Admin');
        }

        // Default role if no specific roles
        if (roles.length === 0) {
          roles.push('Member');
        }

        return {
          ...user,
          roles: [...new Set(roles)], // Remove duplicates
        };
      });

      return {
        success: true,
        data: {
          members: membersWithRoles,
          total: usersResult.data.total,
          hasMore: usersResult.data.hasMore,
        }
      };
    } catch (error) {
      console.error('Failed to get members with roles:', error);
      return {
        success: false,
        error: error.message || 'Failed to get member information'
      };
    }
  }
}
