import { useAuth } from '../providers/AuthProvider/IIProvider';

export function useLogout() {
    const { logout } = useAuth();
    return logout;
}