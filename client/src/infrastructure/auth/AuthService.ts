import type { AuthResponse, User, AuthTokens } from '@/domain/types/auth';

const AUTH_STORAGE_KEY = 'voice_chat_auth';

interface StoredAuth {
  user: User;
  tokens: AuthTokens;
}

interface UserDetailsResponse {
  id: number;
  keycloak_id: string;
  username: string;
  identity?: {
    name: string;
  };
  email?: {
    address: string;
  };
  avatar?: string;
}

export class AuthService {
  // Use our server's proxy to bypass CORS
  private baseUrl = '/api/auth';
  private refreshTimeout: ReturnType<typeof setTimeout> | null = null;

  async login(username: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Invalid credentials');
    }

    const data: AuthResponse & { user?: User } = await response.json();

    const tokens: AuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiryDate: new Date(Date.now() + data.expires_in * 1000),
    };

    // Fetch full user details to get proper name and avatar
    const user = await this.fetchUserDetails(username, tokens.accessToken);

    // Save to localStorage
    this.saveAuth({ user, tokens });

    return { user, tokens };
  }

  private async fetchUserDetails(username: string, accessToken: string): Promise<User> {
    try {
      const response = await fetch(`/api/core/users/by-username/${username}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data: UserDetailsResponse = await response.json();
        return {
          id: data.keycloak_id || String(data.id),
          username: data.username,
          name: data.identity?.name || data.username,
          email: data.email?.address,
          avatar: data.avatar,
        };
      }
    } catch (error) {
      console.warn('Failed to fetch user details, using fallback:', error);
    }

    // Fallback if user details fetch fails
    return {
      id: '',
      username,
      name: username,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await fetch(`${this.baseUrl}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data: AuthResponse = await response.json();

    const tokens: AuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiryDate: new Date(Date.now() + data.expires_in * 1000),
    };

    // Update stored tokens
    const stored = this.getStoredAuth();
    if (stored) {
      this.saveAuth({ user: stored.user, tokens });
    }

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Ignore logout errors - we'll clear local state anyway
    }

    this.clearAuth();
  }

  getAccessToken(): string | null {
    const stored = this.getStoredAuth();
    return stored?.tokens.accessToken || null;
  }

  getRefreshToken(): string | null {
    const stored = this.getStoredAuth();
    return stored?.tokens.refreshToken || null;
  }

  getUser(): User | null {
    const stored = this.getStoredAuth();
    return stored?.user || null;
  }

  getTokens(): AuthTokens | null {
    const stored = this.getStoredAuth();
    return stored?.tokens || null;
  }

  isTokenExpired(): boolean {
    const stored = this.getStoredAuth();
    if (!stored?.tokens.expiryDate) return true;
    // Add 30 second buffer
    return new Date(stored.tokens.expiryDate).getTime() - 30000 < Date.now();
  }

  scheduleTokenRefresh(onRefresh: (tokens: AuthTokens) => void, onError: () => void): void {
    this.cancelTokenRefresh();

    const stored = this.getStoredAuth();
    if (!stored?.tokens.expiryDate) return;

    const expiryTime = new Date(stored.tokens.expiryDate).getTime();
    // Refresh 1 minute before expiry
    const refreshTime = expiryTime - 60000 - Date.now();

    if (refreshTime <= 0) {
      // Token already needs refresh
      this.refreshToken(stored.tokens.refreshToken)
        .then(onRefresh)
        .catch(onError);
      return;
    }

    this.refreshTimeout = setTimeout(async () => {
      const currentStored = this.getStoredAuth();
      if (!currentStored) return;

      try {
        const tokens = await this.refreshToken(currentStored.tokens.refreshToken);
        onRefresh(tokens);
        // Schedule next refresh
        this.scheduleTokenRefresh(onRefresh, onError);
      } catch {
        onError();
      }
    }, refreshTime);
  }

  cancelTokenRefresh(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  private getStoredAuth(): StoredAuth | null {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Convert expiryDate string back to Date
      if (parsed.tokens?.expiryDate) {
        parsed.tokens.expiryDate = new Date(parsed.tokens.expiryDate);
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private saveAuth(auth: StoredAuth): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  }

  private clearAuth(): void {
    this.cancelTokenRefresh();
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

// Singleton instance
let instance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!instance) {
    instance = new AuthService();
  }
  return instance;
}
