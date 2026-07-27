/**
 * Amount parsing that survives both Colombian (1.234,56) and English
 * (1,234.56) typing habits. `parseFloat(s.replace(/,/g, '.'))` — the previous
 * approach — silently read "1.234,56" as 1.234, a 1000x error on a treasury
 * record, so every separator is resolved explicitly here.
 */

interface Separators {
  decimal: string;
  group: string;
}

function separatorsFor(locale: string): Separators {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return {
    decimal: parts.find(p => p.type === 'decimal')?.value ?? '.',
    group: parts.find(p => p.type === 'group')?.value ?? ',',
  };
}

/**
 * Reads a typed amount. Returns NaN when the input holds no digits, so callers
 * can tell "empty/invalid" from a legitimate 0.
 *
 * Resolution order: with both separators present the rightmost is the decimal
 * point. With one separator repeated it is grouping. With one separator once,
 * a 3-digit tail is ambiguous ("1.234") and the locale decides; any other tail
 * length ("1.2", "1.2345") can only be a decimal point.
 */
export function parseMoney(input: string, locale = 'es-CO'): number {
  const raw = String(input).trim();
  if (!raw) return NaN;

  const negative = /^-/.test(raw) || /^\(.*\)$/.test(raw);
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!/\d/.test(cleaned)) return NaN;

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  let decimalSep = '';

  if (lastDot !== -1 && lastComma !== -1) {
    decimalSep = lastDot > lastComma ? '.' : ',';
  } else if (lastDot !== -1 || lastComma !== -1) {
    const sep = lastDot !== -1 ? '.' : ',';
    const occurrences = cleaned.split(sep).length - 1;
    const tail = cleaned.slice(cleaned.lastIndexOf(sep) + 1);
    if (occurrences > 1) {
      decimalSep = '';
    } else if (tail.length === 3) {
      decimalSep = separatorsFor(locale).decimal === sep ? sep : '';
    } else {
      decimalSep = sep;
    }
  }

  const digitsOnly = decimalSep
    ? cleaned.slice(0, cleaned.lastIndexOf(decimalSep)).replace(/[.,]/g, '') +
      '.' +
      cleaned.slice(cleaned.lastIndexOf(decimalSep) + 1).replace(/[.,]/g, '')
    : cleaned.replace(/[.,]/g, '');

  const value = parseFloat(digitsOnly);
  if (isNaN(value)) return NaN;
  return negative ? -value : value;
}

/** Groups the integer part for display, preserving what the user is typing. */
export function formatMoneyInput(input: string, locale = 'es-CO'): string {
  const value = parseMoney(input, locale);
  if (isNaN(value)) return input;
  const { decimal } = separatorsFor(locale);
  const typedDecimals = String(input).match(/[.,](\d*)$/)?.[1];
  const fraction = typedDecimals === undefined
    ? (String(value).split('.')[1]?.length ?? 0)
    : typedDecimals.length;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: Math.min(fraction, 2),
    maximumFractionDigits: 2,
  }).format(value) + (typedDecimals === '' ? decimal : '');
}
