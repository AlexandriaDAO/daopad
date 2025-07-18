import { useIdentity } from './useIdentity';

export function useLogout() {
    const {clear} = useIdentity();

    const logout = async () => {
        await clear();
        // Optionally refresh the page after logout
        window.location.reload();
    }

    return logout;
}