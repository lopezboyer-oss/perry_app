'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CalendarDays, Clock, Loader2, ImagePlus, Trash2, Eye, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Activity {
  id: string; title: string; date: string;
  startTime: string | null; endTime: string | null;
  actualStartTime: string | null; actualEndTime: string | null;
  workOrderFolio: string | null; purchaseOrder: string | null;
  loto: boolean; weekendNotes: string | null; auditNotes: string | null;
  safetyAuditImage: string | null;
  teraFolio: string | null;
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
  userId: string;
}

export function PlanesPasadosClient({
  weekendDates, selectedWeekend, activities,
  techAssignments, safetyAssignments,
  vehicleAssignments, driverAssignments, equipAssignments,
  userRole, userId,
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

  // TERA image state
  const [auditImages, setAuditImages] = useState<Record<string, string | null>>(
    Object.fromEntries(activities.map((a) => [a.id, a.safetyAuditImage || null]))
  );
  const [auditImageLoading, setAuditImageLoading] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [teraFolios, setTeraFolios] = useState<Record<string, string>>(Object.fromEntries(activities.map((a) => [a.id, a.teraFolio || ''])));
  const [teraFolioSaving, setTeraFolioSaving] = useState<Record<string, boolean>>({});

  const canEditAuditImage = (act: Activity) => {
    if (['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole)) return true;
    if (userRole === 'INGENIERO' && act.user?.id === userId) return true;
    return false;
  };

  const updateField = async (actId: string, field: string, value: any) => {
    await fetch(`/api/activities/${actId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) });
  };

  // Compress image using Canvas API
  const compressImage = (file: File, maxDimension = 1200, targetSizeKB = 500): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > targetSizeKB * 1024 * 1.37 && quality > 0.2) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleAuditImageUpload = (actId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setAuditImageLoading((p) => ({ ...p, [actId]: true }));
      try {
        const dataUrl = await compressImage(file);
        const res = await fetch(`/api/activities/${actId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ safetyAuditImage: dataUrl }),
        });
        if (res.ok) setAuditImages((p) => ({ ...p, [actId]: dataUrl }));
        else { const d = await res.json(); alert(d.error || 'Error al subir'); }
      } catch (err: any) { alert(err.message || 'Error de conexión'); }
      setAuditImageLoading((p) => ({ ...p, [actId]: false }));
    };
    input.click();
  };

  const handleAuditImageDelete = async (actId: string) => {
    if (!confirm('¿Eliminar imagen TERA?')) return;
    setAuditImageLoading((p) => ({ ...p, [actId]: true }));
    try {
      const res = await fetch(`/api/activities/${actId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ safetyAuditImage: null }),
      });
      if (res.ok) setAuditImages((p) => ({ ...p, [actId]: null }));
    } catch { alert('Error de conexión'); }
    setAuditImageLoading((p) => ({ ...p, [actId]: false }));
  };

  const saveTeraFolio = async (actId: string) => {
    const folio = teraFolios[actId]?.trim().toUpperCase() || '';
    if (folio && !/^BC-\d{3,5}$/.test(folio)) {
      alert('Formato inválido. Use BC- seguido de 3 a 5 dígitos (ej: BC-123, BC-1234 o BC-12345)');
      return;
    }
    setTeraFolioSaving((p) => ({ ...p, [actId]: true }));
    try {
      const res = await fetch(`/api/activities/${actId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teraFolio: folio || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'Error al guardar folio');
      }
    } catch { alert('Error de conexión'); }
    setTeraFolioSaving((p) => ({ ...p, [actId]: false }));
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
                  <th className="font-semibold w-[90px] text-center">TERA</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr><td colSpan={canViewAudit ? 20 : 19} className="text-center py-16">
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

                      {/* TERA IMAGE + FOLIO */}
                      <td className="text-center">
                        {auditImageLoading[act.id] ? (
                          <Loader2 size={16} className="mx-auto animate-spin text-indigo-500" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center justify-center gap-1">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${auditImages[act.id] ? 'bg-emerald-500' : 'bg-slate-300'}`} title={auditImages[act.id] ? 'Imagen cargada' : 'Sin imagen'} />
                              {canEditAuditImage(act) && (
                                <button onClick={() => handleAuditImageUpload(act.id)} className="p-1 rounded hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700 transition-colors" title="Subir imagen TERA">
                                  <ImagePlus size={14} />
                                </button>
                              )}
                              {auditImages[act.id] && (
                                <button onClick={() => setPreviewImage(auditImages[act.id])} className="p-1 rounded hover:bg-violet-50 text-violet-500 hover:text-violet-700 transition-colors" title="Ver imagen">
                                  <Eye size={14} />
                                </button>
                              )}
                              {auditImages[act.id] && canEditAuditImage(act) && (
                                <button onClick={() => handleAuditImageDelete(act.id)} className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Eliminar imagen">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                            {/* TERA Folio */}
                            {canEditAuditImage(act) ? (
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="text"
                                  maxLength={8}
                                  placeholder="BC-000"
                                  value={teraFolios[act.id] || ''}
                                  onChange={(e) => {
                                    const v = e.target.value.toUpperCase();
                                    setTeraFolios((p) => ({ ...p, [act.id]: v }));
                                  }}
                                  onBlur={() => saveTeraFolio(act.id)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') saveTeraFolio(act.id); }}
                                  className={`w-[70px] text-[10px] font-mono px-1 py-0.5 rounded border text-center ${
                                    teraFolios[act.id] && /^BC-\d{3,5}$/.test(teraFolios[act.id])
                                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-bold'
                                      : 'border-slate-200 text-slate-500'
                                  }`}
                                />
                                {teraFolioSaving[act.id] && <Loader2 size={10} className="animate-spin text-indigo-400" />}
                              </div>
                            ) : (
                              teraFolios[act.id] && (
                                <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {teraFolios[act.id]}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
              <X size={18} />
            </button>
            <img src={previewImage} alt="TERA" className="max-w-full max-h-[85vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
