// Global type definitions

// Environment variables
declare global {
  interface Window {
    ic?: {
      plug?: {
        requestConnect: () => Promise<void>;
        isConnected: () => Promise<boolean>;
        agent?: any;
        principal?: string;
        sessionManager?: any;
      };
    };
  }
}

// Vite environment variables
interface ImportMetaEnv {
  readonly CANISTER_ID_DAOPAD_BACKEND?: string;
  readonly CANISTER_ID_DAOPAD_FRONTEND?: string;
  readonly DFX_NETWORK?: string;
  readonly VITE_HOST?: string;
  readonly VITE_CANISTER_ID_DAOPAD_BACKEND?: string;
  readonly VITE_CANISTER_ID_DAOPAD_FRONTEND?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
