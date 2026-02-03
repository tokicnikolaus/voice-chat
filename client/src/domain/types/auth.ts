export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate: Date;
}
