import { useIdentity } from './useIdentity';

export function useLogout() {
    const {logout} = useIdentity();

    const handleLogout = async () => {
        await logout();
        // Optionally refresh the page after logout
        window.location.reload();
    }

    return handleLogout;
}