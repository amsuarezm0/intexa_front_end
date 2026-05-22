import { api } from '../lib/api';

export interface Category {
  id: string;
  name: string;
}

export const categoriesService = {
  list: () => api.get<Category[]>('/categories'),
};
