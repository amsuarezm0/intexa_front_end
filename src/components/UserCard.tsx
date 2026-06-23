import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import type { User } from '../services';

interface Props {
  user: User;
  currentUserId?: string;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

function roleColor(role: string) {
  if (role === 'ADMINISTRADOR') return 'bg-brand-primary/10 text-brand-primary';
  if (role === 'TESORERÍA') return 'bg-brand-success/10 text-brand-success';
  return 'bg-slate-100 text-slate-500';
}

export function UserCard({ user, currentUserId, onEdit, onDelete }: Props) {
  return (
    <div className="flex items-center justify-between p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-[32px] group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 rounded-[20px] bg-brand-primary/10 text-brand-primary font-black text-xl flex items-center justify-center">
          {user.name.charAt(0)}
        </div>
        <div>
          <p className="text-lg font-black text-slate-900 group-hover:text-brand-primary transition-colors">{user.name}</p>
          <p className="text-sm font-semibold text-slate-400">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={cn('text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest', roleColor(user.role))}>
          {user.role}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(user)}
            className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all"
            title={user.id === currentUserId ? 'Editar mi cuenta' : 'Editar usuario'}
          >
            <Pencil size={16} />
          </button>
          {user.id !== currentUserId && (
            <button
              onClick={() => onDelete(user)}
              className="p-2 text-slate-400 hover:text-brand-danger hover:bg-brand-danger/10 rounded-xl transition-all"
              title="Desactivar usuario"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
