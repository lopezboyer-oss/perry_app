'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts';
import { activityTypeLabels } from '@/lib/utils';
import { TrendingUp, Clock, Target, Award, ArrowRightLeft, Users } from 'lucide-react';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#8b5cf6'];
const TYPE_COLORS: Record<string, string> = {
  VISITA_CAMPO: '#6366f1',
  COTIZACION: '#f59e0b',
  EJECUCION: '#10b981',
  PLANEACION: '#8b5cf6',
  DISENO: '#f43f5e',
};

interface AnalyticsData {
  byType: { type: string; count: number; hours: number }[];
  monthlyData: any[];
  byUser: { userName: string; count: number; hours: number }[];
  avgLeadTime: number;
  avgVisitDelay: number;
  conversionRate: number;
  winRate: number;
  totalVisits: number;
  totalQuotations: number;
  wonOpps: number;
}

export function AnaliticaClient({ data }: { data: AnalyticsData }) {
  const typeChartData = data.byType.map((item) => ({
    name: activityTypeLabels[item.type] || item.type,
    actividades: item.count,
    horas: item.hours,
  }));

  const hoursChartData = data.byType.map((item) => ({
    name: activityTypeLabels[item.type] || item.type,
    value: item.hours,
  }));

  const monthlyChartData = data.monthlyData.map((m) => ({
    month: m.month,
    Visitas: m.VISITA_CAMPO || 0,
    Cotizaciones: m.COTIZACION || 0,
    Ejecuciones: m.EJECUCION || 0,
    Planeación: m.PLANEACION || 0,
    Diseño: m.DISENO || 0,
  }));

  return (
    <div className="space-y-6 pb-20 md:pb-0 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Analítica</h1>
        <p className="text-slate-500 text-sm mt-1">Métricas detalladas de rendimiento y conversión</p>
      </div>

      {/* Conversion KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tiempo Prom. Visita → Cotización"
          value={data.avgLeadTime}
          suffix="días"
          icon={Clock}
          color="indigo"
        />
        <MetricCard
          title="Tiempo Prom. Programada → Realizada"
          value={data.avgVisitDelay}
          suffix="días"
          icon={ArrowRightLeft}
          color="amber"
        />
        <MetricCard
          title="Conversión Visita → Cotización"
          value={data.conversionRate}
          suffix="%"
          icon={TrendingUp}
          color="emerald"
        />
        <MetricCard
          title="Tasa de Cierre"
          value={data.winRate}
          suffix="%"
          icon={Award}
          color="purple"
        />
      </div>

      {/* Funnel */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Embudo de Conversión</h3>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <FunnelStep label="Visitas" value={data.totalVisits} color="bg-blue-500" width="w-48" />
          <div className="text-slate-300 text-2xl">→</div>
          <FunnelStep label="Cotizaciones" value={data.totalQuotations} color="bg-amber-500" width="w-40" />
          <div className="text-slate-300 text-2xl">→</div>
          <FunnelStep label="Ganadas" value={data.wonOpps} color="bg-green-500" width="w-32" />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activities by type */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Actividades por Tipo</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="actividades" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hours by type */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Horas por Tipo de Actividad</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={hoursChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}h`}
                >
                  {hoursChartData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly trend */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Tendencia Mensual por Tipo</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px' }} />
              <Legend />
              <Area type="monotone" dataKey="Visitas" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
              <Area type="monotone" dataKey="Cotizaciones" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
              <Area type="monotone" dataKey="Ejecuciones" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              <Area type="monotone" dataKey="Planeación" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              <Area type="monotone" dataKey="Diseño" stackId="1" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* By user table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Rendimiento por Responsable</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Responsable</th>
                <th>Actividades</th>
                <th>Horas</th>
                <th>Prom. hrs/actividad</th>
              </tr>
            </thead>
            <tbody>
              {data.byUser.sort((a, b) => b.count - a.count).map((u) => (
                <tr key={u.userName}>
                  <td className="font-medium">{u.userName}</td>
                  <td>{u.count}</td>
                  <td>{u.hours}h</td>
                  <td>{u.count > 0 ? (u.hours / u.count).toFixed(1) : '-'}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  suffix,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  suffix: string;
  icon: any;
  color: 'indigo' | 'amber' | 'emerald' | 'purple';
}) {
  const bgColors = {
    indigo: 'bg-indigo-50',
    amber: 'bg-amber-50',
    emerald: 'bg-emerald-50',
    purple: 'bg-purple-50',
  };
  const iconColors = {
    indigo: 'text-indigo-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    purple: 'text-purple-600',
  };

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${bgColors[color]}`}>
          <Icon className={`w-5 h-5 ${iconColors[color]}`} />
        </div>
        <div>
          <p className="text-xs text-slate-500 leading-tight">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {value}
            <span className="text-sm font-normal text-slate-400 ml-1">{suffix}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function FunnelStep({ label, value, color, width }: { label: string; value: number; color: string; width: string }) {
  return (
    <div className="text-center">
      <div className={`${color} ${width} h-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold shadow-md mx-auto`}>
        {value}
      </div>
      <p className="text-sm text-slate-600 mt-2 font-medium">{label}</p>
    </div>
  );
}
