import React from "react";
import { IdentityProvider } from "../../lib/ic-use-identity/init";
import { useIdentity } from "../../lib/ic-use-identity";
import { useInternetIdentity } from "../../lib/ic-use-identity/hooks/useInternetIdentity";
import type { Identity } from "@dfinity/agent";

// Hook that combines identity and auth functions for backward compatibility
export function useAuth() {
	const { identity, clear, error, status } = useIdentity();
	const { login } = useInternetIdentity();

	// Map status to legacy isAuthenticated and isLoading
	const isAuthenticated = status === "success" && !!identity;
	const isLoading = status === "initializing" || status === "authenticating";

	// Legacy auth client is null since we don't expose it anymore
	const authClient = null;

	return {
		identity,
		login,
		logout: clear,
		clear,
		isAuthenticated,
		isLoading,
		authClient,
		error,
		status,
	};
}

interface IIProviderProps {
	children: React.ReactNode;
}

const IIProvider: React.FC<IIProviderProps> = ({ children }) => {
	return <IdentityProvider>{children}</IdentityProvider>;
};

export default IIProvider;
