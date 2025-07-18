import React from "react";
import { InternetIdentityProvider } from "ic-use-internet-identity";

const IIProvider = ({ children }) => {
	return (
		<InternetIdentityProvider loginOptions={{
			derivationOrigin: process.env.DFX_NETWORK !== "ic"
				? undefined
				: "https://yj5ba-aiaaa-aaaap-qkmoa-cai.icp0.io",
			maxTimeToLive: BigInt(7) * BigInt(24) * BigInt(3_600_000_000_000), // 1 week
		}}>
			{children}
		</InternetIdentityProvider>
	)
}

export default IIProvider;