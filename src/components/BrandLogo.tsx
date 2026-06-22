import { THEMES, useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

interface BrandLogoProps {
  /** Extra classes — typically a height utility (e.g. "h-8"). Width stays auto. */
  className?: string;
}

/**
 * Renders the Intexa logo variant that matches the active theme's palette:
 * full-colour grey wordmark on the default light theme, the monochrome
 * orange/green/amber wordmarks on their respective themes, and the
 * white-lettered logo on the dark "noche" theme.
 */
export function BrandLogo({ className }: BrandLogoProps) {
  const { theme } = useTheme();
  const meta = THEMES.find(t => t.id === theme) ?? THEMES[0];

  return (
    <img
      src={meta.logo}
      alt="Intexa Ingeniería"
      title="Intexa ArCa"
      className={cn('w-auto select-none', className)}
      draggable={false}
    />
  );
}
