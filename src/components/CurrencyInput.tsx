import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { formatMoneyInput,parseMoney } from '../lib/money';
import { cn } from '../lib/utils';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Amount field. `inputMode="decimal"` gets the numeric keypad on phones (a
 * plain text input shows the alphabetic keyboard), and the value is grouped on
 * blur so long figures stay readable. Parents keep the raw string and read the
 * number with `parseMoney`.
 */
export function CurrencyInput({ value, onChange, placeholder = '0,00', className, ...rest }: Props) {
  const { locale } = useSettings();
  const [focused, setFocused] = useState(false);

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={focused ? value : (value ? formatMoneyInput(value, locale) : '')}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        // Normalise "1.234,50 " → "1234.5" so what is submitted matches what is shown.
        const n = parseMoney(value, locale);
        if (!isNaN(n)) onChange(String(n));
      }}
      onChange={e => onChange(e.target.value)}
      className={cn(className)}
    />
  );
}
