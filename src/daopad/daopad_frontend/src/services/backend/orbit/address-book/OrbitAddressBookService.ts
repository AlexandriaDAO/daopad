import { BackendServiceBase } from '../../base/BackendServiceBase';
import { v4 as uuidv4 } from 'uuid';

// Constants from Orbit address_book.rs
const DEFAULT_ENTRIES_LIMIT = 100;
const MAX_LIST_ENTRIES_LIMIT = 1000;

export class OrbitAddressBookService extends BackendServiceBase {
  /**
   * List address book entries with filtering and pagination
   */
  async listEntries(input = {}) {
    try {
      const actor = await this.getActor();

      // Build pagination
      let paginateInput = null;
      if (input.paginate) {
        const limit = input.paginate.limit || DEFAULT_ENTRIES_LIMIT;
        if (limit > MAX_LIST_ENTRIES_LIMIT) {
          throw new Error(`Limit cannot exceed ${MAX_LIST_ENTRIES_LIMIT}`);
        }
        paginateInput = {
          offset: input.paginate.offset !== undefined ? [input.paginate.offset] : [],
          limit: [limit]
        };
      } else {
        paginateInput = {
          offset: [],
          limit: [DEFAULT_ENTRIES_LIMIT]
        };
      }

      // Prepare Candid input with proper optional encoding
      const candidInput = {
        ids: input.ids || [],
        addresses: input.addresses || [],
        blockchain: input.blockchain ? [input.blockchain] : [],
        labels: input.labels || [],
        paginate: [paginateInput],
        address_formats: input.address_formats || [],
        search_term: input.search_term ? [input.search_term] : []
      };

      const rawResult = await actor.list_address_book_entries(candidInput);

      if ('Ok' in rawResult) {
        let entries = rawResult.Ok.address_book_entries;

        // Client-side search filter if needed
        if (input.search_term) {
          const searchLower = input.search_term.toLowerCase();
          entries = entries.filter(entry =>
            entry.address_owner.toLowerCase().includes(searchLower) ||
            entry.address.toLowerCase().includes(searchLower)
          );
        }

        return {
          success: true,
          data: {
            address_book_entries: entries,
            privileges: rawResult.Ok.privileges,
            total: Number(rawResult.Ok.total),
            next_offset: rawResult.Ok.next_offset ? Number(rawResult.Ok.next_offset[0]) : null
          }
        };
      }

      return { success: false, error: rawResult.Err };
    } catch (error) {
      console.error('Error listing address book entries:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a single address book entry by ID
   */
  async getEntry(id) {
    try {
      if (!this.isValidUUID(id)) {
        throw new Error('Invalid UUID format');
      }

      const actor = await this.getActor();
      const result = await actor.get_address_book_entry({
        address_book_entry_id: id
      });

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      }
      return { success: false, error: result.Err };
    } catch (error) {
      console.error('Error getting address book entry:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new address book entry (creates a request)
   */
  async createEntry(input) {
    try {
      this.validateInput(input);

      const actor = await this.getActor();
      const requestInput = {
        operation: { AddAddressBookEntry: input },
        title: [` Add address book entry: ${input.address_owner}`],
        summary: [],
        execution_plan: [{ Immediate: null }]
      };

      const result = await actor.create_address_book_request(requestInput);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Error creating address book entry:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Edit an existing address book entry (creates a request)
   */
  async editEntry(input) {
    try {
      if (!this.isValidUUID(input.address_book_entry_id)) {
        throw new Error('Invalid UUID format');
      }

      const actor = await this.getActor();
      const editInput = {
        address_book_entry_id: input.address_book_entry_id,
        address_owner: input.address_owner ? [input.address_owner] : [],
        labels: input.labels || [],
        change_metadata: input.change_metadata ? [input.change_metadata] : []
      };

      const requestInput = {
        operation: { EditAddressBookEntry: editInput },
        title: ['Edit address book entry'],
        summary: [],
        execution_plan: [{ Immediate: null }]
      };

      const result = await actor.create_address_book_request(requestInput);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Error editing address book entry:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove an address book entry (creates a request)
   */
  async removeEntry(id) {
    try {
      if (!this.isValidUUID(id)) {
        throw new Error('Invalid UUID format');
      }

      const actor = await this.getActor();
      const requestInput = {
        operation: { RemoveAddressBookEntry: { address_book_entry_id: id } },
        title: ['Remove address book entry'],
        summary: [],
        execution_plan: [{ Immediate: null }]
      };

      const result = await actor.create_address_book_request(requestInput);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Error removing address book entry:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate address book input
   */
  validateInput(input) {
    // Owner validation
    if (!input.address_owner || input.address_owner.length < 1 || input.address_owner.length > 255) {
      throw new Error('Address owner must be between 1 and 255 characters');
    }

    // Address validation
    if (!input.address || input.address.length < 1 || input.address.length > 255) {
      throw new Error('Address must be between 1 and 255 characters');
    }

    // Blockchain validation
    const validBlockchains = ['icp', 'eth', 'btc'];
    if (!validBlockchains.includes(input.blockchain)) {
      throw new Error(`Unknown blockchain: ${input.blockchain}`);
    }

    // Labels validation
    if (input.labels) {
      if (input.labels.length > 10) {
        throw new Error('Cannot have more than 10 labels');
      }
      for (const label of input.labels) {
        if (label.length === 0) {
          throw new Error('Label cannot be empty');
        }
        if (label.length > 150) {
          throw new Error('Label cannot exceed 150 characters');
        }
      }
    }

    // Address format validation
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
   * Validate UUID format
   */
  isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Generate a new UUID
   */
  generateUUID() {
    return uuidv4();
  }
}

export const getOrbitAddressBookService = (identity) => {
  return new OrbitAddressBookService(identity);
};

export default OrbitAddressBookService;
