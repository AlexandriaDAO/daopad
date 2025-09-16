import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Principal } from '@dfinity/principal';
import { DAOPadBackendService } from '../services/daopadBackend';
import { KongLockerService } from '../services/kongLockerService';
import { setKongLockerCanister, setKongLockerLoading, setKongLockerError } from '../features/dao/daoSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const KongLockerSetup = ({ identity, onComplete }) => {
  const dispatch = useDispatch();
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [hasLockCanister, setHasLockCanister] = useState(null);
  const [detectedCanister, setDetectedCanister] = useState(null);
  const [validationStep, setValidationStep] = useState('');
  
  // Check if user has a Kong Locker canister on mount
  useEffect(() => {
    checkForExistingLockCanister();
  }, [identity]);

  const checkForExistingLockCanister = async () => {
    if (!identity) return;

    setIsChecking(true);
    setError('');

    try {
      const kongLockerService = new KongLockerService(identity);
      const result = await kongLockerService.getMyLockCanister();

      if (result.success && result.data) {
        setHasLockCanister(true);
        setDetectedCanister(result.data.toString());
      } else {
        setHasLockCanister(false);
      }
    } catch (err) {
      console.error('Error checking for lock canister:', err);
      setHasLockCanister(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleAutoConnect = async () => {
    if (!detectedCanister) {
      setError('No Kong Locker canister detected');
      return;
    }

    setIsChecking(true);
    setError('');
    dispatch(setKongLockerLoading(true));

    try {
      setValidationStep('Connecting to your Kong Locker...');

      // Register with DAOPad backend using the detected canister
      const daopadService = new DAOPadBackendService(identity);
      const kongLockerPrincipal = Principal.fromText(detectedCanister);
      const result = await daopadService.registerWithKongLocker(kongLockerPrincipal);

      if (result.success) {
        dispatch(setKongLockerCanister(detectedCanister));
        if (onComplete) {
          onComplete();
        }
      } else {
        setError(result.error || 'Failed to register Kong Locker canister');
        dispatch(setKongLockerError(result.error));
      }
    } catch (err) {
      console.error('Error registering Kong Locker canister:', err);
      setError(err.message || 'An error occurred');
      dispatch(setKongLockerError(err.message));
    } finally {
      setIsChecking(false);
      setValidationStep('');
      dispatch(setKongLockerLoading(false));
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Connect Your Kong Locker</CardTitle>
          <p className="text-muted-foreground">
            To participate in DAO governance, connect your Kong Locker canister.
            Your voting power is based on the USD value of your locked LP tokens.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {isChecking ? (
            <div className="flex flex-col items-center space-y-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <p className="text-muted-foreground">Checking for existing Kong Locker...</p>
            </div>
          ) : hasLockCanister === true ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <div className="text-4xl text-green-500">✓</div>
                <h3 className="text-xl font-semibold">Kong Locker Detected!</h3>
                <p className="text-muted-foreground">We found your Kong Locker canister:</p>
                <Badge variant="outline" className="font-mono text-xs px-3 py-1">
                  {detectedCanister}
                </Badge>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}
              {validationStep && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-blue-700 text-sm">{validationStep}</p>
                </div>
              )}

              <Button
                onClick={handleAutoConnect}
                disabled={isChecking}
                className="w-full"
                size="lg"
              >
                {isChecking ? 'Connecting...' : 'Connect to DAOPad'}
              </Button>
            </div>
          ) : hasLockCanister === false ? (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                <h3 className="font-semibold text-amber-800 mb-2">No Kong Locker Found</h3>
                <p className="text-amber-700 text-sm">
                  You don't have a Kong Locker canister yet. Please create one first to participate in governance.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 p-4 bg-muted rounded-md">
                  <Badge variant="outline" className="rounded-full w-8 h-8 flex items-center justify-center">
                    1
                  </Badge>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold">Create Your Kong Locker</h3>
                    <p className="text-sm text-muted-foreground">
                      Visit <a href="https://konglocker.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">konglocker.com</a> to permanently lock your LP tokens
                    </p>
                    <Button variant="outline" asChild>
                      <a
                        href="https://konglocker.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Go to Kong Locker →
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-muted rounded-md">
                  <Badge variant="outline" className="rounded-full w-8 h-8 flex items-center justify-center">
                    2
                  </Badge>
                  <div className="flex-1">
                    <h3 className="font-semibold">Return Here</h3>
                    <p className="text-sm text-muted-foreground">
                      After creating your lock, return to this page and we'll automatically detect your Kong Locker
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={checkForExistingLockCanister}
                disabled={isChecking}
                variant="outline"
                className="w-full"
              >
                {isChecking ? 'Checking...' : 'Check Again'}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Voting Power Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Your voting power is calculated as: <strong>Total USD Value of Locked LP × 100</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            For example, if you have $50.25 worth of locked LP tokens, your voting power is 5,025.
            This ensures fair representation based on your financial commitment to the ecosystem.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Make sure you've created a lock on Kong Locker first</li>
            <li>• Copy the exact canister principal from your Kong Locker dashboard</li>
            <li>• Ensure you're using the same Internet Identity for both services</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default KongLockerSetup;