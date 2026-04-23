'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CalendarDays, Clock } from 'lucide-react';
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
  const canEditAudit = ['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(userRole);

  const [actualTimes, setActualTimes] = useState<Record<string, { start: string; end: string }>>(
    Object.fromEntries(activities.map((a) => [a.id, { start: a.actualStartTime || '', end: a.actualEndTime || '' }]))
  );

  const [auditNotesState, setAuditNotesState] = useState<Record<string, string>>(
    Object.fromEntries(activities.map((a) => [a.id, a.auditNotes || '']))
  );

  const updateField = async (actId: string, field: string, value: any) => {
    await fetch(`/api/activities/${actId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) });
  };

  const updateActualTime = async (actId: string, field: 'actualStartTime' | 'actualEndTime', value: string) => {
    setActualTimes((p) => ({ ...p, [actId]: { ...p[actId], [field === 'actualStartTime' ? 'start' : 'end']: value } }));
    await updateField(actId, field, value || null);
  };

  const getSunday = (sat: string) => {
    const d = new Date(`${sat}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-5 pb-20 md:pb-0 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Clock className="w-8 h-8 text-indigo-600" /> Planes Pasados
          </h1>
          <p className="text-slate-500 text-sm mt-1">Consulta y completa el horario real de planes anteriores</p>
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
            <table className="data-table">
              <thead>
                <tr className="bg-slate-50">
                  <th className="font-semibold w-[40px] text-center">#</th>
                  <th className="font-semibold w-[100px]">Día</th>
                  <th className="font-semibold w-[110px]">Horario Plan</th>
                  <th className="font-semibold w-[160px]">Horario Real</th>
                  <th className="font-semibold w-[90px]">Desviación</th>
                  <th className="font-semibold w-[110px]">Responsable</th>
                  <th className="font-semibold w-[110px]">Contacto</th>
                  <th className="font-semibold">Actividad</th>
                  <th className="font-semibold w-[75px]">Folio</th>
                  <th className="font-semibold w-[75px]">P.O.</th>
                  <th className="font-semibold w-[50px] text-center">LOTO</th>
                  <th className="font-semibold min-w-[120px]">Técnicos</th>
                  <th className="font-semibold min-w-[110px]">S.Designado</th>
                  <th className="font-semibold min-w-[110px]">S.Dedicado</th>
                  <th className="font-semibold min-w-[100px]">Vehículo</th>
                  <th className="font-semibold min-w-[90px]">Chofer</th>
                  <th className="font-semibold min-w-[100px]">Eq.Elev.</th>
                  <th className="font-semibold min-w-[110px]">Notas</th>
                  {canViewAudit && <th className="font-semibold min-w-[180px]">Notas Auditoría</th>}
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr><td colSpan={canViewAudit ? 19 : 18} className="text-center py-16">
                    <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
                    <p className="font-medium text-lg text-slate-400">Sin actividades para este fin de semana</p>
                  </td></tr>
                ) : activities.map((act, idx) => {
                  const techs = techAssignments.filter((x: any) => x.activityId === act.id && x.role === 'TECNICO').map((x: any) => x.technician.name);
                  const designados = techAssignments.filter((x: any) => x.activityId === act.id && x.role === 'SAFETY_DESIGNADO').map((x: any) => x.technician.name);
                  const dedicados = safetyAssignments.filter((x: any) => x.activityId === act.id).map((x: any) => x.safetyDedicado.name);
                  const vehs = vehicleAssignments.filter((x: any) => x.activityId === act.id).map((x: any) => x.vehicle.name);
                  const drvs = driverAssignments.filter((x: any) => x.activityId === act.id).map((x: any) => x.driver.name);
                  const eqs = equipAssignments.filter((x: any) => x.activityId === act.id).map((x: any) => x.equip.name);

                  const at = actualTimes[act.id];
                  let deviation = '';
                  let devColor = 'text-slate-400';
                  if (act.startTime && at?.start) {
                    const [ph, pm] = act.startTime.split(':').map(Number);
                    const [ah, am] = at.start.split(':').map(Number);
                    const diffMin = (ah * 60 + am) - (ph * 60 + pm);
                    if (diffMin > 0) { deviation = `+${diffMin} min`; devColor = 'text-red-600 font-bold'; }
                    else if (diffMin < 0) { deviation = `${diffMin} min`; devColor = 'text-emerald-600 font-semibold'; }
                    else { deviation = '✓ Puntual'; devColor = 'text-emerald-600 font-semibold'; }
                  }

                  return (
                    <tr key={act.id} className="hover:bg-slate-50/50 transition-colors align-top">
                      <td className="text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">{idx + 1}</span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="font-medium text-slate-800 text-xs">{formatDate(act.date)}</span>
                        <span className="block text-[10px] text-indigo-500 uppercase font-bold">{['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'][new Date(act.date).getUTCDay()]}</span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono border border-slate-200">{act.startTime || '--:--'} — {act.endTime || '--:--'}</span>
                      </td>

                      {/* HORARIO REAL */}
                      <td className="whitespace-nowrap">
                        {canEdit ? (
                          <div className="flex items-center gap-1">
                            <input type="time"
                              className="w-[76px] text-xs px-1 py-0.5 rounded border border-blue-300 bg-blue-50 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={at?.start || ''}
                              onChange={(e) => updateActualTime(act.id, 'actualStartTime', e.target.value)}
                            />
                            <span className="text-xs text-slate-400">—</span>
                            <input type="time"
                              className="w-[76px] text-xs px-1 py-0.5 rounded border border-blue-300 bg-blue-50 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={at?.end || ''}
                              onChange={(e) => updateActualTime(act.id, 'actualEndTime', e.target.value)}
                            />
                          </div>
                        ) : (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-mono border border-blue-200">{at?.start || '--:--'} — {at?.end || '--:--'}</span>
                        )}
                      </td>

                      {/* DESVIACIÓN */}
                      <td><span className={`text-xs ${devColor}`}>{deviation || '—'}</span></td>

                      <td><span className="text-xs font-medium text-slate-700">{act.user?.name || '-'}</span></td>
                      <td><span className="text-xs font-medium text-slate-800">{act.contact?.name || '-'}</span></td>
                      <td><p className="font-semibold text-slate-800 text-xs leading-snug">{act.title}</p></td>
                      <td><span className="text-xs font-mono text-slate-600">{act.workOrderFolio || '-'}</span></td>
                      <td><span className={`text-xs font-mono ${act.purchaseOrder ? 'text-slate-700' : 'text-red-500 font-bold'}`}>{act.purchaseOrder || 'PEND.'}</span></td>
                      <td className="text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${act.loto ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{act.loto ? 'SI' : 'NO'}</span></td>
                      <td><span className="text-xs text-slate-600">{techs.join(', ') || '-'}</span></td>
                      <td><span className="text-xs text-slate-600">{designados.join(', ') || '-'}</span></td>
                      <td><span className="text-xs text-slate-600">{dedicados.join(', ') || '-'}</span></td>
                      <td><span className="text-xs text-slate-600">{vehs.join(', ') || '-'}</span></td>
                      <td><span className="text-xs text-slate-600">{drvs.join(', ') || '-'}</span></td>
                      <td><span className="text-xs text-slate-600">{eqs.join(', ') || '-'}</span></td>
                      <td><span className="text-xs text-slate-600 block max-w-[110px]" title={act.weekendNotes || ''}>{act.weekendNotes || '-'}</span></td>

                      {/* NOTAS AUDITORÍA — editable inline */}
                      {canViewAudit && (
                        <td>
                          {canEditAudit ? (
                            <textarea
                              className="w-full min-w-[160px] text-xs px-2 py-1 rounded border border-red-200 bg-red-50 text-red-800 placeholder-red-300 focus:ring-2 focus:ring-red-400 focus:border-red-400 resize-none"
                              rows={2}
                              value={auditNotesState[act.id] || ''}
                              placeholder="Nota de auditoría..."
                              onChange={(e) => setAuditNotesState((p) => ({ ...p, [act.id]: e.target.value }))}
                              onBlur={() => updateField(act.id, 'auditNotes', auditNotesState[act.id] || null)}
                            />
                          ) : (
                            <span className="text-xs text-red-600 block max-w-[160px]">{act.auditNotes || '-'}</span>
                          )}
                        </td>
                      )}
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
