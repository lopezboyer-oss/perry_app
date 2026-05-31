'use client';

import { useState, useEffect } from 'react';
import {
  ClipboardList, Target, Clock, AlertTriangle, TrendingUp, Users,
  HardHat, FileSearch, Wrench, Calendar, Trophy, FileText, Receipt,
  ChevronDown, ChevronUp, X, Check
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
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

interface ScheduleActivity {
  id: string;
  userName: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  date: string;
}

interface DashboardData {
  totalActivities: number;
  activitiesByType: { type: string; count: number }[];
  activitiesByStatus: { status: string; count: number }[];
  totalOpportunities: number;
  oppsByStatus: { status: string; count: number }[];
  pendingQuotation: number;
  avgLeadTime: number;
  topActive: TopPerformer | null;
  topQuotations: TopPerformer | null;
  topReceipts: TopPerformer | null;
  hoursByUser: HoursByUser[];
  scheduleActivities: ScheduleActivity[];
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
  pendingPreviousDaysCount: number;
  pendingPreviousDaysActivities: {
    id: string;
    title: string;
    type: string;
    status: string;
    date: string;
    userName: string;
    clientName: string;
  }[];
}

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'week', label: 'Esta Semana' },
];

export function DashboardClient({ data }: { data: DashboardData }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [pastActivities, setPastActivities] = useState(data.pendingPreviousDaysActivities || []);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [cancelReason, setCancelReason] = useState<Record<string, string>>({});
  const [cancelHasCharges, setCancelHasCharges] = useState<Record<string, boolean>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, 'complete' | 'cancel'>>({});

  useEffect(() => {
    setPastActivities(data.pendingPreviousDaysActivities || []);
  }, [data.pendingPreviousDaysActivities]);

  const handleQuickComplete = async (activityId: string) => {
    setLoadingId(activityId);
    try {
      const notes = actionNotes[activityId] || '';
      const res = await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETADA',
          result: notes.trim() || 'Actividad completada desde Dashboard'
        })
      });
      if (!res.ok) {
        alert('Error al completar actividad');
        return;
      }
      setPastActivities(prev => prev.filter(a => a.id !== activityId));
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('Error de red');
    } finally {
      setLoadingId(null);
    }
  };

  const handleQuickCancel = async (activityId: string) => {
    const reason = cancelReason[activityId] || 'OTRA';
    const notes = actionNotes[activityId] || '';
    const hasCharges = !!cancelHasCharges[activityId];

    if (reason === 'OTRA' && !notes.trim()) {
      alert('Debe especificar detalles en la nota si el motivo es "Otra"');
      return;
    }

    setLoadingId(activityId);
    try {
      const res = await fetch(`/api/activities/${activityId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, notes: notes.trim(), hasCharges })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Error al cancelar actividad');
        return;
      }
      setPastActivities(prev => prev.filter(a => a.id !== activityId));
      router.refresh();
    } catch (e) {
      console.error(e);
      alert('Error de red');
    } finally {
      setLoadingId(null);
    }
  };

  const CANCEL_REASONS = [
    { value: 'PERMISOLOGIA_INCOMPLETA', label: 'Permisología Incompleta' },
    { value: 'AREA_NO_DESPEJADA', label: 'Área no despejada de equipos Cliente' },
    { value: 'FALTO_PERSONAL_NUESTRO', label: 'Faltó Personal nuestro' },
    { value: 'FALTO_PERSONAL_CLIENTE', label: 'Faltó personal Cliente' },
    { value: 'FALTO_MATERIAL', label: 'Faltó Material' },
    { value: 'MEDIDAS_NO_COINCIDEN', label: 'Medidas de fabricación/Instalación no coinciden' },
    { value: 'ALCANCE_DISTINTO', label: 'Alcance distinto al considerado en plan' },
    { value: 'OBSTRUCCION_OTRA_EMPRESA', label: 'Obstrucción con otra empresa' },
    { value: 'OTRA', label: 'Otra' },
  ];

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
      {/* Alerta de Actividades Vencidas */}
      {data.pendingPreviousDaysCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 border-l-4 border-l-rose-600 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-rose-900 text-sm">Actividades Vencidas Pendientes</h4>
              <p className="text-xs text-rose-700">Hay {data.pendingPreviousDaysCount} actividades de días anteriores que aún no han sido completadas o canceladas.</p>
            </div>
          </div>
          <button
            onClick={() => setAlertModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition-all sm:self-center self-start"
          >
            Ver y Resolver
          </button>
        </div>
      )}

      <Dialog.Root open={alertModalOpen} onOpenChange={setAlertModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 animate-fade-in" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-2xl animate-slide-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                Cierre Express de Actividades Vencidas
              </Dialog.Title>
              <Dialog.Close className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={18} />
              </Dialog.Close>
            </div>
            
            <p className="text-xs text-slate-500 mb-4">
              Estas actividades están programadas para fechas pasadas y siguen pendientes. Por favor, complétalas o cancélalas para mantener el control financiero al día.
            </p>

            {pastActivities.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                🎉 ¡Excelente! No quedan actividades vencidas pendientes.
              </div>
            ) : (
              <div className="space-y-4">
                {pastActivities.map((act) => {
                  const isExpanded = expandedActivityId === act.id;
                  const currentTab = activeTab[act.id] || 'complete';
                  const isLoading = loadingId === act.id;

                  return (
                    <div key={act.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50/50">
                      {/* Header block (clickable to expand) */}
                      <div
                        onClick={() => setExpandedActivityId(isExpanded ? null : act.id)}
                        className="p-3.5 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-100/50 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                            {formatDate(act.date)} • {activityTypeLabels[act.type] || act.type}
                          </p>
                          <h5 className="font-bold text-slate-800 text-sm truncate">{act.title}</h5>
                          <p className="text-xs text-slate-500 truncate">
                            👤 {act.userName} | 🏢 {act.clientName}
                          </p>
                        </div>
                        <span className="text-slate-400">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </div>

                      {/* Expandable actions panel */}
                      {isExpanded && (
                        <div className="p-4 border-t border-slate-200 bg-white space-y-3 animate-fade-in">
                          {/* Segmented control for Complete vs Cancel */}
                          <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setActiveTab({ ...activeTab, [act.id]: 'complete' })}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                currentTab === 'complete' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
                              }`}
                            >
                              ✓ Completar
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab({ ...activeTab, [act.id]: 'cancel' })}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                currentTab === 'cancel' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600'
                              }`}
                            >
                              ✗ Cancelar
                            </button>
                          </div>

                          {currentTab === 'complete' ? (
                            <div className="space-y-2">
                              <label className="block text-[11px] font-semibold text-slate-500 uppercase">Notas de Cierre (Resultados)</label>
                              <textarea
                                value={actionNotes[act.id] || ''}
                                onChange={(e) => setActionNotes({ ...actionNotes, [act.id]: e.target.value })}
                                className="w-full text-xs rounded-lg border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 p-2 p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                placeholder="Describa el resultado o avance de la actividad..."
                                rows={2}
                              />
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleQuickComplete(act.id)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                              >
                                {isLoading ? 'Guardando...' : 'Confirmar como Completada'}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Motivo de Cancelación</label>
                                <select
                                  value={cancelReason[act.id] || 'OTRA'}
                                  onChange={(e) => setCancelReason({ ...cancelReason, [act.id]: e.target.value })}
                                  className="w-full text-xs rounded-lg border-slate-200"
                                >
                                  {CANCEL_REASONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Detalles / Justificación</label>
                                <textarea
                                  value={actionNotes[act.id] || ''}
                                  onChange={(e) => setActionNotes({ ...actionNotes, [act.id]: e.target.value })}
                                  className="w-full text-xs rounded-lg border-slate-200 focus:ring-red-500 focus:border-red-500 p-2 p-2 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                  placeholder="Detalle el motivo de la cancelación..."
                                  rows={2}
                                />
                              </div>

                              <label className="flex items-center gap-2 cursor-pointer py-1">
                                <input
                                  type="checkbox"
                                  checked={!!cancelHasCharges[act.id]}
                                  onChange={(e) => setCancelHasCharges({ ...cancelHasCharges, [act.id]: e.target.checked })}
                                  className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                                />
                                <span className="text-xs font-semibold text-slate-700">¿Aplicar cargos al cliente por fletes/tiempos?</span>
                              </label>

                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => handleQuickCancel(act.id)}
                                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                              >
                                {isLoading ? 'Guardando...' : 'Confirmar Cancelación'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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
        <div className="card p-4 border-l-4 border-l-violet-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Lead Time Promedio</p>
              <p className="text-2xl font-bold text-slate-800">{data.avgLeadTime > 0 ? `${data.avgLeadTime}d` : '—'}</p>
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

        {/* Schedule / Hours by User — dual mode */}
        <ScheduleTimeline
          hoursByUser={data.hoursByUser}
          scheduleActivities={data.scheduleActivities}
          period={data.period}
          periodLabel={periodLabel}
        />
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

// ─── Schedule Timeline (dual-mode: day=timeline, week=bars+expand) ─

const SCHEDULE_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  VISITA_CAMPO: { bg: 'bg-blue-200', border: 'border-blue-400', text: 'text-blue-900' },
  COTIZACION: { bg: 'bg-amber-200', border: 'border-amber-400', text: 'text-amber-900' },
  EJECUCION: { bg: 'bg-green-200', border: 'border-green-400', text: 'text-green-900' },
  PLANEACION: { bg: 'bg-purple-200', border: 'border-purple-400', text: 'text-purple-900' },
  DISENO: { bg: 'bg-rose-200', border: 'border-rose-400', text: 'text-rose-900' },
  CONSORCIO: { bg: 'bg-cyan-200', border: 'border-cyan-400', text: 'text-cyan-900' },
};

function ScheduleTimeline({
  hoursByUser,
  scheduleActivities,
  period,
  periodLabel,
}: {
  hoursByUser: HoursByUser[];
  scheduleActivities: ScheduleActivity[];
  period: string;
  periodLabel: string;
}) {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const isSingleDay = period === 'today' || period === 'yesterday';

  const toggleUser = (userName: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userName)) next.delete(userName);
      else next.add(userName);
      return next;
    });
  };

  // For single day: show timeline directly
  if (isSingleDay) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Horario por Responsable</h3>
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{periodLabel}</span>
        </div>
        {scheduleActivities.length > 0 ? (
          <ScheduleTimelineChart activities={scheduleActivities} />
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            Sin actividades con horario en este periodo
          </div>
        )}
      </div>
    );
  }

  // Group schedule activities by user
  const activitiesByUserMap = new Map<string, ScheduleActivity[]>();
  for (const act of scheduleActivities) {
    if (!activitiesByUserMap.has(act.userName)) activitiesByUserMap.set(act.userName, []);
    activitiesByUserMap.get(act.userName)!.push(act);
  }

  // For week: show accumulated bars with expand buttons
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Horas por Responsable</h3>
        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{periodLabel}</span>
      </div>
      {hoursByUser.length > 0 ? (
        <div className="space-y-2">
          {hoursByUser.map((user) => {
            const isExpanded = expandedUsers.has(user.userName);
            const userActivities = activitiesByUserMap.get(user.userName) || [];
            const hasSchedule = userActivities.length > 0;
            const maxHours = hoursByUser[0]?.hours || 1;
            const barPct = Math.max(5, (user.hours / maxHours) * 100);

            return (
              <div key={user.userName}>
                <div
                  className={`flex items-center gap-3 ${hasSchedule ? 'cursor-pointer hover:bg-slate-50 rounded-lg px-1 -mx-1 transition-colors' : ''}`}
                  onClick={() => hasSchedule && toggleUser(user.userName)}
                >
                  <div className="w-28 flex-shrink-0 text-right">
                    <span className="text-xs font-semibold text-slate-700 truncate block">{user.userName}</span>
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-7 bg-slate-100 rounded-md overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${barPct}%` }}
                      >
                        <span className="text-[10px] font-bold text-white drop-shadow-sm">{user.hours}h</span>
                      </div>
                    </div>
                  </div>
                  {hasSchedule && (
                    <button className="p-1 text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                </div>

                {isExpanded && hasSchedule && (
                  <div className="ml-28 pl-3 mt-2 mb-3 border-l-2 border-indigo-200 animate-fade-in">
                    <WeeklyDetailTimeline activities={userActivities} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          Sin horas registradas en este periodo
        </div>
      )}
    </div>
  );
}

// ─── Weekly Detail: groups activities by date and shows mini timelines ──

function WeeklyDetailTimeline({ activities }: { activities: ScheduleActivity[] }) {
  const byDate = new Map<string, ScheduleActivity[]>();
  for (const act of activities) {
    const dateKey = act.date.split('T')[0];
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(act);
  }
  const sortedDates = Array.from(byDate.keys()).sort();

  return (
    <div className="space-y-3">
      {sortedDates.map((dateStr) => {
        const dayActivities = byDate.get(dateStr)!;
        const dateLabel = new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          timeZone: 'UTC',
        });
        return (
          <div key={dateStr}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{dateLabel}</p>
            <ScheduleTimelineChart activities={dayActivities} compact />
          </div>
        );
      })}
    </div>
  );
}

// ─── Timeline Chart: renders horizontal Gantt bars ──────────────

function ScheduleTimelineChart({
  activities,
  compact = false,
}: {
  activities: ScheduleActivity[];
  compact?: boolean;
}) {
  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  // Find min/max time range
  let minTime = 1440;
  let maxTime = 0;
  for (const act of activities) {
    const s = parseTime(act.startTime);
    const e = parseTime(act.endTime);
    if (s < minTime) minTime = s;
    if (e > maxTime) maxTime = e;
  }
  minTime = Math.floor(minTime / 60) * 60;
  maxTime = Math.ceil(maxTime / 60) * 60;
  if (maxTime <= minTime) maxTime = minTime + 60;
  const totalSpan = maxTime - minTime;

  // Hour labels
  const hourLabels: number[] = [];
  for (let t = minTime; t <= maxTime; t += 60) hourLabels.push(t);

  // Group by user
  const userMap = new Map<string, ScheduleActivity[]>();
  for (const act of activities) {
    if (!userMap.has(act.userName)) userMap.set(act.userName, []);
    userMap.get(act.userName)!.push(act);
  }
  const users = Array.from(userMap.keys()).sort();

  const rowH = compact ? 'h-5' : 'h-8';
  const textSize = compact ? 'text-[8px]' : 'text-[10px]';

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[350px]">
        {/* Hour header */}
        <div className={`flex ${compact ? '' : 'ml-28'}`}>
          <div className="flex-1 relative h-5 border-b border-slate-200">
            {hourLabels.map((t) => (
              <span
                key={t}
                className="absolute text-[9px] text-slate-400 font-medium -translate-x-1/2 bottom-0.5"
                style={{ left: `${((t - minTime) / totalSpan) * 100}%` }}
              >
                {Math.floor(t / 60)}
              </span>
            ))}
          </div>
        </div>

        {/* User rows */}
        {users.map((userName) => {
          const userActs = userMap.get(userName)!;
          return (
            <div key={userName} className={`flex items-center gap-2 ${compact ? 'py-0.5' : 'py-1'}`}>
              {!compact && (
                <div className="w-28 flex-shrink-0 text-right pr-2">
                  <span className="text-xs font-semibold text-slate-700 truncate block">{userName}</span>
                </div>
              )}
              <div className={`flex-1 relative ${rowH} bg-slate-50 rounded-md border border-slate-100`}>
                {/* Gridlines */}
                {hourLabels.map((t) => (
                  <div
                    key={t}
                    className="absolute top-0 bottom-0 border-l border-slate-200/60"
                    style={{ left: `${((t - minTime) / totalSpan) * 100}%` }}
                  />
                ))}
                {/* Activity blocks */}
                {userActs.map((act) => {
                  const start = parseTime(act.startTime);
                  const end = parseTime(act.endTime);
                  const left = ((start - minTime) / totalSpan) * 100;
                  const width = ((end - start) / totalSpan) * 100;
                  const colors = SCHEDULE_TYPE_COLORS[act.type] || SCHEDULE_TYPE_COLORS.EJECUCION;
                  const label = activityTypeLabels[act.type] || act.type;
                  return (
                    <div
                      key={act.id}
                      className={`absolute top-0.5 bottom-0.5 ${colors.bg} ${colors.border} border rounded-sm flex items-center overflow-hidden px-1 cursor-default`}
                      style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                      title={`${act.title}\n${act.startTime} – ${act.endTime}\n${label}`}
                    >
                      <span className={`${textSize} font-semibold ${colors.text} truncate leading-tight`}>
                        {width > 10 ? act.title : (width > 5 ? label.substring(0, 4) : '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        {!compact && (
          <div className="flex flex-wrap gap-3 mt-3 ml-28">
            {Object.entries(SCHEDULE_TYPE_COLORS).map(([type, colors]) => {
              if (!activities.some((a) => a.type === type)) return null;
              return (
                <div key={type} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-sm ${colors.bg} ${colors.border} border`} />
                  <span className="text-[10px] text-slate-500 font-medium">{activityTypeLabels[type] || type}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
