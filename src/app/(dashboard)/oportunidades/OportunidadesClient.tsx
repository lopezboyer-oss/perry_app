'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  Plus, Search, Download, Filter, X, AlertTriangle, Clock, CheckCircle
} from 'lucide-react';
import {
  opportunityStatusLabels, opportunityStatusColors,
  formatDate, daysBetween,
} from '@/lib/utils';

interface Opportunity {
  id: string;
  folio: string;
  title: string;
  status: string;
  quotationDueDate: string | null;
  quotationSentDate: string | null;
  actualVisitDate: string | null;
  scheduledVisitDate: string | null;
  user: { id: string; name: string };
  client: { id: string; name: string };
  contact: { id: string; name: string } | null;
  activitiesCount: number;
  delayReason: string | null;
}

interface Props {
  opportunities: Opportunity[];
  users: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  filters: { estatus: string; responsable: string; cliente: string; buscar: string };
  userRole: string;
}

export function OportunidadesClient({ opportunities, users, clients, filters, userRole }: Props) {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const applyFilters = () => {
    const params = new URLSearchParams();
    Object.entries(localFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    router.push(`/oportunidades?${params.toString()}`);
  };

  const clearFilters = () => {
    setLocalFilters({ estatus: '', responsable: '', cliente: '', buscar: '' });
    router.push('/oportunidades');
  };

  // Semáforo logic
  const getTrafficLight = (opp: Opportunity) => {
    if (['GANADA', 'PERDIDA', 'COTIZACION_ENVIADA'].includes(opp.status)) return null;
    if (!opp.quotationDueDate) return null;

    const daysUntilDue = daysBetween(new Date().toISOString(), opp.quotationDueDate);
    if (daysUntilDue === null) return null;

    if (daysUntilDue < 0) return 'red';
    if (daysUntilDue <= 3) return 'yellow';
    return 'green';
  };

  const getLeadTime = (opp: Opportunity) => {
    if (opp.actualVisitDate && opp.quotationSentDate) {
      return daysBetween(opp.actualVisitDate, opp.quotationSentDate);
    }
    return null;
  };

  const exportCSV = () => {
    const headers = ['Folio', 'Título', 'Cliente', 'Responsable', 'Estatus', 'Visita Programada', 'Visita Realizada', 'Cotización Compromiso', 'Cotización Enviada', 'Lead Time (días)', 'Motivo Atraso'];
    const rows = opportunities.map((o) => {
      const lt = getLeadTime(o);
      return [
        o.folio,
        `"${o.title.replace(/"/g, '""')}"`,
        o.client.name,
        o.user.name,
        opportunityStatusLabels[o.status] || o.status,
        formatDate(o.scheduledVisitDate),
        formatDate(o.actualVisitDate),
        formatDate(o.quotationDueDate),
        formatDate(o.quotationSentDate),
        lt !== null ? lt.toString() : '',
        `"${(o.delayReason || '').replace(/"/g, '""')}"`,
      ];
    });

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `oportunidades_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Oportunidades</h1>
          <p className="text-slate-500 text-sm">{opportunities.length} oportunidades</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm">
            <Download size={16} /> CSV
          </button>
          <Link href="/oportunidades/nueva" className="btn-primary text-sm">
            <Plus size={16} /> Nueva
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar oportunidades..."
            value={localFilters.buscar}
            onChange={(e) => setLocalFilters({ ...localFilters, buscar: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="w-full pl-10"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary text-sm">
          <Filter size={16} />
        </button>
      </div>

      {showFilters && (
        <div className="card p-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Estatus</label>
              <select value={localFilters.estatus} onChange={(e) => setLocalFilters({ ...localFilters, estatus: e.target.value })} className="w-full">
                <option value="">Todos</option>
                {Object.entries(opportunityStatusLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {userRole !== 'INGENIERO' && (
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Responsable</label>
                <select value={localFilters.responsable} onChange={(e) => setLocalFilters({ ...localFilters, responsable: e.target.value })} className="w-full">
                  <option value="">Todos</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Cliente</label>
              <select value={localFilters.cliente} onChange={(e) => setLocalFilters({ ...localFilters, cliente: e.target.value })} className="w-full">
                <option value="">Todos</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={applyFilters} className="btn-primary text-sm">Aplicar</button>
            <button onClick={clearFilters} className="btn-ghost text-sm"><X size={14} /> Limpiar</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Título</th>
                <th className="hidden sm:table-cell">Cliente</th>
                <th className="hidden md:table-cell">Responsable</th>
                <th>Estatus</th>
                <th className="hidden lg:table-cell">Lead Time</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {opportunities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <p className="font-medium">No hay oportunidades</p>
                  </td>
                </tr>
              ) : (
                opportunities.map((opp) => {
                  const traffic = getTrafficLight(opp);
                  const leadTime = getLeadTime(opp);
                  return (
                    <tr key={opp.id} className="cursor-pointer" onClick={() => router.push(`/oportunidades/${opp.id}`)}>
                      <td className="font-mono text-sm font-medium text-indigo-600">{opp.folio}</td>
                      <td>
                        <p className="font-medium text-slate-800 text-sm">
                          {opp.title.length > 50 ? opp.title.substring(0, 50) + '...' : opp.title}
                        </p>
                        <p className="text-xs text-slate-400">{opp.activitiesCount} actividades</p>
                      </td>
                      <td className="hidden sm:table-cell text-sm">{opp.client.name}</td>
                      <td className="hidden md:table-cell text-sm">{opp.user.name}</td>
                      <td>
                        <span className={`badge ${opportunityStatusColors[opp.status] || ''}`}>
                          {opportunityStatusLabels[opp.status] || opp.status}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell text-sm">
                        {leadTime !== null ? `${leadTime} días` : '-'}
                      </td>
                      <td>
                        {traffic === 'red' && (
                          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse-soft" title="Atrasada" />
                        )}
                        {traffic === 'yellow' && (
                          <div className="w-3 h-3 rounded-full bg-yellow-500" title="Próxima a vencer" />
                        )}
                        {traffic === 'green' && (
                          <div className="w-3 h-3 rounded-full bg-green-500" title="En tiempo" />
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
