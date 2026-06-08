'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search, RefreshCw, FileText, ChevronDown, ChevronUp, MessageSquare, Send, Loader2, DollarSign, Calendar
} from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  userName: string;
  createdAt: string;
}

interface OdooOrder {
  id: number;
  name: string;
  po: string;
  project: string | null;
  clientCompany: string;
  clientContact: string;
  state: string;
  invoiceStatus: string;
  amountTotal: number;
  amountUntaxed: number;
  dateOrder: string;
  salesperson: string | null;
  companyName: string | null;
  comments: Comment[];
}

const invoiceStatusLabels: Record<string, string> = {
  no: 'Sin Facturar (N/A)',
  to_invoice: 'Por Facturar',
  to: 'Por Facturar',
  'to invoice': 'Por Facturar',
  invoiced: 'Facturado',
  upselling: 'Upselling',
};

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const fmtDate = (d: string) => {
  if (!d) return '—';
  try {
    // Check if it has time part, if so parse directly as UTC, else add safe mid-day time in UTC
    const cleanD = d.includes(' ') ? d.replace(' ', 'T') + 'Z' : d + 'T12:00:00Z';
    return new Date(cleanD).toLocaleDateString('es-MX', {
      timeZone: 'America/Tijuana',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return d;
  }
};

const fmtDateTime = (d: string) => {
  try {
    return new Date(d).toLocaleString('es-MX', {
      timeZone: 'America/Tijuana',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return d;
  }
};

export function TrabajosAbiertosClient({ userRole }: { userRole: string }) {
  const [orders, setOrders] = useState<OdooOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [filterProject, setFilterProject] = useState<string>('all'); // all | with_project | no_project

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // Leer empresa activa de las cookies
      const cookie = document.cookie.split('; ').find(c => c.startsWith('perry_active_company='));
      const activeCompany = cookie?.split('=')[1] || '';
      const companyParam = activeCompany ? `?companyId=${encodeURIComponent(activeCompany)}` : '';
      
      const res = await fetch(`/api/odoo/trabajos-abiertos${companyParam}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOrders(data.orders || []);
    } catch (e: any) {
      setError(e.message || 'Error al cargar trabajos abiertos');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Escuchar cambios de empresa (por ejemplo si el usuario hace clic en el selector global de empresa)
    // En Perry App, al cambiar de empresa se recarga la página o se actualiza la cookie.
    const getActiveCompanyCookie = () => {
      const cookie = document.cookie.split('; ').find(c => c.startsWith('perry_active_company='));
      return cookie ? cookie.split('=')[1] || '' : '';
    };
    let lastCookie = getActiveCompanyCookie();
    const interval = setInterval(() => {
      const currentCookie = getActiveCompanyCookie();
      if (currentCookie !== lastCookie) {
        lastCookie = currentCookie;
        load();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleRow = (name: string) => {
    setExpandedRows(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleAddComment = async (folio: string) => {
    const text = newCommentText[folio]?.trim();
    if (!text) return;

    setSubmittingComment(prev => ({ ...prev, [folio]: true }));
    try {
      const res = await fetch('/api/odoo/trabajos-abiertos/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folio, content: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar comentario');

      // Actualizar localmente el estado de comentarios
      setOrders(prevOrders =>
        prevOrders.map(o => {
          if (o.name.toUpperCase() === folio.toUpperCase()) {
            return {
              ...o,
              comments: [data.comment, ...o.comments],
            };
          }
          return o;
        })
      );
      // Limpiar texto de input
      setNewCommentText(prev => ({ ...prev, [folio]: '' }));
    } catch (err: any) {
      alert(err.message || 'Error de conexión');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [folio]: false }));
    }
  };

  // Stats
  const stats = useMemo(() => {
    const totalAmount = orders.reduce((sum, o) => sum + o.amountTotal, 0);
    const totalCount = orders.length;
    const withCommentsCount = orders.filter(o => o.comments.length > 0).length;
    const totalCommentsCount = orders.reduce((sum, o) => sum + o.comments.length, 0);

    return { totalAmount, totalCount, withCommentsCount, totalCommentsCount };
  }, [orders]);

  // Filtros
  const filtered = useMemo(() => {
    let list = orders;

    if (filterProject === 'with_project') {
      list = list.filter(o => !!o.project);
    } else if (filterProject === 'no_project') {
      list = list.filter(o => !o.project);
    }

    if (search) {
      const q = search.toUpperCase();
      list = list.filter(o =>
        o.name.toUpperCase().includes(q) ||
        o.po.toUpperCase().includes(q) ||
        (o.project && o.project.toUpperCase().includes(q)) ||
        o.clientCompany.toUpperCase().includes(q) ||
        (o.salesperson && o.salesperson.toUpperCase().includes(q))
      );
    }

    return list;
  }, [orders, filterProject, search]);

  return (
    <div className="space-y-4 pb-20 md:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Trabajos Abiertos</h1>
          <p className="text-slate-500 text-sm">Folios de Odoo con cotización y orden de compra (P.O.) pendientes de facturación</p>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-indigo-50"><DollarSign size={18} className="text-indigo-600" /></div>
              <span className="text-xs text-slate-500 font-medium">Monto Pendiente Total</span>
            </div>
            <p className="text-xl font-bold text-slate-800">{fmt(stats.totalAmount)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{stats.totalCount} folios abiertos</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-emerald-50"><FileText size={18} className="text-emerald-600" /></div>
              <span className="text-xs text-slate-500 font-medium">Con Proyecto Definido</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">
              {orders.filter(o => !!o.project).length}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">folios asociados</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-violet-50"><MessageSquare size={18} className="text-violet-600" /></div>
              <span className="text-xs text-slate-500 font-medium">Con Seguimiento</span>
            </div>
            <p className="text-xl font-bold text-violet-600">{stats.withCommentsCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{stats.totalCommentsCount} notas registradas</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-amber-50"><Calendar size={18} className="text-amber-600" /></div>
              <span className="text-xs text-slate-500 font-medium">Última Actualización</span>
            </div>
            <p className="text-xl font-bold text-amber-600">Odoo Live</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Sincronización en tiempo real</p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por folio, P.O., proyecto, cliente o vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-300"
          />
        </div>
        {[
          { key: 'all', label: 'Todos', count: orders.length },
          { key: 'with_project', label: 'Con Proyecto', count: orders.filter(o => !!o.project).length },
          { key: 'no_project', label: 'Sin Proyecto', count: orders.filter(o => !o.project).length },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterProject(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterProject === f.key
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>Folio Odoo</th>
                <th>P.O. Cliente</th>
                <th>Cliente</th>
                <th>Proyecto</th>
                <th>Responsable (Vendedor)</th>
                <th className="text-right">Monto (Con IVA)</th>
                <th>Fecha Orden</th>
                <th>Estatus Factura</th>
                <th className="text-center">Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <RefreshCw size={32} className="mx-auto animate-spin text-indigo-400 mb-3" />
                    <p className="text-slate-400 font-medium">Consultando Odoo y base de datos...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-400 font-medium">No se encontraron trabajos abiertos con estos criterios</p>
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const isExpanded = !!expandedRows[order.name];
                  return (
                    <>
                      <tr
                        key={order.name}
                        onClick={() => toggleRow(order.name)}
                        className={`cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-indigo-50/10' : ''}`}
                      >
                        <td className="text-center">
                          {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </td>
                        <td className="text-xs font-mono font-bold text-indigo-600">{order.name}</td>
                        <td>
                          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            {order.po}
                          </span>
                        </td>
                        <td className="text-xs text-slate-700 max-w-[150px] truncate" title={order.clientCompany}>
                          {order.clientCompany}
                        </td>
                        <td className="text-xs text-slate-700 max-w-[200px] truncate" title={order.project || ''}>
                          {order.project || <span className="text-[10px] text-slate-400 italic">Sin título</span>}
                        </td>
                        <td>
                          {order.salesperson ? (
                            <span className="text-[11px] text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                              {order.salesperson.trim().replace(/\s*-\s*$/, '').split(/\s+-\s+/)[0].trim()}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="text-right text-xs font-bold text-slate-800">
                          {fmt(order.amountTotal)}
                        </td>
                        <td className="text-xs text-slate-600">
                          {fmtDate(order.dateOrder)}
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {invoiceStatusLabels[order.invoiceStatus] || order.invoiceStatus}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="inline-flex items-center gap-1 text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">
                            <MessageSquare size={10} />
                            {order.comments.length}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Comments Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="bg-slate-50/50 p-4 border-b border-slate-200">
                            <div className="max-w-4xl mx-auto space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Detalles del Folio</h4>
                                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                                    <p><span className="text-slate-400">Compañía Odoo:</span> <span className="font-semibold">{order.companyName || '—'}</span></p>
                                    <p><span className="text-slate-400">Cliente (Completo):</span> <span className="font-semibold">{order.clientCompany} {order.clientContact ? `(${order.clientContact})` : ''}</span></p>
                                    <p><span className="text-slate-400">Monto Subtotal (Sin IVA):</span> <span className="font-semibold">{fmt(order.amountUntaxed)}</span></p>
                                    <p><span className="text-slate-400">Proyecto:</span> <span className="font-semibold text-indigo-600">{order.project || 'Sin Proyecto Registrado'}</span></p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Agregar Anotación</h4>
                                  <div className="flex gap-2">
                                    <textarea
                                      rows={2}
                                      value={newCommentText[order.name] || ''}
                                      onChange={(e) => setNewCommentText(p => ({ ...p, [order.name]: e.target.value }))}
                                      placeholder="Escribe comentarios de seguimiento o estatus..."
                                      className="flex-1 p-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-300 resize-none bg-white"
                                    />
                                    <button
                                      onClick={() => handleAddComment(order.name)}
                                      disabled={submittingComment[order.name] || !(newCommentText[order.name]?.trim())}
                                      className="btn-primary self-end py-2 px-3 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                      {submittingComment[order.name] ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <Send size={14} />
                                      )}
                                      <span className="hidden sm:inline">Guardar</span>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Historial de Anotaciones</h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                  {order.comments.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No hay anotaciones aún para este folio. Utiliza el cuadro de arriba para agregar una.</p>
                                  ) : (
                                    order.comments.map((comment) => (
                                      <div key={comment.id} className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-sm text-xs">
                                        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                                          <span className="font-semibold text-slate-600">{comment.userName}</span>
                                          <span>{fmtDateTime(comment.createdAt)}</span>
                                        </div>
                                        <p className="text-slate-700 text-left whitespace-pre-wrap">{comment.content}</p>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
