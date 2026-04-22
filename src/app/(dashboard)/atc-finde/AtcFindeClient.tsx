'use client';

import { useState, useRef, useEffect } from 'react';
import { CalendarDays, Download, Plus, X, AlertTriangle, Shield, HardHat, Search, Truck, User as UserIcon, ChevronsUp, Lock } from 'lucide-react';
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
  user: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
  opportunity: { id: string; folio: string } | null;
}

interface Technician { id: string; name: string; type: string; isCruzVerde: boolean; }
interface SafetyDedicado { id: string; name: string; }
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
  vehicles: Vehicle[];
  drivers: Driver[];
  elevationEquips: ElevationEquip[];
  techAssignments: TechAssignment[];
  safetyAssignments: SafetyAssignment[];
  vehicleAssignments: VehicleAssignment[];
  driverAssignments: DriverAssignment[];
  equipAssignments: EquipAssignment[];
  userRole: string;
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
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const assignedIds = new Set(assigned.map((a) => a.id));
  const available = options.filter(
    (o) => !assignedIds.has(o.id) && o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {assigned.map((a) => (
          <span
            key={a.assignmentId}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${a.hasConflict ? 'bg-red-100 text-red-700 ring-1 ring-red-300' : colorClass}`}
          >
            {a.hasConflict && <AlertTriangle size={10} />}
            {a.name}
            {!disabled && (
              <button onClick={() => onRemove(a.assignmentId)} className="hover:text-red-600 ml-0.5">
                <X size={10} />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <button
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] text-slate-500 hover:bg-slate-100 border border-dashed border-slate-300 transition-colors"
          >
            <Plus size={10} /> {label}
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 p-2 animate-fade-in">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="max-h-40 overflow-y-auto space-y-0.5">
            {available.length === 0 ? (
              <li className="text-xs text-slate-400 text-center py-3">Sin opciones disponibles</li>
            ) : (
              available.map((opt) => (
                <li
                  key={opt.id}
                  className="flex items-center justify-between px-2 py-1.5 text-xs rounded-md cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => { onAssign(opt.id); setSearch(''); }}
                >
                  <span className="font-medium text-slate-700">{opt.name}</span>
                  {opt.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{opt.badge}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────

export function AtcFindeClient({
  activities,
  technicians,
  safetyDedicados,
  vehicles,
  drivers,
  elevationEquips,
  techAssignments: initialTechAssignments,
  safetyAssignments: initialSafetyAssignments,
  vehicleAssignments: initialVehicleAssignments,
  driverAssignments: initialDriverAssignments,
  equipAssignments: initialEquipAssignments,
  userRole,
  weekendOf,
  weekendLabel,
}: Props) {
  const router = useRouter();
  const [techAssignments, setTechAssignments] = useState(initialTechAssignments);
  const [safetyAssignments, setSafetyAssignments] = useState(initialSafetyAssignments);
  const [vehicleAssignments, setVehicleAssignments] = useState(initialVehicleAssignments);
  const [driverAssignments, setDriverAssignments] = useState(initialDriverAssignments);
  const [equipAssignments, setEquipAssignments] = useState(initialEquipAssignments);
  const [conflictAlerts, setConflictAlerts] = useState<Record<string, string[]>>({});

  // Local state for inline LOTO / PO edits
  const [lotoState, setLotoState] = useState<Record<string, boolean>>(
    Object.fromEntries(activities.map((a) => [a.id, a.loto]))
  );
  const [poState, setPoState] = useState<Record<string, string>>(
    Object.fromEntries(activities.map((a) => [a.id, a.purchaseOrder || '']))
  );

  const canAssignTech = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canAssignSafetyDedicado = ['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canAssignDriver = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canAssignVehicle = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canAssignEquip = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canEditFields = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);

  // Safety Designado: Cruz Verde techs + Safety Dedicados combined
  const designadoOptions = [
    ...technicians.filter((t) => t.isCruzVerde).map((t) => ({ id: t.id, name: t.name, badge: '🟢 Cruz Verde', source: 'tech' as const })),
    ...safetyDedicados.map((s) => ({ id: `sd-${s.id}`, name: s.name, badge: '⭐ Dedicado', source: 'safety' as const })),
  ];

  // ── ASSIGN ──
  const handleAssign = async (
    type: 'TECH' | 'SAFETY_DESIGNADO' | 'SAFETY_DEDICADO' | 'VEHICLE' | 'DRIVER' | 'EQUIP',
    activityId: string,
    personId: string
  ) => {
    try {
      const body: any = { type, activityId, weekendOf };

      if (type === 'SAFETY_DEDICADO') body.safetyDedicadoId = personId;
      else if (type === 'VEHICLE') body.vehicleId = personId;
      else if (type === 'DRIVER') body.driverId = personId;
      else if (type === 'EQUIP') body.equipId = personId;
      else if (type === 'SAFETY_DESIGNADO') {
        // If it's a safety dedicado in the designado dropdown
        if (personId.startsWith('sd-')) {
          body.technicianId = personId; // Will be handled as tech assignment
        } else {
          body.technicianId = personId;
        }
      } else {
        body.technicianId = personId;
      }

      const res = await fetch('/api/weekend-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Error al asignar');
        return;
      }

      if (data.conflicts && data.conflicts.length > 0) {
        const msgs = data.conflicts.map(
          (c: any) => `⚠️ Conflicto de horario con: "${c.activityTitle}" (${c.startTime || '?'} - ${c.endTime || '?'})`
        );
        setConflictAlerts((prev) => ({ ...prev, [`${activityId}-${personId}`]: msgs }));
        alert(`AVISO DE DUPLICIDAD:\n${msgs.join('\n')}\n\nLa asignación fue registrada, pero revise el traslape de horarios.`);
      }

      // Update local state
      if (type === 'SAFETY_DEDICADO') setSafetyAssignments((prev) => [...prev, data.assignment]);
      else if (type === 'VEHICLE') setVehicleAssignments((prev) => [...prev, data.assignment]);
      else if (type === 'DRIVER') setDriverAssignments((prev) => [...prev, data.assignment]);
      else if (type === 'EQUIP') setEquipAssignments((prev) => [...prev, data.assignment]);
      else setTechAssignments((prev) => [...prev, data.assignment]);
    } catch (err) {
      alert('Error de conexión');
    }
  };

  // ── REMOVE ──
  const handleRemove = async (assignmentId: string, assignmentType: string) => {
    try {
      const res = await fetch('/api/weekend-assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, assignmentType }),
      });
      if (!res.ok) { const data = await res.json(); alert(data.error || 'Error'); return; }

      if (assignmentType === 'SAFETY_DEDICADO') setSafetyAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      else if (assignmentType === 'VEHICLE') setVehicleAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      else if (assignmentType === 'DRIVER') setDriverAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      else if (assignmentType === 'EQUIP') setEquipAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      else setTechAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch (err) {
      alert('Error de conexión');
    }
  };

  // ── INLINE FIELD UPDATE (LOTO, PO) ──
  const updateActivityField = async (activityId: string, field: string, value: any) => {
    try {
      await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (err) {
      console.error('Error updating field', err);
    }
  };

  // ── CSV EXPORT ──
  const exportCSV = () => {
    const headers = [
      '#', 'Día', 'Hora Inicio', 'Hora Fin', 'Responsable',
      'Contacto', 'Actividad', 'Folio Odoo', 'P.O.', 'LOTO',
      'Técnicos', 'Safety Designado', 'Safety Dedicado',
      'Vehículo', 'Chofer', 'Eq. Elevación',
    ];
    const rows = activities.map((a, idx) => {
      const techs = techAssignments.filter((ta) => ta.activityId === a.id && ta.role === 'TECNICO').map((ta) => ta.technician.name).join('; ');
      const designados = techAssignments.filter((ta) => ta.activityId === a.id && ta.role === 'SAFETY_DESIGNADO').map((ta) => ta.technician.name).join('; ');
      const dedicados = safetyAssignments.filter((sa) => sa.activityId === a.id).map((sa) => sa.safetyDedicado.name).join('; ');
      const vehs = vehicleAssignments.filter((va) => va.activityId === a.id).map((va) => va.vehicle.name).join('; ');
      const drvs = driverAssignments.filter((da) => da.activityId === a.id).map((da) => da.driver.name).join('; ');
      const eqs = equipAssignments.filter((ea) => ea.activityId === a.id).map((ea) => ea.equip.name).join('; ');

      return [
        idx + 1, formatDate(a.date), a.startTime || '-', a.endTime || '-',
        a.user?.name || '-', a.contact?.name || '-',
        `"${a.title.replace(/"/g, '""')}"`,
        a.workOrderFolio || '-', a.purchaseOrder || 'PENDIENTE',
        lotoState[a.id] ? 'SI' : 'NO',
        techs || '-', designados || '-', dedicados || '-',
        vehs || '-', drvs || '-', eqs || '-',
      ];
    });

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plan_finde_${weekendOf}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── HELPERS ──
  const getTechsForActivity = (actId: string, role: string) =>
    techAssignments.filter((ta) => ta.activityId === actId && ta.role === role);
  const getSafetyForActivity = (actId: string) =>
    safetyAssignments.filter((sa) => sa.activityId === actId);
  const getVehiclesForActivity = (actId: string) =>
    vehicleAssignments.filter((va) => va.activityId === actId);
  const getDriversForActivity = (actId: string) =>
    driverAssignments.filter((da) => da.activityId === actId);
  const getEquipsForActivity = (actId: string) =>
    equipAssignments.filter((ea) => ea.activityId === actId);

  // ── STATS ──
  const satActivities = activities.filter((a) => new Date(a.date).getUTCDay() === 6);
  const sunActivities = activities.filter((a) => new Date(a.date).getUTCDay() === 0);
  const engineerMap = new Map<string, number>();
  activities.forEach((a) => {
    const name = a.user?.name || 'Sin asignar';
    engineerMap.set(name, (engineerMap.get(name) || 0) + 1);
  });
  const satTechIds = new Set(techAssignments.filter((ta) => {
    const act = activities.find((a) => a.id === ta.activityId);
    return act && new Date(act.date).getUTCDay() === 6;
  }).map((ta) => ta.technicianId));
  const sunTechIds = new Set(techAssignments.filter((ta) => {
    const act = activities.find((a) => a.id === ta.activityId);
    return act && new Date(act.date).getUTCDay() === 0;
  }).map((ta) => ta.technicianId));
  const allTechIds = new Set(techAssignments.map((ta) => ta.technicianId));

  return (
    <div className="space-y-5 pb-20 md:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-indigo-600" />
            Plan ATC FINDE
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Fin de semana inmediato: <span className="font-semibold text-indigo-600">{weekendLabel}</span>
          </p>
        </div>
        <button onClick={exportCSV} className="btn-secondary text-sm shrink-0">
          <Download size={16} /> Exportar Plan
        </button>
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
            <span className="text-indigo-600 font-semibold">SÁB {satActivities.length}</span>
            <span className="text-purple-600 font-semibold">DOM {sunActivities.length}</span>
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
            {Array.from(engineerMap.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs">
                <span className="font-semibold text-slate-800">{name}</span>
                <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>
              </span>
            ))}
            {engineerMap.size === 0 && <span className="text-xs text-slate-400">Sin datos</span>}
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
                <th className="font-semibold w-[100px]">Día</th>
                <th className="font-semibold w-[90px]">Horario</th>
                <th className="font-semibold w-[110px]">Responsable</th>
                <th className="font-semibold w-[110px]">Contacto</th>
                <th className="font-semibold min-w-[150px]">Actividad</th>
                <th className="font-semibold w-[90px]">Folio Odoo</th>
                <th className="font-semibold w-[100px]">P.O.</th>
                <th className="font-semibold w-[55px] text-center">LOTO</th>
                <th className="font-semibold min-w-[160px]">Técnicos</th>
                <th className="font-semibold min-w-[150px]">Safety Designado</th>
                <th className="font-semibold min-w-[140px]">Safety Dedicado</th>
                <th className="font-semibold min-w-[130px]">Vehículo</th>
                <th className="font-semibold min-w-[120px]">Chofer</th>
                <th className="font-semibold min-w-[140px]">Eq. Elevación</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-16">
                    <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
                    <p className="font-medium text-lg text-slate-400">Fin de Semana Despejado</p>
                    <p className="text-sm mt-1 text-slate-400">No hay actividades para este fin de semana.</p>
                  </td>
                </tr>
              ) : (
                activities.map((act, index) => {
                  const actTechs = getTechsForActivity(act.id, 'TECNICO');
                  const actDesignados = getTechsForActivity(act.id, 'SAFETY_DESIGNADO');
                  const actDedicados = getSafetyForActivity(act.id);
                  const actVehicles = getVehiclesForActivity(act.id);
                  const actDrivers = getDriversForActivity(act.id);
                  const actEquips = getEquipsForActivity(act.id);

                  return (
                    <tr key={act.id} className="hover:bg-slate-50/50 transition-colors align-top">
                      <td className="text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">{index + 1}</span>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800 text-xs">{formatDate(act.date)}</span>
                          <span className="text-[10px] text-indigo-500 uppercase tracking-widest font-bold">
                            {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'][new Date(act.date).getUTCDay()]}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono border border-slate-200">
                          {act.startTime || '--:--'} — {act.endTime || '--:--'}
                        </span>
                      </td>
                      <td><span className="text-xs font-medium text-slate-700">{act.user?.name || '-'}</span></td>
                      <td><span className="text-xs font-medium text-slate-800">{act.contact?.name || '-'}</span></td>
                      <td>
                        <p className="font-semibold text-slate-800 text-xs leading-snug cursor-pointer hover:text-indigo-600" onClick={() => router.push(`/actividades/${act.id}`)}>
                          {act.title.length > 50 ? act.title.substring(0, 50) + '...' : act.title}
                        </p>
                      </td>

                      {/* FOLIO ODOO */}
                      <td>
                        <span className="text-xs font-mono text-slate-600">{act.workOrderFolio || '-'}</span>
                      </td>

                      {/* P.O. */}
                      <td>
                        {canEditFields ? (
                          <input
                            type="text"
                            maxLength={10}
                            className="w-[85px] text-xs px-1.5 py-1 rounded border border-slate-200 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={poState[act.id] || ''}
                            placeholder="PENDIENTE"
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                              setPoState((prev) => ({ ...prev, [act.id]: val }));
                            }}
                            onBlur={() => updateActivityField(act.id, 'purchaseOrder', poState[act.id] || null)}
                          />
                        ) : (
                          <span className={`text-xs font-mono ${act.purchaseOrder ? 'text-slate-700' : 'text-red-500 font-bold'}`}>
                            {act.purchaseOrder || 'PENDIENTE'}
                          </span>
                        )}
                        {!poState[act.id] && canEditFields && (
                          <span className="block text-[9px] text-red-500 font-bold mt-0.5">PENDIENTE</span>
                        )}
                      </td>

                      {/* LOTO */}
                      <td className="text-center">
                        {canEditFields ? (
                          <button
                            onClick={() => {
                              const newVal = !lotoState[act.id];
                              setLotoState((prev) => ({ ...prev, [act.id]: newVal }));
                              updateActivityField(act.id, 'loto', newVal);
                            }}
                            className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                              lotoState[act.id]
                                ? 'bg-red-100 text-red-700 ring-1 ring-red-300 hover:bg-red-200'
                                : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-200'
                            }`}
                          >
                            {lotoState[act.id] ? 'SI' : 'NO'}
                          </button>
                        ) : (
                          <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                            act.loto ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {act.loto ? 'SI' : 'NO'}
                          </span>
                        )}
                      </td>

                      {/* TÉCNICOS */}
                      <td>
                        <AssignDropdown
                          label="Técnico"
                          options={technicians.map((t) => ({ id: t.id, name: t.name, badge: t.type }))}
                          assigned={actTechs.map((ta) => ({
                            assignmentId: ta.id, id: ta.technicianId, name: ta.technician.name,
                            hasConflict: !!conflictAlerts[`${act.id}-${ta.technicianId}`],
                          }))}
                          onAssign={(id) => handleAssign('TECH', act.id, id)}
                          onRemove={(id) => handleRemove(id, 'TECH')}
                          disabled={!canAssignTech}
                          colorClass="bg-sky-100 text-sky-700"
                        />
                      </td>

                      {/* SAFETY DESIGNADO (Cruz Verde + Safety Dedicados) */}
                      <td>
                        <AssignDropdown
                          label="Designado"
                          options={designadoOptions.map((d) => ({ id: d.id, name: d.name, badge: d.badge }))}
                          assigned={actDesignados.map((ta) => ({
                            assignmentId: ta.id, id: ta.technicianId, name: ta.technician.name,
                            hasConflict: !!conflictAlerts[`${act.id}-${ta.technicianId}`],
                          }))}
                          onAssign={(id) => handleAssign('SAFETY_DESIGNADO', act.id, id)}
                          onRemove={(id) => handleRemove(id, 'TECH')}
                          disabled={!canAssignTech}
                          colorClass="bg-emerald-100 text-emerald-700"
                        />
                      </td>

                      {/* SAFETY DEDICADO */}
                      <td>
                        <AssignDropdown
                          label="Dedicado"
                          options={safetyDedicados.map((s) => ({ id: s.id, name: s.name }))}
                          assigned={actDedicados.map((sa) => ({
                            assignmentId: sa.id, id: sa.safetyDedicadoId, name: sa.safetyDedicado.name,
                          }))}
                          onAssign={(id) => handleAssign('SAFETY_DEDICADO', act.id, id)}
                          onRemove={(id) => handleRemove(id, 'SAFETY_DEDICADO')}
                          disabled={!canAssignSafetyDedicado}
                          colorClass="bg-amber-100 text-amber-700"
                        />
                      </td>

                      {/* VEHÍCULO */}
                      <td>
                        <AssignDropdown
                          label="Vehículo"
                          options={vehicles.map((v) => ({ id: v.id, name: v.name }))}
                          assigned={actVehicles.map((va) => ({
                            assignmentId: va.id, id: va.vehicleId, name: va.vehicle.name,
                          }))}
                          onAssign={(id) => handleAssign('VEHICLE', act.id, id)}
                          onRemove={(id) => handleRemove(id, 'VEHICLE')}
                          disabled={!canAssignVehicle}
                          colorClass="bg-violet-100 text-violet-700"
                        />
                      </td>

                      {/* CHOFER */}
                      <td>
                        <AssignDropdown
                          label="Chofer"
                          options={drivers.map((d) => ({ id: d.id, name: d.name }))}
                          assigned={actDrivers.map((da) => ({
                            assignmentId: da.id, id: da.driverId, name: da.driver.name,
                          }))}
                          onAssign={(id) => handleAssign('DRIVER', act.id, id)}
                          onRemove={(id) => handleRemove(id, 'DRIVER')}
                          disabled={!canAssignDriver}
                          colorClass="bg-cyan-100 text-cyan-700"
                        />
                      </td>

                      {/* EQ. ELEVACIÓN */}
                      <td>
                        <AssignDropdown
                          label="Equipo"
                          options={elevationEquips.map((e) => ({ id: e.id, name: e.name, badge: e.ownership }))}
                          assigned={actEquips.map((ea) => ({
                            assignmentId: ea.id, id: ea.equipId, name: ea.equip.name,
                            hasConflict: !!conflictAlerts[`${act.id}-${ea.equipId}`],
                          }))}
                          onAssign={(id) => handleAssign('EQUIP', act.id, id)}
                          onRemove={(id) => handleRemove(id, 'EQUIP')}
                          disabled={!canAssignEquip}
                          colorClass="bg-orange-100 text-orange-700"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
