import { useState, useEffect, useCallback } from 'react';
import ExcelJS from 'exceljs';
import {
  Download, Filter, Plus, Search,
  Building2, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight, X,
  ArrowUpRight, ArrowDownLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import { TransactionDetailDrawer } from '../components/TransactionDetailDrawer';
import { StatusBadge } from '../components/StatusBadge';
import { CategoryBadge } from '../components/CategoryBadge';
import { transactionsService, type Transaction, type TransactionSummary } from '../services';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';

const TYPE_OPTIONS = ['Ingreso', 'Egreso'] as const;
const STATUS_OPTIONS = ['Completado', 'Pendiente', 'Cancelado'] as const;

type TypeFilter = '' | 'Ingreso' | 'Egreso';
type StatusFilter = '' | 'Completado' | 'Pendiente' | 'Cancelado';

async function exportXLSX(transactions: Transaction[], formatCurrency: (n: number) => string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Movimientos');

  ws.columns = [
    { header: 'Fecha',       key: 'date',        width: 14 },
    { header: 'Descripción', key: 'description', width: 40 },
    { header: 'Categoría',   key: 'category',    width: 20 },
    { header: 'Tipo',        key: 'type',        width: 12 },
    { header: 'Monto',       key: 'amount',      width: 20 },
    { header: 'Estado',      key: 'status',      width: 14 },
    { header: 'Referencia',  key: 'reference',   width: 20 },
    { header: 'Origen',      key: 'source',      width: 12 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  transactions.forEach(tx => {
    ws.addRow({
      date: tx.date,
      description: tx.description,
      category: tx.category,
      type: tx.type,
      amount: formatCurrency(tx.amount),
      status: tx.status,
      reference: tx.reference ?? '',
      source: tx.isProjection ? 'Proyección' : tx.source,
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `movimientos_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MovementsView({
  onCreateMovement,
  initialSelectedId,
}: {
  onCreateMovement?: () => void;
  initialSelectedId?: string;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary>({ totalBalance: 0, monthlyIncome: 0, monthlyExpense: 0 });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const { formatCurrency } = useSettings();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [listRes, summaryRes] = await Promise.all([
        transactionsService.list({ page, limit: 10, search, type: typeFilter || undefined, status: statusFilter || undefined }),
        transactionsService.summary(),
      ]);
      setTransactions(listRes.data);
      setTotal(listRes.total);
      setTotalPages(listRes.totalPages);
      setSummary(prev => ({ ...prev, ...(summaryRes ?? {}) }));
    } catch {
      setError('No se pudo cargar los movimientos.');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!initialSelectedId) return;
    setIsLoadingDetail(true);
    transactionsService.get(initialSelectedId)
      .then(setSelectedTx)
      .catch(() => {})
      .finally(() => setIsLoadingDetail(false));
  }, [initialSelectedId]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await transactionsService.list({
        limit: 9999,
        search,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      await exportXLSX(res.data, formatCurrency);
    } catch {
      // silently fail — user can retry
    } finally {
      setIsExporting(false);
    }
  };

  const activeFilterCount = (typeFilter ? 1 : 0) + (statusFilter ? 1 : 0);

  const clearFilters = () => {
    setTypeFilter('');
    setStatusFilter('');
    setPage(1);
  };

  if (error) return <div className="p-8 text-brand-danger font-semibold">{error}</div>;
  if (isLoading) {
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

  const fmt = (n: number) => formatCurrency(Math.abs(n));
  const balancePositive = summary.totalBalance >= 0;

  return (
    <>
    <TransactionDetailDrawer
      transaction={selectedTx}
      isLoading={isLoadingDetail}
      onClose={() => setSelectedTx(null)}
      onDeleted={() => { setSelectedTx(null); fetchData(); }}
      onUpdated={tx => { setSelectedTx(tx); fetchData(); }}
    />

    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Movimientos</h1>
          <p className="text-slate-500 font-medium tracking-tight">Gestión detallada de ingresos y egresos de Intexa ArCa.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-60"
          >
            <Download size={18} />
            <span>{isExporting ? 'Exportando...' : 'Exportar'}</span>
          </button>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-colors relative",
              showFilters || activeFilterCount > 0
                ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <Filter size={18} />
            <span>Filtros</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-danger text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Total */}
        <div className={cn("bg-white p-6 rounded-[32px] border card-shadow flex justify-between items-center cursor-default", balancePositive ? "border-slate-100" : "border-brand-danger/20")}>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">BALANCE TOTAL</p>
            <p className="text-2xl font-bold text-slate-900">
              {balancePositive ? '' : '-'}{fmt(summary.totalBalance)}
            </p>
          </div>
          <div className={cn("p-4 rounded-[20px]", balancePositive ? "bg-slate-100 text-brand-primary" : "bg-brand-danger/10 text-brand-danger")}>
            <Building2 size={24} />
          </div>
        </div>

        {/* Ingresos Mes */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 card-shadow flex justify-between items-center cursor-default">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">INGRESOS MES</p>
            <p className="text-2xl font-bold text-brand-success">+{fmt(summary.monthlyIncome)}</p>
          </div>
          <div className="p-4 rounded-[20px] bg-brand-success/10 text-brand-success">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Egresos Mes */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 card-shadow flex justify-between items-center cursor-default">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">EGRESOS MES</p>
            <p className="text-2xl font-bold text-brand-danger">-{fmt(summary.monthlyExpense)}</p>
          </div>
          <div className="p-4 rounded-[20px] bg-brand-danger/10 text-brand-danger">
            <TrendingDown size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl sm:rounded-[40px] border border-slate-100 card-shadow overflow-hidden">
        {/* Search + action row */}
        <div className="p-4 sm:p-8 border-b border-slate-100 flex justify-between items-center gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setPage(1); }}
              placeholder="Buscar movimientos..."
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-brand-primary outline-none transition-all w-64"
            />
          </div>
          <button onClick={onCreateMovement} className="bg-brand-dark text-white p-3 rounded-2xl hover:bg-brand-accent transition-all">
            <Plus size={20} />
          </button>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-slate-100"
            >
              <div className="px-8 py-6 flex flex-wrap items-center gap-6">
                {/* Type filter */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</span>
                  <div className="flex gap-2">
                    {TYPE_OPTIONS.map(t => (
                      <button
                        key={t}
                        onClick={() => { setTypeFilter(typeFilter === t ? '' : t); setPage(1); }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                          typeFilter === t
                            ? t === 'Ingreso'
                              ? "bg-brand-success text-white border-brand-success"
                              : "bg-brand-danger text-white border-brand-danger"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                        )}
                      >{t}</button>
                    ))}
                  </div>
                </div>

                {/* Status filter */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1); }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                          statusFilter === s
                            ? s === 'Completado' ? "bg-brand-success text-white border-brand-success"
                              : s === 'Pendiente' ? "bg-brand-primary text-white border-brand-primary"
                              : "bg-brand-danger text-white border-brand-danger"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                        )}
                      >{s}</button>
                    ))}
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-brand-danger transition-colors ml-auto"
                  >
                    <X size={14} />Limpiar filtros
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter chips */}
        {!showFilters && activeFilterCount > 0 && (
          <div className="px-8 py-3 border-b border-slate-100 flex items-center gap-2">
            {typeFilter && (
              <span className={cn(
                "flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                typeFilter === 'Ingreso' ? "bg-brand-success/10 text-brand-success" : "bg-brand-danger/10 text-brand-danger"
              )}>
                {typeFilter}
                <button onClick={() => { setTypeFilter(''); setPage(1); }}><X size={10} /></button>
              </span>
            )}
            {statusFilter && (
              <span className={cn(
                "flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest",
                statusFilter === 'Completado' ? "bg-brand-success/10 text-brand-success"
                  : statusFilter === 'Pendiente' ? "bg-brand-primary/10 text-brand-primary"
                  : "bg-brand-danger/10 text-brand-danger"
              )}>
                {statusFilter}
                <button onClick={() => { setStatusFilter(''); setPage(1); }}><X size={10} /></button>
              </span>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['FECHA', 'DESCRIPCIÓN', 'CATEGORÍA', 'TIPO', 'MONTO', 'ESTADO'].map(h => (
                  <th key={h} className={cn("px-3 sm:px-8 py-3 sm:py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest", h === 'CATEGORÍA' && 'hidden sm:table-cell', h === 'TIPO' && 'text-center', (h === 'MONTO' || h === 'ESTADO') && 'text-right')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-8 py-4"><Skeleton className="h-6 w-full" /></td></tr>
                  ))
                : transactions.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-16 text-center text-sm font-semibold text-slate-400">
                        No se encontraron movimientos con los filtros aplicados.
                      </td>
                    </tr>
                  )
                : transactions.map(tx => (
                  <tr key={tx.id} onClick={() => setSelectedTx(tx)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="px-3 sm:px-8 py-3 sm:py-6 text-sm font-semibold text-slate-500 whitespace-nowrap">{tx.date}</td>
                    <td className="px-3 sm:px-8 py-3 sm:py-6 max-w-xs">
                      <p className="text-sm font-bold text-slate-900">{tx.description}</p>
                      {tx.detail && <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-snug">{tx.detail}</p>}
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-8 py-3 sm:py-6">
                      <CategoryBadge category={tx.category} />
                    </td>
                    <td className="px-3 sm:px-8 py-3 sm:py-6">
                      <div className={cn("flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider", tx.type === 'Ingreso' ? "text-brand-success" : "text-brand-danger")}>
                        {tx.type === 'Ingreso' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        <span className="hidden xs:inline">{tx.type}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-8 py-3 sm:py-6 text-right">
                      <span className="text-sm font-extrabold text-slate-900">{formatCurrency(tx.amount)}</span>
                    </td>
                    <td className="px-3 sm:px-8 py-3 sm:py-6 text-right">
                      <StatusBadge status={tx.status} />
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        <div className="p-4 sm:p-8 border-t border-slate-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-400">Mostrando {transactions.length} de {total} movimientos</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 text-slate-400 hover:text-brand-primary disabled:opacity-30">
              <ChevronLeft size={20} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={cn("w-8 h-8 rounded-lg text-xs font-bold transition-colors", p === page ? "bg-brand-dark text-white" : "text-slate-600 hover:bg-slate-100")}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 text-slate-400 hover:text-brand-primary disabled:opacity-30">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
}
