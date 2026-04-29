'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Clock, Users, TrendingUp, Download, Search,
  BarChart3, Calendar, ArrowUpRight,
} from 'lucide-react';
import {
  activityStatusLabels, activityStatusColors, formatDate, formatDuration,
  CONSORTIUM_COMPANIES,
} from '@/lib/utils';

interface Activity {
  id: string;
  title: string;
  date: string;
  status: string;
  durationMinutes: number | null;
  consortiumCompany: string | null;
  workOrderFolio: string | null;
  location: string | null;
  notes: string | null;
  userName: string;
  clientName: string | null;
}

interface Props {
  activities: Activity[];
}

const COMPANY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  'GRUPO CASEME': { bg: 'bg-indigo-50', text: 'text-indigo-700', bar: 'bg-indigo-500' },
  'DROBOTS': { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  'OPUS INGENIUM': { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  'VULCAN FORGE': { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
  'SAINPRO': { bg: 'bg-violet-50', text: 'text-violet-700', bar: 'bg-violet-500' },
};

export function ConsorcioClient({ activities }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterEngineer, setFilterEngineer] = useState('');

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (filterCompany && a.consortiumCompany !== filterCompany) return false;
      if (filterEngineer && a.userName !== filterEngineer) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.userName.toLowerCase().includes(q) ||
          (a.consortiumCompany || '').toLowerCase().includes(q) ||
          (a.workOrderFolio || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activities, filterCompany, filterEngineer, search]);

  // Stats derived from ALL activities (not filtered)
  const stats = useMemo(() => {
    const totalActivities = activities.length;
    const totalMinutes = activities.reduce((s, a) => s + (a.durationMinutes || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    // By company
    const byCompany: Record<string, { count: number; minutes: number; engineers: Set<string> }> = {};
    activities.forEach((a) => {
      const co = a.consortiumCompany || 'SIN EMPRESA';
      if (!byCompany[co]) byCompany[co] = { count: 0, minutes: 0, engineers: new Set() };
      byCompany[co].count++;
      byCompany[co].minutes += a.durationMinutes || 0;
      byCompany[co].engineers.add(a.userName);
    });

    // By engineer
    const byEngineer: Record<string, { count: number; minutes: number; companies: Set<string> }> = {};
    activities.forEach((a) => {
      if (!byEngineer[a.userName]) byEngineer[a.userName] = { count: 0, minutes: 0, companies: new Set() };
      byEngineer[a.userName].count++;
      byEngineer[a.userName].minutes += a.durationMinutes || 0;
      if (a.consortiumCompany) byEngineer[a.userName].companies.add(a.consortiumCompany);
    });

    // Monthly trend
    const byMonth: Record<string, number> = {};
    activities.forEach((a) => {
      const month = a.date.substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    // Active companies count
    const companiesServed = new Set(activities.map((a) => a.consortiumCompany).filter(Boolean)).size;

    // Top engineer
    const topEngineer = Object.entries(byEngineer).sort((a, b) => b[1].count - a[1].count)[0];

    // Unique engineers
    const engineers = [...new Set(activities.map((a) => a.userName))].sort();

    const maxCompanyCount = Math.max(...Object.values(byCompany).map((c) => c.count), 1);

    return { totalActivities, totalMinutes, totalHours, byCompany, byEngineer, byMonth, companiesServed, topEngineer, engineers, maxCompanyCount };
  }, [activities]);

  // CSV Export
  const exportCSV = () => {
    const data = filtered.length > 0 ? filtered : activities;
    const headers = ['Fecha', 'Título', 'Empresa Destino', 'Ingeniero', 'Duración (min)', 'Estatus', 'Folio', 'Cliente', 'Ubicación', 'Notas'];
    const rows = data.map((a) => [
      formatDate(a.date),
      `"${a.title.replace(/"/g, '""')}"`,
      a.consortiumCompany || '',
      a.userName,
      a.durationMinutes || '',
      activityStatusLabels[a.status] || a.status,
      a.workOrderFolio || '',
      a.clientName || '',
      a.location || '',
      `"${(a.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consorcio_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-cyan-600" /> Consorcio
          </h1>
          <p className="text-slate-500 text-sm">Soporte inter-empresas · Solo administradores</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary text-sm">
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 border-l-4 border-l-cyan-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Actividades</p>
              <p className="text-2xl font-bold text-slate-800">{stats.totalActivities}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-l-4 border-l-violet-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-50 rounded-lg">
              <Clock className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Horas Invertidas</p>
              <p className="text-2xl font-bold text-slate-800">{stats.totalHours}<span className="text-sm text-slate-400"> hrs</span></p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Building2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Empresas Atendidas</p>
              <p className="text-2xl font-bold text-slate-800">{stats.companiesServed}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Ingeniero Más Activo</p>
              <p className="text-lg font-bold text-slate-800 truncate">{stats.topEngineer ? stats.topEngineer[0] : '—'}</p>
              {stats.topEngineer && (
                <p className="text-xs text-slate-400">{stats.topEngineer[1].count} actividades</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Company */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-cyan-600" /> Soporte por Empresa
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byCompany)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([company, data]) => {
                const colors = COMPANY_COLORS[company] || { bg: 'bg-slate-50', text: 'text-slate-700', bar: 'bg-slate-500' };
                return (
                  <div key={company}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-semibold px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                        {company}
                      </span>
                      <span className="text-sm text-slate-500">
                        {data.count} act · {Math.round(data.minutes / 60 * 10) / 10}h · {data.engineers.size} ing.
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                        style={{ width: `${(data.count / stats.maxCompanyCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            {Object.keys(stats.byCompany).length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">Sin actividades de consorcio registradas</p>
            )}
          </div>
        </div>

        {/* By Engineer */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Users size={18} className="text-amber-600" /> Soporte por Ingeniero
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byEngineer)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([engineer, data]) => (
                <div key={engineer} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{engineer}</p>
                    <div className="flex gap-1 mt-0.5">
                      {[...data.companies].map((c) => {
                        const colors = COMPANY_COLORS[c] || { bg: 'bg-slate-100', text: 'text-slate-600', bar: '' };
                        return (
                          <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                            {c}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{data.count}</p>
                    <p className="text-[10px] text-slate-400">{Math.round(data.minutes / 60 * 10) / 10}h</p>
                  </div>
                </div>
              ))}
            {Object.keys(stats.byEngineer).length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">Sin datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      {Object.keys(stats.byMonth).length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-600" /> Tendencia Mensual
          </h3>
          <div className="flex items-end gap-2 h-32">
            {Object.entries(stats.byMonth)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .slice(-12)
              .map(([month, count]) => {
                const maxCount = Math.max(...Object.values(stats.byMonth));
                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-700">{count}</span>
                    <div className="w-full bg-slate-100 rounded-t-md relative" style={{ height: '100px' }}>
                      <div
                        className="absolute bottom-0 w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-md transition-all duration-500"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 whitespace-nowrap">{month.substring(5)}/{month.substring(2, 4)}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Filters + Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm"
            />
          </div>
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="text-sm py-2"
          >
            <option value="">Todas las empresas</option>
            {CONSORTIUM_COMPANIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filterEngineer}
            onChange={(e) => setFilterEngineer(e.target.value)}
            className="text-sm py-2"
          >
            <option value="">Todos los ingenieros</option>
            {stats.engineers.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Título</th>
                <th>Empresa</th>
                <th className="hidden sm:table-cell">Ingeniero</th>
                <th className="hidden md:table-cell">Duración</th>
                <th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="text-slate-400">
                      <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Sin actividades de consorcio</p>
                      <p className="text-sm">Registra actividades tipo &quot;Consorcio&quot; para verlas aquí</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((act) => {
                  const colors = COMPANY_COLORS[act.consortiumCompany || ''] || { bg: 'bg-slate-50', text: 'text-slate-600', bar: '' };
                  return (
                    <tr
                      key={act.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/actividades/${act.id}`)}
                    >
                      <td className="whitespace-nowrap text-sm">{formatDate(act.date)}</td>
                      <td>
                        <p className="font-medium text-slate-800 text-sm">
                          {act.title.length > 50 ? act.title.substring(0, 50) + '...' : act.title}
                        </p>
                        {act.workOrderFolio && (
                          <p className="text-xs text-indigo-500 font-mono">{act.workOrderFolio}</p>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${colors.bg} ${colors.text} text-xs`}>
                          {act.consortiumCompany || 'Sin empresa'}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell text-sm">{act.userName}</td>
                      <td className="hidden md:table-cell text-sm">{formatDuration(act.durationMinutes)}</td>
                      <td>
                        <span className={`badge ${activityStatusColors[act.status] || ''}`}>
                          {activityStatusLabels[act.status] || act.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="p-3 border-t border-slate-100 text-sm text-slate-500 flex justify-between">
            <span>{filtered.length} actividades</span>
            <span>
              {Math.round(filtered.reduce((s, a) => s + (a.durationMinutes || 0), 0) / 60 * 10) / 10} horas totales
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
