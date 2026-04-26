'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  Plus, Search, Download, Filter, X, ChevronDown
} from 'lucide-react';
import {
  activityTypeLabels, activityStatusLabels, activityTypeColors,
  activityStatusColors, formatDate, formatDuration,
} from '@/lib/utils';

interface Activity {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string;
  durationMinutes: number | null;
  workOrderFolio: string | null;
  purchaseOrder: string | null;
  user: { id: string; name: string };
  client: { id: string; name: string } | null;
  opportunity: { id: string; folio: string } | null;
}

interface Props {
  activities: Activity[];
  users: { id: string; name: string; role: string }[];
  clients: { id: string; name: string }[];
  filters: {
    tipo: string;
    estatus: string;
    responsable: string;
    cliente: string;
    fechaDesde: string;
    fechaHasta: string;
    buscar: string;
    folioOdoo: string;
  };
  userRole: string;
}

export function ActividadesClient({ activities, users, clients, filters, userRole }: Props) {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const [quickFolio, setQuickFolio] = useState('');

  const handleQuickNew = () => {
    const folio = quickFolio.trim().toUpperCase();
    if (folio && folio.length >= 4) {
      router.push(`/actividades/nueva?folio=${encodeURIComponent(folio)}`);
    } else {
      router.push('/actividades/nueva');
    }
  };

  const applyFilters = (overrides?: any) => {
    const params = new URLSearchParams();
    const finalFilters = { ...localFilters, ...overrides };
    Object.entries(finalFilters).forEach(([key, value]) => {
      if (value) params.set(key, value as string);
    });
    if (overrides) {
      setLocalFilters(finalFilters);
    }
    router.push(`/actividades?${params.toString()}`);
  };

  const clearFilters = () => {
    setLocalFilters({ tipo: '', estatus: '', responsable: '', cliente: '', fechaDesde: '', fechaHasta: '', buscar: '', folioOdoo: '' });
    router.push('/actividades');
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  // Helper date for Quick Filters
  const getLocalISODate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getLocalISODate(new Date());
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalISODate(yesterday);
  
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = getLocalISODate(weekAgo);

  const isHoy = localFilters.fechaDesde === todayStr && localFilters.fechaHasta === todayStr;
  const isAyer = localFilters.fechaDesde === yesterdayStr && localFilters.fechaHasta === yesterdayStr;
  const isSemana = localFilters.fechaDesde === weekAgoStr && localFilters.fechaHasta === todayStr;

  // CSV Export
  const exportCSV = () => {
    const headers = ['Fecha', 'Título', 'Tipo', 'Estatus', 'Responsable', 'Cliente', 'P.O.', 'Duración', 'OPP'];
    const rows = activities.map((a) => [
      formatDate(a.date),
      `"${a.title.replace(/"/g, '""')}"`,
      activityTypeLabels[a.type] || a.type,
      activityStatusLabels[a.status] || a.status,
      a.user?.name || 'POR ASIGNAR',
      a.client?.name || '',
      a.purchaseOrder || (a.workOrderFolio ? 'Sin P.O.' : 'Sin Cotización'),
      formatDuration(a.durationMinutes),
      a.opportunity?.folio || '',
    ]);

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `actividades_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Actividades</h1>
          <p className="text-slate-500 text-sm">{activities.length} actividades encontradas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm">
            <Download size={16} /> CSV
          </button>
          <div className="flex items-center">
            <input
              type="text"
              maxLength={6}
              placeholder="Ej: S06309"
              value={quickFolio}
              onChange={(e) => setQuickFolio(e.target.value.toUpperCase().slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickNew()}
              className="w-[90px] text-xs font-mono px-2 py-1.5 rounded-l-lg border border-r-0 border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button onClick={handleQuickNew} className="btn-primary text-sm rounded-l-none">
              <Plus size={16} /> Nueva
            </button>
          </div>
        </div>
      </div>

      {/* Quick Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mr-2 hidden sm:block">Vistas Rápidas:</span>
        <div className="flex gap-1 border-r border-slate-200 pr-3">
          <button
            onClick={() => applyFilters({ fechaDesde: todayStr, fechaHasta: todayStr })}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              isHoy ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            HOY
          </button>
          <button
            onClick={() => applyFilters({ fechaDesde: yesterdayStr, fechaHasta: yesterdayStr })}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              isAyer ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            AYER
          </button>
          <button
            onClick={() => applyFilters({ fechaDesde: weekAgoStr, fechaHasta: todayStr })}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              isSemana ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            SEMANA
          </button>
        </div>

        {/* Quick Engineer Selector */}
        {userRole !== 'INGENIERO' && (
          <div className="flex-1 min-w-[150px] sm:ml-2">
            <select
              value={localFilters.responsable}
              onChange={(e) => applyFilters({ responsable: e.target.value })}
              className="w-full sm:max-w-xs text-sm border-none bg-slate-50 rounded-lg py-1.5 focus:ring-1 focus:ring-indigo-500 font-medium text-slate-700"
            >
              <option value="">Equipos (Todos)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Search + Filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar actividades..."
            value={localFilters.buscar}
            onChange={(e) => setLocalFilters({ ...localFilters, buscar: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="w-full pl-10 pr-4"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary text-sm ${hasActiveFilters ? 'border-indigo-300 bg-indigo-50' : ''}`}
        >
          <Filter size={16} />
          <span className="hidden sm:inline">Filtros</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card p-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Tipo</label>
              <select
                value={localFilters.tipo}
                onChange={(e) => setLocalFilters({ ...localFilters, tipo: e.target.value })}
                className="w-full"
              >
                <option value="">Todos</option>
                {Object.entries(activityTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Estatus</label>
              <select
                value={localFilters.estatus}
                onChange={(e) => setLocalFilters({ ...localFilters, estatus: e.target.value })}
                className="w-full"
              >
                <option value="">Todos</option>
                {Object.entries(activityStatusLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {userRole !== 'INGENIERO' && (
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Responsable</label>
                <select
                  value={localFilters.responsable}
                  onChange={(e) => setLocalFilters({ ...localFilters, responsable: e.target.value })}
                  className="w-full"
                >
                  <option value="">Todos</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Cliente</label>
              <select
                value={localFilters.cliente}
                onChange={(e) => setLocalFilters({ ...localFilters, cliente: e.target.value })}
                className="w-full"
              >
                <option value="">Todos</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Desde</label>
              <input
                type="date"
                value={localFilters.fechaDesde}
                onChange={(e) => setLocalFilters({ ...localFilters, fechaDesde: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Hasta</label>
              <input
                type="date"
                value={localFilters.fechaHasta}
                onChange={(e) => setLocalFilters({ ...localFilters, fechaHasta: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Folio Odoo</label>
              <input
                type="text"
                maxLength={6}
                placeholder="Ej: 123456"
                value={localFilters.folioOdoo}
                onChange={(e) => setLocalFilters({ ...localFilters, folioOdoo: e.target.value })}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={applyFilters} className="btn-primary text-sm">Aplicar</button>
            <button onClick={clearFilters} className="btn-ghost text-sm">
              <X size={14} /> Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Título</th>
                <th>Tipo</th>
                <th className="hidden sm:table-cell">Responsable</th>
                <th className="hidden md:table-cell">Cliente</th>
                <th className="hidden lg:table-cell">P.O.</th>
                <th>Estatus</th>
                <th className="hidden lg:table-cell">Duración</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="text-slate-400">
                      <ClipboardIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No hay actividades</p>
                      <p className="text-sm">Crea una nueva actividad o ajusta los filtros</p>
                    </div>
                  </td>
                </tr>
              ) : (
                activities.map((act) => (
                  <tr key={act.id} className="cursor-pointer" onClick={() => router.push(`/actividades/${act.id}`)}>
                    <td className="whitespace-nowrap text-sm">{formatDate(act.date)}</td>
                    <td>
                      <p className="font-medium text-slate-800 text-sm">
                        {act.title.length > 60 ? act.title.substring(0, 60) + '...' : act.title}
                      </p>
                      {act.opportunity && (
                        <p className="text-xs text-indigo-500">{act.opportunity.folio}</p>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${activityTypeColors[act.type] || ''}`}>
                        {activityTypeLabels[act.type] || act.type}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell text-sm">{act.user?.name || 'POR ASIGNAR'}</td>
                    <td className="hidden md:table-cell text-sm">{act.client?.name || '-'}</td>
                    <td className="hidden lg:table-cell">
                      {act.purchaseOrder ? (
                        <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">{act.purchaseOrder}</span>
                      ) : act.workOrderFolio ? (
                        <span className="text-[10px] font-bold text-amber-600">Sin P.O.</span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-500">Sin Cotización</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${activityStatusColors[act.status] || ''}`}>
                        {activityStatusLabels[act.status] || act.status}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell text-sm">{formatDuration(act.durationMinutes)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
