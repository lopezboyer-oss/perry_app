'use client';

import {
  ClipboardList, Target, Clock, AlertTriangle, TrendingUp, Users,
  HardHat, FileSearch, Wrench, Calendar, Trophy, FileText, Receipt,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  activityTypeLabels, activityStatusLabels, activityTypeColors,
  opportunityStatusLabels, formatDate,
} from '@/lib/utils';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4', '#f97316'];

const typeIcons: Record<string, any> = {
  VISITA_CAMPO: HardHat,
  COTIZACION: FileSearch,
  EJECUCION: Wrench,
  PLANEACION: Calendar,
  DISENO: FileSearch,
};

interface TopPerformer {
  userName: string;
  count: number;
}

interface HoursByUser {
  userName: string;
  hours: number;
  minutes: number;
}

interface DashboardData {
  totalActivities: number;
  activitiesByType: { type: string; count: number }[];
  activitiesByStatus: { status: string; count: number }[];
  totalOpportunities: number;
  oppsByStatus: { status: string; count: number }[];
  pendingQuotation: number;
  overdue: number;
  avgLeadTime: number;
  topActive: TopPerformer | null;
  topQuotations: TopPerformer | null;
  topReceipts: TopPerformer | null;
  hoursByUser: HoursByUser[];
  recentActivities: {
    id: string;
    title: string;
    type: string;
    status: string;
    date: string;
    userName: string;
    clientName: string;
  }[];
  activitiesByUser: { userName: string; count: number }[];
  availableUsers?: { id: string; name: string }[];
  selectedUserId?: string | null;
  period: string;
}

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'week', label: 'Esta Semana' },
];

export function DashboardClient({ data }: { data: DashboardData }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const typeChartData = data.activitiesByType.map((item) => ({
    name: activityTypeLabels[item.type] || item.type,
    value: item.count,
  }));

  const userChartData = data.activitiesByUser.sort((a, b) => b.count - a.count);

  const navigateWithParams = (params: Record<string, string | undefined>) => {
    const current = new URLSearchParams(searchParams?.toString() || '');
    Object.entries(params).forEach(([k, v]) => {
      if (v) current.set(k, v);
      else current.delete(k);
    });
    router.push(`/dashboard?${current.toString()}`);
  };

  const periodLabel = PERIOD_OPTIONS.find((p) => p.key === data.period)?.label || 'Hoy';

  return (
    <div className="space-y-6 pb-20 md:pb-0 animate-fade-in">
      {/* Title, Period Filters & User Filter */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Resumen general de actividades y oportunidades</p>
          </div>
          
          {/* User Filter Dropdown */}
          {data.availableUsers && data.availableUsers.length > 0 && (
            <div className="w-full md:w-64">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Filtrar por Responsable</label>
              <select
                value={data.selectedUserId || ''}
                onChange={(e) => navigateWithParams({ user: e.target.value || undefined })}
                className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Vista Global (Todos)</option>
                {data.availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Period Filter Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Periodo:</span>
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => navigateWithParams({ period: opt.key })}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                data.period === opt.key
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards — Row 1: Activities + Opportunities */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Actividades Periodo"
          value={data.totalActivities}
          icon={ClipboardList}
          color="indigo"
          subtitle={periodLabel}
        />
        <KPICard
          title="Oportunidades"
          value={data.totalOpportunities}
          icon={Target}
          color="amber"
        />
        <KPICard
          title="Lead Time Prom."
          value={data.avgLeadTime}
          suffix="días"
          icon={TrendingUp}
          color="purple"
        />
        <KPICard
          title="Personas Activas"
          value={data.activitiesByUser.length}
          icon={Users}
          color="emerald"
          subtitle={periodLabel}
        />
      </div>

      {/* KPI Cards — Row 2: Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TopPerformerCard
          title="Más Activo"
          performer={data.topActive}
          icon={Trophy}
          accentColor="indigo"
          metricLabel="actividades"
          periodLabel={periodLabel}
        />
        <TopPerformerCard
          title="Más Cotizaciones"
          performer={data.topQuotations}
          icon={FileText}
          accentColor="amber"
          metricLabel="cotizaciones completadas"
          periodLabel={periodLabel}
        />
        <TopPerformerCard
          title="Más Recibos"
          performer={data.topReceipts}
          icon={Receipt}
          accentColor="emerald"
          metricLabel="recibos confirmados"
          periodLabel={periodLabel}
        />
      </div>

      {/* Alert cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pendientes de Cotizar</p>
              <p className="text-2xl font-bold text-slate-800">{data.pendingQuotation}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 border-l-4 border-l-red-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Oportunidades Atrasadas</p>
              <p className="text-2xl font-bold text-slate-800">{data.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activities by Type - Pie Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Actividades por Tipo</h3>
          <div className="h-72">
            {typeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {typeChartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Sin actividades en este periodo
              </div>
            )}
          </div>
        </div>

        {/* Hours by User - Bar Chart (replaces old Activities by User) */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Horas por Responsable</h3>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{periodLabel}</span>
          </div>
          <div className="h-72">
            {data.hoursByUser.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hoursByUser} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} unit=" hrs" />
                  <YAxis
                    type="category"
                    dataKey="userName"
                    tick={{ fontSize: 11 }}
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value: number) => [`${value} hrs`, 'Horas']}
                  />
                  <Bar dataKey="hours" fill="#6366f1" radius={[0, 6, 6, 0]} name="Horas" barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Sin horas registradas en este periodo
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Type Breakdown Cards */}
      {data.activitiesByType.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {data.activitiesByType.map((item) => {
            const Icon = typeIcons[item.type] || ClipboardList;
            return (
              <div key={item.type} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${activityTypeColors[item.type]?.split(' ')[0] || 'bg-slate-100'}`}>
                    <Icon className={`w-5 h-5 ${activityTypeColors[item.type]?.split(' ')[1] || 'text-slate-600'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{activityTypeLabels[item.type]}</p>
                    <p className="text-xl font-bold text-slate-800">{item.count}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Opportunities by Status */}
      {data.oppsByStatus.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Estado de Oportunidades</h3>
            <Link href="/oportunidades" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Ver todas →
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {data.oppsByStatus.map((item) => (
              <div
                key={item.status}
                className="rounded-lg px-4 py-2 text-sm font-medium bg-slate-50 border border-slate-200"
              >
                <span className="text-slate-500">{opportunityStatusLabels[item.status] || item.status}</span>
                <span className="ml-2 text-lg font-bold text-slate-800">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activities Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-800">Actividades Recientes</h3>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{periodLabel}</span>
          </div>
          <Link href="/actividades" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Ver todas →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Título</th>
                <th>Tipo</th>
                <th>Responsable</th>
                <th>Cliente</th>
                <th>Estatus</th>
              </tr>
            </thead>
            <tbody>
              {data.recentActivities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No hay actividades registradas en este periodo
                  </td>
                </tr>
              ) : (
                data.recentActivities.map((act) => (
                  <tr key={act.id}>
                    <td className="whitespace-nowrap">{formatDate(act.date)}</td>
                    <td>
                      <Link href={`/actividades/${act.id}`} className="text-indigo-600 hover:text-indigo-700 font-medium">
                        {act.title.length > 50 ? act.title.substring(0, 50) + '...' : act.title}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge ${activityTypeColors[act.type] || ''}`}>
                        {activityTypeLabels[act.type] || act.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">{act.userName}</td>
                    <td className="whitespace-nowrap">{act.clientName}</td>
                    <td>
                      <span className={`badge ${
                        act.status === 'COMPLETADA' ? 'bg-green-100 text-green-800 border-green-200' :
                        act.status === 'EN_PROGRESO' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        act.status === 'PENDIENTE' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {activityStatusLabels[act.status] || act.status}
                      </span>
                    </td>
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

// ─── Top Performer Card ──────────────────────────────────────────

function TopPerformerCard({
  title,
  performer,
  icon: Icon,
  accentColor,
  metricLabel,
  periodLabel,
}: {
  title: string;
  performer: TopPerformer | null;
  icon: any;
  accentColor: 'indigo' | 'amber' | 'emerald';
  metricLabel: string;
  periodLabel: string;
}) {
  const colors = {
    indigo: {
      bg: 'bg-indigo-50',
      iconBg: 'from-indigo-500 to-indigo-600',
      shadow: 'shadow-indigo-500/20',
      text: 'text-indigo-600',
      badge: 'bg-indigo-100 text-indigo-700',
    },
    amber: {
      bg: 'bg-amber-50',
      iconBg: 'from-amber-500 to-amber-600',
      shadow: 'shadow-amber-500/20',
      text: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700',
    },
    emerald: {
      bg: 'bg-emerald-50',
      iconBg: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/20',
      text: 'text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-700',
    },
  };

  const c = colors[accentColor];

  return (
    <div className="card p-5 relative overflow-hidden">
      {/* Subtle background accent */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${c.bg} opacity-50`} />
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${c.iconBg} ${c.shadow} shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
            <span className={`text-[10px] font-medium ${c.badge} px-1.5 py-0.5 rounded-md`}>{periodLabel}</span>
          </div>
        </div>
        {performer ? (
          <div>
            <p className="text-lg font-bold text-slate-800 truncate">{performer.userName}</p>
            <p className={`text-sm font-semibold ${c.text}`}>
              {performer.count} {metricLabel}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-400 italic">Sin datos en este periodo</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────

function KPICard({
  title,
  value,
  suffix,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: number;
  suffix?: string;
  icon: any;
  color: 'indigo' | 'emerald' | 'amber' | 'purple';
  subtitle?: string;
}) {
  const colorClasses = {
    indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/20',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
    amber: 'from-amber-500 to-amber-600 shadow-amber-500/20',
    purple: 'from-purple-500 to-purple-600 shadow-purple-500/20',
  };

  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs md:text-sm text-slate-500 mb-1">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-slate-800">
            {value.toLocaleString()}
            {suffix && <span className="text-base font-normal text-slate-400 ml-1">{suffix}</span>}
          </p>
          {subtitle && (
            <p className="text-[10px] font-medium text-indigo-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 md:p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
          <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
