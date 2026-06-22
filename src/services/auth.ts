import { api } from '../lib/api';
import { completeMicrosoftRedirect,signInWithMicrosoft } from '../lib/msal';
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

  // Kicks off the redirect; the page navigates away and never returns here.
  loginWithMicrosoft: async (): Promise<void> => {
    await signInWithMicrosoft();
  },

  // Run on app startup: completes the login if we just returned from Microsoft.
  completeMicrosoftLogin: async (): Promise<LoginResponse | null> => {
    const result = await completeMicrosoftRedirect();
    if (!result) return null;
    return api.post<LoginResponse>('/auth/microsoft', { idToken: result.idToken });
  },

  logout: () => api.post<void>('/auth/logout', {}),
};
