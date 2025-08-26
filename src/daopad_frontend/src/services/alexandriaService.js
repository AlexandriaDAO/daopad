import { Actor } from "@dfinity/agent";

class AlexandriaService {
  constructor(actor) {
    this.actor = actor;
  }

  // Fetch proposals with optional filter
  async getProposals(filter = null) {
    try {
      const result = await this.actor.get_alexandria_proposals(filter ? [filter] : []);
      
      if ('Ok' in result) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch proposals'
      };
    }
  }

  // Get detailed information about a specific proposal
  async getProposalDetails(proposalId) {
    try {
      const result = await this.actor.get_proposal_details(proposalId);
      
      if ('Ok' in result) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Error fetching proposal details:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch proposal details'
      };
    }
  }

  // Force cache refresh
  async refreshCache() {
    try {
      const result = await this.actor.refresh_alexandria_cache();
      
      if ('Ok' in result) {
        return {
          success: true,
          message: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Error refreshing cache:', error);
      return {
        success: false,
        error: error.message || 'Failed to refresh cache'
      };
    }
  }

  // Get cache status
  async getCacheStatus() {
    try {
      const status = await this.actor.get_cache_status();
      return {
        success: true,
        data: status
      };
    } catch (error) {
      console.error('Error getting cache status:', error);
      return {
        success: false,
        error: error.message || 'Failed to get cache status'
      };
    }
  }

  // Register backend with Alexandria Station (one-time setup)
  async registerBackend() {
    try {
      const result = await this.actor.register_backend_with_alexandria();
      
      if ('Ok' in result) {
        return {
          success: true,
          message: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Error registering backend:', error);
      return {
        success: false,
        error: error.message || 'Failed to register backend'
      };
    }
  }
}

// Factory function to create the service
export const createAlexandriaService = (actor) => {
  return new AlexandriaService(actor);
};

// Helper function to format dates
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

// Helper function to get status color
export const getStatusColor = (status) => {
  const statusColors = {
    'Created': '#6b7280',    // gray
    'Pending': '#f59e0b',     // amber
    'Approved': '#10b981',    // green
    'Rejected': '#ef4444',    // red
    'Cancelled': '#6b7280',   // gray
    'Scheduled': '#3b82f6',   // blue
    'Processing': '#8b5cf6',  // purple
    'Completed': '#10b981',   // green
    'Failed': '#ef4444',      // red
  };
  
  return statusColors[status] || '#6b7280';
};

// Helper function to get status badge text
export const getStatusBadgeText = (status) => {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

export default AlexandriaService;