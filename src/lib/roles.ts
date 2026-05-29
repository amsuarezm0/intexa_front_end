export function canWrite(role?: string | null): boolean {
  const r = role?.toUpperCase();
  return r === 'ADMINISTRADOR' || r === 'TESORERÍA';
}

export function isAdmin(role?: string | null): boolean {
  return role?.toUpperCase() === 'ADMINISTRADOR';
}

export function isTreasury(role?: string | null): boolean {
  return role?.toUpperCase() === 'TESORERÍA';
}
