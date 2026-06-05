import { ChevronDown,Eye,History,ShieldCheck,UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect,useState } from 'react';
import { DeleteUserModal } from '../components/DeleteUserModal';
import { Skeleton,SkeletonCard } from '../components/Skeleton';
import { UserCard } from '../components/UserCard';
import { UserFormModal } from '../components/UserFormModal';
import { useSettings } from '../contexts/SettingsContext';
import { getStoredUser } from '../lib/api';
import { cn } from '../lib/utils';
import { settingsService,usersService,type ActivityLog,type Settings,type User } from '../services';

export function SettingsView() {
  const currentUser = getStoredUser();
  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMINISTRADOR';

  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Settings>({ baseCurrency: 'COP', autoExchangeRate: true });
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const { locale, refreshSettings } = useSettings();

  useEffect(() => {
    Promise.all([
      usersService.list(),
      settingsService.get(),
      settingsService.getActivityLogs(),
    ]).then(([u, s, l]) => {
      setUsers(u);
      setSettings(s);
      setLogs(l);
    })
    .catch(() => setError('No se pudo cargar la configuración.'))
    .finally(() => setIsLoading(false));
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updated = await settingsService.update(settings);
      setSettings(updated);
      refreshSettings();
    } finally {
      setSaving(false);
    }
  };


  if (error) return <div className="p-8 text-brand-danger font-semibold">{error}</div>;
  if (isLoading) {
    return <div className="p-8 space-y-8"><Skeleton className="h-10 w-48" /><SkeletonCard /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 pb-12">
      <div className="space-y-1">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Configuración</h1>
        <p className="text-slate-500 font-semibold tracking-tight text-lg">Gestiona usuarios, moneda base y auditoría de actividad.</p>
      </div>

      <div className={cn("grid grid-cols-1 gap-10", isAdmin ? "lg:grid-cols-3" : "lg:grid-cols-1 max-w-lg")}>
        {isAdmin && (
        <div className="lg:col-span-2 bg-white p-5 sm:p-10 rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow space-y-10">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-brand-primary tracking-tight">Gestión de Usuarios</h3>
              <p className="text-sm font-semibold text-slate-400">Controla quién tiene acceso a los estados financieros.</p>
            </div>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 bg-brand-success text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-brand-success/20"
            >
              <UserPlus size={20} /><span>Añadir Usuario</span>
            </button>
          </div>
          <div className="space-y-4">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                currentUserId={currentUser?.id}
                onEdit={setEditingUser}
                onDelete={setConfirmDelete}
              />
            ))}
          </div>

          {showAddUser && (
            <UserFormModal
              mode="create"
              onSuccess={user => setUsers(u => [...u, user])}
              onClose={() => setShowAddUser(false)}
            />
          )}
          {editingUser && (
            <UserFormModal
              mode="edit"
              user={editingUser}
              onSuccess={updated => setUsers(u => u.map(x => x.id === updated.id ? updated : x))}
              onClose={() => setEditingUser(null)}
            />
          )}
          {confirmDelete && (
            <DeleteUserModal
              user={confirmDelete}
              onSuccess={id => setUsers(u => u.filter(x => x.id !== id))}
              onClose={() => setConfirmDelete(null)}
            />
          )}
        </div>
        )}

        <div className="space-y-10">
          <div className="bg-white p-5 sm:p-10 rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow space-y-8">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Preferencias de Moneda</h3>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">MONEDA BASE DEL SISTEMA</label>
                <div className="relative group">
                  <select
                    value={settings.baseCurrency}
                    onChange={e => setSettings(s => ({ ...s, baseCurrency: e.target.value }))}
                    className="w-full pl-5 pr-12 py-5 bg-slate-50 border border-slate-100 rounded-[28px] font-bold text-slate-700 appearance-none outline-none focus:border-brand-primary transition-all"
                  >
                    <option value="USD">USD - Dólar Estadounidense</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="CLP">CLP - Peso Chileno</option>
                    <option value="MXN">MXN - Peso Mexicano</option>
                    <option value="COP">COP - Peso Colombiano</option>
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex items-center justify-between p-1">
                <div className="space-y-0.5">
                  <p className="text-sm font-black text-slate-900">Actualización automática</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">tipo de cambio</p>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, autoExchangeRate: !s.autoExchangeRate }))}
                  className={cn("w-14 h-8 rounded-full p-1 relative cursor-pointer shadow-inner transition-colors", settings.autoExchangeRate ? "bg-brand-success shadow-green-700/20" : "bg-slate-200")}
                >
                  <div className={cn("w-6 h-6 bg-white rounded-full shadow-lg transition-all", settings.autoExchangeRate ? "translate-x-6" : "translate-x-0")} />
                </button>
              </div>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-accent transition-all shadow-xl shadow-brand-primary/20 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar Preferencias'}
            </button>
          </div>

          <div className="bg-brand-primary/5 border border-brand-primary/10 p-8 rounded-[40px] text-center space-y-4">
            <div className="w-14 h-14 bg-brand-primary text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-brand-primary/20">
              <ShieldCheck size={28} />
            </div>
            <h4 className="text-xl font-black text-brand-primary tracking-tight">Seguridad de Grado Bancario</h4>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">Intexa ArCa utiliza encriptación AES-256 para asegurar todos tus datos financieros.</p>
          </div>
        </div>
      </div>

      {isAdmin && (
      <div className="bg-white p-5 sm:p-12 rounded-3xl sm:rounded-[56px] border border-slate-100 card-shadow space-y-10">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <History className="text-brand-primary" size={28} />
            Logs de Actividad Reciente
          </h3>
          <button className="text-sm font-black text-slate-400 hover:text-brand-primary transition-colors border-b-2 border-transparent hover:border-brand-primary">Ver historial completo</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 rounded-2xl">
                {['USUARIO', 'ACCIÓN', 'MÓDULO', 'FECHA Y HORA', 'DETALLES'].map(h => (
                  <th key={h} className={cn("px-4 sm:px-10 py-3 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest", (h === 'MÓDULO' || h === 'FECHA Y HORA') && 'hidden sm:table-cell', h === 'DETALLES' && 'text-right')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 sm:px-10 py-4 sm:py-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xs font-black text-slate-600 group-hover:bg-brand-primary group-hover:text-white transition-colors">{log.initial}</div>
                      <span className="text-base font-black text-slate-900">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-10 py-4 sm:py-8">
                    <span className={cn("text-[10px] font-black px-3 py-1.5 rounded-lg text-white uppercase tracking-widest", log.color)}>{log.action}</span>
                  </td>
                  <td className="hidden sm:table-cell px-4 sm:px-10 py-4 sm:py-8 text-base font-bold text-slate-500">{log.module}</td>
                  <td className="hidden sm:table-cell px-4 sm:px-10 py-4 sm:py-8 text-base font-bold text-slate-500">
                    {new Date(log.timestamp).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 sm:px-10 py-4 sm:py-8 text-right">
                    <button className="p-3 text-slate-300 hover:text-brand-primary hover:bg-brand-primary/10 rounded-2xl transition-all">
                      <Eye size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </motion.div>
  );
}
