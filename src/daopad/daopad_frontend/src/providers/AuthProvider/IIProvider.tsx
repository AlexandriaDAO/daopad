import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent, type Identity } from "@dfinity/agent";

interface AuthContextType {
	authClient: AuthClient | null;
	identity: Identity | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: () => Promise<void>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within IIProvider");
	}
	return context;
};

interface IIProviderProps {
	children: React.ReactNode;
}

const IIProvider: React.FC<IIProviderProps> = ({ children }) => {
	const [authClient, setAuthClient] = useState<AuthClient | null>(null);
	const [identity, setIdentity] = useState<Identity | null>(null);
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	const isLocal = import.meta.env.VITE_DFX_NETWORK === "local";
	const internetIdentityUrl = isLocal
		? `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`
		: "https://identity.internetcomputer.org";

	console.log("DFX_NETWORK:", import.meta.env.VITE_DFX_NETWORK);
	console.log("Internet Identity URL:", internetIdentityUrl);

	useEffect(() => {
		initAuth();
	}, []);

	const initAuth = async (): Promise<void> => {
		try {
			const client = await AuthClient.create({
				idleOptions: {
					idleTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
					disableIdle: false,
					disableDefaultIdleCallback: true, // We'll handle session expiry ourselves
				}
			});
			setAuthClient(client);

			const isAuth = await client.isAuthenticated();
			setIsAuthenticated(isAuth);

			if (isAuth) {
				const identity = client.getIdentity();
				setIdentity(identity);
			}
		} catch (error) {
			console.error("Error initializing auth:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const login = async (): Promise<void> => {
		if (!authClient) return;

		try {
			await authClient.login({
				identityProvider: internetIdentityUrl,
				onSuccess: () => {
					const identity = authClient.getIdentity();
					setIdentity(identity);
					setIsAuthenticated(true);
				},
				onError: (error?: string) => {
					console.error("Login error:", error);
				},
				derivationOrigin: "https://yj5ba-aiaaa-aaaap-qkmoa-cai.icp0.io",
				maxTimeToLive: BigInt(7) * BigInt(24) * BigInt(3_600_000_000_000), // 1 week
			});
		} catch (error) {
			console.error("Login failed:", error);
		}
	};

	const logout = async (): Promise<void> => {
		if (!authClient) return;

		try {
			await authClient.logout();
			setIdentity(null);
			setIsAuthenticated(false);
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

	const value = {
		authClient,
		identity,
		isAuthenticated,
		isLoading,
		login,
		logout,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default IIProvider;