import React from 'react';

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
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="proposal-modal-overlay" onClick={handleOverlayClick}>
      <div className="proposal-modal">
        <div className="modal-header">
          <h2>Proposal Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="detail-section">
            <h3>General Information</h3>
            
            <div className="detail-row">
              <span className="detail-label">ID:</span>
              <span className="detail-value">{proposal.id}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Title:</span>
              <span className="detail-value">{proposal.title || 'Untitled'}</span>
            </div>

            {proposal.summary && (
              <div className="detail-row">
                <span className="detail-label">Summary:</span>
                <span className="detail-value">{proposal.summary}</span>
              </div>
            )}

            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span 
                className="proposal-status"
                style={{ backgroundColor: getStatusColor(proposal.status) }}
              >
                {getStatusText(proposal.status)}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Requested by:</span>
              <span className="detail-value">{proposal.requested_by}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Created:</span>
              <span className="detail-value">{formatDate(proposal.created_at)}</span>
            </div>

            {proposal.expiration_dt && (
              <div className="detail-row">
                <span className="detail-label">Expires:</span>
                <span className="detail-value">{formatDate(proposal.expiration_dt)}</span>
              </div>
            )}
          </div>

          <div className="detail-section">
            <h3>Approval Status</h3>
            
            {proposal.approvals && proposal.approvals.length > 0 ? (
              <div className="approval-list">
                <h4>Approval Decisions ({proposal.approvals.length})</h4>
                {proposal.approvals.map((approval, index) => (
                  <div key={index} className={`approval-item ${approval.status?.Rejected ? 'rejection' : ''}`}>
                    <span className="approval-user">{approval.approver_id?.substring(0, 8)}...</span>
                    <span className="approval-status">
                      {approval.status?.Approved ? 'Approved' : 'Rejected'}
                    </span>
                    <span className="approval-date">{formatDate(approval.decided_at)}</span>
                    {approval.status_reason && (
                      <span className="approval-reason">{approval.status_reason}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-approvals">No approval decisions yet</p>
            )}
          </div>

          {proposal.operation && (
            <div className="detail-section">
              <h3>Operation Details</h3>
              <pre className="operation-details">
                {JSON.stringify(proposal.operation, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-close-modal" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ProposalDetailsModal;