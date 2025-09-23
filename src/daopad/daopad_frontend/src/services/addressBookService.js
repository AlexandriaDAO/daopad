import { Principal } from '@dfinity/principal';
import { v4 as uuidv4 } from 'uuid';
import { DAOPadBackendService } from './daopadBackend';

// Constants from address_book.rs Lines 36-37
const DEFAULT_ENTRIES_LIMIT = 100;
const MAX_LIST_ENTRIES_LIMIT = 1000;

// Error codes from errors/address_book.rs Lines 8-36
const AddressBookErrorCodes = {
  ADDRESS_NOT_FOUND: 'AddressNotFound',
  DUPLICATE_ADDRESS: 'DuplicateAddress',
  ADDRESS_BOOK_ENTRY_NOT_FOUND: 'AddressBookEntryNotFound',
  INVALID_ADDRESS_OWNER_LENGTH: 'InvalidAddressOwnerLength',
  INVALID_ADDRESS_LENGTH: 'InvalidAddressLength',
  UNKNOWN_BLOCKCHAIN: 'UnknownBlockchain',
  UNKNOWN_BLOCKCHAIN_STANDARD: 'UnknownBlockchainStandard',
  VALIDATION_ERROR: 'ValidationError'
};

class AddressBookService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5000; // 5 seconds cache
    this.daopadService = null;
    this.identity = null;
  }

  // Initialize with identity for authenticated calls
  setIdentity(identity) {
    if (identity !== this.identity) {
      this.identity = identity;
      this.daopadService = new DAOPadBackendService(identity);
    }
  }

  async getBackendActor() {
    if (!this.daopadService) {
      throw new Error('AddressBookService not initialized. Call setIdentity first.');
    }
    return await this.daopadService.getActor();
  }

  /**
   * List address book entries with filtering and pagination
   * Reference: controllers/address_book.rs Lines 75-103
   *
   * @param {Object} input - ListAddressBookEntriesInput
   * @param {string[]} [input.ids] - Filter by specific UUIDs
   * @param {string[]} [input.addresses] - Filter by exact addresses
   * @param {string} [input.blockchain] - Filter by blockchain ("icp", "eth", "btc")
   * @param {string[]} [input.labels] - Filter by labels (OR logic)
   * @param {Object} [input.paginate] - Pagination options
   * @param {number} [input.paginate.offset=0] - Starting offset
   * @param {number} [input.paginate.limit=100] - Items per page (max 1000)
   * @param {string[]} [input.address_formats] - Filter by address formats
   * @param {string} [input.search_term] - Search in owner name and address
   * @returns {Promise<ListAddressBookEntriesResponse>}
   */
  async listAddressBookEntries(input = {}) {
    try {
      // CRITICAL FIX: Each optional field needs array wrapping for Candid encoding
      // Reference: orbit-reference/apps/wallet/src/services/station.service.ts

      // Build pagination with proper nested optional encoding
      let paginateInput = null;

      if (input.paginate) {
        const limit = input.paginate.limit || DEFAULT_ENTRIES_LIMIT;
        if (limit > MAX_LIST_ENTRIES_LIMIT) {
          throw new Error(`Limit cannot exceed ${MAX_LIST_ENTRIES_LIMIT}`);
        }

        // Each field inside PaginationInput is also optional and needs array wrapping
        paginateInput = {
          // offset: opt nat64 - wrap in array for Some, empty array for None
          offset: input.paginate.offset !== undefined ? [input.paginate.offset] : [],
          // limit: opt nat64 - wrap in array for Some
          limit: [limit]
        };
      } else {
        // Default pagination with proper optional encoding
        paginateInput = {
          offset: [0],                      // opt nat64 as [0]
          limit: [DEFAULT_ENTRIES_LIMIT]    // opt nat64 as [100]
        };
      }

      // Convert undefined to null for Candid - wrap in arrays for opt types
      const candid_input = {
        ids: input.ids ? [input.ids] : [],
        addresses: input.addresses ? [input.addresses] : [],
        blockchain: input.blockchain ? [input.blockchain] : [],
        labels: input.labels ? [input.labels] : [],
        paginate: [paginateInput],  // opt PaginationInput - wrapped
        address_formats: input.address_formats ? [input.address_formats] : [],
        search_term: input.search_term ? [input.search_term] : []
      };

      const actor = await this.getBackendActor();
      const result = await actor.list_address_book_entries(candid_input);

      if (result.Err) {
        throw this.handleError(result.Err);
      }

      // Process search_term client-side if needed - services/address_book.rs Lines 93-99
      let entries = result.Ok.address_book_entries;
      if (input.search_term) {
        const searchLower = input.search_term.toLowerCase();
        entries = entries.filter(entry =>
          entry.address_owner.toLowerCase().includes(searchLower) ||
          entry.address.toLowerCase().includes(searchLower)
        );
      }

      return {
        Ok: {
          address_book_entries: entries,
          privileges: result.Ok.privileges,
          total: Number(result.Ok.total),
          next_offset: result.Ok.next_offset ? Number(result.Ok.next_offset[0]) : null
        }
      };
    } catch (error) {
      console.error('Error listing address book entries:', error);
      return { Err: error };
    }
  }

  /**
   * Get a single address book entry by ID
   * Reference: controllers/address_book.rs Lines 52-72
   *
   * @param {string} id - UUID of the address book entry
   * @returns {Promise<GetAddressBookEntryResponse>}
   */
  async getAddressBookEntry(id) {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        throw new Error('Invalid UUID format');
      }

      const actor = await this.getBackendActor();
      const result = await actor.get_address_book_entry({
        address_book_entry_id: id
      });

      if (result.Err) {
        throw this.handleError(result.Err);
      }

      return result;
    } catch (error) {
      console.error('Error getting address book entry:', error);
      return { Err: error };
    }
  }

  /**
   * Create a new address book entry (creates a request)
   * Reference: factories/requests/add_address_book_entry.rs Lines 13-34
   *
   * @param {Object} input - AddAddressBookEntryOperationInput
   * @param {string} input.address_owner - Owner name (1-255 chars)
   * @param {string} input.address - The address (1-255 chars)
   * @param {string} input.address_format - Format identifier
   * @param {string} input.blockchain - Blockchain type ("icp", "eth", "btc")
   * @param {Array} input.metadata - Key-value metadata pairs
   * @param {string[]} input.labels - Labels (max 10, 150 chars each)
   * @returns {Promise<CreateRequestResponse>}
   */
  async createAddressBookEntry(input) {
    try {
      // Validate input - models/address_book.rs Lines 52-118
      this.validateAddressBookInput(input);

      const request_input = {
        operation: {
          AddAddressBookEntry: input
        },
        title: [`Add address book entry: ${input.address_owner}`],
        summary: [],
        execution_plan: []
      };

      const actor = await this.getBackendActor();
      const result = await actor.create_address_book_request(request_input);

      if (result.Err) {
        throw this.handleError(result.Err);
      }

      return result;
    } catch (error) {
      console.error('Error creating address book entry:', error);
      return { Err: error };
    }
  }

  /**
   * Edit an existing address book entry (creates a request)
   * Reference: factories/requests/edit_address_book_entry.rs
   *
   * @param {Object} input - EditAddressBookEntryOperationInput
   * @param {string} input.address_book_entry_id - UUID of the entry
   * @param {string} [input.address_owner] - New owner name (optional)
   * @param {string[]} [input.labels] - New labels (replaces all)
   * @param {Object} [input.change_metadata] - Metadata changes
   * @returns {Promise<CreateRequestResponse>}
   */
  async editAddressBookEntry(input) {
    try {
      // Validate UUID
      if (!this.isValidUUID(input.address_book_entry_id)) {
        throw new Error('Invalid UUID format');
      }

      // Convert to candid format with optional fields
      const editInput = {
        address_book_entry_id: input.address_book_entry_id,
        address_owner: input.address_owner ? [input.address_owner] : [],
        labels: input.labels ? [input.labels] : [],
        change_metadata: input.change_metadata ? [input.change_metadata] : []
      };

      const request_input = {
        operation: {
          EditAddressBookEntry: editInput
        },
        title: [`Edit address book entry`],
        summary: [],
        execution_plan: []
      };

      const actor = await this.getBackendActor();
      const result = await actor.create_address_book_request(request_input);

      if (result.Err) {
        throw this.handleError(result.Err);
      }

      return result;
    } catch (error) {
      console.error('Error editing address book entry:', error);
      return { Err: error };
    }
  }

  /**
   * Remove an address book entry (creates a request)
   * Reference: factories/requests/remove_address_book_entry.rs
   *
   * @param {string} id - UUID of the address book entry to remove
   * @returns {Promise<CreateRequestResponse>}
   */
  async removeAddressBookEntry(id) {
    try {
      // Validate UUID
      if (!this.isValidUUID(id)) {
        throw new Error('Invalid UUID format');
      }

      const request_input = {
        operation: {
          RemoveAddressBookEntry: {
            address_book_entry_id: id
          }
        },
        title: [`Remove address book entry`],
        summary: [],
        execution_plan: []
      };

      const actor = await this.getBackendActor();
      const result = await actor.create_address_book_request(request_input);

      if (result.Err) {
        throw this.handleError(result.Err);
      }

      return result;
    } catch (error) {
      console.error('Error removing address book entry:', error);
      return { Err: error };
    }
  }

  /**
   * Validate address book input against Orbit constraints
   * Reference: models/address_book.rs Lines 52-118
   */
  validateAddressBookInput(input) {
    // Owner validation - Lines 52-62
    if (!input.address_owner || input.address_owner.length < 1 || input.address_owner.length > 255) {
      throw new Error(`Address owner must be between 1 and 255 characters`);
    }

    // Address validation - Lines 65-76
    if (!input.address || input.address.length < 1 || input.address.length > 255) {
      throw new Error(`Address must be between 1 and 255 characters`);
    }

    // Blockchain validation - models/blockchain.rs Lines 9-13
    if (!['icp', 'eth', 'btc'].includes(input.blockchain)) {
      throw new Error(`Unknown blockchain: ${input.blockchain}`);
    }

    // Labels validation - Lines 78-106
    if (input.labels) {
      if (input.labels.length > 10) {
        throw new Error(`Cannot have more than 10 labels`);
      }
      for (const label of input.labels) {
        if (label.length === 0) {
          throw new Error('Label cannot be empty');
        }
        if (label.length > 150) {
          throw new Error(`Label cannot exceed 150 characters`);
        }
      }
    }

    // Address format validation - models/account.rs Lines 86-117
    const validFormats = {
      icp: ['icp_account_identifier', 'icrc1_account'],
      eth: ['ethereum_address'],
      btc: ['bitcoin_address_p2wpkh', 'bitcoin_address_p2tr']
    };

    if (!validFormats[input.blockchain]?.includes(input.address_format)) {
      throw new Error(`Invalid address format for blockchain ${input.blockchain}`);
    }
  }

  /**
   * Validate address format based on blockchain
   * Reference: models/account.rs Lines 86-117
   */
  validateAddress(address, format, blockchain) {
    switch(format) {
      case 'icp_account_identifier':
        // 64 character hex string
        if (!/^[0-9a-f]{64}$/i.test(address)) {
          return false;
        }
        break;

      case 'icrc1_account':
        // Principal-subaccount format
        if (!address.includes('-') || address.split('-').length !== 2) {
          return false;
        }
        break;

      case 'ethereum_address':
        // 0x + 40 hex characters
        if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
          return false;
        }
        break;

      case 'bitcoin_address_p2wpkh':
        // bc1 + 40 characters
        if (!address.startsWith('bc1') || address.length !== 42) {
          return false;
        }
        break;

      case 'bitcoin_address_p2tr':
        // bc1p + 58 characters
        if (!address.startsWith('bc1p') || address.length !== 62) {
          return false;
        }
        break;

      default:
        return false;
    }

    return true;
  }

  /**
   * Detect address format automatically
   */
  detectAddressFormat(address, blockchain) {
    // Implementation based on patterns from models/account.rs Lines 86-117
    if (blockchain === 'icp') {
      if (address.length === 64 && /^[0-9a-f]{64}$/i.test(address)) {
        return 'icp_account_identifier';
      }
      if (address.includes('-') && address.split('-').length === 2) {
        return 'icrc1_account';
      }
    } else if (blockchain === 'eth') {
      if (/^0x[0-9a-fA-F]{40}$/.test(address)) {
        return 'ethereum_address';
      }
    } else if (blockchain === 'btc') {
      if (address.startsWith('bc1') && address.length === 42) {
        return 'bitcoin_address_p2wpkh';
      }
      if (address.startsWith('bc1p') && address.length === 62) {
        return 'bitcoin_address_p2tr';
      }
    }
    return '';
  }

  /**
   * Check if a string is a valid UUID
   */
  isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Handle error responses
   */
  handleError(error) {
    if (typeof error === 'object' && error.code) {
      // It's already a structured error
      return error;
    }
    // Convert string errors to structured format
    return {
      code: 'UNKNOWN_ERROR',
      message: error.toString(),
      details: []
    };
  }

  /**
   * Generate a new UUID
   */
  generateUUID() {
    return uuidv4();
  }
}

export const addressBookService = new AddressBookService();