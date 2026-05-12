'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, Shield, ShieldAlert, CheckCircle, XCircle, Image, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AlarmaActivity {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  workOrderFolio: string | null;
  teraFolio: string | null;
  teraUploadedAt: string | null;
  teraUploadedBy: string | null;
  hasImage: boolean;
  hasFolio: boolean;
  user: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
}

interface Props {
  activities: AlarmaActivity[];
  weekendDates: string[];
  selectedWeekend: string;
  totalActivities: number;
  compliantCount: number;
}

export function AlarmaTeraClient({ activities, weekendDates, selectedWeekend, totalActivities, compliantCount }: Props) {
  const router = useRouter();
  const alarmaCount = activities.length;
  const complianceRate = totalActivities > 0 ? Math.round((compliantCount / totalActivities) * 100) : 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-red-500 to-amber-500 rounded-xl shadow-lg shadow-red-500/20">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Alarma TERA</h1>
            <p className="text-sm text-slate-500">Actividades sin imagen y/o folio TERA</p>
          </div>
        </div>
        <select
          className="text-sm border border-slate-300 rounded-lg px-3 py-2"
          value={selectedWeekend}
          onChange={(e) => router.push(`/alarma-tera?weekend=${e.target.value}`)}
        >
          {weekendDates.map((d) => (
            <option key={d} value={d}>Fin de Semana: {d}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Shield className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Total Actividades</p>
              <p className="text-2xl font-bold text-slate-800">{totalActivities}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Cumplidas</p>
              <p className="text-2xl font-bold text-emerald-600">{compliantCount}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${alarmaCount > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${alarmaCount > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Con Alarma</p>
              <p className={`text-2xl font-bold ${alarmaCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{alarmaCount}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${complianceRate >= 90 ? 'bg-emerald-100' : complianceRate >= 70 ? 'bg-amber-100' : 'bg-red-100'}`}>
              <Shield className={`w-5 h-5 ${complianceRate >= 90 ? 'text-emerald-600' : complianceRate >= 70 ? 'text-amber-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Cumplimiento</p>
              <p className={`text-2xl font-bold ${complianceRate >= 90 ? 'text-emerald-600' : complianceRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{complianceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {alarmaCount === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500 opacity-60" />
          <h2 className="text-xl font-bold text-emerald-700 mb-2">¡Sin Alarmas!</h2>
          <p className="text-slate-500">Todas las actividades del plan cumplen con imagen y folio TERA.</p>
        </div>
      ) : (
        <div className="card overflow-hidden shadow-md border-red-200">
          <div className="bg-gradient-to-r from-red-50 to-amber-50 px-4 py-3 border-b border-red-200">
            <h2 className="font-bold text-red-800 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" />
              Actividades con TERA Pendiente ({alarmaCount})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr className="bg-red-50/50">
                  <th className="font-semibold w-[40px] text-center">#</th>
                  <th className="font-semibold w-[100px]">Día</th>
                  <th className="font-semibold w-[100px]">Horario</th>
                  <th className="font-semibold w-[120px]">Responsable</th>
                  <th className="font-semibold w-[120px]">Cliente</th>
                  <th className="font-semibold">Actividad</th>
                  <th className="font-semibold w-[80px]">Folio Odoo</th>
                  <th className="font-semibold w-[90px] text-center">Imagen</th>
                  <th className="font-semibold w-[90px] text-center">Folio TERA</th>
                  <th className="font-semibold w-[100px] text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((act, idx) => (
                  <tr key={act.id} className="hover:bg-red-50/30 transition-colors align-top">
                    <td className="text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="font-medium text-slate-800 text-xs">{formatDate(act.date)}</span>
                      <span className="block text-[10px] text-red-500 uppercase font-bold">
                        {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'][new Date(act.date).getUTCDay()]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono border border-slate-200">
                        {act.startTime || '--:--'} — {act.endTime || '--:--'}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-medium text-slate-700">{act.user?.name || '-'}</span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-600">{act.client?.name || '-'}</span>
                    </td>
                    <td>
                      <p className="font-semibold text-slate-800 text-xs leading-snug">{act.title}</p>
                    </td>
                    <td>
                      <span className="text-xs font-mono text-slate-600">{act.workOrderFolio || '-'}</span>
                    </td>
                    <td className="text-center">
                      {act.hasImage ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          <Image size={10} /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
                          <XCircle size={10} /> FALTA
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      {act.hasFolio ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          <FileText size={10} /> {act.teraFolio}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
                          <XCircle size={10} /> FALTA
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      {!act.hasImage && !act.hasFolio ? (
                        <span className="inline-flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                          <AlertTriangle size={10} /> CRÍTICO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          <AlertTriangle size={10} /> PARCIAL
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
