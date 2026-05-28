import { api } from '../lib/api';
import { signInWithMicrosoft } from '../lib/msal';
import { hashPassword } from '../lib/utils';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export const authService = {
  login: async (email: string, password: string) => {
    const hashedPassword = await hashPassword(password);
    return api.post<LoginResponse>('/auth/login', { email, password: hashedPassword });
  },

  loginWithMicrosoft: async (): Promise<LoginResponse> => {
    const result = await signInWithMicrosoft();
    return api.post<LoginResponse>('/auth/microsoft', { idToken: result.idToken });
  },

  logout: () => api.post<void>('/auth/logout', {}),
};
