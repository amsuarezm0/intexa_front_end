import { Building2, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import type { ThirdParty } from '../services';

interface Props {
  thirdParty?: ThirdParty | null;
  /** `compact` is the table form: no icon, and the name wraps to two lines
   *  rather than being cut at one — legal names run long ("Comercializadora
   *  Internacional de Textiles S.A.S."), and a single truncated line hides the
   *  part that tells two third parties apart. */
  compact?: boolean;
  className?: string;
}

/**
 * Shows the counterparty of a document and links to it in Clientes.
 *
 * Siigo's document payloads carry no name, only an identification, so a third
 * party that has not been synced yet resolves to a key without a name. That
 * still renders — as the identification — because a NIT is more useful than an
 * empty cell; it just isn't a link, since there is nothing to link to.
 */
export function ThirdPartyLink({ thirdParty, compact, className }: Props) {
  if (!thirdParty?.identification && !thirdParty?.name) {
    return <span className={cn('text-slate-300 font-semibold', className)}>—</span>;
  }

  const label = thirdParty.name || thirdParty.identification || '—';
  const title = thirdParty.name
    ? `${thirdParty.name} · ${thirdParty.identification ?? ''}`
    : `Tercero ${thirdParty.identification} — aún no sincronizado en Clientes`;

  const body = (
    <span className={cn('inline-flex gap-1.5 min-w-0', compact ? 'items-start' : 'items-center', className)}>
      {!compact && (thirdParty.type === 'Proveedor'
        ? <User size={14} className="text-slate-400 shrink-0" />
        : <Building2 size={14} className="text-slate-400 shrink-0" />)}
      <span className={cn(
        'min-w-0',
        // Two lines, then ellipsis — the full name is always on the tooltip.
        compact ? 'line-clamp-2 break-words leading-snug' : 'truncate',
        !thirdParty.name && 'font-mono text-slate-400',
      )}>{label}</span>
    </span>
  );

  if (!thirdParty.customerId) {
    return <span title={title} className="text-slate-500 font-semibold">{body}</span>;
  }

  return (
    <Link
      to={`/clients?client=${thirdParty.customerId}`}
      onClick={e => e.stopPropagation()}
      title={title}
      className="font-semibold text-slate-600 hover:text-brand-primary hover:underline transition-colors"
    >
      {body}
    </Link>
  );
}
