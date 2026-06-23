import { Check,ChevronDown,History,KeyRound,Palette,ShieldCheck,UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect,useRef,useState } from 'react';
import { DeleteUserModal } from '../components/DeleteUserModal';
import { LogDetailModal } from '../components/LogDetailModal';
import { LogRow } from '../components/LogRow';
import { Pagination } from '../components/Pagination';
import { Skeleton,SkeletonCard } from '../components/Skeleton';
import { UserCard } from '../components/UserCard';
import { UserFormModal } from '../components/UserFormModal';
import { useSettings } from '../contexts/SettingsContext';
import { THEMES, useTheme, type ThemeId } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { getStoredUser } from '../lib/api';
import { cn } from '../lib/utils';
import { settingsService,usersService,type ActivityLog,type Settings,type User } from '../services';

export function SettingsView() {
  const currentUser = getStoredUser();
  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMINISTRADOR';

  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Settings>({ baseCurrency: 'COP', autoExchangeRate: true, theme: 'predeterminado' });
  // Last settings persisted to the server. Theme changes merge onto this so they
  // never prematurely save the staged (unsaved) currency edits in `settings`.
  const savedRef = useRef<Settings>(settings);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showSelfPassword, setShowSelfPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [logPage, setLogPage] = useState(1);
  const LOG_PAGE_SIZE = 10;
  const { locale, refreshSettings } = useSettings();

  useEffect(() => {
    let active = true;

    // Build the request list according to the current role so we never issue a
    // request the role isn't allowed to make. Each task handles its own outcome,
    // so the combined Promise.all always resolves.
    const tasks: Promise<void>[] = [
      // Settings (currency/theme) are available to every role.
      settingsService.get()
        .then(s => { if (active) { setSettings(s); savedRef.current = s; } })
        .catch((err: any) => { if (active) setError(err.message ?? 'No se pudo cargar la configuración.'); }),
    ];

    // User management and activity logs are ADMINISTRADOR-only on the API.
    if (isAdmin) {
      tasks.push(
        usersService.list().then(u => { if (active) setUsers(u); }).catch(() => {}),
        settingsService.getActivityLogs().then(l => { if (active) setLogs(l); }).catch(() => {}),
      );
    }

    Promise.all(tasks).finally(() => { if (active) setIsLoading(false); });

    return () => { active = false; };
  }, [isAdmin]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updated = await settingsService.update({ ...settings, theme });
      setSettings(updated);
      savedRef.current = updated;
      refreshSettings();
    } catch (err: any) {
      toast.error(err.message ?? 'Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  // Theme changes apply instantly and persist (merged onto the last saved
  // settings so staged currency edits are left untouched). Settings updates
  // are not recorded in the activity log.
  const handleSelectTheme = async (id: ThemeId) => {
    const previous = theme;
    setTheme(id);
    try {
      const updated = await settingsService.update({ ...savedRef.current, theme: id });
      savedRef.current = updated;
      setSettings(s => ({ ...s, theme: id }));
    } catch (err: any) {
      setTheme(previous); // revert UI if the server rejected it
      toast.error(err.message ?? 'No se pudo guardar el tema.');
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
              className="flex items-center gap-2 bg-brand-success text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand-success/20"
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
              isSelf={editingUser.id === currentUser?.id}
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
          {!isAdmin && currentUser && (
            <div className="bg-white p-5 sm:p-10 rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow space-y-6">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Mi Cuenta</h3>
              <div className="flex items-center gap-5 p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-[32px]">
                <div className="w-14 h-14 rounded-[20px] bg-brand-primary/10 text-brand-primary font-black text-xl flex items-center justify-center flex-shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-black text-slate-900 truncate">{currentUser.name}</p>
                  <p className="text-sm font-semibold text-slate-400 truncate">{currentUser.email}</p>
                  <span className="inline-block mt-1.5 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest bg-slate-100 text-slate-500">
                    {currentUser.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowSelfPassword(true)}
                className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-accent transition-all shadow-xl shadow-brand-primary/20"
              >
                <KeyRound size={16} /><span>Cambiar contraseña</span>
              </button>
            </div>
          )}

          {showSelfPassword && currentUser && (
            <UserFormModal
              mode="edit"
              user={{ ...currentUser, createdAt: '' }}
              isSelf
              onSuccess={() => {}}
              onClose={() => setShowSelfPassword(false)}
            />
          )}

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
                  className={cn("w-14 h-8 rounded-full p-1 relative cursor-pointer shadow-inner transition-colors", settings.autoExchangeRate ? "bg-brand-success shadow-brand-success/20" : "bg-slate-200")}
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

          <div className="bg-white p-5 sm:p-8 rounded-3xl sm:rounded-[48px] border border-slate-100 card-shadow space-y-6">
            <div className="flex items-center gap-3">
              <Palette size={22} className="text-brand-primary" />
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Apariencia</h3>
            </div>
            <div className="space-y-2">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTheme(t.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                    theme === t.id
                      ? "border-brand-primary bg-brand-primary/5"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50/50"
                  )}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden border border-black/10 flex flex-col shadow-sm">
                    <div style={{ backgroundColor: t.bg }} className="flex-1" />
                    <div className="flex h-3">
                      <div style={{ backgroundColor: t.primary }} className="flex-1" />
                      <div style={{ backgroundColor: t.accent }} className="flex-1" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-900 tracking-tight">{t.label}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.dark ? 'Oscuro' : 'Claro'}</p>
                  </div>
                  {theme === t.id && (
                    <div className="w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
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
        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4">
          <History className="text-brand-primary" size={28} />
          Logs de Actividad Reciente
        </h3>
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
              {logs.slice((logPage - 1) * LOG_PAGE_SIZE, logPage * LOG_PAGE_SIZE).map((log) => (
                <LogRow key={log.id} log={log} locale={locale} onSelect={setSelectedLog} />
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={logPage}
          totalPages={Math.ceil(logs.length / LOG_PAGE_SIZE)}
          total={logs.length}
          pageSize={LOG_PAGE_SIZE}
          onPage={setLogPage}
          label="registros"
        />
      </div>
      )}

      {selectedLog && (
        <LogDetailModal log={selectedLog} locale={locale} onClose={() => setSelectedLog(null)} />
      )}
    </motion.div>
  );
}
