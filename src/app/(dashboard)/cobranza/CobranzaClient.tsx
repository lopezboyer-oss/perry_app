'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, AlertTriangle, Clock, CheckCircle, Search, RefreshCw,
  FileText, Calendar, Users, ChevronDown, ChevronUp, Check, X, Loader2,
} from 'lucide-react';

interface Invoice {
  id: number;
  number: string;
  folio: string | null;
  po: string | null;
  paymentState: string;
  amountTotal: number;
  amountPending: number;
  invoiceDate: string;
  dueDate: string | null;
  daysUntilDue: number | null;
  urgency: 'overdue' | 'urgent' | 'normal' | 'paid';
  company: string;
  contact: string;
  supervisor: string | null;
}

interface Receipt {
  invoiceNumber: string;
  confirmedBy?: { name: string };
  confirmedAt: string;
  notes?: string;
}

const paymentStateLabels: Record<string, string> = {
  not_paid: 'Sin Pagar',
  partial: 'Pago Parcial',
  paid: 'Pagada',
  in_payment: 'En Proceso',
  reversed: 'Revertida',
};

const urgencyConfig = {
  overdue: { label: 'Vencida', color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-500' },
  urgent: { label: '< 7 días', color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  normal: { label: 'Dentro de plazo', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  paid: { label: 'Pagada', color: 'text-slate-500 bg-slate-50 border-slate-200', dot: 'bg-slate-400' },
};

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtDateTime = (d: string) => new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function CobranzaClient() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<string>('pending');
  const [sortField, setSortField] = useState<'dueDate' | 'amountPending'>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Receipt tracking
  const [receipts, setReceipts] = useState<Record<string, Receipt>>({});
  const [receiptLoading, setReceiptLoading] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [invRes, recRes] = await Promise.all([
        fetch('/api/odoo/invoices'),
        fetch('/api/cobranza/receipts'),
      ]);
      const invData = await invRes.json();
      const recData = await recRes.json();
      if (invData.error) throw new Error(invData.error);
      setInvoices(invData.invoices || []);

      // Index receipts by invoice number
      const recMap: Record<string, Receipt> = {};
      (recData.receipts || []).forEach((r: Receipt) => { recMap[r.invoiceNumber] = r; });
      setReceipts(recMap);
    } catch (e: any) {
      setError(e.message || 'Error al cargar facturas');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleReceipt = async (inv: Invoice) => {
    const key = inv.number;
    setReceiptLoading((p) => ({ ...p, [key]: true }));
    try {
      if (receipts[key]) {
        // Undo receipt
        await fetch('/api/cobranza/receipts', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceNumber: key }),
        });
        setReceipts((p) => { const n = { ...p }; delete n[key]; return n; });
      } else {
        // Mark receipt
        const res = await fetch('/api/cobranza/receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoiceNumber: key, folio: inv.folio, po: inv.po }),
        });
        const data = await res.json();
        if (data.receipt) setReceipts((p) => ({ ...p, [key]: data.receipt }));
      }
    } catch {
      // silent fail
    }
    setReceiptLoading((p) => ({ ...p, [key]: false }));
  };

  // Stats
  const stats = useMemo(() => {
    const pending = invoices.filter((i) => i.urgency !== 'paid');
    const overdue = pending.filter((i) => i.urgency === 'overdue');
    const urgent = pending.filter((i) => i.urgency === 'urgent');
    const normal = pending.filter((i) => i.urgency === 'normal');
    const paid = invoices.filter((i) => i.urgency === 'paid');

    const totalPending = pending.reduce((s, i) => s + i.amountPending, 0);
    const totalOverdue = overdue.reduce((s, i) => s + i.amountPending, 0);

    // Count receipts confirmed
    const withReceipt = pending.filter((i) => receipts[i.number]);
    const withoutReceipt = pending.filter((i) => !receipts[i.number]);

    // By contact
    const byContact: Record<string, { count: number; amount: number }> = {};
    pending.forEach((i) => {
      const key = i.contact || 'Sin Contacto';
      if (!byContact[key]) byContact[key] = { count: 0, amount: 0 };
      byContact[key].count++;
      byContact[key].amount += i.amountPending;
    });

    // By supervisor
    const bySupervisor: Record<string, { count: number; amount: number }> = {};
    pending.forEach((i) => {
      const key = i.supervisor || 'Sin Asignar';
      if (!bySupervisor[key]) bySupervisor[key] = { count: 0, amount: 0 };
      bySupervisor[key].count++;
      bySupervisor[key].amount += i.amountPending;
    });

    return { pending, overdue, urgent, normal, paid, totalPending, totalOverdue, byContact, bySupervisor, withReceipt, withoutReceipt };
  }, [invoices, receipts]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = invoices;
    if (filterUrgency === 'pending') list = list.filter((i) => i.urgency !== 'paid');
    else if (filterUrgency === 'receipt') list = list.filter((i) => !!receipts[i.number]);
    else if (filterUrgency === 'no_receipt') list = list.filter((i) => i.urgency !== 'paid' && !receipts[i.number]);
    else if (filterUrgency !== 'all') list = list.filter((i) => i.urgency === filterUrgency);

    if (search) {
      const q = search.toUpperCase();
      list = list.filter((i) =>
        i.number.toUpperCase().includes(q) ||
        (i.folio && i.folio.toUpperCase().includes(q)) ||
        (i.po && i.po.includes(q)) ||
        i.company.toUpperCase().includes(q) ||
        i.contact.toUpperCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let va: any, vb: any;
      if (sortField === 'dueDate') { va = a.dueDate || ''; vb = b.dueDate || ''; }
      else { va = a.amountPending; vb = b.amountPending; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [invoices, filterUrgency, search, sortField, sortDir, receipts]);

  const toggleSort = (field: 'dueDate' | 'amountPending') => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: string }) => (
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
      : <ChevronDown size={12} className="opacity-30" />
  );

  return (
    <div className="space-y-4 pb-20 md:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Cobranza</h1>
          <p className="text-slate-500 text-sm">Seguimiento de facturas y pendientes de recibo</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-sm self-start">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-indigo-50"><DollarSign size={18} className="text-indigo-600" /></div>
              <span className="text-xs text-slate-500 font-medium">Total Pendiente</span>
            </div>
            <p className="text-xl font-bold text-slate-800">{fmt(stats.totalPending)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{stats.pending.length} facturas</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-red-50"><AlertTriangle size={18} className="text-red-600" /></div>
              <span className="text-xs text-slate-500 font-medium">Vencidas</span>
            </div>
            <p className="text-xl font-bold text-red-600">{fmt(stats.totalOverdue)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{stats.overdue.length} facturas</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-amber-50"><Clock size={18} className="text-amber-600" /></div>
              <span className="text-xs text-slate-500 font-medium">Próximas a Vencer</span>
            </div>
            <p className="text-xl font-bold text-amber-600">{stats.urgent.length}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">menos de 7 días</p>
          </div>

          <div className="card p-4 border-2 border-violet-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-violet-50"><Check size={18} className="text-violet-600" /></div>
              <span className="text-xs text-slate-500 font-medium">Con Recibo</span>
            </div>
            <p className="text-xl font-bold text-violet-600">{stats.withReceipt.length}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">confirmado manualmente</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-emerald-50"><CheckCircle size={18} className="text-emerald-600" /></div>
              <span className="text-xs text-slate-500 font-medium">Pagadas</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{stats.paid.length}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">del periodo</p>
          </div>
        </div>
      )}

      {/* Contacts breakdown */}
      {!loading && Object.keys(stats.byContact).length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Users size={14} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-700">Pendiente por Contacto (Requisitor)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(stats.byContact)
              .sort((a, b) => b[1].amount - a[1].amount)
              .map(([contact, data]) => (
                <div key={contact} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-slate-700">{contact}</p>
                    <p className="text-[10px] text-slate-400">{data.count} factura{data.count > 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{fmt(data.amount)}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Supervisor breakdown */}
      {!loading && Object.keys(stats.bySupervisor).length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Users size={14} className="text-violet-500" />
            <h3 className="text-sm font-semibold text-slate-700">Pendiente por Supervisor</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(stats.bySupervisor)
              .sort((a, b) => b[1].amount - a[1].amount)
              .map(([supervisor, data]) => (
                <div key={supervisor} className="flex items-center justify-between bg-violet-50/50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-slate-700">{supervisor}</p>
                    <p className="text-[10px] text-slate-400">{data.count} factura{data.count > 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{fmt(data.amount)}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar factura, folio, P.O. o contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-sm rounded-lg border border-slate-200"
          />
        </div>
        {[
          { key: 'pending', label: 'Pendientes', count: stats.pending.length },
          { key: 'no_receipt', label: 'Sin Recibo', count: stats.withoutReceipt.length },
          { key: 'receipt', label: 'Con Recibo', count: stats.withReceipt.length },
          { key: 'overdue', label: 'Vencidas', count: stats.overdue.length },
          { key: 'paid', label: 'Pagadas', count: stats.paid.length },
          { key: 'all', label: 'Todas', count: invoices.length },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterUrgency(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterUrgency === f.key
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Folio</th>
                <th>P.O.</th>
                <th className="hidden md:table-cell">Contacto</th>
                <th>
                  <button onClick={() => toggleSort('amountPending')} className="flex items-center gap-0.5 hover:text-indigo-600">
                    Pendiente <SortIcon field="amountPending" />
                  </button>
                </th>
                <th>
                  <button onClick={() => toggleSort('dueDate')} className="flex items-center gap-0.5 hover:text-indigo-600">
                    Vencimiento <SortIcon field="dueDate" />
                  </button>
                </th>
                <th>Estado</th>
                <th className="text-center">Recibo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <RefreshCw size={32} className="mx-auto animate-spin text-indigo-400 mb-3" />
                    <p className="text-slate-400 font-medium">Consultando Odoo...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-400 font-medium">No hay facturas</p>
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const uc = urgencyConfig[inv.urgency];
                  const receipt = receipts[inv.number];
                  const isLoadingReceipt = receiptLoading[inv.number];
                  return (
                    <tr key={inv.id} className={receipt ? 'bg-violet-50/40' : inv.urgency === 'overdue' ? 'bg-red-50/50' : ''}>
                      <td className="text-xs font-mono font-medium text-slate-700">{inv.number}</td>
                      <td>
                        {inv.folio ? (
                          <span className="text-xs font-mono text-indigo-600">{inv.folio}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      <td>
                        {inv.po ? (
                          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">{inv.po}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell">
                        <p className="text-xs text-slate-700 truncate max-w-[150px]" title={inv.contact}>{inv.contact || '—'}</p>
                      </td>
                      <td className="text-right">
                        <p className="text-sm font-bold text-slate-800">{fmt(inv.amountPending)}</p>
                        {inv.amountPending !== inv.amountTotal && (
                          <p className="text-[10px] text-slate-400">de {fmt(inv.amountTotal)}</p>
                        )}
                      </td>
                      <td>
                        {inv.dueDate ? (
                          <div>
                            <p className="text-xs text-slate-700">{fmtDate(inv.dueDate)}</p>
                            {inv.daysUntilDue !== null && inv.urgency !== 'paid' && (
                              <p className={`text-[10px] font-bold ${
                                inv.daysUntilDue < 0 ? 'text-red-600' : inv.daysUntilDue <= 7 ? 'text-amber-600' : 'text-slate-400'
                              }`}>
                                {inv.daysUntilDue < 0 ? `${Math.abs(inv.daysUntilDue)}d vencida` : inv.daysUntilDue === 0 ? 'Vence hoy' : `${inv.daysUntilDue}d restantes`}
                              </p>
                            )}
                          </div>
                        ) : <span className="text-[10px] text-slate-400">—</span>}
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${uc.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${uc.dot}`} />
                          {inv.urgency === 'paid' ? paymentStateLabels[inv.paymentState] || uc.label : uc.label}
                        </span>
                      </td>
                      <td className="text-center">
                        {inv.urgency === 'paid' ? (
                          <span className="text-[10px] text-slate-400">—</span>
                        ) : isLoadingReceipt ? (
                          <Loader2 size={16} className="mx-auto animate-spin text-violet-500" />
                        ) : receipt ? (
                          <button
                            onClick={() => toggleReceipt(inv)}
                            className="group relative"
                            title={`Confirmado por ${receipt.confirmedBy?.name || '?'} — ${fmtDateTime(receipt.confirmedAt)}\nClick para desmarcar`}
                          >
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-violet-100 text-violet-700 border border-violet-200 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-200 transition-colors">
                              <Check size={12} className="group-hover:hidden" />
                              <X size={12} className="hidden group-hover:block" />
                              <span className="group-hover:hidden">Recibido</span>
                              <span className="hidden group-hover:inline">Desmarcar</span>
                            </span>
                            <span className="block text-[9px] text-violet-400 mt-0.5">{receipt.confirmedBy?.name}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleReceipt(inv)}
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-300 transition-colors"
                          >
                            <Check size={12} />
                            Marcar Recibo
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
