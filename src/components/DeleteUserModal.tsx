import { Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { usersService, type User } from '../services';

interface Props {
  user: User;
  onSuccess: (userId: string) => void;
  onClose: () => void;
}

export function DeleteUserModal({ user, onSuccess, onClose }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await usersService.delete(user.id);
      onSuccess(user.id);
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo desactivar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl sm:rounded-[40px] p-6 sm:p-10 w-full max-w-sm shadow-2xl space-y-6 text-center max-h-[90dvh] overflow-y-auto"
      >
        <div className="w-16 h-16 bg-brand-danger/10 rounded-3xl flex items-center justify-center mx-auto">
          <Trash2 size={28} className="text-brand-danger" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-900">¿Desactivar usuario?</h3>
          <p className="text-sm font-semibold text-slate-400">
            <span className="text-slate-700">{user.name}</span> perderá acceso al sistema. Esta acción puede revertirse.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-4 rounded-2xl font-bold bg-brand-danger text-white hover:bg-brand-dark transition-all disabled:opacity-60"
          >
            {loading ? 'Desactivando...' : 'Desactivar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
