'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CalendarDays, Clock, Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Activity {
  id: string; title: string; date: string;
  startTime: string | null; endTime: string | null;
  actualStartTime: string | null; actualEndTime: string | null;
  workOrderFolio: string | null; purchaseOrder: string | null;
  loto: boolean; weekendNotes: string | null; auditNotes: string | null;
  user: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
}

interface Props {
  weekendDates: string[];
  selectedWeekend: string;
  activities: Activity[];
  techAssignments: any[];
  safetyAssignments: any[];
  vehicleAssignments: any[];
  driverAssignments: any[];
  equipAssignments: any[];
  userRole: string;
}

export function PlanesPasadosClient({
  weekendDates, selectedWeekend, activities,
  techAssignments, safetyAssignments,
  vehicleAssignments, driverAssignments, equipAssignments,
  userRole,
}: Props) {
  const router = useRouter();
  const canEdit = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canViewAudit = ['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(userRole);

  const [actualTimes, setActualTimes] = useState<Record<string, { start: string; end: string }>>(
    Object.fromEntries(activities.map((a) => [a.id, { start: a.actualStartTime || '', end: a.actualEndTime || '' }]))
  );

  const updateActualTime = async (actId: string, field: 'actualStartTime' | 'actualEndTime', value: string) => {
    setActualTimes((p) => ({ ...p, [actId]: { ...p[actId], [field === 'actualStartTime' ? 'start' : 'end']: value } }));
    await fetch(`/api/activities/${actId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value || null }) });
  };

  const getSunday = (sat: string) => {
    const d = new Date(`${sat}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-7 h-7 text-indigo-600" /> Planes Pasados
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Consulta y completa el horario real de planes anteriores</p>
        </div>
      </div>

      {/* Weekend Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-2">Seleccionar Plan del Fin de Semana:</label>
        <div className="flex flex-wrap gap-2">
          {weekendDates.length === 0 && <p className="text-sm text-slate-400">No hay planes registrados aún.</p>}
          {weekendDates.map((d) => (
            <button
              key={d}
              onClick={() => router.push(`/planes-pasados?weekend=${d}`)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedWeekend === d
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d} — {getSunday(d)}
            </button>
          ))}
        </div>
      </div>

      {/* Plan Table */}
      {selectedWeekend && (
        <div className="card overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="data-table text-[11px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="font-semibold w-7 px-1 text-center">#</th>
                  <th className="font-semibold w-16 px-1">Día</th>
                  <th className="font-semibold w-24 px-1">Horario Plan</th>
                  <th className="font-semibold w-28 px-1">Horario Real</th>
                  <th className="font-semibold w-20 px-1">Desviación</th>
                  <th className="font-semibold w-16 px-1">Resp.</th>
                  <th className="font-semibold w-16 px-1">Contacto</th>
                  <th className="font-semibold min-w-[100px] px-1">Actividad</th>
                  <th className="font-semibold w-14 px-1">Folio</th>
                  <th className="font-semibold w-14 px-1">P.O.</th>
                  <th className="font-semibold w-9 px-0 text-center">LOTO</th>
                  <th className="font-semibold min-w-[80px] px-1">Técnicos</th>
                  <th className="font-semibold min-w-[80px] px-1">S.Design.</th>
                  <th className="font-semibold min-w-[80px] px-1">S.Dedic.</th>
                  <th className="font-semibold min-w-[70px] px-1">Vehículo</th>
                  <th className="font-semibold min-w-[65px] px-1">Chofer</th>
                  <th className="font-semibold min-w-[70px] px-1">Eq.Elev.</th>
                  <th className="font-semibold w-20 px-1">Notas</th>
                  {canViewAudit && <th className="font-semibold w-20 px-1">Auditoría</th>}
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr><td colSpan={canViewAudit ? 19 : 18} className="text-center py-12">
                    <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-600" />
                    <p className="font-medium text-slate-400">Sin actividades para este fin de semana</p>
                  </td></tr>
                ) : activities.map((act, idx) => {
                  const techs = techAssignments.filter((x: any) => x.activityId === act.id && x.role === 'TECNICO').map((x: any) => x.technician.name);
                  const designados = techAssignments.filter((x: any) => x.activityId === act.id && x.role === 'SAFETY_DESIGNADO').map((x: any) => x.technician.name);
                  const dedicados = safetyAssignments.filter((x: any) => x.activityId === act.id).map((x: any) => x.safetyDedicado.name);
                  const vehs = vehicleAssignments.filter((x: any) => x.activityId === act.id).map((x: any) => x.vehicle.name);
                  const drvs = driverAssignments.filter((x: any) => x.activityId === act.id).map((x: any) => x.driver.name);
                  const eqs = equipAssignments.filter((x: any) => x.activityId === act.id).map((x: any) => x.equip.name);

                  // Deviation calculation
                  const at = actualTimes[act.id];
                  let deviation = '';
                  let devColor = 'text-slate-400';
                  if (act.startTime && at?.start) {
                    const [ph, pm] = act.startTime.split(':').map(Number);
                    const [ah, am] = at.start.split(':').map(Number);
                    const diffMin = (ah * 60 + am) - (ph * 60 + pm);
                    if (diffMin > 0) { deviation = `+${diffMin}min`; devColor = 'text-red-600 font-bold'; }
                    else if (diffMin < 0) { deviation = `${diffMin}min`; devColor = 'text-emerald-600'; }
                    else { deviation = 'Puntual'; devColor = 'text-emerald-600'; }
                  }

                  return (
                    <tr key={act.id} className="hover:bg-slate-50/50 transition-colors align-top border-b border-slate-100">
                      <td className="text-center px-1"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">{idx + 1}</span></td>
                      <td className="whitespace-nowrap px-1">
                        <span className="font-medium text-slate-800 text-[10px]">{formatDate(act.date)}</span>
                        <span className="block text-[9px] text-indigo-500 uppercase font-bold">{['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'][new Date(act.date).getUTCDay()]}</span>
                      </td>
                      <td className="whitespace-nowrap px-1">
                        <span className="bg-slate-100 text-slate-700 px-1 py-0 rounded text-[10px] font-mono border border-slate-200">{act.startTime || '--:--'}–{act.endTime || '--:--'}</span>
                      </td>
                      <td className="whitespace-nowrap px-1">
                        {canEdit ? (
                          <div className="flex gap-0.5 items-center">
                            <input type="time" className="w-[65px] text-[10px] px-0.5 py-0 rounded border border-blue-200 bg-blue-50 font-mono focus:ring-1 focus:ring-blue-500"
                              value={at?.start || ''} onChange={(e) => updateActualTime(act.id, 'actualStartTime', e.target.value)} />
                            <span className="text-[9px] text-slate-400">–</span>
                            <input type="time" className="w-[65px] text-[10px] px-0.5 py-0 rounded border border-blue-200 bg-blue-50 font-mono focus:ring-1 focus:ring-blue-500"
                              value={at?.end || ''} onChange={(e) => updateActualTime(act.id, 'actualEndTime', e.target.value)} />
                          </div>
                        ) : (
                          <span className="bg-blue-50 text-blue-700 px-1 py-0 rounded text-[10px] font-mono border border-blue-200">{at?.start || '--:--'}–{at?.end || '--:--'}</span>
                        )}
                      </td>
                      <td className="px-1"><span className={`text-[10px] ${devColor}`}>{deviation || '-'}</span></td>
                      <td className="px-1"><span className="text-[10px] font-medium text-slate-700 truncate block max-w-[60px]">{act.user?.name?.split(' ')[0] || '-'}</span></td>
                      <td className="px-1"><span className="text-[10px] font-medium text-slate-800 truncate block max-w-[60px]">{act.contact?.name?.split(' ')[0] || '-'}</span></td>
                      <td className="px-1"><p className="font-semibold text-slate-800 text-[10px] leading-snug truncate max-w-[120px]" title={act.title}>{act.title}</p></td>
                      <td className="px-1"><span className="text-[10px] font-mono text-slate-600">{act.workOrderFolio || '-'}</span></td>
                      <td className="px-1"><span className={`text-[10px] font-mono ${act.purchaseOrder ? 'text-slate-700' : 'text-red-500 font-bold'}`}>{act.purchaseOrder || 'PEND.'}</span></td>
                      <td className="text-center px-0"><span className={`px-1 py-0 rounded text-[9px] font-bold ${act.loto ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{act.loto ? 'SI' : 'NO'}</span></td>
                      <td className="px-1"><span className="text-[10px] text-slate-600">{techs.join(', ') || '-'}</span></td>
                      <td className="px-1"><span className="text-[10px] text-slate-600">{designados.join(', ') || '-'}</span></td>
                      <td className="px-1"><span className="text-[10px] text-slate-600">{dedicados.join(', ') || '-'}</span></td>
                      <td className="px-1"><span className="text-[10px] text-slate-600">{vehs.join(', ') || '-'}</span></td>
                      <td className="px-1"><span className="text-[10px] text-slate-600">{drvs.join(', ') || '-'}</span></td>
                      <td className="px-1"><span className="text-[10px] text-slate-600">{eqs.join(', ') || '-'}</span></td>
                      <td className="px-1"><span className="text-[10px] text-slate-600 truncate block max-w-[80px]" title={act.weekendNotes || ''}>{act.weekendNotes || '-'}</span></td>
                      {canViewAudit && <td className="px-1"><span className="text-[10px] text-red-600 truncate block max-w-[80px]" title={act.auditNotes || ''}>{act.auditNotes || '-'}</span></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
