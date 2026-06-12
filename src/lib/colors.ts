export const CATEGORY_COLORS: Record<string, string> = {
  'Tecnología':    'badge-green',
  'Ventas':        'badge-orange',
  'Personal':      'badge-gray',
  'Finanzas':      'badge-yellow',
  'Marketing':     'badge-orange',
  'Operaciones':   'badge-dark',
  'Legal':         'badge-dark',
  'Administración':'badge-green',
};

const FALLBACK_COLORS = [
  'badge-green',
  'badge-orange',
  'badge-yellow',
  'badge-dark',
  'badge-gray',
  'badge-orange',
  'badge-green',
  'badge-yellow',
];

export function getCategoryColor(category: string): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  const hash = category.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

export const PIE_COLORS = [
  '#7A9A01', // brand-primary
  '#D86018', // brand-accent
  '#F2A900', // brand-warning
  '#53565A', // brand-dark
  '#88898D', // brand-secondary
  '#38BDF8', // sky-400
  '#A78BFA', // violet-400
  '#F472B6', // pink-400
  '#2DD4BF', // teal-400
  '#FCD34D', // amber-300
];
