import { api } from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export const usersService = {
  list: () => api.get<User[]>('/users'),
  create: (body: Omit<User, 'id' | 'createdAt'> & { password?: string }) =>
    api.post<User>('/users', body),
  update: (id: string, body: Partial<User>) => api.put<User>(`/users/${id}`, body),
  delete: (id: string) => api.del<{ message: string }>(`/users/${id}`),
};
