import { api } from '../lib/api';

/**
 * `both` only exists on the original seed categories; new ones are always
 * income or expense.
 */
export type CategoryType = 'income' | 'expense' | 'both';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
}

export interface CreateCategoryInput {
  name: string;
  type: 'income' | 'expense';
}

export const categoriesService = {
  list: () => api.get<Category[]>('/categories'),
  create: (input: CreateCategoryInput) => api.post<Category>('/categories', input),
};
