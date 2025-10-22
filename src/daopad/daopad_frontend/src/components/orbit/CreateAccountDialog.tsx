import React, { useState, useEffect } from 'react';
import { DialogLayout } from '@/components/shared/DialogLayout';
import { Button } from '../ui/button';
import { AccountWizard } from './account-wizard/AccountWizard';
import { Loader2 } from 'lucide-react';
import { getProposalService } from '../../services/backend';
import OrbitSetupInstructions from './OrbitSetupInstructions';

const CreateAccountDialog = ({ open, onClose, tokenId, tokenSymbol, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Account configuration state
  const [accountConfig, setAccountConfig] = useState({
    // Step 1: Configuration
    name: '',
    assetIds: [],
    metadata: [],

    // Step 2: Permissions
    readPermission: {
      authScope: { Public: null },
      users: [],
      userGroups: []
    },
    configsPermission: {
      authScope: { Authenticated: null },
      users: [],
      userGroups: []
    },
    transferPermission: {
      authScope: { Authenticated: null },
      users: [],
      userGroups: []
    },

    // Step 3: Approval Rules
    configsRule: null,
    transferRule: null
  });

  // Check backend status when dialog opens
  useEffect(() => {
    if (open && tokenId) {
      checkBackendStatus();
    }
  }, [open, tokenId]);

  // Load assets only after backend status is confirmed
  useEffect(() => {
    if (backendStatus && backendStatus.is_member) {
      loadAssets();
    }
  }, [backendStatus]);

  const checkBackendStatus = async () => {
    setCheckingStatus(true);
    try {
      const backend = getProposalService();
      const result = await backend.checkBackendStatus(tokenId);

      if (result.success) {
        setBackendStatus(result.data);
      } else {
        console.error('Failed to check backend status:', result.error);
        // Set a default error status
        setBackendStatus({
          is_member: false,
          backend_principal: null,
          station_id: null,
          error: result.error || 'Failed to check backend status',
          instructions: ['Please try refreshing the page or contact support if the issue persists.']
        });
      }
    } catch (error) {
      console.error('Error checking backend status:', error);
      setBackendStatus({
        is_member: false,
        backend_principal: null,
        station_id: null,
        error: error.message || 'Failed to connect to backend',
        instructions: ['Please check your connection and try again.']
      });
    }
    setCheckingStatus(false);
  };

  const loadAssets = async () => {
    // Only load assets if backend is a member
    if (!backendStatus || !backendStatus.is_member) {
      return;
    }

    setLoadingAssets(true);
    try {
      const backend = getProposalService();
      const result = await backend.getAvailableAssets(tokenId);

      if (result.success) {
        setAssets(result.data || []);
        // Auto-select first asset if available
        if (result.data && result.data.length > 0) {
          setAccountConfig(prev => ({
            ...prev,
            assetIds: [result.data[0].id]
          }));
        }
      } else {
        // Check if this is a permission error
        if (result.error && result.error.includes('does not exist as a user')) {
          // Update backend status to reflect we're not a member
          setBackendStatus(prev => ({
            ...prev,
            is_member: false,
            error: 'Not authorized to query Orbit Station'
          }));
        } else {
          console.error('Failed to load assets:', result.error);
          // Use default ICP asset as fallback
          setAssets([{
            id: '7802cbab-221d-4e49-b764-a695ea6def1a',
            symbol: 'ICP',
            name: 'Internet Computer',
            decimals: 8
          }]);
          setAccountConfig(prev => ({
            ...prev,
            assetIds: ['7802cbab-221d-4e49-b764-a695ea6def1a']
          }));
        }
      }
    } catch (error) {
      console.error('Error loading assets:', error);
      // Check if this is a permission error
      if (error.message && error.message.includes('does not exist as a user')) {
        setBackendStatus(prev => ({
          ...prev,
          is_member: false,
          error: 'Not authorized to query Orbit Station'
        }));
      } else {
        // Use default ICP asset as fallback for other errors
        setAssets([{
          id: '7802cbab-221d-4e49-b764-a695ea6def1a',
          symbol: 'ICP',
          name: 'Internet Computer',
          decimals: 8
        }]);
        setAccountConfig(prev => ({
          ...prev,
          assetIds: ['7802cbab-221d-4e49-b764-a695ea6def1a']
        }));
      }
    }
    setLoadingAssets(false);
  };

  const handleCreateAccount = async () => {
    // Double-check we're a member before trying to create
    if (!backendStatus || !backendStatus.is_member) {
      setError('DAOPad backend must be a member of the Orbit Station to create accounts');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const backend = getProposalService();
      const result = await backend.createTreasuryAccount(tokenId, accountConfig);

      if (result.success) {
        // Success! Close dialog and notify parent
        onSuccess?.(result.data);
        handleClose();
      } else {
        // Check if this is a permission error
        if (result.error && result.error.includes('does not exist as a user')) {
          setBackendStatus({
            is_member: false,
            backend_principal: backendStatus.backend_principal,
            station_id: backendStatus.station_id,
            instructions: backendStatus.instructions,
            error: 'Lost authorization - please re-add DAOPad as a member'
          });
        }
        setError(result.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      // Check if this is a permission error
      if (error.message && error.message.includes('does not exist as a user')) {
        setBackendStatus({
          is_member: false,
          backend_principal: backendStatus.backend_principal,
          station_id: backendStatus.station_id,
          instructions: backendStatus.instructions,
          error: 'Lost authorization - please re-add DAOPad as a member'
        });
      }
      setError(error.message || 'Failed to create account');
    }

    setIsCreating(false);
  };

  const handleClose = () => {
    // Reset state
    setCurrentStep(0);
    setBackendStatus(null);
    setAccountConfig({
      name: '',
      assetIds: [],
      metadata: [],
      readPermission: {
        authScope: { Public: null },
        users: [],
        userGroups: []
      },
      configsPermission: {
        authScope: { Authenticated: null },
        users: [],
        userGroups: []
      },
      transferPermission: {
        authScope: { Authenticated: null },
        users: [],
        userGroups: []
      },
      configsRule: null,
      transferRule: null
    });
    setError(null);
    onClose();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Configuration step
        return accountConfig.name.trim().length > 0 &&
               accountConfig.assetIds.length > 0;
      case 1: // Permissions step
        return true; // Permissions are optional
      case 2: // Rules step
        return true; // Rules are optional
      default:
        return false;
    }
  };

  const footer = checkingStatus || loadingAssets ? null : backendStatus && !backendStatus.is_member ? null : (
    <div className="flex justify-between">
      <Button
        variant="outline"
        onClick={currentStep > 0 ? () => setCurrentStep(currentStep - 1) : handleClose}
      >
        {currentStep > 0 ? 'Back' : 'Cancel'}
      </Button>

      <div className="flex gap-2">
        {currentStep < 2 ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceed()}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleCreateAccount}
            disabled={isCreating || !canProceed()}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <DialogLayout
      open={open}
      onOpenChange={handleClose}
      title="Create Treasury Account"
      description={`Create a new treasury account for ${tokenSymbol || 'your token'}. This will create a request that needs approval.`}
      footer={footer}
      maxWidth="max-w-2xl"
      maxHeight="max-h-[80vh]"
    >
      {checkingStatus || loadingAssets ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : backendStatus && !backendStatus.is_member ? (
        <OrbitSetupInstructions
          backendStatus={backendStatus}
          onRetryCheck={checkBackendStatus}
          isChecking={checkingStatus}
        />
      ) : (
        <>
          <AccountWizard
            currentStep={currentStep}
            accountConfig={accountConfig}
            setAccountConfig={setAccountConfig}
            assets={assets}
            tokenId={tokenId}
          />

          {error && (
            <div className="rounded-md bg-red-50 p-4 mt-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </>
      )}
    </DialogLayout>
  );
};

export default CreateAccountDialog;
