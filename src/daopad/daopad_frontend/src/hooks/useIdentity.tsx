import { useAuth } from '../providers/AuthProvider/IIProvider';

export function useIdentity() {
    // Use our custom auth implementation
    return useAuth();
}