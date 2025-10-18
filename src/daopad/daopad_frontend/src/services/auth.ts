import { AuthClient } from '@dfinity/auth-client';

export class AuthService {
  constructor() {
    this.authClient = null;
    this.identity = null;
    this.principal = null;
    this.isInitialized = false;
  }
  
  async init() {
    if (this.isInitialized) return;

    this.authClient = await AuthClient.create({
      idleOptions: {
        idleTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        disableIdle: false,
        disableDefaultIdleCallback: true, // We'll handle session expiry ourselves
      }
    });
    if (await this.authClient.isAuthenticated()) {
      this.identity = this.authClient.getIdentity();
      this.principal = this.identity.getPrincipal();
    }
    this.isInitialized = true;
  }
  
  async login(onSuccess = () => {}, onError = () => {}) {
    try {
      await this.init();
      
      await this.authClient.login({
        identityProvider: 'https://identity.internetcomputer.org',
        maxTimeToLive: BigInt(7) * BigInt(24) * BigInt(3600) * BigInt(1000000000), // 7 days in nanoseconds
        onSuccess: async () => {
          this.identity = this.authClient.getIdentity();
          this.principal = this.identity.getPrincipal();
          onSuccess();
        },
        onError: (error) => {
          console.error('Login failed:', error);
          onError(error);
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      onError(error);
    }
  }
  
  async logout() {
    if (this.authClient) {
      await this.authClient.logout();
      this.identity = null;
      this.principal = null;
    }
  }
  
  isAuthenticated() {
    return this.identity !== null;
  }
  
  getIdentity() {
    return this.identity;
  }
  
  getPrincipal() {
    return this.principal;
  }
}

// Create a singleton instance
export const authService = new AuthService();