import React from 'react';
import { useCallback, useEffect, useMemo } from "react";
import { type DelegationIdentity, isDelegationValid } from "@dfinity/identity";
import {
	authenticateAll,
	ensureAllInitialized,
	type InterceptorErrorData,
	type InterceptorRequestData,
	type InterceptorResponseData,
} from "ic-use-actor";

import { getIdentity, useIdentity } from "../lib/ic-use-identity";
import { toast } from "sonner";
import {
	useDaopadBackend,
	useAdmin,
} from "../hooks/actors";

// Component using multiple actors
export default function ActorProvider() {
	const { identity, clear } = useIdentity();

	const backend = useDaopadBackend();
	const admin = useAdmin();

	const onRequest = useCallback(
		(data: InterceptorRequestData) => {
			const id = getIdentity();
			console.log("onRequest", data.args, data.methodName);
			if (
				id &&
				!isDelegationValid(
					(id as DelegationIdentity).getDelegation()
				)
			) {
				toast.error("Login expired.", {
					id: "login-expired",
					position: "bottom-right",
				});
				setTimeout(() => {
					clear(); // Clears the identity from the state and local storage. Effectively "logs the user out".
					window.location.reload(); // Reloads the page to reset the UI.
				}, 1000);
			}
			return data.args;
		},
		[clear, getIdentity]
	);

	const onRequestError = useCallback((data: InterceptorErrorData) => {
		console.log("onRequestError", data.args, data.methodName, data.error);
		return data.error;
	}, []);

	const onResponse = useCallback((data: InterceptorResponseData) => {
		console.log("onResponse", data.args, data.methodName, data.response);
		return data.response;
	}, []);

	const onResponseError = useCallback((data: InterceptorErrorData) => {
		console.log("onResponseError", data.args, data.methodName, data.error);
		return data.error;
	}, []);

	const interceptors = useMemo(
		() => ({
			onRequest,
			onResponse,
			onRequestError,
			onResponseError,
		}),
		[onRequest, onResponse, onRequestError, onResponseError]
	);

	useEffect(() => {
		if (!identity) return;
		ensureAllInitialized().then(() => {
			authenticateAll(identity);
		});
	}, [identity]);

	useEffect(() => {
		ensureAllInitialized().then(() => {
			backend.setInterceptors(interceptors);
			admin.setInterceptors(interceptors);
		});
	}, [interceptors, backend, admin]);

	return null;
}
