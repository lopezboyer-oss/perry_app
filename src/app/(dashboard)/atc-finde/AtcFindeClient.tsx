'use client';

import { CalendarDays, Download, ClipboardList } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Activity {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  user: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
  opportunity: { id: string; folio: string } | null;
}

interface Props {
  activities: Activity[];
  users: { id: string; name: string; role: string }[];
  userRole: string;
}

export function AtcFindeClient({ activities, users, userRole }: Props) {
  const router = useRouter();

  // CSV Export focused on ATC Finde (Plan de Trabajo weekend layout)
  const exportCSV = () => {
    const headers = ['Día', 'Hora Inicio', 'Hora Fin', 'Técnico Asignado', 'Proyecto/Cliente', 'Actividad', 'Oportunidad'];
    const rows = activities.map((a) => [
      formatDate(a.date),
      a.startTime || 'Sin Ingresar',
      a.endTime || 'Sin Ingresar',
      a.user?.name || 'POR ASIGNAR',
      a.client?.name || '-',
      `"${a.title.replace(/"/g, '""')}"`,
      a.opportunity?.folio || '-',
    ]);

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atc_finde_plan_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-indigo-600" />
            Plan ATC FINDE
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Visualización estricta de actividades programadas para fines de semana (Sábados y Domingos).
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary text-sm">
            <Download size={16} /> Exportar Plan
          </button>
        </div>
      </div>

      {/* Info Notice */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 shadow-sm">
        <ClipboardList className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-800">
          <p className="font-semibold mb-1">Módulo de Organización Estratégica</p>
          <p>
            Este listado sirve como base para organizar el calendario <strong>hora por hora</strong> del personal asignado a clientes de alta criticidad los fines de semana. Las acciones aquí mostradas mantienen sincronía directa con el listado maestro de Actividades.
          </p>
        </div>
      </div>

      {/* Activities Table */}
      <div className="card overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="bg-slate-50">
                <th className="font-semibold">Día Programado</th>
                <th className="font-semibold">Horario (Inicio - Fin)</th>
                <th className="font-semibold">Técnico Asignado</th>
                <th className="font-semibold">Cliente</th>
                <th className="font-semibold tracking-wide">Actividad a realizar</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="text-slate-400">
                      <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
                      <p className="font-medium text-lg">Fin de Semana Despejado</p>
                      <p className="text-sm mt-1">No se detectaron actividades programadas para sábados ni domingos.</p>
                      <Link href="/actividades/nueva" className="text-indigo-500 hover:underline mt-4 inline-block text-sm">
                        + Programar Tarea
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                activities.map((act) => (
                  <tr key={act.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => router.push(`/actividades/${act.id}`)}>
                    <td className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{formatDate(act.date)}</span>
                        <span className="text-xs text-indigo-500 uppercase tracking-widest font-semibold">
                          {new Date(act.date).getUTCDay() === 6 ? 'SÁBADO' : 'DOMINGO'}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-mono font-medium border border-slate-200">
                        {act.startTime || '--:--'} a {act.endTime || '--:--'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                          {act.user?.name.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {act.user?.name || 'Por definir'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm font-medium text-slate-800">
                        {act.client?.name || 'Asunto Interno'}
                      </span>
                    </td>
                    <td>
                      <p className="font-semibold text-slate-800 text-sm">
                        {act.title.length > 70 ? act.title.substring(0, 70) + '...' : act.title}
                      </p>
                      {act.opportunity && (
                        <p className="text-xs text-indigo-600 mt-0.5">Asociado a: {act.opportunity.folio}</p>
                      )}
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
