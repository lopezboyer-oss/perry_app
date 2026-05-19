'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Camera, FileText, CheckCircle, XCircle, Shield, Wrench, StickyNote, User, Loader2, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import {
  type Props, type REActivity, type EquipRecordData,
  DAY_NAMES, getChecklistScore, canEdit as canEditFn, canViewFolioReport,
} from './registro-equipos-types';
import { ChecklistModal, EvidenciasModal, FolioReportModal, NotesModal } from './RegistroEquiposModals';

type ModalState =
  | { type: 'checklist'; record: EquipRecordData; equipName: string; actTitle: string }
  | { type: 'evidencias'; record: EquipRecordData; equipName: string }
  | { type: 'notes'; record: EquipRecordData; equipName: string }
  | { type: 'folio'; folio: string }
  | { type: 'operator'; record: EquipRecordData; equipName: string; techs: { technicianId: string; technicianName: string }[] }
  | null;

export function RegistroEquiposClient({ activities: initialActivities, weekendDates, selectedWeekend, userRole, userName, userId }: Props) {
  const router = useRouter();
  const [activities, setActivities] = useState(initialActivities);
  const [modal, setModal] = useState<ModalState>(null);
  const [initDone, setInitDone] = useState(false);
  const editable = canEditFn(userRole);

  // ── Auto-create missing EquipRecords on mount ──
  useEffect(() => {
    if (initDone) return;
    const missing: { activityId: string; equipId: string }[] = [];
    for (const act of initialActivities) {
      for (const eq of act.equips) {
        const has = act.equipRecords.some(r => r.equipId === eq.equipId);
        if (!has) missing.push({ activityId: act.id, equipId: eq.equipId });
      }
    }
    if (missing.length === 0) { setInitDone(true); return; }
    // Create all missing records in parallel
    Promise.all(
      missing.map(m =>
        fetch('/api/equip-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...m, weekendOf: selectedWeekend }),
        }).then(r => r.json()).then(rec => ({ ...m, rec }))
      )
    ).then(results => {
      setActivities(prev => {
        const next = prev.map(a => {
          const newRecs = results
            .filter(r => r.activityId === a.id)
            .map(r => ({
              id: r.rec.id,
              equipId: r.equipId,
              operatorId: null,
              operatorName: null,
              operatorUpdatedBy: null,
              operatorUpdatedAt: null,
              chkCondicionesGenerales: false,
              chkCargaBateria100: false,
              chk5sEquipo: false,
              chkPaseClienteVigente: false,
              chkExtintorFuncional: false,
              checklistUpdatedBy: null,
              checklistUpdatedAt: null,
              evidencias: [],
              notes: null,
              notesUpdatedBy: null,
              notesUpdatedAt: null,
              weekendOf: selectedWeekend,
            } as EquipRecordData));
          if (newRecs.length === 0) return a;
          return { ...a, equipRecords: [...a.equipRecords, ...newRecs] };
        });
        return next;
      });
      setInitDone(true);
    }).catch(() => setInitDone(true));
  }, [initialActivities, selectedWeekend, initDone]);

  // ── Group by day ──
  const groupedByDay = useMemo(() => {
    const map = new Map<string, REActivity[]>();
    for (const act of activities) {
      const dateKey = act.date.substring(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(act);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [activities]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    let totalEquips = 0, totalChecked = 0, totalEvid = 0, perfect = 0;
    for (const act of activities) {
      for (const rec of act.equipRecords) {
        totalEquips++;
        const s = getChecklistScore(rec);
        totalChecked += s;
        if (s === 5) perfect++;
        totalEvid += (rec.evidencias?.length || 0);
      }
    }
    return { totalActs: activities.length, totalEquips, totalChecked, totalEvid, perfect, checklistRate: totalEquips > 0 ? Math.round((totalChecked / (totalEquips * 5)) * 100) : 0 };
  }, [activities]);

  // ── API helpers ──
  const patchRecord = useCallback(async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/equip-records/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { alert('Error al guardar'); return null; }
    return res.json();
  }, []);

  const handleSaveChecklist = useCallback(async (recordId: string, checklist: Record<string, boolean>) => {
    const result = await patchRecord(recordId, { checklist });
    if (result) {
      setActivities(prev => prev.map(a => ({
        ...a, equipRecords: a.equipRecords.map(r => r.id === recordId ? { ...r, ...checklist, checklistUpdatedBy: userName, checklistUpdatedAt: new Date().toISOString() } : r),
      })));
    }
  }, [patchRecord, userName]);

  const handleSaveEvidencias = useCallback(async (recordId: string, evidencias: string[]) => {
    const result = await patchRecord(recordId, { evidencias });
    if (result) {
      setActivities(prev => prev.map(a => ({
        ...a, equipRecords: a.equipRecords.map(r => r.id === recordId ? { ...r, evidencias } : r),
      })));
    }
  }, [patchRecord]);

  const handleSaveNotes = useCallback(async (recordId: string, notes: string) => {
    const result = await patchRecord(recordId, { notes });
    if (result) {
      setActivities(prev => prev.map(a => ({
        ...a, equipRecords: a.equipRecords.map(r => r.id === recordId ? { ...r, notes, notesUpdatedBy: userName, notesUpdatedAt: new Date().toISOString() } : r),
      })));
    }
  }, [patchRecord, userName]);

  const handleSaveOperator = useCallback(async (recordId: string, operatorId: string | null, operatorName: string | null) => {
    const result = await patchRecord(recordId, { operatorId, operatorName });
    if (result) {
      setActivities(prev => prev.map(a => ({
        ...a, equipRecords: a.equipRecords.map(r => r.id === recordId ? { ...r, operatorId, operatorName, operatorUpdatedBy: userName, operatorUpdatedAt: new Date().toISOString() } : r),
      })));
    }
  }, [patchRecord, userName]);

  // ── Find record for an equip in an activity ──
  const findRecord = (act: REActivity, equipId: string) => act.equipRecords.find(r => r.equipId === equipId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl shadow-lg shadow-teal-500/20">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Registro Equipos</h1>
            <p className="text-sm text-slate-500">Checklist de seguridad y evidencias por equipo</p>
          </div>
        </div>
        <select className="text-sm border border-slate-300 rounded-lg px-3 py-2" value={selectedWeekend} onChange={e => router.push(`/registro-equipos?weekend=${e.target.value}`)}>
          {weekendDates.map(d => <option key={d} value={d}>Fin de Semana: {d}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg"><FileText className="w-5 h-5 text-teal-600" /></div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Actividades</p>
              <p className="text-2xl font-bold text-slate-800">{kpis.totalActs}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-lg"><Wrench className="w-5 h-5 text-cyan-600" /></div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Equipos</p>
              <p className="text-2xl font-bold text-slate-800">{kpis.totalEquips}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${kpis.checklistRate >= 80 ? 'bg-emerald-100' : kpis.checklistRate >= 50 ? 'bg-amber-100' : 'bg-red-100'}`}>
              <Shield className={`w-5 h-5 ${kpis.checklistRate >= 80 ? 'text-emerald-600' : kpis.checklistRate >= 50 ? 'text-amber-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Checklist</p>
              <p className={`text-2xl font-bold ${kpis.checklistRate >= 80 ? 'text-emerald-600' : kpis.checklistRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{kpis.checklistRate}%</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${kpis.perfect === kpis.totalEquips && kpis.totalEquips > 0 ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              <CheckCircle className={`w-5 h-5 ${kpis.perfect === kpis.totalEquips && kpis.totalEquips > 0 ? 'text-emerald-600' : 'text-slate-500'}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">5/5 Perfecto</p>
              <p className="text-2xl font-bold text-slate-800">{kpis.perfect}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Camera className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Evidencias</p>
              <p className="text-2xl font-bold text-slate-800">{kpis.totalEvid}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {activities.length === 0 ? (
        <div className="card p-12 text-center">
          <Wrench className="w-16 h-16 mx-auto mb-4 text-slate-300 opacity-60" />
          <h2 className="text-xl font-bold text-slate-500 mb-2">Sin equipos asignados</h2>
          <p className="text-slate-400">No hay actividades con equipos para este fin de semana.</p>
        </div>
      ) : (
        /* Tables grouped by day */
        groupedByDay.map(([dateKey, dayActivities]) => {
          const dayDate = new Date(dateKey + 'T12:00:00');
          const dayName = DAY_NAMES[dayDate.getUTCDay()] || '';
          return (
            <div key={dateKey} className="card overflow-hidden shadow-md">
              {/* Day header */}
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-4 py-3 border-b border-teal-200">
                <h2 className="font-bold text-teal-800 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500 text-white text-xs font-bold">{dayName}</span>
                  {formatDate(dateKey)} — {dayActivities.length} actividad{dayActivities.length !== 1 ? 'es' : ''}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="font-semibold text-xs w-[40px] text-center">#</th>
                      <th className="font-semibold text-xs w-[80px]">Horario</th>
                      <th className="font-semibold text-xs w-[120px]">Sup. Operativo</th>
                      <th className="font-semibold text-xs">Actividad</th>
                      <th className="font-semibold text-xs w-[80px]">Folio</th>
                      <th className="font-semibold text-xs w-[130px]">Equipo</th>
                      <th className="font-semibold text-xs w-[100px]">Operador</th>
                      <th className="font-semibold text-xs w-[70px] text-center">Checklist</th>
                      <th className="font-semibold text-xs w-[60px] text-center">Evid.</th>
                      <th className="font-semibold text-xs w-[60px] text-center">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayActivities.map((act, actIdx) => {
                      const equipRows = act.equips.length || 1;
                      return act.equips.length === 0 ? (
                        <tr key={act.id} className="hover:bg-slate-50/50 transition-colors align-top">
                          <td className="text-center"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">{actIdx + 1}</span></td>
                          <td className="whitespace-nowrap"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono border border-slate-200">{act.startTime || '--:--'} — {act.endTime || '--:--'}</span></td>
                          <td className="text-xs font-medium text-slate-700">{act.user?.name || '-'}</td>
                          <td><p className="font-semibold text-slate-800 text-xs leading-snug">{act.title}</p>{act.company && <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">{act.company.shortName || act.company.name}</span>}</td>
                          <td>{act.workOrderFolio ? <FolioCell folio={act.workOrderFolio} userRole={userRole} onOpen={() => setModal({ type: 'folio', folio: act.workOrderFolio! })} /> : <span className="text-xs text-slate-400">-</span>}</td>
                          <td colSpan={5} className="text-xs text-slate-400 text-center">Sin equipos</td>
                        </tr>
                      ) : (
                        act.equips.map((eq, eqIdx) => {
                          const rec = findRecord(act, eq.equipId);
                          const score = rec ? getChecklistScore(rec) : 0;
                          const evidCount = rec?.evidencias?.length || 0;
                          return (
                            <tr key={`${act.id}-${eq.equipId}`} className="hover:bg-teal-50/30 transition-colors align-top border-b border-slate-100">
                              {eqIdx === 0 && (
                                <>
                                  <td className="text-center" rowSpan={equipRows}><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">{actIdx + 1}</span></td>
                                  <td className="whitespace-nowrap" rowSpan={equipRows}><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono border border-slate-200">{act.startTime || '--:--'} — {act.endTime || '--:--'}</span></td>
                                  <td className="text-xs font-medium text-slate-700" rowSpan={equipRows}>{act.user?.name || '-'}</td>
                                  <td rowSpan={equipRows}>
                                    <p className="font-semibold text-slate-800 text-xs leading-snug">{act.title.length > 50 ? act.title.substring(0, 50) + '...' : act.title}</p>
                                    {act.company && <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded inline-block mt-0.5">{act.company.shortName || act.company.name}</span>}
                                    {act.client && <span className="block text-[10px] text-slate-500 mt-0.5">{act.client.name}</span>}
                                  </td>
                                  <td rowSpan={equipRows}>
                                    {act.workOrderFolio ? <FolioCell folio={act.workOrderFolio} userRole={userRole} onOpen={() => setModal({ type: 'folio', folio: act.workOrderFolio! })} /> : <span className="text-xs text-slate-400">-</span>}
                                  </td>
                                </>
                              )}
                              {/* Equip name */}
                              <td>
                                <span className="text-xs font-medium text-slate-800">{eq.equipName}</span>
                                {eq.equipOwnership && <span className={`block text-[9px] font-bold mt-0.5 ${eq.equipOwnership === 'PROPIA' ? 'text-emerald-600' : 'text-amber-600'}`}>{eq.equipOwnership}</span>}
                              </td>
                              {/* Operator */}
                              <td className="text-xs text-slate-600">
                                {rec && editable ? (
                                  <button
                                    onClick={() => setModal({ type: 'operator', record: rec, equipName: eq.equipName, techs: act.techs })}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-colors hover:opacity-80 ${rec.operatorName ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}
                                  >
                                    <User size={10} />{rec.operatorName || 'Asignar'}
                                  </button>
                                ) : (
                                  <span>{rec?.operatorName || <span className="text-slate-400">-</span>}</span>
                                )}
                              </td>
                              {/* Checklist button */}
                              <td className="text-center">
                                {rec ? (
                                  <button onClick={() => setModal({ type: 'checklist', record: rec, equipName: eq.equipName, actTitle: act.title })}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-colors hover:opacity-80 ${score === 5 ? 'bg-emerald-100 text-emerald-700' : score >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                    {score === 5 ? <CheckCircle size={10} /> : <XCircle size={10} />}{score}/5
                                  </button>
                                ) : <span className="text-slate-300 text-xs">—</span>}
                              </td>
                              {/* Evidencias button */}
                              <td className="text-center">
                                {rec ? (
                                  <button onClick={() => setModal({ type: 'evidencias', record: rec, equipName: eq.equipName })}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-colors hover:opacity-80 ${evidCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                    <Camera size={10} />{evidCount}
                                  </button>
                                ) : <span className="text-slate-300 text-xs">—</span>}
                              </td>
                              {/* Notes button */}
                              <td className="text-center">
                                {rec ? (
                                  <button onClick={() => setModal({ type: 'notes', record: rec, equipName: eq.equipName })}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors hover:opacity-80 ${rec.notes ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'}`}>
                                    <StickyNote size={10} />{rec.notes ? '✓' : '-'}
                                  </button>
                                ) : <span className="text-slate-300 text-xs">—</span>}
                              </td>
                            </tr>
                          );
                        })
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* ── MODALS ── */}
      {modal?.type === 'checklist' && (
        <ChecklistModal record={modal.record} equipName={modal.equipName} activityTitle={modal.actTitle} canEdit={editable} onClose={() => setModal(null)} onSave={handleSaveChecklist} />
      )}
      {modal?.type === 'evidencias' && (
        <EvidenciasModal record={modal.record} equipName={modal.equipName} canEdit={editable} onClose={() => setModal(null)} onSave={handleSaveEvidencias} />
      )}
      {modal?.type === 'notes' && (
        <NotesModal record={modal.record} equipName={modal.equipName} canEdit={editable} onClose={() => setModal(null)} onSave={handleSaveNotes} />
      )}
      {modal?.type === 'folio' && (
        <FolioReportModal folio={modal.folio} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'operator' && (
        <OperatorModal
          record={modal.record}
          equipName={modal.equipName}
          techs={modal.techs}
          onClose={() => setModal(null)}
          onSave={handleSaveOperator}
        />
      )}
    </div>
  );
}

/* ── Folio Cell helper ── */
function FolioCell({ folio, userRole, onOpen }: { folio: string; userRole: string; onOpen: () => void }) {
  return canViewFolioReport(userRole) ? (
    <button onClick={onOpen} className="text-xs font-mono text-indigo-600 hover:text-indigo-800 hover:underline font-semibold" title="Ver historial de folio">{folio}</button>
  ) : (
    <span className="text-xs font-mono text-slate-600">{folio}</span>
  );
}

/* ── Operator Modal ── */
function OperatorModal({ record, equipName, techs, onClose, onSave }: {
  record: EquipRecordData;
  equipName: string;
  techs: { technicianId: string; technicianName: string }[];
  onClose: () => void;
  onSave: (recordId: string, operatorId: string | null, operatorName: string | null) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const handleSelect = async (techId: string | null, techName: string | null) => {
    setSaving(true);
    await onSave(record.id, techId, techName);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-800">👤 Operador</h3>
            <p className="text-xs text-slate-500 mt-0.5">{equipName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {saving && (
            <div className="text-center py-4"><Loader2 size={20} className="mx-auto animate-spin text-teal-500" /></div>
          )}
          {!saving && (
            <>
              {record.operatorName && (
                <button
                  onClick={() => handleSelect(null, null)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <span className="text-xs font-bold text-red-600">✕ Quitar operador</span>
                  <span className="block text-[10px] text-red-400 mt-0.5">Actual: {record.operatorName}</span>
                </button>
              )}
              {techs.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <User size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Sin técnicos asignados a esta actividad</p>
                </div>
              ) : (
                techs.map(t => (
                  <button
                    key={t.technicianId}
                    onClick={() => handleSelect(t.technicianId, t.technicianName)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      record.operatorId === t.technicianId
                        ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-400'
                        : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-teal-50'
                    }`}
                  >
                    <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <User size={14} className="text-teal-500" /> {t.technicianName}
                    </span>
                    {record.operatorId === t.technicianId && (
                      <span className="text-[10px] text-teal-600 font-bold mt-0.5 block">✓ Operador actual</span>
                    )}
                  </button>
                ))
              )}
            </>
          )}
        </div>
        {record.operatorUpdatedBy && (
          <div className="px-5 py-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-400">Últ: {record.operatorUpdatedBy}</p>
          </div>
        )}
      </div>
    </div>
  );
}
