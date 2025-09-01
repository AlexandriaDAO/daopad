import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent } from "@dfinity/agent";

const AuthContext = createContext();

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within IIProvider");
	}
	return context;
};

const IIProvider = ({ children }) => {
	const [authClient, setAuthClient] = useState(null);
	const [identity, setIdentity] = useState(null);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const isLocal = process.env.DFX_NETWORK === "local";
	const internetIdentityUrl = isLocal
		? `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`
		: "https://identity.internetcomputer.org";

	console.log("DFX_NETWORK:", process.env.DFX_NETWORK);
	console.log("Internet Identity URL:", internetIdentityUrl);

	useEffect(() => {
		initAuth();
	}, []);

	const initAuth = async () => {
		try {
			const client = await AuthClient.create();
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

	const login = async () => {
		if (!authClient) return;

		try {
			await authClient.login({
				identityProvider: internetIdentityUrl,
				onSuccess: () => {
					const identity = authClient.getIdentity();
					setIdentity(identity);
					setIsAuthenticated(true);
				},
				onError: (error) => {
					console.error("Login error:", error);
				},
				// No derivationOrigin - authenticate to our own canister
				maxTimeToLive: BigInt(7) * BigInt(24) * BigInt(3_600_000_000_000), // 1 week
			});
		} catch (error) {
			console.error("Login failed:", error);
		}
	};

	const logout = async () => {
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