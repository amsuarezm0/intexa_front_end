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
  '#7A9A01', // brand-success (PANTONE 377 C)
  '#D86018', // brand-accent  (PANTONE 1595 C)
  '#F2A900', // brand-warning (PANTONE 130 C)
  '#53565A', // brand-primary (PANTONE Cool Gray 11 C)
  '#88898D', // brand-secondary (PANTONE Cool Gray 8 C)
  '#38BDF8', // sky-400
  '#A78BFA', // violet-400
  '#F472B6', // pink-400
  '#2DD4BF', // teal-400
  '#FCD34D', // amber-300
];
