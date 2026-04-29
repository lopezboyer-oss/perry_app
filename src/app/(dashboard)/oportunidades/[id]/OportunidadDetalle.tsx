'use client';

import Link from 'next/link';
import {
  ArrowLeft, Target, Clock, CheckCircle, AlertTriangle,
  TrendingUp, Activity, Timer, Calendar, User, Building,
  BarChart2, Award, Zap, Hash, FileText,
} from 'lucide-react';
import { formatDate, formatDuration, activityTypeLabels, activityStatusLabels, activityTypeColors, activityStatusColors } from '@/lib/utils';

interface ActivityRow {
  id: string;
  workOrderFolio: string | null;
  title: string;
  type: string;
  status: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  result: string | null;
  nextStep: string | null;
  notes: string | null;
  user: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
}

interface Props {
  folio: string;
  activities: ActivityRow[];
  userRole: string;
}

const estadoConfig: Record<string, { label: string; color: string; icon: any }> = {
  EN_PROGRESO: { label: 'En Progreso', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
  COMPLETADA: { label: 'Completada', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
  CANCELADA: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
};

export function OportunidadDetalle({ folio, activities, userRole }: Props) {
  const sinFolio = folio.startsWith('sin-folio-');

  // Derived state from cotizacion activities
  const cotizaciones = activities.filter(a => a.type === 'COTIZACION');
  const first = cotizaciones[0] || activities[0];
  const enProgreso = cotizaciones.find(a => a.status === 'EN_PROGRESO');
  const completada = cotizaciones.find(a => a.status === 'COMPLETADA');

  const fechaInicio = new Date(enProgreso?.date || first.date);
  const fechaFin = completada ? new Date(completada.date) : null;
  let leadTimeDays: number | null = null;
  if (fechaFin) {
    leadTimeDays = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
    if (leadTimeDays < 0) leadTimeDays = 0;
  }

  let estado: 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA' = 'EN_PROGRESO';
  if (completada) estado = 'COMPLETADA';
  else if (cotizaciones.every(a => a.status === 'CANCELADA')) estado = 'CANCELADA';

  const cfg = estadoConfig[estado];

  // Analytics
  const totalMinutos = activities.reduce((s, a) => s + (a.durationMinutes || 0), 0);

  // By type
  const byType: Record<string, { count: number; minutos: number }> = {};
  for (const a of activities) {
    if (!byType[a.type]) byType[a.type] = { count: 0, minutos: 0 };
    byType[a.type].count++;
    byType[a.type].minutos += a.durationMinutes || 0;
  }

  // By status
  const byStatus: Record<string, number> = {};
  for (const a of activities) {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
  }

  // By person
  const byPerson: Record<string, { name: string; count: number; minutos: number }> = {};
  for (const a of activities) {
    const id = a.user?.id || 'unknown';
    const name = a.user?.name || 'Sin asignar';
    if (!byPerson[id]) byPerson[id] = { name, count: 0, minutos: 0 };
    byPerson[id].count++;
    byPerson[id].minutos += a.durationMinutes || 0;
  }

  // Days since start
  const daysSinceStart = Math.ceil((new Date().getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));

  // Average activity duration
  const activitiesWithTime = activities.filter(a => a.durationMinutes);
  const avgDuration = activitiesWithTime.length > 0
    ? Math.round(activitiesWithTime.reduce((s, a) => s + (a.durationMinutes || 0), 0) / activitiesWithTime.length)
    : null;

  const maxType = Object.entries(byType).sort((a, b) => b[1].minutos - a[1].minutos)[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 md:pb-0 animate-fade-in">
      {/* Header */}
      <div>
        <Link href="/oportunidades" className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-3 w-fit">
          <ArrowLeft size={14} /> Oportunidades
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Target className="w-7 h-7 text-indigo-600" />
              {sinFolio ? (
                <span className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-1 rounded">SIN FOLIO ODOO — Completar dato</span>
              ) : (
                <span className="font-mono font-bold text-xl text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg">{folio}</span>
              )}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
                <cfg.icon size={12} /> {cfg.label}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{first.title}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {first.client?.name || '-'} {first.contact?.name ? `· ${first.contact.name}` : ''} · Resp: {first.user?.name || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={<Hash size={18} className="text-indigo-500" />}
          label="Actividades"
          value={activities.length}
          accent="indigo"
        />
        <KpiCard
          icon={<Timer size={18} className="text-violet-500" />}
          label="Tiempo Total"
          value={formatDuration(totalMinutos)}
          accent="violet"
        />
        <KpiCard
          icon={<TrendingUp size={18} className="text-emerald-500" />}
          label="Lead Time"
          value={leadTimeDays !== null ? `${leadTimeDays}d` : estado === 'EN_PROGRESO' ? `${daysSinceStart}d*` : '—'}
          sub={leadTimeDays !== null ? undefined : estado === 'EN_PROGRESO' ? 'transcurridos' : undefined}
          accent={leadTimeDays !== null ? (leadTimeDays <= 3 ? 'emerald' : leadTimeDays <= 7 ? 'amber' : 'red') : 'slate'}
        />
        <KpiCard
          icon={<Calendar size={18} className="text-blue-500" />}
          label="Inicio"
          value={formatDate(fechaInicio.toISOString())}
          accent="blue"
        />
        <KpiCard
          icon={<CheckCircle size={18} className="text-emerald-500" />}
          label="Cierre"
          value={fechaFin ? formatDate(fechaFin.toISOString()) : '—'}
          accent="emerald"
        />
        <KpiCard
          icon={<Zap size={18} className="text-amber-500" />}
          label="Duración Prom."
          value={avgDuration ? formatDuration(avgDuration) : '—'}
          sub="por actividad"
          accent="amber"
        />
      </div>

      {/* Analytics grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* By type */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-indigo-500" /> Actividades por Tipo
          </h3>
          <div className="space-y-3">
            {Object.entries(byType).sort((a, b) => b[1].minutos - a[1].minutos).map(([type, data]) => {
              const pct = totalMinutos > 0 ? Math.round(data.minutos / totalMinutos * 100) : 0;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${activityTypeColors[type] || 'bg-slate-100 text-slate-700'}`}>
                      {activityTypeLabels[type] || type}
                    </span>
                    <span className="text-xs text-slate-600 font-bold">{data.count} act · {formatDuration(data.minutos)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By status */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
            <Activity size={16} className="text-violet-500" /> Estado de Actividades
          </h3>
          <div className="space-y-2">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${activityStatusColors[status] || 'bg-slate-100 text-slate-700'}`}>
                  {activityStatusLabels[status] || status}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-slate-200 w-20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-400"
                      style={{ width: `${Math.round(count / activities.length * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-4 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By person */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
            <User size={16} className="text-rose-500" /> Participación del Equipo
          </h3>
          <div className="space-y-3">
            {Object.entries(byPerson).sort((a, b) => b[1].minutos - a[1].minutos).map(([id, data]) => {
              const pct = totalMinutos > 0 ? Math.round(data.minutos / totalMinutos * 100) : 0;
              return (
                <div key={id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700">{data.name}</span>
                    <span className="text-xs text-slate-500">{data.count} act · {formatDuration(data.minutos)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sales insight strip */}
      <div className="card p-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-100">
        <h3 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
          <Award size={15} className="text-indigo-600" /> Resumen Ejecutivo
        </h3>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <Stat label="Tipo de actividad dominante" value={maxType ? `${activityTypeLabels[maxType[0]] || maxType[0]} (${maxType[1].minutos ? formatDuration(maxType[1].minutos) : '—'})` : '—'} />
          <Stat label="Personas involucradas" value={`${Object.keys(byPerson).length}`} />
          <Stat label="Completadas" value={`${byStatus['COMPLETADA'] || 0} de ${activities.length}`} />
          {leadTimeDays !== null && leadTimeDays > 0 && (
            <Stat label="Eficiencia" value={`${Math.round(totalMinutos / leadTimeDays)}min/día promedio`} />
          )}
          {estado === 'EN_PROGRESO' && (
            <Stat label="Días activos" value={`${daysSinceStart}d desde inicio`} accent="amber" />
          )}
        </div>
      </div>

      {/* Timeline of activities */}
      <div className="card overflow-hidden shadow-md">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <FileText size={16} className="text-slate-500" /> Timeline de Actividades
          </h3>
          <span className="text-xs text-slate-400">{activities.length} actividad{activities.length !== 1 ? 'es' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="bg-slate-50">
                <th className="font-semibold w-[40px] text-center">#</th>
                <th className="font-semibold w-[95px]">Fecha</th>
                <th className="font-semibold w-[85px]">Tipo</th>
                <th className="font-semibold">Título</th>
                <th className="font-semibold w-[105px]">Responsable</th>
                <th className="font-semibold w-[80px]">Horario</th>
                <th className="font-semibold w-[65px] text-center">Tiempo</th>
                <th className="font-semibold w-[85px] text-center">Estado</th>
                <th className="font-semibold min-w-[120px]">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((act, idx) => (
                <tr key={act.id} className="hover:bg-slate-50/50 transition-colors align-top">
                  <td className="text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">{idx + 1}</span>
                  </td>
                  <td>
                    <span className="text-xs font-medium text-slate-700">{formatDate(act.date)}</span>
                  </td>
                  <td>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${activityTypeColors[act.type] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {activityTypeLabels[act.type] || act.type}
                    </span>
                  </td>
                  <td>
                    <Link href={`/actividades/${act.id}`} className="text-xs font-medium text-slate-800 hover:text-indigo-600 leading-snug">
                      {act.title}
                    </Link>
                  </td>
                  <td><span className="text-xs text-slate-600">{act.user?.name || '-'}</span></td>
                  <td>
                    <span className="text-xs font-mono text-slate-600">
                      {act.startTime ? `${act.startTime}${act.endTime ? `–${act.endTime}` : ''}` : '—'}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="text-xs text-slate-600">{act.durationMinutes ? formatDuration(act.durationMinutes) : '—'}</span>
                  </td>
                  <td className="text-center">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${activityStatusColors[act.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {activityStatusLabels[act.status] || act.status}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-slate-500 block max-w-[150px]" title={act.result || ''}>
                      {act.result || act.notes || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg bg-${accent}-50 flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-base font-bold text-slate-800 leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold ${accent === 'amber' ? 'text-amber-600' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
