import { useInternetIdentity } from 'ic-use-internet-identity';

export function useIdentity() {
    // Always use Internet Identity
    return useInternetIdentity();
}