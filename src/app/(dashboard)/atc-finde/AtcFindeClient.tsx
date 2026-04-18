'use client';

import { useState, useRef, useEffect } from 'react';
import { CalendarDays, Download, ClipboardList, Plus, X, AlertTriangle, Shield, HardHat, Search } from 'lucide-react';
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
  user: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
  opportunity: { id: string; folio: string } | null;
}

interface Technician {
  id: string;
  name: string;
  type: string;
  isCruzVerde: boolean;
}

interface SafetyDedicado {
  id: string;
  name: string;
}

interface TechAssignment {
  id: string;
  activityId: string;
  technicianId: string;
  role: string;
  technician: Technician;
}

interface SafetyAssignment {
  id: string;
  activityId: string;
  safetyDedicadoId: string;
  safetyDedicado: SafetyDedicado;
}

interface Props {
  activities: Activity[];
  technicians: Technician[];
  safetyDedicados: SafetyDedicado[];
  techAssignments: TechAssignment[];
  safetyAssignments: SafetyAssignment[];
  userRole: string;
  weekendOf: string;
  weekendLabel: string;
}

// ─── MULTI-SELECT DROPDOWN ──────────────────────────────────────

function AssignDropdown({
  label,
  options,
  assigned,
  onAssign,
  onRemove,
  disabled,
  colorClass,
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
      {/* Assigned chips */}
      <div className="flex flex-wrap gap-1 min-h-[28px]">
        {assigned.map((a) => (
          <span
            key={a.assignmentId}
            className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium ${colorClass} ${a.hasConflict ? 'ring-2 ring-amber-400' : ''}`}
          >
            {a.hasConflict && <AlertTriangle size={10} className="text-amber-600" />}
            {a.name}
            {!disabled && (
              <button onClick={() => onRemove(a.assignmentId)} className="hover:bg-black/10 rounded-full p-0.5">
                <X size={10} />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <button
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            <Plus size={10} /> {label}
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
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
                  onClick={() => {
                    onAssign(opt.id);
                    setSearch('');
                  }}
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
  techAssignments: initialTechAssignments,
  safetyAssignments: initialSafetyAssignments,
  userRole,
  weekendOf,
  weekendLabel,
}: Props) {
  const router = useRouter();
  const [techAssignments, setTechAssignments] = useState(initialTechAssignments);
  const [safetyAssignments, setSafetyAssignments] = useState(initialSafetyAssignments);
  const [conflictAlerts, setConflictAlerts] = useState<Record<string, string[]>>({});

  const canAssignTech = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canAssignSafetyDedicado = ['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const cruzVerdeList = technicians.filter((t) => t.isCruzVerde);

  // ── ASSIGN ──
  const handleAssign = async (
    type: 'TECH' | 'SAFETY_DESIGNADO' | 'SAFETY_DEDICADO',
    activityId: string,
    personId: string
  ) => {
    try {
      const body: any = { type, activityId, weekendOf };
      if (type === 'SAFETY_DEDICADO') body.safetyDedicadoId = personId;
      else body.technicianId = personId;

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

      // Show conflict warnings
      if (data.conflicts && data.conflicts.length > 0) {
        const msgs = data.conflicts.map(
          (c: any) => `⚠️ Conflicto de horario con: "${c.activityTitle}" (${c.startTime || '?'} - ${c.endTime || '?'})`
        );
        setConflictAlerts((prev) => ({
          ...prev,
          [`${activityId}-${personId}`]: msgs,
        }));
        alert(`AVISO DE DUPLICIDAD:\n${msgs.join('\n')}\n\nLa asignación fue registrada, pero revise el traslape de horarios.`);
      }

      // Update local state
      if (type === 'SAFETY_DEDICADO') {
        setSafetyAssignments((prev) => [...prev, data.assignment]);
      } else {
        setTechAssignments((prev) => [...prev, data.assignment]);
      }
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
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Error');
        return;
      }

      if (assignmentType === 'SAFETY_DEDICADO') {
        setSafetyAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      } else {
        setTechAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  // ── CSV EXPORT ──
  const exportCSV = () => {
    const headers = [
      'Día', 'Hora Inicio', 'Hora Fin', 'Responsable',
      'Cliente', 'Actividad', 'Técnicos Asignados',
      'Safety Designado', 'Safety Dedicado',
    ];
    const rows = activities.map((a) => {
      const techs = techAssignments
        .filter((ta) => ta.activityId === a.id && ta.role === 'TECNICO')
        .map((ta) => ta.technician.name).join('; ');
      const designados = techAssignments
        .filter((ta) => ta.activityId === a.id && ta.role === 'SAFETY_DESIGNADO')
        .map((ta) => ta.technician.name).join('; ');
      const dedicados = safetyAssignments
        .filter((sa) => sa.activityId === a.id)
        .map((sa) => sa.safetyDedicado.name).join('; ');

      return [
        formatDate(a.date),
        a.startTime || '-',
        a.endTime || '-',
        a.user?.name || '-',
        a.client?.name || '-',
        `"${a.title.replace(/"/g, '""')}"`,
        techs || '-',
        designados || '-',
        dedicados || '-',
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
            Fin de semana inmediato: <span className="font-semibold text-indigo-600">{weekendLabel}</span>
          </p>
        </div>
        <button onClick={exportCSV} className="btn-secondary text-sm shrink-0">
          <Download size={16} /> Exportar Plan
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-sky-100 text-sky-700 font-medium">
          <HardHat size={12} /> Técnico
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
          <Shield size={12} /> Safety Designado (Cruz Verde)
        </span>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
          <Shield size={12} /> Safety Dedicado
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="bg-slate-50">
                <th className="font-semibold w-[110px]">Día</th>
                <th className="font-semibold w-[100px]">Horario</th>
                <th className="font-semibold w-[120px]">Responsable</th>
                <th className="font-semibold w-[120px]">Cliente</th>
                <th className="font-semibold">Actividad</th>
                <th className="font-semibold min-w-[180px]">Técnicos</th>
                <th className="font-semibold min-w-[160px]">Safety Designado</th>
                <th className="font-semibold min-w-[160px]">Safety Dedicado</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
                    <p className="font-medium text-lg text-slate-400">Fin de Semana Despejado</p>
                    <p className="text-sm mt-1 text-slate-400">No hay actividades para este fin de semana.</p>
                  </td>
                </tr>
              ) : (
                activities.map((act) => {
                  const actTechs = getTechsForActivity(act.id, 'TECNICO');
                  const actDesignados = getTechsForActivity(act.id, 'SAFETY_DESIGNADO');
                  const actDedicados = getSafetyForActivity(act.id);

                  return (
                    <tr key={act.id} className="hover:bg-slate-50/50 transition-colors align-top">
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
                      <td>
                        <span className="text-xs font-medium text-slate-700">{act.user?.name || '-'}</span>
                      </td>
                      <td>
                        <span className="text-xs font-medium text-slate-800">{act.client?.name || '-'}</span>
                      </td>
                      <td>
                        <p className="font-semibold text-slate-800 text-xs leading-snug cursor-pointer hover:text-indigo-600" onClick={() => router.push(`/actividades/${act.id}`)}>
                          {act.title.length > 60 ? act.title.substring(0, 60) + '...' : act.title}
                        </p>
                      </td>

                      {/* TÉCNICOS */}
                      <td>
                        <AssignDropdown
                          label="Técnico"
                          options={technicians.map((t) => ({ id: t.id, name: t.name, badge: t.type }))}
                          assigned={actTechs.map((ta) => ({
                            assignmentId: ta.id,
                            id: ta.technicianId,
                            name: ta.technician.name,
                            hasConflict: !!conflictAlerts[`${act.id}-${ta.technicianId}`],
                          }))}
                          onAssign={(id) => handleAssign('TECH', act.id, id)}
                          onRemove={(id) => handleRemove(id, 'TECH')}
                          disabled={!canAssignTech}
                          colorClass="bg-sky-100 text-sky-700"
                        />
                      </td>

                      {/* SAFETY DESIGNADO */}
                      <td>
                        <AssignDropdown
                          label="Designado"
                          options={cruzVerdeList.map((t) => ({ id: t.id, name: t.name }))}
                          assigned={actDesignados.map((ta) => ({
                            assignmentId: ta.id,
                            id: ta.technicianId,
                            name: ta.technician.name,
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
                            assignmentId: sa.id,
                            id: sa.safetyDedicadoId,
                            name: sa.safetyDedicado.name,
                          }))}
                          onAssign={(id) => handleAssign('SAFETY_DEDICADO', act.id, id)}
                          onRemove={(id) => handleRemove(id, 'SAFETY_DEDICADO')}
                          disabled={!canAssignSafetyDedicado}
                          colorClass="bg-amber-100 text-amber-700"
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
