'use client';

import { useState, useRef, useEffect } from 'react';
import { CalendarDays, Download, Plus, X, AlertTriangle, Shield, HardHat, Search, MessageSquare, FileWarning } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// ─── TYPES ──────────────────────────────────────────────────────

interface Activity {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  workOrderFolio: string | null;
  purchaseOrder: string | null;
  loto: boolean;
  weekendNotes: string | null;
  auditNotes: string | null;
  user: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
  opportunity: { id: string; folio: string } | null;
}

interface Technician { id: string; name: string; type: string; isCruzVerde: boolean; }
interface SafetyDedicado { id: string; name: string; }
interface SafetyDesignadoUser { id: string; name: string; }
interface Vehicle { id: string; name: string; }
interface Driver { id: string; name: string; }
interface ElevationEquip { id: string; name: string; ownership: string; }

interface TechAssignment { id: string; activityId: string; technicianId: string; role: string; technician: Technician; }
interface SafetyAssignment { id: string; activityId: string; safetyDedicadoId: string; safetyDedicado: SafetyDedicado; }
interface VehicleAssignment { id: string; activityId: string; vehicleId: string; vehicle: Vehicle; }
interface DriverAssignment { id: string; activityId: string; driverId: string; driver: Driver; }
interface EquipAssignment { id: string; activityId: string; equipId: string; equip: ElevationEquip; }

interface Props {
  activities: Activity[];
  technicians: Technician[];
  safetyDedicados: SafetyDedicado[];
  safetyDesignadoUsers: SafetyDesignadoUser[];
  vehicles: Vehicle[];
  drivers: Driver[];
  elevationEquips: ElevationEquip[];
  techAssignments: TechAssignment[];
  safetyAssignments: SafetyAssignment[];
  vehicleAssignments: VehicleAssignment[];
  driverAssignments: DriverAssignment[];
  equipAssignments: EquipAssignment[];
  userRole: string;
  userId: string;
  weekendOf: string;
  weekendLabel: string;
}

// ─── MULTI-SELECT DROPDOWN ──────────────────────────────────────

function AssignDropdown({
  label, options, assigned, onAssign, onRemove, disabled, colorClass,
}: {
  label: string;
  options: { id: string; name: string; badge?: string }[];
  assigned: { assignmentId: string; id: string; name: string; hasConflict?: boolean }[];
  onAssign: (id: string) => void;
  onRemove: (assignmentId: string) => void;
  disabled?: boolean;
  colorClass: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const assignedIds = new Set(assigned.map((a) => a.id));
  const available = options.filter((o) => !assignedIds.has(o.id) && o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {assigned.map((a) => (
          <span key={a.assignmentId} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${a.hasConflict ? 'bg-red-100 text-red-700 ring-1 ring-red-300' : colorClass}`}>
            {a.hasConflict && <AlertTriangle size={10} />}
            {a.name}
            {!disabled && <button onClick={() => onRemove(a.assignmentId)} className="hover:text-red-600 ml-0.5"><X size={10} /></button>}
          </span>
        ))}
        {!disabled && (
          <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] text-slate-500 hover:bg-slate-100 border border-dashed border-slate-300 transition-colors">
            <Plus size={10} /> {label}
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 p-2 animate-fade-in">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          </div>
          <ul className="max-h-40 overflow-y-auto space-y-0.5">
            {available.length === 0 ? <li className="text-xs text-slate-400 text-center py-3">Sin opciones disponibles</li> : available.map((opt) => (
              <li key={opt.id} className="flex items-center justify-between px-2 py-1.5 text-xs rounded-md cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => { onAssign(opt.id); setSearch(''); }}>
                <span className="font-medium text-slate-700">{opt.name}</span>
                {opt.badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{opt.badge}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── INLINE TEXT POPUP ──────────────────────────────────────────

function NoteCell({ value, onChange, disabled, placeholder, color }: {
  value: string; onChange: (v: string) => void; disabled: boolean; placeholder: string; color: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { if (open && text !== value) onChange(text); setOpen(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, text, value]);

  const hasContent = value && value.trim().length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full text-left px-2 py-1 rounded text-xs truncate max-w-[110px] ${hasContent ? `${color} font-medium` : 'text-slate-300'} ${disabled ? 'cursor-default' : 'cursor-pointer hover:bg-slate-100 transition-colors'}`}
        title={value || placeholder}
      >
        {hasContent ? (value.length > 20 ? value.substring(0, 20) + '…' : value) : (disabled ? '—' : placeholder)}
      </button>
      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 animate-fade-in">
          <textarea
            className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            autoFocus
          />
          <button onClick={() => { onChange(text); setOpen(false); }} className="mt-2 text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg font-medium hover:bg-indigo-700 transition-colors">Guardar</button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────

export function AtcFindeClient({
  activities, technicians, safetyDedicados, safetyDesignadoUsers,
  vehicles, drivers, elevationEquips,
  techAssignments: initialTechAssignments,
  safetyAssignments: initialSafetyAssignments,
  vehicleAssignments: initialVehicleAssignments,
  driverAssignments: initialDriverAssignments,
  equipAssignments: initialEquipAssignments,
  userRole, userId, weekendOf, weekendLabel,
}: Props) {
  const router = useRouter();
  const [techAssignments, setTechAssignments] = useState(initialTechAssignments);
  const [safetyAssignments, setSafetyAssignments] = useState(initialSafetyAssignments);
  const [vehicleAssignments, setVehicleAssignments] = useState(initialVehicleAssignments);
  const [driverAssignments, setDriverAssignments] = useState(initialDriverAssignments);
  const [equipAssignments, setEquipAssignments] = useState(initialEquipAssignments);
  const [conflictAlerts, setConflictAlerts] = useState<Record<string, string[]>>({});

  const [lotoState, setLotoState] = useState<Record<string, boolean>>(Object.fromEntries(activities.map((a) => [a.id, a.loto])));
  const [poState, setPoState] = useState<Record<string, string>>(Object.fromEntries(activities.map((a) => [a.id, a.purchaseOrder || ''])));
  const [folioState, setFolioState] = useState<Record<string, string>>(Object.fromEntries(activities.map((a) => [a.id, a.workOrderFolio || ''])));

  const canAssign = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canAssignSafetyDedicado = ['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canEditFields = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canViewAudit = ['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canEditAudit = ['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(userRole);

  // Safety Designado dropdown: Cruz Verde techs + Safety Dedicados + Users with isSafetyDesignado
  const designadoOptions = [
    ...technicians.filter((t) => t.isCruzVerde).map((t) => ({ id: t.id, name: t.name, badge: 'Cruz Verde' })),
    ...safetyDedicados.map((s) => ({ id: `sd-${s.id}`, name: s.name, badge: 'Dedicado' })),
    ...safetyDesignadoUsers.map((u) => ({ id: `usr-${u.id}`, name: u.name, badge: 'Ingeniero' })),
  ];

  const canEditNotes = (act: Activity) => {
    if (userRole === 'ADMIN' || userRole === 'SUPERVISOR_SAFETY_LP') return true;
    if (userRole === 'SUPERVISOR') return true;
    if (userRole === 'INGENIERO' && act.user?.id === userId) return true;
    return false;
  };

  // ── ASSIGN ──
  const handleAssign = async (type: string, activityId: string, personId: string) => {
    try {
      const body: any = { type, activityId, weekendOf };
      if (type === 'SAFETY_DEDICADO') body.safetyDedicadoId = personId;
      else if (type === 'VEHICLE') body.vehicleId = personId;
      else if (type === 'DRIVER') body.driverId = personId;
      else if (type === 'EQUIP') body.equipId = personId;
      else body.technicianId = personId;

      const res = await fetch('/api/weekend-assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Error al asignar'); return; }

      if (data.conflicts?.length > 0) {
        const msgs = data.conflicts.map((c: any) => `⚠️ "${c.activityTitle}" (${c.startTime || '?'} - ${c.endTime || '?'})`);
        setConflictAlerts((prev) => ({ ...prev, [`${activityId}-${personId}`]: msgs }));
        alert(`AVISO DE DUPLICIDAD:\n${msgs.join('\n')}`);
      }

      if (type === 'SAFETY_DEDICADO') setSafetyAssignments((prev) => [...prev, data.assignment]);
      else if (type === 'VEHICLE') setVehicleAssignments((prev) => [...prev, data.assignment]);
      else if (type === 'DRIVER') setDriverAssignments((prev) => [...prev, data.assignment]);
      else if (type === 'EQUIP') setEquipAssignments((prev) => [...prev, data.assignment]);
      else setTechAssignments((prev) => [...prev, data.assignment]);
    } catch { alert('Error de conexión'); }
  };

  const handleRemove = async (assignmentId: string, assignmentType: string) => {
    try {
      const res = await fetch('/api/weekend-assignments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignmentId, assignmentType }) });
      if (!res.ok) { alert('Error'); return; }
      if (assignmentType === 'SAFETY_DEDICADO') setSafetyAssignments((p) => p.filter((a) => a.id !== assignmentId));
      else if (assignmentType === 'VEHICLE') setVehicleAssignments((p) => p.filter((a) => a.id !== assignmentId));
      else if (assignmentType === 'DRIVER') setDriverAssignments((p) => p.filter((a) => a.id !== assignmentId));
      else if (assignmentType === 'EQUIP') setEquipAssignments((p) => p.filter((a) => a.id !== assignmentId));
      else setTechAssignments((p) => p.filter((a) => a.id !== assignmentId));
    } catch { alert('Error de conexión'); }
  };

  const updateField = async (activityId: string, field: string, value: any) => {
    try { await fetch(`/api/activities/${activityId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) }); }
    catch (err) { console.error('Error updating', err); }
  };

  // ── CSV EXPORT ──
  const exportCSV = () => {
    const h = ['#','Día','Inicio','Fin','Resp.','Contacto','Actividad','Folio','P.O.','LOTO','Técnicos','S.Designado','S.Dedicado','Vehículo','Chofer','Eq.Elev.','Notas','N.Auditoría'];
    const rows = activities.map((a, i) => {
      const t = techAssignments.filter((x) => x.activityId === a.id && x.role === 'TECNICO').map((x) => x.technician.name).join(';');
      const sd = techAssignments.filter((x) => x.activityId === a.id && x.role === 'SAFETY_DESIGNADO').map((x) => x.technician.name).join(';');
      const dd = safetyAssignments.filter((x) => x.activityId === a.id).map((x) => x.safetyDedicado.name).join(';');
      const v = vehicleAssignments.filter((x) => x.activityId === a.id).map((x) => x.vehicle.name).join(';');
      const dr = driverAssignments.filter((x) => x.activityId === a.id).map((x) => x.driver.name).join(';');
      const eq = equipAssignments.filter((x) => x.activityId === a.id).map((x) => x.equip.name).join(';');
      return [i+1,formatDate(a.date),a.startTime||'-',a.endTime||'-',a.user?.name||'-',a.contact?.name||'-',`"${a.title.replace(/"/g,'""')}"`,folioState[a.id]||'-',poState[a.id]||'PEND.',lotoState[a.id]?'SI':'NO',t||'-',sd||'-',dd||'-',v||'-',dr||'-',eq||'-',`"${(a.weekendNotes||'').replace(/"/g,'""')}"`,canViewAudit?`"${(a.auditNotes||'').replace(/"/g,'""')}"`:'-'];
    });
    const csv = '\uFEFF' + [h.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `plan_finde_${weekendOf}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  // ── HELPERS ──
  const getTechs = (id: string, role: string) => techAssignments.filter((x) => x.activityId === id && x.role === role);
  const getSafety = (id: string) => safetyAssignments.filter((x) => x.activityId === id);
  const getVehicles = (id: string) => vehicleAssignments.filter((x) => x.activityId === id);
  const getDrivers = (id: string) => driverAssignments.filter((x) => x.activityId === id);
  const getEquips = (id: string) => equipAssignments.filter((x) => x.activityId === id);

  // ── STATS ──
  const satActs = activities.filter((a) => new Date(a.date).getUTCDay() === 6);
  const sunActs = activities.filter((a) => new Date(a.date).getUTCDay() === 0);
  const engMap = new Map<string, number>();
  activities.forEach((a) => { const n = a.user?.name || 'Sin asignar'; engMap.set(n, (engMap.get(n) || 0) + 1); });
  const allTechIds = new Set(techAssignments.map((x) => x.technicianId));
  const satTechIds = new Set(techAssignments.filter((x) => { const a = activities.find((a) => a.id === x.activityId); return a && new Date(a.date).getUTCDay() === 6; }).map((x) => x.technicianId));
  const sunTechIds = new Set(techAssignments.filter((x) => { const a = activities.find((a) => a.id === x.activityId); return a && new Date(a.date).getUTCDay() === 0; }).map((x) => x.technicianId));

  return (
    <div className="space-y-5 pb-20 md:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-indigo-600" /> Plan ATC FINDE
          </h1>
          <p className="text-slate-500 text-sm mt-1">Fin de semana: <span className="font-semibold text-indigo-600">{weekendLabel}</span></p>
        </div>
        <button onClick={exportCSV} className="btn-secondary text-sm shrink-0"><Download size={16} /> Exportar Plan</button>
      </div>

      {/* Mini Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Actividades</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-800">{activities.length}</span>
            <span className="text-xs text-slate-400">total</span>
          </div>
          <div className="flex gap-3 mt-2 text-xs">
            <span className="text-indigo-600 font-semibold">SÁB {satActs.length}</span>
            <span className="text-purple-600 font-semibold">DOM {sunActs.length}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Técnicos Asignados</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-sky-700">{allTechIds.size}</span>
            <span className="text-xs text-slate-400">total</span>
          </div>
          <div className="flex gap-3 mt-2 text-xs">
            <span className="text-indigo-600 font-semibold">SÁB {satTechIds.size}</span>
            <span className="text-purple-600 font-semibold">DOM {sunTechIds.size}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm col-span-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Actividades por Ingeniero</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(engMap.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs">
                <span className="font-semibold text-slate-800">{name}</span>
                <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="bg-slate-50">
                <th className="font-semibold w-[40px] text-center">#</th>
                <th className="font-semibold w-[110px]">Día</th>
                <th className="font-semibold w-[100px]">Horario</th>
                <th className="font-semibold w-[120px]">Responsable</th>
                <th className="font-semibold w-[120px]">Contacto</th>
                <th className="font-semibold">Actividad</th>
                <th className="font-semibold w-[80px]">Folio Odoo</th>
                <th className="font-semibold w-[100px]">P.O.</th>
                <th className="font-semibold w-[55px] text-center">LOTO</th>
                <th className="font-semibold min-w-[180px]">Técnicos</th>
                <th className="font-semibold min-w-[160px]">Safety Designado</th>
                <th className="font-semibold min-w-[140px]">Safety Dedicado</th>
                <th className="font-semibold min-w-[130px]">Vehículo</th>
                <th className="font-semibold min-w-[120px]">Chofer</th>
                <th className="font-semibold min-w-[140px]">Eq. Elevación</th>
                <th className="font-semibold min-w-[120px]">Notas</th>
                {canViewAudit && <th className="font-semibold min-w-[120px]">Auditoría</th>}
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr><td colSpan={canViewAudit ? 17 : 16} className="text-center py-16">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
                  <p className="font-medium text-lg text-slate-400">Fin de Semana Despejado</p>
                  <p className="text-sm mt-1 text-slate-400">No hay actividades para este fin de semana.</p>
                </td></tr>
              ) : activities.map((act, idx) => {
                const aT = getTechs(act.id, 'TECNICO');
                const aD = getTechs(act.id, 'SAFETY_DESIGNADO');
                const aS = getSafety(act.id);
                const aV = getVehicles(act.id);
                const aDr = getDrivers(act.id);
                const aE = getEquips(act.id);

                return (
                  <tr key={act.id} className="hover:bg-slate-50/50 transition-colors align-top">
                    <td className="text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">{idx + 1}</span>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 text-xs">{formatDate(act.date)}</span>
                        <span className="text-[10px] text-indigo-500 uppercase tracking-widest font-bold">{['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'][new Date(act.date).getUTCDay()]}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono border border-slate-200">{act.startTime || '--:--'} — {act.endTime || '--:--'}</span>
                    </td>
                    <td><span className="text-xs font-medium text-slate-700">{act.user?.name || '-'}</span></td>
                    <td><span className="text-xs font-medium text-slate-800">{act.contact?.name || '-'}</span></td>
                    <td>
                      <p className="font-semibold text-slate-800 text-xs leading-snug cursor-pointer hover:text-indigo-600" onClick={() => router.push(`/actividades/${act.id}`)}>
                        {act.title.length > 60 ? act.title.substring(0, 60) + '...' : act.title}
                      </p>
                    </td>

                    {/* FOLIO ODOO */}
                    <td>
                      {canEditFields ? (
                        <input type="text" maxLength={6} className="w-[70px] text-xs px-1.5 py-1 rounded border border-slate-200 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          value={folioState[act.id] || ''} placeholder="—"
                          onChange={(e) => setFolioState((p) => ({ ...p, [act.id]: e.target.value.slice(0, 6) }))}
                          onBlur={() => updateField(act.id, 'workOrderFolio', folioState[act.id] || null)}
                        />
                      ) : <span className="text-xs font-mono text-slate-600">{act.workOrderFolio || '-'}</span>}
                    </td>

                    {/* P.O. */}
                    <td>
                      {canEditFields ? (
                        <div>
                          <input type="text" maxLength={10} className="w-[85px] text-xs px-1.5 py-1 rounded border border-slate-200 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={poState[act.id] || ''} placeholder="PENDIENTE"
                            onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setPoState((p) => ({ ...p, [act.id]: v })); }}
                            onBlur={() => updateField(act.id, 'purchaseOrder', poState[act.id] || null)}
                          />
                          {!poState[act.id] && <span className="block text-[9px] text-red-500 font-bold mt-0.5">PENDIENTE</span>}
                        </div>
                      ) : <span className={`text-xs font-mono ${act.purchaseOrder ? 'text-slate-700' : 'text-red-500 font-bold'}`}>{act.purchaseOrder || 'PENDIENTE'}</span>}
                    </td>

                    {/* LOTO */}
                    <td className="text-center">
                      {canEditFields ? (
                        <button onClick={() => { const n = !lotoState[act.id]; setLotoState((p) => ({ ...p, [act.id]: n })); updateField(act.id, 'loto', n); }}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${lotoState[act.id] ? 'bg-red-100 text-red-700 ring-1 ring-red-300 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-200'}`}>
                          {lotoState[act.id] ? 'SI' : 'NO'}
                        </button>
                      ) : <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${act.loto ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{act.loto ? 'SI' : 'NO'}</span>}
                    </td>

                    {/* TÉCNICOS */}
                    <td><AssignDropdown label="Técnico" options={technicians.map((t) => ({ id: t.id, name: t.name, badge: t.type }))} assigned={aT.map((x) => ({ assignmentId: x.id, id: x.technicianId, name: x.technician.name, hasConflict: !!conflictAlerts[`${act.id}-${x.technicianId}`] }))} onAssign={(id) => handleAssign('TECH', act.id, id)} onRemove={(id) => handleRemove(id, 'TECH')} disabled={!canAssign} colorClass="bg-sky-100 text-sky-700" /></td>

                    {/* SAFETY DESIGNADO */}
                    <td><AssignDropdown label="Designado" options={designadoOptions} assigned={aD.map((x) => ({ assignmentId: x.id, id: x.technicianId, name: x.technician.name, hasConflict: !!conflictAlerts[`${act.id}-${x.technicianId}`] }))} onAssign={(id) => handleAssign('SAFETY_DESIGNADO', act.id, id)} onRemove={(id) => handleRemove(id, 'TECH')} disabled={!canAssign} colorClass="bg-emerald-100 text-emerald-700" /></td>

                    {/* SAFETY DEDICADO */}
                    <td><AssignDropdown label="Dedicado" options={safetyDedicados.map((s) => ({ id: s.id, name: s.name }))} assigned={aS.map((x) => ({ assignmentId: x.id, id: x.safetyDedicadoId, name: x.safetyDedicado.name }))} onAssign={(id) => handleAssign('SAFETY_DEDICADO', act.id, id)} onRemove={(id) => handleRemove(id, 'SAFETY_DEDICADO')} disabled={!canAssignSafetyDedicado} colorClass="bg-amber-100 text-amber-700" /></td>

                    {/* VEHÍCULO */}
                    <td><AssignDropdown label="Vehículo" options={vehicles.map((v) => ({ id: v.id, name: v.name }))} assigned={aV.map((x) => ({ assignmentId: x.id, id: x.vehicleId, name: x.vehicle.name }))} onAssign={(id) => handleAssign('VEHICLE', act.id, id)} onRemove={(id) => handleRemove(id, 'VEHICLE')} disabled={!canAssign} colorClass="bg-violet-100 text-violet-700" /></td>

                    {/* CHOFER */}
                    <td><AssignDropdown label="Chofer" options={drivers.map((d) => ({ id: d.id, name: d.name }))} assigned={aDr.map((x) => ({ assignmentId: x.id, id: x.driverId, name: x.driver.name }))} onAssign={(id) => handleAssign('DRIVER', act.id, id)} onRemove={(id) => handleRemove(id, 'DRIVER')} disabled={!canAssign} colorClass="bg-cyan-100 text-cyan-700" /></td>

                    {/* EQ. ELEVACIÓN */}
                    <td><AssignDropdown label="Equipo" options={elevationEquips.map((e) => ({ id: e.id, name: e.name, badge: e.ownership }))} assigned={aE.map((x) => ({ assignmentId: x.id, id: x.equipId, name: x.equip.name, hasConflict: !!conflictAlerts[`${act.id}-${x.equipId}`] }))} onAssign={(id) => handleAssign('EQUIP', act.id, id)} onRemove={(id) => handleRemove(id, 'EQUIP')} disabled={!canAssign} colorClass="bg-orange-100 text-orange-700" /></td>

                    {/* NOTAS GENERALES */}
                    <td>
                      <NoteCell value={act.weekendNotes || ''} onChange={(v) => updateField(act.id, 'weekendNotes', v)} disabled={!canEditNotes(act)} placeholder="Agregar nota..." color="text-slate-700" />
                    </td>

                    {/* NOTAS AUDITORÍA */}
                    {canViewAudit && (
                      <td>
                        <NoteCell value={act.auditNotes || ''} onChange={(v) => updateField(act.id, 'auditNotes', v)} disabled={!canEditAudit} placeholder="Nota auditoría..." color="text-red-600" />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
