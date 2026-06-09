'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Search, RefreshCw, FileText, ChevronDown, ChevronUp, MessageSquare, Send, Loader2, DollarSign, Calendar, Download, Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';

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
  
  // Filtros
  const [filterProject, setFilterProject] = useState<string>('all'); // all | with_project | no_project
  const [filterCompany, setFilterCompany] = useState<string>('all'); // all | gc | drobots | opus | vulcan | sainpro
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all | to_invoice | no | upselling
  const [filterSalesperson, setFilterSalesperson] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
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
      setNewCommentText(prev => ({ ...prev, [folio]: '' }));
    } catch (err: any) {
      alert(err.message || 'Error de conexión');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [folio]: false }));
    }
  };

  // Obtener lista única de vendedores para el filtro rápido
  const salespeople = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.salesperson) {
        const formatted = o.salesperson.trim().replace(/\s*-\s*$/, '').split(/\s+-\s+/)[0].trim();
        set.add(formatted);
      }
    });
    return Array.from(set).sort();
  }, [orders]);

  // Filtros aplicados en cascada
  const filtered = useMemo(() => {
    let list = orders;

    // 1. Filtro por Proyecto
    if (filterProject === 'with_project') {
      list = list.filter(o => !!o.project);
    } else if (filterProject === 'no_project') {
      list = list.filter(o => !o.project);
    }

    // 2. Filtro por Empresa
    if (filterCompany !== 'all') {
      const q = filterCompany.toLowerCase();
      list = list.filter(o => {
        const name = (o.companyName || '').toLowerCase();
        if (q === 'gc') return name.includes('global support') || name.includes('caseme');
        if (q === 'drobots') return name.includes('drobots');
        if (q === 'opus') return name.includes('opus');
        if (q === 'vulcan') return name.includes('vulcan');
        if (q === 'sainpro') return name.includes('sainpro');
        return true;
      });
    }

    // 3. Filtro por Vendedor
    if (filterSalesperson !== 'all') {
      list = list.filter(o => {
        if (!o.salesperson) return false;
        const formatted = o.salesperson.trim().replace(/\s*-\s*$/, '').split(/\s+-\s+/)[0].trim();
        return formatted === filterSalesperson;
      });
    }

    // 4. Filtro por Estatus de Facturación
    if (filterStatus !== 'all') {
      list = list.filter(o => o.invoiceStatus === filterStatus);
    }

    // 5. Entrada de búsqueda general
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
  }, [orders, filterProject, filterCompany, filterSalesperson, filterStatus, search]);

  // Stats basados en las órdenes actualmente filtradas
  const stats = useMemo(() => {
    const totalAmount = filtered.reduce((sum, o) => sum + o.amountTotal, 0);
    const totalUntaxed = filtered.reduce((sum, o) => sum + o.amountUntaxed, 0);
    const totalCount = filtered.length;
    
    const toInvoiceCount = filtered.filter(o => o.invoiceStatus === 'to invoice' || o.invoiceStatus === 'to_invoice').length;
    const toInvoiceAmount = filtered.filter(o => o.invoiceStatus === 'to invoice' || o.invoiceStatus === 'to_invoice').reduce((sum, o) => sum + o.amountTotal, 0);
    
    const noInvoiceCount = filtered.filter(o => o.invoiceStatus === 'no').length;
    const noInvoiceAmount = filtered.filter(o => o.invoiceStatus === 'no').reduce((sum, o) => sum + o.amountTotal, 0);

    const withCommentsCount = filtered.filter(o => o.comments.length > 0).length;
    const totalCommentsCount = filtered.reduce((sum, o) => sum + o.comments.length, 0);

    return { 
      totalAmount, 
      totalUntaxed, 
      totalCount, 
      toInvoiceCount, 
      toInvoiceAmount,
      noInvoiceCount,
      noInvoiceAmount,
      withCommentsCount, 
      totalCommentsCount 
    };
  }, [filtered]);

  // Exportar listado a Excel con metadatos
  const handleExportExcel = () => {
    if (filtered.length === 0) return;

    const wb = XLSX.utils.book_new();

    const rows: any[][] = [
      ['REPORTES PERRY APP - TRABAJOS ABIERTOS'],
      ['Folios de Odoo con cotización y P.O. pendientes de facturación'],
      [],
      ['Filtros aplicados:'],
      ['Proyecto:', filterProject === 'all' ? 'Todos' : filterProject === 'with_project' ? 'Con Proyecto' : 'Sin Proyecto'],
      ['Empresa:', filterCompany === 'all' ? 'Todas' : filterCompany.toUpperCase()],
      ['Vendedor:', filterSalesperson === 'all' ? 'Todos' : filterSalesperson],
      ['Estatus Factura:', filterStatus === 'all' ? 'Todos' : (invoiceStatusLabels[filterStatus] || filterStatus)],
      ['Búsqueda:', search || 'Ninguna'],
      ['Fecha de generación:', new Date().toLocaleString('es-MX', { hour12: false })],
      [],
      [
        'Folio Odoo',
        'P.O. Cliente',
        'Cliente',
        'Contacto',
        'Proyecto',
        'Responsable (Vendedor)',
        'Subtotal (Sin IVA)',
        'Monto Total (Con IVA)',
        'Fecha Orden',
        'Estatus Factura',
        'Compañía Odoo',
        'Notas de Seguimiento'
      ]
    ];

    filtered.forEach(o => {
      const commentsText = o.comments
        .map(c => `[${c.userName} - ${fmtDateTime(c.createdAt)}]: ${c.content}`)
        .join(' | ');

      rows.push([
        o.name,
        o.po,
        o.clientCompany,
        o.clientContact || '—',
        o.project || 'Sin Proyecto',
        o.salesperson ? o.salesperson.trim().replace(/\s*-\s*$/, '').split(/\s+-\s+/)[0].trim() : '—',
        o.amountUntaxed,
        o.amountTotal,
        fmtDate(o.dateOrder),
        invoiceStatusLabels[o.invoiceStatus] || o.invoiceStatus,
        o.companyName || '—',
        commentsText || 'Sin anotaciones'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    
    ws['!cols'] = [
      { wch: 12 }, // Folio
      { wch: 15 }, // PO
      { wch: 30 }, // Cliente
      { wch: 20 }, // Contacto
      { wch: 30 }, // Proyecto
      { wch: 25 }, // Vendedor
      { wch: 18 }, // Subtotal
      { wch: 18 }, // Total
      { wch: 15 }, // Fecha
      { wch: 18 }, // Estatus
      { wch: 25 }, // Compañía
      { wch: 50 }  // Notas
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Trabajos Abiertos");
    XLSX.writeFile(wb, `Reporte_Trabajos_Abiertos_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0 animate-fade-in">
      {/* CSS para Impresión PDF */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body, #__next, main, div.flex.h-screen, div.flex-1.flex.flex-col {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
            background: white !important;
          }
          
          .sidebar-desktop,
          aside,
          header,
          .print\\:hidden {
            display: none !important;
          }
          
          @page {
            size: letter landscape;
            margin: 1cm;
          }
          
          body {
            color: #1e293b !important;
          }
          
          .card {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
          }
          
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          
          th, td {
            font-size: 8px !important;
            padding: 4px 6px !important;
            border: 1px solid #e2e8f0 !important;
          }
          
          th {
            background-color: #f8fafc !important;
            color: #0f172a !important;
            font-weight: bold !important;
          }
        }
      `}} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Trabajos Abiertos</h1>
          <p className="text-slate-500 text-sm">Folios de Odoo con cotización y orden de compra (P.O.) pendientes de facturación</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-sm self-start">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Cabecera de Impresión (Solo visible al exportar a PDF / Imprimir) */}
      <div className="hidden print:block mb-4 border-b border-slate-300 pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Reporte de Trabajos Abiertos (Odoo)</h1>
            <p className="text-slate-500 text-[10px] mt-0.5">Folios con cotización y orden de compra (P.O.) pendientes de facturación</p>
          </div>
          <div className="text-right text-[9px] text-slate-400">
            <p>Perry App • Odoo Live</p>
            <p>Generado: {new Date().toLocaleString('es-MX', { hour12: false })}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3 text-[9px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
          <div><span className="font-bold text-slate-700">Proyecto:</span> {filterProject === 'all' ? 'Todos' : filterProject === 'with_project' ? 'Con Proyecto' : 'Sin Proyecto'}</div>
          <div><span className="font-bold text-slate-700">Empresa:</span> {filterCompany === 'all' ? 'Todas' : filterCompany.toUpperCase()}</div>
          <div><span className="font-bold text-slate-700">Vendedor:</span> {filterSalesperson === 'all' ? 'Todos' : filterSalesperson}</div>
          <div><span className="font-bold text-slate-700">Estatus:</span> {filterStatus === 'all' ? 'Todos' : (invoiceStatusLabels[filterStatus] || filterStatus)}</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm print:hidden">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-indigo-50"><DollarSign size={14} className="text-indigo-600" /></div>
              <span className="text-[10px] text-slate-500 font-medium">Monto Total (Con IVA)</span>
            </div>
            <p className="text-base font-bold text-slate-800">{fmt(stats.totalAmount)}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">De {stats.totalCount} folios filtrados</p>
          </div>

          <div className="card p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-slate-100"><DollarSign size={14} className="text-slate-505" /></div>
              <span className="text-[10px] text-slate-500 font-medium">Subtotal (Sin IVA)</span>
            </div>
            <p className="text-base font-bold text-slate-600">{fmt(stats.totalUntaxed)}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Base gravable de folios</p>
          </div>

          <div className="card p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-emerald-50"><FileText size={14} className="text-emerald-600" /></div>
              <span className="text-[10px] text-slate-500 font-medium">Por Facturar</span>
            </div>
            <p className="text-base font-bold text-emerald-600">{stats.toInvoiceCount} folios</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Total: {fmt(stats.toInvoiceAmount)}</p>
          </div>

          <div className="card p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-amber-50"><FileText size={14} className="text-amber-600" /></div>
              <span className="text-[10px] text-slate-500 font-medium">Sin Facturar</span>
            </div>
            <p className="text-base font-bold text-amber-600">{stats.noInvoiceCount} folios</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Total: {fmt(stats.noInvoiceAmount)}</p>
          </div>

          <div className="card p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-violet-50"><MessageSquare size={14} className="text-violet-600" /></div>
              <span className="text-[10px] text-slate-500 font-medium">Con Seguimiento</span>
            </div>
            <p className="text-base font-bold text-violet-600">{stats.withCommentsCount} folios</p>
            <p className="text-[9px] text-slate-400 mt-0.5">{stats.totalCommentsCount} notas</p>
          </div>

          <div className="card p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="p-1.5 rounded-lg bg-rose-50"><Calendar size={14} className="text-rose-600" /></div>
              <span className="text-[10px] text-slate-500 font-medium">Última Actualización</span>
            </div>
            <p className="text-base font-bold text-rose-600">Odoo Live</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Sincronización en vivo</p>
          </div>
        </div>
      )}

      {/* Filtros, Búsqueda y Botones de Exportación */}
      <div className="flex flex-col gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm print:hidden">
        {/* Fila 1: Búsqueda y Acciones */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por folio, P.O., proyecto, cliente o responsable..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-300"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all"
              title="Exportar listado a archivo Excel"
            >
              <Download size={14} />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all"
              title="Imprimir reporte en formato PDF"
            >
              <Printer size={14} />
              Imprimir/PDF
            </button>
          </div>
        </div>

        {/* Fila 2: Filtros Rápidos */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
          {/* Filtro de Proyecto */}
          <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
            {[
              { key: 'all', label: 'Todos Proy.' },
              { key: 'with_project', label: 'Con Proy.' },
              { key: 'no_project', label: 'Sin Proy.' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterProject(f.key)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                  filterProject === f.key
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-155'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Filtro por Empresa */}
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empresa:</label>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="text-xs rounded-lg py-1 pl-2 pr-6 border border-slate-200 focus:outline-none bg-slate-50 hover:bg-slate-100"
            >
              <option value="all">Todas</option>
              <option value="gc">Grupo Caseme (GSI)</option>
              <option value="drobots">Drobots</option>
              <option value="opus">Opus Ingenium</option>
              <option value="vulcan">Vulcan Forge</option>
              <option value="sainpro">Sainpro</option>
            </select>
          </div>

          {/* Filtro por Estatus Factura */}
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Factura:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs rounded-lg py-1 pl-2 pr-6 border border-slate-200 focus:outline-none bg-slate-50 hover:bg-slate-100"
            >
              <option value="all">Todos los estatus</option>
              <option value="to invoice">Por Facturar</option>
              <option value="no">Sin Facturar</option>
              <option value="upselling">Upselling</option>
            </select>
          </div>

          {/* Filtro por Responsable */}
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Responsable:</label>
            <select
              value={filterSalesperson}
              onChange={(e) => setFilterSalesperson(e.target.value)}
              className="text-xs rounded-lg py-1 pl-2 pr-6 border border-slate-200 focus:outline-none bg-slate-50 hover:bg-slate-100 max-w-[180px]"
            >
              <option value="all">Todos los responsables</option>
              {salespeople.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10 print:hidden"></th>
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
                    <tr key={order.name} className="hover:bg-slate-50/50 transition-colors">
                      {/* Envolver en React Fragment para renderizar fila principal y expandida */}
                      <td colSpan={10} className="p-0 border-none">
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr
                              onClick={() => toggleRow(order.name)}
                              className={`cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-indigo-50/10' : ''}`}
                            >
                              <td className="w-10 text-center print:hidden border-b border-slate-200">
                                {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                              </td>
                              <td className="text-xs font-mono font-bold text-indigo-600 border-b border-slate-200">{order.name}</td>
                              <td className="border-b border-slate-200">
                                <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded print:bg-transparent print:border-none print:p-0">
                                  {order.po}
                                </span>
                              </td>
                              <td className="text-xs text-slate-700 max-w-[150px] truncate border-b border-slate-200" title={order.clientCompany}>
                                {order.clientCompany}
                              </td>
                              <td className="text-xs text-slate-700 max-w-[200px] truncate border-b border-slate-200" title={order.project || ''}>
                                {order.project || <span className="text-[10px] text-slate-400 italic">Sin título</span>}
                              </td>
                              <td className="border-b border-slate-200">
                                {order.salesperson ? (
                                  <span className="text-[11px] text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded print:bg-transparent print:border-none print:p-0">
                                    {order.salesperson.trim().replace(/\s*-\s*$/, '').split(/\s+-\s+/)[0].trim()}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">—</span>
                                )}
                              </td>
                              <td className="text-right text-xs font-bold text-slate-800 border-b border-slate-200">
                                {fmt(order.amountTotal)}
                              </td>
                              <td className="text-xs text-slate-600 border-b border-slate-200">
                                {fmtDate(order.dateOrder)}
                              </td>
                              <td className="border-b border-slate-200">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200 print:border-none print:bg-transparent print:p-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 print:hidden" />
                                  {invoiceStatusLabels[order.invoiceStatus] || order.invoiceStatus}
                                </span>
                              </td>
                              <td className="text-center border-b border-slate-200">
                                <div className="inline-flex items-center gap-1 text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full print:border-none print:bg-transparent print:p-0">
                                  <MessageSquare size={10} className="print:hidden" />
                                  {order.comments.length}
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Comments Row */}
                            {isExpanded && (
                              <tr className="print:hidden bg-slate-50/50">
                                <td colSpan={10} className="p-4 border-b border-slate-200">
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
                          </tbody>
                        </table>
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
