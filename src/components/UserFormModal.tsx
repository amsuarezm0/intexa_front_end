import { ChevronDown, Eye, EyeOff, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { hashPassword } from '../lib/utils';
import { usersService, type User } from '../services';

const ROLES = ['ADMINISTRADOR', 'TESORERÍA', 'CONSULTA'];

const inputCls =
  'w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none font-semibold';
const btnSecondary =
  'flex-1 py-4 rounded-2xl font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all';
const btnPrimary =
  'flex-1 py-4 rounded-2xl font-bold bg-brand-primary text-white hover:bg-brand-accent transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-60';

interface CreateProps {
  mode: 'create';
  onSuccess: (user: User) => void;
  onClose: () => void;
}

interface EditProps {
  mode: 'edit';
  user: User;
  onSuccess: (user: User) => void;
  onClose: () => void;
}

type Props = CreateProps | EditProps;

export function UserFormModal(props: Props) {
  const isEdit = props.mode === 'edit';
  const initial = isEdit
    ? { name: props.user.name, email: '', password: '', role: props.user.role }
    : { name: '', email: '', password: '', role: 'CONSULTA' };

  const [form, setForm] = useState(initial);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        const updated = await usersService.update(props.user.id, {
          name: form.name,
          role: form.role,
        });
        props.onSuccess({ ...props.user, ...updated });
      } else {
        const hashed = await hashPassword(form.password);
        const created = await usersService.create({
          name: form.name,
          email: form.email,
          role: form.role,
          password: hashed,
        });
        props.onSuccess(created);
      }
      props.onClose();
    } catch (err: any) {
      setError(err.message ?? 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={props.onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-[40px] p-8 sm:p-12 w-full max-w-md shadow-2xl space-y-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h3>
            {isEdit && (
              <p className="text-sm font-semibold text-slate-400 mt-1">{props.user.email}</p>
            )}
          </div>
          <button onClick={props.onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm font-semibold px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre</label>
            <input type="text" required value={form.name} onChange={set('name')} className={inputCls} />
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Correo electrónico</label>
              <input type="email" required value={form.email} onChange={set('email')} className={inputCls} />
            </div>
          )}

          {!isEdit && (
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={set('password')}
                  className={`${inputCls} pr-14`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Rol</label>
            <div className="relative">
              <select value={form.role} onChange={set('role')} className={`${inputCls} pl-5 pr-12 appearance-none`}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={props.onClose} className={btnSecondary}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading
                ? isEdit ? 'Guardando...' : 'Creando...'
                : isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
