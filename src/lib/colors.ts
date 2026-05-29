export const CATEGORY_COLORS: Record<string, string> = {
  'Tecnología':    'bg-blue-100 text-blue-700',
  'Ventas':        'bg-emerald-100 text-emerald-700',
  'Personal':      'bg-violet-100 text-violet-700',
  'Finanzas':      'bg-amber-100 text-amber-700',
  'Marketing':     'bg-pink-100 text-pink-700',
  'Operaciones':   'bg-orange-100 text-orange-700',
  'Legal':         'bg-red-100 text-red-700',
  'Administración':'bg-teal-100 text-teal-700',
};

const FALLBACK_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-cyan-100 text-cyan-700',
];

export function getCategoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  const hash = category.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

export const PIE_COLORS = [
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#F59E0B',
  '#EC4899',
  '#F97316',
  '#14B8A6',
  '#EF4444',
];
