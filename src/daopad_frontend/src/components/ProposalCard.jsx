import React from 'react';

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString();
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

const getStatusText = (status) => {
  if (typeof status === 'object') {
    return Object.keys(status)[0];
  }
  return 'Unknown';
};

const ProposalCard = ({ proposal, onClick, onApprove, onReject, canVote, isVotingLoading }) => {
  const approvals = proposal.approvals || [];
  const approvalProgress = 0; // We'll calculate this based on policy rules if available

  return (
    <div className="proposal-card" onClick={onClick}>
      <div className="proposal-card-header">
        <h3 className="proposal-title">{proposal.title || 'Untitled Proposal'}</h3>
        <span 
          className="proposal-status"
          style={{ backgroundColor: getStatusColor(proposal.status) }}
        >
          {getStatusText(proposal.status)}
        </span>
      </div>

      <div className="proposal-card-body">
        <div className="proposal-info">
          <span className="info-label">ID:</span>
          <span className="info-value">{proposal.id?.substring(0, 8) || 'N/A'}...</span>
        </div>
        
        {proposal.summary && (
          <div className="proposal-info">
            <span className="info-label">Summary:</span>
            <span className="info-value">{proposal.summary}</span>
          </div>
        )}

        <div className="proposal-info">
          <span className="info-label">Created:</span>
          <span className="info-value">{formatDate(proposal.created_at)}</span>
        </div>

        {proposal.expiration_dt && (
          <div className="proposal-info">
            <span className="info-label">Expires:</span>
            <span className="info-value">{formatDate(proposal.expiration_dt)}</span>
          </div>
        )}

        <div className="proposal-approval">
          <div className="approval-header">
            <span className="info-label">Approvals:</span>
            <span className="info-value">
              {approvals.length}
            </span>
          </div>
          {approvals.length > 0 && (
            <div className="approval-list">
              {approvals.slice(0, 3).map((approval, idx) => (
                <span key={idx} className={`approval-badge ${approval.status?.Approved ? 'approved' : 'rejected'}`}>
                  {approval.status?.Approved ? '✓' : '✗'}
                </span>
              ))}
              {approvals.length > 3 && <span className="more-approvals">+{approvals.length - 3}</span>}
            </div>
          )}
        </div>
      </div>
      
      {canVote && getStatusText(proposal.status) === 'Created' && (
        <div className="proposal-actions">
          <button 
            className={`approve-btn ${isVotingLoading === 'approving' ? 'loading' : ''} ${isVotingLoading === 'approved' ? 'success' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onApprove(proposal.id);
            }}
            disabled={isVotingLoading}
          >
            {isVotingLoading === 'approving' ? '⏳ Approving...' : 
             isVotingLoading === 'approved' ? '✅ Approved!' : '✓ Approve'}
          </button>
          <button 
            className={`reject-btn ${isVotingLoading === 'rejecting' ? 'loading' : ''} ${isVotingLoading === 'rejected' ? 'success' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onReject(proposal.id, 'Rejected by DAO vote');
            }}
            disabled={isVotingLoading}
          >
            {isVotingLoading === 'rejecting' ? '⏳ Rejecting...' : 
             isVotingLoading === 'rejected' ? '✅ Rejected!' : '✗ Reject'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProposalCard;