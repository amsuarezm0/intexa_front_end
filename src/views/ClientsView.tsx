import {
AlertTriangle,
Building2,
CheckCircle2,
Download,
RefreshCw,
Search,
User,
Users,
Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import type { LoggedInUser } from '../App';
import { CustomerDetailDrawer } from '../components/CustomerDetailDrawer';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Pagination } from '../components/Pagination';
import { Skeleton,SkeletonCard } from '../components/Skeleton';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { toInt,useQueryState } from '../hooks/useQueryState';
import { canWrite } from '../lib/roles';
import { cn } from '../lib/utils';
import {
customersService,
type Customer,
type CustomerDetail,
type CustomerListParams,
type CustomerSummary,
} from '../services';

const PAGE_SIZE = 10;

const TYPE_TABS = [
  { value: 'Cliente',   label: 'Clientes' },
  { value: 'Proveedor', label: 'Proveedores' },
  { value: 'Otro',      label: 'Otros' },
  { value: 'all',       label: 'Todos' },
] as const;

const SORT_OPTIONS = [
  { value: 'name',     label: 'Nombre (A-Z)' },
  { value: 'pending',  label: 'Mayor saldo pendiente' },
  { value: 'invoiced', label: 'Mayor facturación' },
  { value: 'recent',   label: 'Factura más reciente' },
] as const;

// ExcelJS is ~1 MB and only ever runs behind the Export button, so it is
// fetched on the click rather than shipped with the view.
async function exportXLSX(customers: Customer[], formatCurrency: (n: number) => string) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Clientes');

  ws.columns = [
    { header: 'Identificación', key: 'identification', width: 18 },
    { header: 'Nombre',         key: 'name',           width: 42 },
    { header: 'Nombre comercial', key: 'commercialName', width: 32 },
    { header: 'Tipo',           key: 'type',           width: 14 },
    { header: 'Correo',         key: 'email',          width: 32 },
    { header: 'Teléfono',       key: 'phone',          width: 18 },
    { header: 'Ciudad',         key: 'city',           width: 20 },
    { header: 'Facturas',       key: 'invoiceCount',   width: 12 },
    { header: 'Total facturado', key: 'totalInvoiced', width: 20 },
    { header: 'Saldo pendiente', key: 'pendingBalance', width: 20 },
    { header: 'Última factura', key: 'lastInvoiceDate', width: 16 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  customers.forEach(c => {
    ws.addRow({
      identification: c.checkDigit ? `${c.identification}-${c.checkDigit}` : c.identification,
      name: c.name,
      commercialName: c.commercialName ?? '',
      type: c.type,
      email: c.email ?? '',
      phone: c.phone ?? '',
      city: c.city ?? '',
      invoiceCount: c.invoiceCount,
      totalInvoiced: formatCurrency(c.totalInvoiced),
      pendingBalance: formatCurrency(c.pendingBalance),
      lastInvoiceDate: c.lastInvoiceDate ?? '',
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clientes_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ClientsView({ user }: { user?: LoggedInUser | null }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // The list lives in the URL, so a filtered page — or an open client — can be
  // copied out of the address bar and shared as-is.
  const [query, setQuery] = useQueryState({
    q: '', page: '1', type: 'Cliente', sort: 'name', debt: '', client: '',
  });
  const page = toInt(query.page, 1);
  const search = query.q;
  const typeFilter = query.type;
  const sortBy = query.sort;
  const onlyWithDebt = query.debt === 'true';

  const [searchInput, setSearchInput] = useState(search);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const { formatCurrency, formatCompact } = useSettings();
  const toast = useToast();

  const listParams = useMemo<CustomerListParams>(() => ({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    type: typeFilter as CustomerListParams['type'],
    sort: sortBy as CustomerListParams['sort'],
    withBalance: onlyWithDebt || undefined,
  }), [page, search, typeFilter, sortBy, onlyWithDebt]);

  const fetchSummary = useCallback(async () => {
    try {
      setSummary(await customersService.summary());
    } catch { /* the table is the point; the strip can stay blank */ }
  }, []);

  const fetchData = useCallback(async (initial = false) => {
    if (initial) setIsInitialLoading(true);
    else setIsFetching(true);
    setError('');
    try {
      const res = await customersService.list(listParams);
      setCustomers(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err.message ?? 'No se pudo cargar los clientes.');
    } finally {
      setIsInitialLoading(false);
      setIsFetching(false);
    }
  }, [listParams]);

  const hasFetched = useRef(false);
  useEffect(() => {
    const initial = !hasFetched.current;
    hasFetched.current = true;
    if (initial) fetchSummary();
    fetchData(initial);
  }, [fetchData, fetchSummary]);

  // Follow the URL when it changes from outside the box (Back, or a shared link).
  useEffect(() => { setSearchInput(search); }, [search]);

  // `?client=` is what opens the drawer, so a client can be linked to directly.
  const openClient = (c: Customer) => setQuery({ client: c.id });
  const closeClient = () => setQuery({ client: '' });

  useEffect(() => {
    if (!query.client) { setDetail(null); return; }
    if (detail?.customer.id === query.client) return;
    setIsLoadingDetail(true);
    customersService.get(query.client)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setIsLoadingDetail(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.client]);

  async function handleSync() {
    if (syncState === 'loading') return;
    setSyncState('loading');
    try {
      const res = await customersService.sync();
      await Promise.all([fetchData(), fetchSummary()]);
      if ((res.errors?.length ?? 0) > 0) {
        toast.error(`Sincronización parcial: ${res.errors!.length} página(s) con error. ${res.imported} nuevos, ${res.updated} actualizados.`);
        setSyncState('error');
      } else {
        toast.success(`${res.imported} nuevos · ${res.updated} actualizados`);
        setSyncState('success');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo sincronizar los clientes.');
      setSyncState('error');
    } finally {
      setTimeout(() => setSyncState('idle'), 3000);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await customersService.list({ ...listParams, page: 1, limit: 9999 });
      await exportXLSX(res.data, formatCurrency);
    } catch (err: any) {
      toast.error(err.message ?? 'Error al exportar los clientes.');
    } finally {
      setIsExporting(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => { fetchSummary(); return fetchData(true); }} />;
  if (isInitialLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-3"><Skeleton className="h-10 w-24 rounded-lg" /><Skeleton className="h-10 w-24 rounded-lg" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 h-96"><Skeleton className="h-full w-full" /></div>
      </div>
    );
  }

  const fmt = (n: number) => formatCompact(Math.abs(n));

  return (
    <>
    <CustomerDetailDrawer detail={detail} isLoading={isLoadingDetail} onClose={closeClient} />

    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clientes</h1>
          <p className="text-slate-500 font-medium tracking-tight">
            Terceros sincronizados desde Siigo, con su cartera al día.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-60"
          >
            <Download size={18} />
            <span>{isExporting ? 'Exportando...' : 'Exportar'}</span>
          </button>
          {canWrite(user?.role) && (
            <button
              onClick={handleSync}
              disabled={syncState === 'loading'}
              title="Traer los terceros más recientes desde Siigo"
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all disabled:cursor-not-allowed',
                syncState === 'success' ? 'bg-brand-success/10 text-brand-success'
                  : syncState === 'error' ? 'bg-brand-danger/10 text-brand-danger'
                  : 'bg-brand-primary/10 text-brand-primary hover:brightness-90',
                syncState === 'loading' && 'opacity-70',
              )}
            >
              {syncState === 'success' ? <CheckCircle2 size={18} />
                : syncState === 'error' ? <AlertTriangle size={18} />
                : <RefreshCw size={18} className={cn(syncState === 'loading' && 'animate-spin')} />}
              <span>
                {syncState === 'loading' ? 'Sincronizando...'
                  : syncState === 'success' ? 'Sincronizado'
                  : syncState === 'error' ? 'Error'
                  : 'Sincronizar'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 card-shadow flex justify-between items-center cursor-default">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CLIENTES ACTIVOS</p>
            <p className="text-2xl font-bold text-slate-900">{summary?.customers ?? 0}</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              {summary?.suppliers ?? 0} proveedores · {summary?.others ?? 0} otros
            </p>
          </div>
          <div className="p-4 rounded-[20px] bg-slate-100 text-brand-primary">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 card-shadow flex justify-between items-center cursor-default">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CARTERA POR COBRAR</p>
            <p className="text-2xl font-bold text-brand-danger" title={formatCurrency(summary?.totalPendingBalance ?? 0)}>
              {fmt(summary?.totalPendingBalance ?? 0)}
            </p>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              {summary?.customersWithDebt ?? 0} cliente{summary?.customersWithDebt === 1 ? '' : 's'} con saldo
            </p>
          </div>
          <div className="p-4 rounded-[20px] bg-brand-danger/10 text-brand-danger">
            <Wallet size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 card-shadow flex justify-between items-center cursor-default">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">TOTAL FACTURADO</p>
            <p className="text-2xl font-bold text-brand-success" title={formatCurrency(summary?.totalInvoiced ?? 0)}>
              {fmt(summary?.totalInvoiced ?? 0)}
            </p>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Histórico sincronizado</p>
          </div>
          <div className="p-4 rounded-[20px] bg-brand-success/10 text-brand-success">
            <Building2 size={24} />
          </div>
        </div>
      </div>

      <div className={cn('bg-white rounded-3xl sm:rounded-[40px] border border-slate-100 card-shadow overflow-hidden transition-opacity', isFetching && 'opacity-60 pointer-events-none')}>
        {/* Búsqueda + filtros */}
        <div className="p-4 sm:p-8 border-b border-slate-100 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={e => { e.preventDefault(); setQuery({ q: searchInput, page: '1' }); }} className="flex items-center">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Nombre, NIT, correo..."
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-l-xl text-sm focus:border-brand-primary outline-none transition-all w-48 sm:w-64"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-brand-primary text-white text-sm font-bold rounded-r-xl hover:bg-brand-accent transition-colors border border-brand-primary"
              >
                Buscar
              </button>
            </form>

            <button
              onClick={() => setQuery({ debt: onlyWithDebt ? '' : 'true', page: '1' })}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors shrink-0',
                onlyWithDebt
                  ? 'bg-brand-danger text-white shadow-md shadow-brand-danger/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              <Wallet size={16} />
              <span className="hidden sm:inline">Con saldo</span>
            </button>

            <select
              value={sortBy}
              onChange={e => setQuery({ sort: e.target.value, page: '1' })}
              className="ml-auto px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 outline-none focus:border-brand-primary transition-colors"
              title="Ordenar la lista"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Tipo de tercero */}
          <div className="flex flex-wrap gap-2">
            {TYPE_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setQuery({ type: tab.value, page: '1' })}
                className={cn(
                  'px-4 py-1.5 rounded-xl text-xs font-bold transition-colors',
                  typeFilter === tab.value
                    ? 'bg-brand-dark text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['TERCERO', 'IDENTIFICACIÓN', 'CONTACTO', 'FACTURAS', 'SALDO PENDIENTE'].map(h => (
                  <th
                    key={h}
                    className={cn(
                      'px-3 sm:px-8 py-3 sm:py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest',
                      h === 'CONTACTO' && 'hidden lg:table-cell',
                      h === 'IDENTIFICACIÓN' && 'hidden sm:table-cell',
                      h === 'FACTURAS' && 'text-center hidden md:table-cell',
                      h === 'SALDO PENDIENTE' && 'text-right',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isFetching && customers.length === 0
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-8 py-4"><Skeleton className="h-6 w-full" /></td></tr>
                  ))
                : customers.length === 0
                  ? (
                    <tr>
                      <td colSpan={5}>
                        {search || onlyWithDebt ? (
                          <EmptyState
                            icon={Search}
                            title="Sin resultados"
                            hint="Ningún tercero coincide con la búsqueda y los filtros aplicados."
                            action={{ label: 'Limpiar búsqueda y filtros', onClick: () => { setSearchInput(''); setQuery({ q: '', debt: '', page: '1' }); } }}
                          />
                        ) : (
                          <EmptyState
                            icon={Users}
                            title="Aún no hay clientes"
                            hint="Los terceros aparecerán aquí tras sincronizar con Siigo."
                            action={canWrite(user?.role) ? { label: 'Sincronizar ahora', onClick: handleSync } : undefined}
                          />
                        )}
                      </td>
                    </tr>
                  )
                : customers.map(c => (
                  <tr key={c.id} onClick={() => openClient(c)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="px-3 sm:px-8 py-3 sm:py-6 max-w-xs">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-100 text-slate-400 group-hover:text-brand-primary transition-colors shrink-0">
                          {c.personType === 'Company' ? <Building2 size={16} /> : <User size={16} />}
                        </div>
                        <div className="min-w-0">
                          {c.name
                            ? <p className="text-sm font-bold text-slate-900 truncate" title={c.name}>{c.name}</p>
                            : <p className="text-sm font-bold text-slate-400 italic truncate" title="Este tercero no tiene nombre registrado en Siigo">Sin nombre en Siigo</p>}
                          {c.commercialName && c.commercialName !== c.name && (
                            <p className="text-[11px] text-slate-400 truncate" title={c.commercialName}>{c.commercialName}</p>
                          )}
                          <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5 tracking-wider sm:hidden" title="Identificación">
                            {c.identification}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-8 py-3 sm:py-6">
                      <p className="text-xs font-mono font-bold text-slate-500 tracking-wider" title={c.idType || 'Identificación'}>
                        {c.checkDigit ? `${c.identification}-${c.checkDigit}` : c.identification}
                      </p>
                      {c.branchOffice > 0 && (
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Sucursal {c.branchOffice}</p>
                      )}
                    </td>
                    <td className="hidden lg:table-cell px-3 sm:px-8 py-3 sm:py-6 max-w-[220px]">
                      {c.email
                        ? <p className="text-xs font-semibold text-slate-600 truncate" title={c.email}>{c.email}</p>
                        : <p className="text-xs text-slate-300 font-semibold">—</p>}
                      {c.phone && <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{c.phone}</p>}
                    </td>
                    <td className="hidden md:table-cell px-3 sm:px-8 py-3 sm:py-6 text-center">
                      <span className="text-sm font-bold text-slate-600" title={c.lastInvoiceDate ? `Última: ${c.lastInvoiceDate}` : 'Sin facturas'}>
                        {c.invoiceCount}
                      </span>
                    </td>
                    <td className="px-3 sm:px-8 py-3 sm:py-6 text-right">
                      {c.pendingBalance > 0 ? (
                        <span className="text-sm font-extrabold text-brand-danger" title={formatCurrency(c.pendingBalance)}>
                          {formatCurrency(c.pendingBalance)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-300">Al día</span>
                      )}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPage={next => setQuery({ page: String(next) })}
          label="terceros"
        />
      </div>
    </motion.div>
    </>
  );
}
