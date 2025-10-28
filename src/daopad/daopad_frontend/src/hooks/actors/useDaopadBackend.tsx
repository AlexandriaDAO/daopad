import { createActorHook } from "ic-use-actor";
import { _SERVICE } from "../../declarations/daopad_backend/daopad_backend.did";
import { canisterId, idlFactory } from "../../declarations/daopad_backend";

const useDaopadBackend = createActorHook<_SERVICE>({
	canisterId: canisterId,
	idlFactory: idlFactory,
});

export default useDaopadBackend;
