export interface AuthUser {
  uid: string;
  email?: string;
  isAdmin: boolean;
}

export interface ApiError {
  error: string;
}
