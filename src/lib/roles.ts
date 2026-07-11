// canWrite covers movements (manual transactions, bank balance) and Siigo sync.
export function canWrite(role?: string | null): boolean {
  const r = role?.toUpperCase();
  return r === 'ADMINISTRADOR' || r === 'TESORERÍA';
}

// canWriteProjections covers creating projections only.
export function canWriteProjections(role?: string | null): boolean {
  const r = role?.toUpperCase();
  return r === 'ADMINISTRADOR' || r === 'GESTIÓN';
}

export function isAdmin(role?: string | null): boolean {
  return role?.toUpperCase() === 'ADMINISTRADOR';
}

export function isTreasury(role?: string | null): boolean {
  return role?.toUpperCase() === 'TESORERÍA';
}

export function isManagement(role?: string | null): boolean {
  return role?.toUpperCase() === 'GESTIÓN';
}

// Human-friendly display names for the stored (uppercase) role values. The
// stored value is the source of truth — this map only affects presentation.
export const ROLE_LABELS: Record<string, string> = {
  'ADMINISTRADOR': 'Administrador',
  'TESORERÍA': 'Tesorero',
  'GESTIÓN': 'Gestión/Control',
  'CONSULTA': 'Consultor',
};

export function roleLabel(role?: string | null): string {
  if (!role) return '';
  return ROLE_LABELS[role.toUpperCase()] ?? role;
}
