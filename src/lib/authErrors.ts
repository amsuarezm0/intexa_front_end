// Maps raw backend/MSAL auth errors to friendly Spanish messages shown on the
// login screen. Unknown messages fall back to a generic line so we never leak
// internal text or show a blank error.
export function friendlyAuthError(raw?: string): string {
  const msg = (raw ?? '').toLowerCase();

  if (msg.includes('invalid credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (msg.includes('not authorised') || msg.includes('not authorized') || msg.includes('domain')) {
    return 'Esta cuenta no pertenece a un dominio autorizado para esta aplicación.';
  }
  if (msg.includes('no email')) {
    return 'Tu cuenta de Microsoft no tiene un correo asociado.';
  }
  if (msg.includes('microsoft token') || msg.includes('token expired') || msg.includes('invalid token')) {
    return 'No se pudo validar tu cuenta de Microsoft. Intenta de nuevo.';
  }
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
  }
  return raw && raw.trim() ? raw : 'No se pudo iniciar sesión. Intenta de nuevo.';
}
