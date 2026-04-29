'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Target, Search, Clock, CheckCircle, AlertTriangle, TrendingUp, Activity, Timer } from 'lucide-react';
import { formatDate, formatDuration } from '@/lib/utils';
import type { DerivedOpportunity } from './page';

interface Props {
  opportunities: DerivedOpportunity[];
  users: { id: string; name: string }[];
  filters: { estatus: string; responsable: string; buscar: string };
  userRole: string;
}

const estadoConfig: Record<string, { label: string; color: string; icon: any }> = {
  EN_PROGRESO: { label: 'En Progreso', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
  COMPLETADA: { label: 'Completada', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
  CANCELADA: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
};

export function OportunidadesClient({ opportunities, users, filters, userRole }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.buscar);
  const [estatus, setEstatus] = useState(filters.estatus);
  const [responsable, setResponsable] = useState(filters.responsable);

  const filtered = useMemo(() => {
    let result = opportunities;
    if (estatus) result = result.filter(o => o.estado === estatus);
    if (responsable) result = result.filter(o => o.responsableId === responsable);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(o =>
        (o.folio || '').toLowerCase().includes(s) ||
        o.title.toLowerCase().includes(s) ||
        o.responsable.toLowerCase().includes(s) ||
        o.cliente.toLowerCase().includes(s)
      );
    }
    return result;
  }, [opportunities, estatus, responsable, search]);

  // KPIs
  const stats = useMemo(() => {
    const enProgreso = filtered.filter(o => o.estado === 'EN_PROGRESO').length;
    const completadas = filtered.filter(o => o.estado === 'COMPLETADA');
    const completadasCount = completadas.length;
    const leadTimes = completadas.filter(o => o.leadTimeDays !== null).map(o => o.leadTimeDays!);
    const avgLeadTime = leadTimes.length > 0 ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : null;
    const totalActividades = filtered.reduce((s, o) => s + o.totalActividades, 0);
    const totalMinutos = filtered.reduce((s, o) => s + o.totalMinutos, 0);
    return { enProgreso, completadasCount, avgLeadTime, totalActividades, totalMinutos };
  }, [filtered]);

  return (
    <div className="space-y-5 pb-20 md:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Target className="w-8 h-8 text-indigo-600" /> Oportunidades
          </h1>
          <p className="text-slate-500 text-sm mt-1">Seguimiento de cotizaciones por folio Odoo</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={<Clock size={18} className="text-blue-500" />} label="En Progreso" value={stats.enProgreso} accent="blue" />
        <KpiCard icon={<CheckCircle size={18} className="text-emerald-500" />} label="Completadas" value={stats.completadasCount} accent="emerald" />
        <KpiCard icon={<TrendingUp size={18} className="text-violet-500" />} label="Lead Time Prom." value={stats.avgLeadTime !== null ? `${stats.avgLeadTime}d` : '—'} accent="violet" />
        <KpiCard icon={<Activity size={18} className="text-amber-500" />} label="Actividades" value={stats.totalActividades} accent="amber" />
        <KpiCard icon={<Timer size={18} className="text-rose-500" />} label="Tiempo Total" value={formatDuration(stats.totalMinutos)} accent="rose" />
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar folio, título, responsable, cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
          />
        </div>
        <select
          value={estatus}
          onChange={(e) => setEstatus(e.target.value)}
          className="text-sm rounded-lg py-2 px-3"
        >
          <option value="">Todos los estados</option>
          <option value="EN_PROGRESO">En Progreso</option>
          <option value="COMPLETADA">Completada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        {(userRole === 'ADMIN' || userRole === 'SUPERVISOR' || userRole === 'SUPERVISOR_SAFETY_LP') && (
          <select
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            className="text-sm rounded-lg py-2 px-3"
          >
            <option value="">Todos</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="bg-slate-50">
                <th className="font-semibold w-[40px] text-center">#</th>
                <th className="font-semibold w-[85px]">Folio</th>
                <th className="font-semibold">Título</th>
                <th className="font-semibold w-[110px]">Responsable</th>
                <th className="font-semibold w-[110px]">Cliente</th>
                <th className="font-semibold w-[90px]">Inicio</th>
                <th className="font-semibold w-[90px]">Fin</th>
                <th className="font-semibold w-[80px] text-center">Lead Time</th>
                <th className="font-semibold w-[55px] text-center">Acts.</th>
                <th className="font-semibold w-[75px] text-center">Tiempo</th>
                <th className="font-semibold w-[100px] text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-16">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
                  <p className="font-medium text-lg text-slate-400">Sin oportunidades</p>
                  <p className="text-sm mt-1 text-slate-400">Las oportunidades se generan al registrar actividades tipo Cotización.</p>
                </td></tr>
              ) : filtered.map((opp, idx) => {
                const cfg = estadoConfig[opp.estado];
                return (
                  <tr
                    key={`${opp.folio || idx}`}
                    className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                    onClick={() => router.push(`/oportunidades/${opp.folio || `sin-folio-${idx}`}`)}
                  >
                    <td className="text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">{idx + 1}</span>
                    </td>
                    <td>
                      {opp.folio ? (
                        <span className="font-mono font-bold text-indigo-600 text-xs">{opp.folio}</span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">SIN FOLIO ODOO</span>
                      )}
                    </td>
                    <td>
                      <p className="font-medium text-slate-800 text-xs leading-snug truncate max-w-[200px]" title={opp.title}>{opp.title}</p>
                    </td>
                    <td><span className="text-xs text-slate-700">{opp.responsable}</span></td>
                    <td><span className="text-xs text-slate-600">{opp.cliente}</span></td>
                    <td><span className="text-xs text-slate-600">{formatDate(opp.fechaInicio)}</span></td>
                    <td><span className="text-xs text-slate-600">{opp.fechaFin ? formatDate(opp.fechaFin) : '—'}</span></td>
                    <td className="text-center">
                      {opp.leadTimeDays !== null ? (
                        <span className={`text-xs font-bold ${opp.leadTimeDays <= 3 ? 'text-emerald-600' : opp.leadTimeDays <= 7 ? 'text-amber-600' : 'text-red-600'}`}>
                          {opp.leadTimeDays}d
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="text-center"><span className="text-xs font-bold text-slate-700">{opp.totalActividades}</span></td>
                    <td className="text-center"><span className="text-xs text-slate-600">{formatDuration(opp.totalMinutos)}</span></td>
                    <td className="text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
                        <cfg.icon size={10} />
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-${accent}-50`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
