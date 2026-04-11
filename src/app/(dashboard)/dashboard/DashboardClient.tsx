'use client';

import {
  ClipboardList, Target, Clock, AlertTriangle, TrendingUp, Users,
  HardHat, FileSearch, Wrench, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
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

interface DashboardData {
  totalActivities: number;
  activitiesByType: { type: string; count: number }[];
  activitiesByStatus: { status: string; count: number }[];
  totalOpportunities: number;
  oppsByStatus: { status: string; count: number }[];
  pendingQuotation: number;
  overdue: number;
  avgLeadTime: number;
  totalHours: number;
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
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const typeChartData = data.activitiesByType.map((item) => ({
    name: activityTypeLabels[item.type] || item.type,
    value: item.count,
  }));

  const userChartData = data.activitiesByUser.sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6 pb-20 md:pb-0 animate-fade-in">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Resumen general de actividades y oportunidades</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Actividades"
          value={data.totalActivities}
          icon={ClipboardList}
          color="indigo"
        />
        <KPICard
          title="Horas Registradas"
          value={data.totalHours}
          suffix="hrs"
          icon={Clock}
          color="emerald"
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
      </div>

      {/* Alert cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className="card p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Por Responsable</p>
              <p className="text-2xl font-bold text-slate-800">
                {data.activitiesByUser.length} personas
              </p>
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
          </div>
        </div>

        {/* Activities by User - Bar Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Actividades por Responsable</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="userName" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Actividades" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Type Breakdown Cards */}
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

      {/* Opportunities by Status */}
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
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                opportunityStatusLabels[item.status] ? '' : ''
              } bg-slate-50 border border-slate-200`}
            >
              <span className="text-slate-500">{opportunityStatusLabels[item.status] || item.status}</span>
              <span className="ml-2 text-lg font-bold text-slate-800">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activities Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Actividades Recientes</h3>
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
                    No hay actividades registradas aún
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

function KPICard({
  title,
  value,
  suffix,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  suffix?: string;
  icon: any;
  color: 'indigo' | 'emerald' | 'amber' | 'purple';
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
        </div>
        <div className={`p-2 md:p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
          <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
