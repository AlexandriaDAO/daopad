import { createActorHook } from "ic-use-actor";
import { _SERVICE } from "../../declarations/admin/admin.did";
import { canisterId, idlFactory } from "../../declarations/admin";

const useAdmin = createActorHook<_SERVICE>({
	canisterId: canisterId,
	idlFactory: idlFactory,
});

export default useAdmin;
