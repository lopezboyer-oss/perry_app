'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CalendarDays, Download, Plus, X, AlertTriangle, Shield, ShieldCheck, HardHat, Search, MessageSquare, FileWarning, Loader2, ImagePlus, Trash2, Eye, Clock, Ban, Copy, Check, ExternalLink, RotateCcw } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { TimeRegistryModal, TimeRegistryEntryData } from '@/components/ui/TimeRegistryModal';
import { canViewEconomicAnalysis } from '@/lib/permissions';

// ─── TYPES ──────────────────────────────────────────────────────

interface Activity {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  workOrderFolio: string | null;
  purchaseOrder: string | null;
  loto: boolean;
  weekendNotes: string | null;
  auditNotes: string | null;
  alertNotes: string | null;
  safetyAuditImage: string | null;
  teraFolio: string | null;
  teraUploadedAt: string | null;
  teraUploadedBy: string | null;
  teraAuditorFolio: string | null;
  teraAuditorUploadedAt: string | null;
  teraAuditorUploadedBy: string | null;
  teraAuditorImage: string | null;
  teraExempt: boolean;
  teraExemptBy: string | null;
  user: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
  timeRegistryEntries: TimeRegistryEntryData[];
  continuedFromId?: string | null;
  cancelledBy?: string | null;
  cancelReason?: string | null;
  cancelNotes?: string | null;
}

interface Technician { id: string; name: string; type: string; isCruzVerde: boolean; phone?: string | null; contractorId?: string | null; contractor?: { id: string; name: string } | null; linkedUserId?: string | null; }
interface SafetyDedicado { id: string; name: string; linkedUserId?: string | null; }
interface SafetyDesignadoUser { id: string; name: string; }
interface Vehicle { id: string; name: string; }
interface Driver { id: string; name: string; }
interface ElevationEquip { id: string; name: string; ownership: string; }

interface TechAssignment { id: string; activityId: string; technicianId: string; role: string; technician: Technician; }
interface SafetyAssignment { id: string; activityId: string; safetyDedicadoId: string; role: string; safetyDedicado: SafetyDedicado; }
interface VehicleAssignment { id: string; activityId: string; vehicleId: string; vehicle: Vehicle; }
interface DriverAssignment { id: string; activityId: string; driverId: string; driver: Driver; }
interface EquipAssignment { id: string; activityId: string; equipId: string; equip: ElevationEquip; }
interface UserSafetyAssignment { id: string; activityId: string; userId: string; user: { id: string; name: string }; }

interface AllCompanyActivity {
  id: string; title: string; type: string; status: string; date: string;
  startTime: string | null; endTime: string | null; loto: boolean; weekendNotes: string | null;
  workOrderFolio: string | null; purchaseOrder: string | null;
  user: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
  companyName: string;
}

interface PlanDay {
  date: string;
  isExtra: boolean;
  extraId: string | null;
  label: string | null;
  hasActivities: boolean;
}

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
  userSafetyAssignments: UserSafetyAssignment[];
  userRole: string;
  userId: string;
  userName: string;
  weekendOf: string;
  weekendLabel: string;
  planDays: PlanDay[];
  companyName: string;
  userIsSafetyAuditor: boolean;
  allCompanyActivities: AllCompanyActivity[];
  preloadedConflicts: Record<string, string[]>;
  currentUserEmail?: string;
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
  userSafetyAssignments: initialUserSafetyAssignments,
  userRole, userId, userName, currentUserEmail = '', weekendOf, weekendLabel, planDays, companyName, userIsSafetyAuditor, allCompanyActivities, preloadedConflicts,
}: Props) {
  const router = useRouter();
  const [techAssignments, setTechAssignments] = useState(initialTechAssignments);
  const [safetyAssignments, setSafetyAssignments] = useState(initialSafetyAssignments);
  const [vehicleAssignments, setVehicleAssignments] = useState(initialVehicleAssignments);
  const [driverAssignments, setDriverAssignments] = useState(initialDriverAssignments);
  const [equipAssignments, setEquipAssignments] = useState(initialEquipAssignments);
  const [userSafetyAssignments, setUserSafetyAssignments] = useState(initialUserSafetyAssignments);
  const [conflictAlerts, setConflictAlerts] = useState<Record<string, string[]>>(preloadedConflicts);

  const [lotoState, setLotoState] = useState<Record<string, boolean>>(Object.fromEntries(activities.map((a) => [a.id, a.loto])));
  const [poState, setPoState] = useState<Record<string, string>>(Object.fromEntries(activities.map((a) => [a.id, a.purchaseOrder || ''])));
  const [folioState, setFolioState] = useState<Record<string, string>>(Object.fromEntries(activities.map((a) => [a.id, a.workOrderFolio || ''])));
  const [notesState, setNotesState] = useState<Record<string, string>>(Object.fromEntries(activities.map((a) => [a.id, a.weekendNotes || ''])));
  const [auditNotesState, setAuditNotesState] = useState<Record<string, string>>(Object.fromEntries(activities.map((a) => [a.id, a.auditNotes || ''])));
  const [alertNotesState, setAlertNotesState] = useState<Record<string, string>>(Object.fromEntries(activities.map((a) => [a.id, a.alertNotes || ''])));

  // Safety audit image state
  const [auditImages, setAuditImages] = useState<Record<string, string | null>>(Object.fromEntries(activities.map((a) => [a.id, a.safetyAuditImage || null])));
  const [auditImageLoading, setAuditImageLoading] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [teraFolios, setTeraFolios] = useState<Record<string, string>>(Object.fromEntries(activities.map((a) => [a.id, a.teraFolio || ''])));
  const [teraFolioSaving, setTeraFolioSaving] = useState<Record<string, boolean>>({});
  const deletingTeraRef = useRef<Set<string>>(new Set());
  const [teraUploadInfo, setTeraUploadInfo] = useState<Record<string, { at: string | null; by: string | null }>>(Object.fromEntries(activities.map((a) => [a.id, { at: a.teraUploadedAt || null, by: a.teraUploadedBy || null }])));

  // TERA Auditor state
  const [teraAuditorFolios, setTeraAuditorFolios] = useState<Record<string, string>>(Object.fromEntries(activities.map((a) => [a.id, a.teraAuditorFolio || ''])));
  const [teraAuditorFolioSaving, setTeraAuditorFolioSaving] = useState<Record<string, boolean>>({});
  const [teraAuditorImages, setTeraAuditorImages] = useState<Record<string, string | null>>(Object.fromEntries(activities.map((a) => [a.id, a.teraAuditorImage || null])));
  const [teraAuditorImageLoading, setTeraAuditorImageLoading] = useState<Record<string, boolean>>({});
  const [teraAuditorUploadInfo, setTeraAuditorUploadInfo] = useState<Record<string, { at: string | null; by: string | null }>>(Object.fromEntries(activities.map((a) => [a.id, { at: a.teraAuditorUploadedAt || null, by: a.teraAuditorUploadedBy || null }])));

  // Time registry state
  const [timeRegistries, setTimeRegistries] = useState<Record<string, TimeRegistryEntryData[]>>(Object.fromEntries(activities.map((a) => [a.id, a.timeRegistryEntries || []])));
  const [timeRegistryModal, setTimeRegistryModal] = useState<{ activityId: string; activityTitle: string } | null>(null);

  // TERA Exempt state
  const [teraExemptState, setTeraExemptState] = useState<Record<string, boolean>>(Object.fromEntries(activities.map((a) => [a.id, a.teraExempt || false])));
  const [teraExemptByState, setTeraExemptByState] = useState<Record<string, string | null>>(Object.fromEntries(activities.map((a) => [a.id, a.teraExemptBy || null])));
  const [teraExemptLoading, setTeraExemptLoading] = useState<Record<string, boolean>>({});

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState<{ activity: Activity } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancelHasCharges, setCancelHasCharges] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ whatsappNotice: string; newCotizacionId: string | null; releasedResources: any } | null>(null);
  const [cancelCopied, setCancelCopied] = useState(false);
  // Track locally-cancelled activity IDs so UI reflects cancellation without reload
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set(activities.filter(a => a.status === 'CANCELADA').map(a => a.id)));
  const [cancelledByMap, setCancelledByMap] = useState<Record<string, string>>(Object.fromEntries(activities.filter(a => a.cancelledBy).map(a => [a.id, a.cancelledBy!])));
  const [uncancelLoading, setUncancelLoading] = useState<Record<string, boolean>>({});

  // Extra day dialog state
  const [showExtraDayDialog, setShowExtraDayDialog] = useState(false);
  const [extraDayDate, setExtraDayDate] = useState('');
  const [extraDayLabel, setExtraDayLabel] = useState('');
  const [extraDaySaving, setExtraDaySaving] = useState(false);

  const canAssign = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canAssignSafetyDedicado = ['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canEditFields = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canViewAudit = true; // All profiles can now see Notas Auditoría
  const canEditAudit = userRole === 'SUPERVISOR_SAFETY_LP' || userIsSafetyAuditor; // Safety & LP + Auditor Safety
  const canViewAlertNotes = ['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canEditAlertNotes = userRole === 'SUPERVISOR_SAFETY_LP';
  const canManageExtraDays = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canCancelAny = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canCancelOwn = userRole === 'INGENIERO';

  const canEditAuditImage = (act: Activity) => {
    if (['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole)) return true;
    if (userRole === 'INGENIERO' && act.user?.id === userId) return true;
    // Sup Operativo assigned to this activity (any of the 3 sources)
    if (isSupOperativoForActivity(act.id)) return true;
    return false;
  };

  const canEditTeraAuditor = () => {
    if (['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(userRole)) return true;
    if (userIsSafetyAuditor) return true;
    return false;
  };

  // Check if current user is assigned as Sup Operativo for an activity
  // Covers ALL 3 assignment sources:
  //   1. Técnico Cruz Verde as SAFETY_DESIGNADO (match by name)
  //   2. User as Safety Designado (WeekendUserSafetyAssignment, match by userId)
  //   3. Safety Dedicado as DESIGNADO (match by name)
  const isSupOperativoForActivity = (actId: string) => {
    // Source 1: WeekendUserSafetyAssignment (userId match)
    if ((userSafetyAssignments || []).some((x: any) => x.activityId === actId && x.userId === userId)) return true;

    // Source 2: WeekendTechAssignment with role SAFETY_DESIGNADO (name or linkedUserId match)
    const techDesignados = techAssignments.filter(x => x.activityId === actId && x.role === 'SAFETY_DESIGNADO');
    if (techDesignados.some(x => x.technician.name === userName || (x.technician.linkedUserId && x.technician.linkedUserId === userId))) return true;

    // Source 3: WeekendSafetyAssignment with role DESIGNADO (name or linkedUserId match)
    const safetyDesignados = safetyAssignments.filter(x => x.activityId === actId && x.role === 'DESIGNADO');
    if (safetyDesignados.some(x => x.safetyDedicado.name === userName || (x.safetyDedicado.linkedUserId && x.safetyDedicado.linkedUserId === userId))) return true;

    return false;
  };

  // Odoo lookup state
  // Toggle TERA exemption (Safety & LP only)
  const toggleTeraExempt = async (actId: string) => {
    const newValue = !teraExemptState[actId];
    setTeraExemptLoading((p) => ({ ...p, [actId]: true }));
    try {
      const res = await fetch(`/api/activities/${actId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teraExempt: newValue,
          teraExemptBy: newValue ? userName : null,
        }),
      });
      if (res.ok) {
        setTeraExemptState((p) => ({ ...p, [actId]: newValue }));
        setTeraExemptByState((p) => ({ ...p, [actId]: newValue ? userName : null }));
      } else {
        const d = await res.json();
        alert(d.error || 'Error al cambiar exención TERA');
      }
    } catch { alert('Error de conexión'); }
    setTeraExemptLoading((p) => ({ ...p, [actId]: false }));
  };

  const [odooLoading, setOdooLoading] = useState<Record<string, boolean>>({});
  const [odooInfo, setOdooInfo] = useState<Record<string, { client?: string; state?: string; found: boolean; hasPO: boolean }>>({});

  const lookupOdoo = async (actId: string, folio: string, save = true) => {
    if (save) updateField(actId, 'workOrderFolio', folio || null);
    if (!folio || folio.length < 4) {
      // Clear Odoo info if folio is too short
      if (save) {
        setOdooInfo((p) => { const n = { ...p }; delete n[actId]; return n; });
      }
      return;
    }

    setOdooLoading((p) => ({ ...p, [actId]: true }));
    try {
      const res = await fetch(`/api/odoo/lookup?folio=${encodeURIComponent(folio)}`);
      const data = await res.json();
      if (data.found) {
        setOdooInfo((p) => ({ ...p, [actId]: { client: data.client, state: data.stateLabel, found: true, hasPO: !!data.purchaseOrder } }));
        // Always update the P.O. field based on Odoo result
        const newPO = data.purchaseOrder || '';
        setPoState((p) => ({ ...p, [actId]: newPO }));
        if (save) updateField(actId, 'purchaseOrder', newPO || null);
      } else {
        setOdooInfo((p) => ({ ...p, [actId]: { found: false, hasPO: false } }));
        // Clear PO if folio not found in Odoo
        if (save) {
          setPoState((p) => ({ ...p, [actId]: '' }));
          updateField(actId, 'purchaseOrder', null);
        }
      }
    } catch { /* silent */ }
    setOdooLoading((p) => ({ ...p, [actId]: false }));
  };

  // Auto-lookup on page load for all activities with a folio
  useEffect(() => {
    if (!canEditFields) return;
    activities.forEach((act) => {
      const folio = folioState[act.id];
      if (folio && folio.length >= 4) {
        lookupOdoo(act.id, folio, false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Sup Operativo assigned to this activity
    if (isSupOperativoForActivity(act.id)) return true;
    return false;
  };

  // ── ASSIGN ──
  const handleAssign = async (type: string, activityId: string, personId: string) => {
    try {
      // Detect usr- prefix for user-based Safety Designado
      if (type === 'SAFETY_DESIGNADO' && personId.startsWith('usr-')) {
        const realUserId = personId.replace('usr-', '');
        const body = { type: 'USER_SAFETY_DESIGNADO', activityId, weekendOf, userId: realUserId };
        const res = await fetch('/api/weekend-assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) { alert(data.error || 'Error al asignar'); return; }
        if (data.conflicts?.length > 0) {
          const msgs = data.conflicts.map((c: any) => `⚠️ "${c.activityTitle}" (${c.startTime || '?'} - ${c.endTime || '?'}) ${c.day || ''} ${c.company || ''}`.trim());
          setConflictAlerts((prev) => ({ ...prev, [`${activityId}-${personId}`]: msgs }));
          alert(`AVISO DE DUPLICIDAD:\n${msgs.join('\n')}`);
        }
        setUserSafetyAssignments((prev) => [...prev, data.assignment]);
        return;
      }

      // Detect sd- prefix for Safety Dedicado assigned as Designado
      if (type === 'SAFETY_DESIGNADO' && personId.startsWith('sd-')) {
        const realSdId = personId.replace('sd-', '');
        const body = { type: 'SAFETY_DEDICADO_AS_DESIGNADO', activityId, weekendOf, safetyDedicadoId: realSdId };
        const res = await fetch('/api/weekend-assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) { alert(data.error || 'Error al asignar'); return; }
        setSafetyAssignments((prev) => [...prev, data.assignment]);
        return;
      }

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
        const msgs = data.conflicts.map((c: any) => `⚠️ "${c.activityTitle}" (${c.startTime || '?'} - ${c.endTime || '?'}) ${c.day || ''} ${c.company || ''}`.trim());
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
      else if (assignmentType === 'USER_SAFETY_DESIGNADO') setUserSafetyAssignments((p) => p.filter((a) => a.id !== assignmentId));
      else setTechAssignments((p) => p.filter((a) => a.id !== assignmentId));
    } catch { alert('Error de conexión'); }
  };

  const updateField = async (activityId: string, field: string, value: any) => {
    try { await fetch(`/api/activities/${activityId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) }); }
    catch (err) { console.error('Error updating', err); }
  };

  // Compress image using Canvas API — scales down + JPEG compression
  const compressImage = (file: File, maxDimension = 1200, targetSizeKB = 500): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Scale down if needed
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

        // Try progressively lower quality until under target size
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

  // Safety audit image handlers
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
        if (res.ok) {
          setAuditImages((p) => ({ ...p, [actId]: dataUrl }));
          setTeraUploadInfo((p) => ({ ...p, [actId]: { at: new Date().toISOString(), by: userName } }));
        }
        else { const d = await res.json(); alert(d.error || 'Error al subir'); }
      } catch (err: any) { alert(err.message || 'Error de conexión'); }
      setAuditImageLoading((p) => ({ ...p, [actId]: false }));
    };
    input.click();
  };

  const handleAuditImageDelete = async (actId: string) => {
    if (!confirm('¿Eliminar imagen y folio TERA?')) return;
    // Mark as deleting BEFORE clearing state, so onBlur saveTeraFolio won't re-save the old value
    deletingTeraRef.current.add(actId);
    setTeraFolios((p) => ({ ...p, [actId]: '' }));
    setAuditImageLoading((p) => ({ ...p, [actId]: true }));
    try {
      const res = await fetch(`/api/activities/${actId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ safetyAuditImage: null, teraFolio: null }),
      });
      if (res.ok) {
        setAuditImages((p) => ({ ...p, [actId]: null }));
        setTeraUploadInfo((p) => ({ ...p, [actId]: { at: null, by: null } }));
      }
    } catch { alert('Error de conexión'); }
    setAuditImageLoading((p) => ({ ...p, [actId]: false }));
    deletingTeraRef.current.delete(actId);
  };

  const saveTeraFolio = async (actId: string) => {
    // Skip if a delete is in progress — the delete handler already cleared the folio
    if (deletingTeraRef.current.has(actId)) return;
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

  const saveTeraAuditorFolio = async (actId: string) => {
    const folio = teraAuditorFolios[actId]?.trim().toUpperCase() || '';
    if (folio && !/^BC-\d{3,5}$/.test(folio)) {
      alert('Formato inválido. Use BC- seguido de 3 a 5 dígitos (ej: BC-123, BC-1234 o BC-12345)');
      return;
    }
    setTeraAuditorFolioSaving((p) => ({ ...p, [actId]: true }));
    try {
      const now = new Date().toISOString();
      const res = await fetch(`/api/activities/${actId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teraAuditorFolio: folio || null, teraAuditorUploadedAt: folio ? now : null, teraAuditorUploadedBy: folio ? userName : null }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'Error al guardar folio auditor');
      } else if (folio) {
        setTeraAuditorUploadInfo((p) => ({ ...p, [actId]: { at: now, by: userName } }));
      }
    } catch { alert('Error de conexión'); }
    setTeraAuditorFolioSaving((p) => ({ ...p, [actId]: false }));
  };

  const handleTeraAuditorImageUpload = (actId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setTeraAuditorImageLoading((p) => ({ ...p, [actId]: true }));
      try {
        const dataUrl = await compressImage(file);
        const now = new Date().toISOString();
        const res = await fetch(`/api/activities/${actId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teraAuditorImage: dataUrl, teraAuditorUploadedAt: now, teraAuditorUploadedBy: userName }),
        });
        if (res.ok) {
          setTeraAuditorImages((p) => ({ ...p, [actId]: dataUrl }));
          setTeraAuditorUploadInfo((p) => ({ ...p, [actId]: { at: now, by: userName } }));
        }
        else { const d = await res.json(); alert(d.error || 'Error al subir'); }
      } catch (err: any) { alert(err.message || 'Error de conexión'); }
      setTeraAuditorImageLoading((p) => ({ ...p, [actId]: false }));
    };
    input.click();
  };

  const handleTeraAuditorImageDelete = async (actId: string) => {
    if (!confirm('¿Eliminar imagen y folio TERA Auditor?')) return;
    setTeraAuditorFolios((p) => ({ ...p, [actId]: '' }));
    setTeraAuditorImageLoading((p) => ({ ...p, [actId]: true }));
    try {
      const res = await fetch(`/api/activities/${actId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teraAuditorImage: null, teraAuditorFolio: null, teraAuditorUploadedAt: null, teraAuditorUploadedBy: null }),
      });
      if (res.ok) {
        setTeraAuditorImages((p) => ({ ...p, [actId]: null }));
        setTeraAuditorUploadInfo((p) => ({ ...p, [actId]: { at: null, by: null } }));
      }
    } catch { alert('Error de conexión'); }
    setTeraAuditorImageLoading((p) => ({ ...p, [actId]: false }));
  };

  // ── CSV EXPORT ──
  const exportCSV = () => {
    const dayNames = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];

    // Build rows data
    const rowsData = activities.map((a, i) => {
      const techs = techAssignments.filter((x) => x.activityId === a.id && x.role === 'TECNICO').map((x) => x.technician.name).join(', ');
      // Sup Operativo = tech-based SAFETY_DESIGNADO + user-based + safetyDedicado with DESIGNADO role
      const allSafetyForAct = safetyAssignments.filter((x) => x.activityId === a.id);
      const supOperativo = [
        ...techAssignments.filter((x) => x.activityId === a.id && x.role === 'SAFETY_DESIGNADO').map((x) => x.technician.name),
        ...(userSafetyAssignments || []).filter((x: any) => x.activityId === a.id).map((x: any) => x.user.name),
        ...allSafetyForAct.filter((x) => x.role === 'DESIGNADO').map((x) => x.safetyDedicado.name),
      ].join(', ');
      // Safety Dedicado = only safetyAssignments with role !== DESIGNADO
      const dedicados = allSafetyForAct.filter((x) => x.role !== 'DESIGNADO').map((x) => x.safetyDedicado.name).join(', ');
      const eqs = equipAssignments.filter((x) => x.activityId === a.id).map((x) => x.equip.name).join(', ');
      const d = new Date(a.date);
      const dayLabel = dayNames[d.getUTCDay()] || '';
      const isLoto = lotoState[a.id] !== undefined ? lotoState[a.id] : a.loto;
      return {
        num: i + 1,
        day: `${formatDate(a.date)} ${dayLabel}`,
        start: a.startTime || '-',
        end: a.endTime || '-',
        resp: a.user?.name || '-',
        contact: a.contact?.name || '-',
        activity: a.title,
        folio: folioState[a.id] || '-',
        loto: isLoto ? 'SÍ' : 'NO',
        isLoto,
        techs: techs || '-',
        supOperativo: supOperativo || '-',
        dedicados: dedicados || '-',
        equip: eqs || '-',
        notes: notesState[a.id] || '',
        continued: !!a.continuedFromId,
      };
    });

    // Excel HTML with styling
    const headers = ['#','Día','Inicio','Fin','Responsable','Contacto','Actividad','Folio Odoo','LOTO','Técnicos','Sup Operativo','Safety Dedicado','Eq. Elevación','Notas Ingeniero'];
    const colWidths = [30, 110, 55, 55, 120, 120, 280, 80, 45, 160, 120, 120, 130, 200];

    const thStyle = 'style="background:#1e293b;color:#ffffff;font-weight:bold;font-size:10pt;padding:6px 8px;border:1px solid #94a3b8;text-align:center;font-family:Calibri,Arial;"';
    const titleStyle = 'style="background:#4f46e5;color:#ffffff;font-weight:bold;font-size:13pt;padding:10px 8px;text-align:left;font-family:Calibri,Arial;border:1px solid #4f46e5;"';

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Plan Finde</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/><x:FitToPage/><x:Print><x:FitWidth>1</x:FitWidth></x:Print></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head><body>
<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:Calibri,Arial;font-size:10pt;">`;

    // Column widths
    html += colWidths.map(w => `<col width="${w}">`).join('');

    // Title row
    html += `<tr><td colspan="${headers.length}" ${titleStyle}>📋 PLAN FINDE — ${weekendLabel} · ${companyName}</td></tr>`;

    // Header row
    html += '<tr>' + headers.map(h => `<th ${thStyle}>${h}</th>`).join('') + '</tr>';

    // Data rows
    rowsData.forEach((r, idx) => {
      const even = idx % 2 === 0;
      const bgColor = even ? '#ffffff' : '#f1f5f9';
      const cellStyle = (extra = '') => `style="background:${bgColor};padding:5px 8px;border:1px solid #e2e8f0;font-size:9.5pt;font-family:Calibri,Arial;vertical-align:top;${extra}"`;
      const lotoStyle = r.isLoto
        ? `style="background:#fee2e2;color:#dc2626;font-weight:bold;padding:5px 8px;border:1px solid #e2e8f0;font-size:9.5pt;font-family:Calibri,Arial;text-align:center;"`
        : `style="background:${bgColor};color:#059669;padding:5px 8px;border:1px solid #e2e8f0;font-size:9.5pt;font-family:Calibri,Arial;text-align:center;"`;
      const contBadge = r.continued ? '🔄 ' : '';

      html += '<tr>';
      html += `<td ${cellStyle('text-align:center;font-weight:bold;color:#4f46e5;')}>${r.num}</td>`;
      html += `<td ${cellStyle('white-space:nowrap;font-weight:600;')}>${r.day}</td>`;
      html += `<td ${cellStyle('text-align:center;font-family:Consolas,monospace;')}>${r.start}</td>`;
      html += `<td ${cellStyle('text-align:center;font-family:Consolas,monospace;')}>${r.end}</td>`;
      html += `<td ${cellStyle('font-weight:500;')}>${r.resp}</td>`;
      html += `<td ${cellStyle('')}>${r.contact}</td>`;
      html += `<td ${cellStyle('font-weight:600;color:#1e293b;')}>${contBadge}${r.activity}</td>`;
      html += `<td ${cellStyle('text-align:center;font-family:Consolas,monospace;color:#4f46e5;')}>${r.folio}</td>`;
      html += `<td ${lotoStyle}>${r.loto}</td>`;
      html += `<td ${cellStyle('')}>${r.techs}</td>`;
      html += `<td ${cellStyle('')}>${r.supOperativo}</td>`;
      html += `<td ${cellStyle('')}>${r.dedicados}</td>`;
      html += `<td ${cellStyle('')}>${r.equip}</td>`;
      html += `<td ${cellStyle('font-style:italic;color:#475569;')}>${r.notes}</td>`;
      html += '</tr>';
    });

    // Summary row
    html += `<tr><td colspan="${headers.length}" style="background:#e0e7ff;color:#4f46e5;font-weight:bold;padding:8px;border:1px solid #c7d2fe;font-size:9.5pt;font-family:Calibri,Arial;">Total actividades: ${rowsData.length} · Generado: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Tijuana' })} ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Tijuana' })} hrs</td></tr>`;

    html += '</table></body></html>';

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeCompany = companyName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '').replace(/\s+/g, '_');
    link.download = `Plan_Finde_${weekendOf}_${safeCompany}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── MULTI-COMPANY EXCEL EXPORT ──
  const [exportingMulti, setExportingMulti] = useState(false);

  const exportMultiCompanyExcel = async () => {
    setExportingMulti(true);
    try {
      const res = await fetch(`/api/weekend-export-all?weekendOf=${weekendOf}`);
      if (!res.ok) throw new Error('Error al obtener datos');
      const data = await res.json();

      const dayNames = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
      type MultiAct = { id: string; title: string; date: string; startTime: string | null; endTime: string | null; workOrderFolio: string | null; loto: boolean; weekendNotes: string | null; continuedFromId: string | null; user: { name: string } | null; contact: { name: string } | null; company: { name: string; shortName: string | null } | null };

      const rowsData = (data.activities as MultiAct[]).map((a: MultiAct, i: number) => {
        const techs = data.techAssignments.filter((x: any) => x.activityId === a.id && x.role === 'TECNICO').map((x: any) => x.technician.name).join(', ');
        const allSafetyForAct = data.safetyAssignments.filter((x: any) => x.activityId === a.id);
        const supOperativo = [
          ...data.techAssignments.filter((x: any) => x.activityId === a.id && x.role === 'SAFETY_DESIGNADO').map((x: any) => x.technician.name),
          ...data.userSafetyAssignments.filter((x: any) => x.activityId === a.id).map((x: any) => x.user.name),
          ...allSafetyForAct.filter((x: any) => x.role === 'DESIGNADO').map((x: any) => x.safetyDedicado.name),
        ].join(', ');
        const dedicados = allSafetyForAct.filter((x: any) => x.role !== 'DESIGNADO').map((x: any) => x.safetyDedicado.name).join(', ');
        const eqs = data.equipAssignments.filter((x: any) => x.activityId === a.id).map((x: any) => x.equip.name).join(', ');
        const d = new Date(a.date);
        const dayLabel = dayNames[d.getUTCDay()] || '';
        return {
          num: i + 1,
          company: a.company?.shortName || a.company?.name || '-',
          day: `${formatDate(a.date)} ${dayLabel}`,
          start: a.startTime || '-',
          end: a.endTime || '-',
          resp: a.user?.name || '-',
          contact: a.contact?.name || '-',
          activity: a.title,
          folio: a.workOrderFolio || '-',
          loto: a.loto ? 'SÍ' : 'NO',
          isLoto: a.loto,
          techs: techs || '-',
          supOperativo: supOperativo || '-',
          dedicados: dedicados || '-',
          equip: eqs || '-',
          notes: a.weekendNotes || '',
          continued: !!a.continuedFromId,
        };
      });

      const headers = ['#','Empresa','Día','Inicio','Fin','Responsable','Contacto','Actividad','Folio Odoo','LOTO','Técnicos','Sup Operativo','Safety Dedicado','Eq. Elevación','Notas Ingeniero'];
      const colWidths = [30, 100, 110, 55, 55, 120, 120, 280, 80, 45, 160, 120, 120, 130, 200];

      const thStyle = 'style="background:#1e293b;color:#ffffff;font-weight:bold;font-size:10pt;padding:6px 8px;border:1px solid #94a3b8;text-align:center;font-family:Calibri,Arial;"';
      const titleStyle = 'style="background:#7c3aed;color:#ffffff;font-weight:bold;font-size:13pt;padding:10px 8px;text-align:left;font-family:Calibri,Arial;border:1px solid #7c3aed;"';

      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Multiempresa</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/><x:FitToPage/><x:Print><x:FitWidth>1</x:FitWidth></x:Print></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head><body>
<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:Calibri,Arial;font-size:10pt;">`;

      html += colWidths.map(w => `<col width="${w}">`).join('');
      html += `<tr><td colspan="${headers.length}" ${titleStyle}>🏢 PLAN FINDE MULTIEMPRESA — ${weekendLabel}</td></tr>`;
      html += '<tr>' + headers.map(h => `<th ${thStyle}>${h}</th>`).join('') + '</tr>';

      // Company color map
      const companyColors: Record<string, string> = {};
      const palette = ['#dbeafe','#d1fae5','#fef3c7','#fce7f3','#e0e7ff','#ccfbf1','#fde68a'];
      let colorIdx = 0;
      rowsData.forEach(r => {
        if (!companyColors[r.company]) {
          companyColors[r.company] = palette[colorIdx % palette.length];
          colorIdx++;
        }
      });

      rowsData.forEach((r, idx) => {
        const even = idx % 2 === 0;
        const bgColor = even ? '#ffffff' : '#f8fafc';
        const cellStyle = (extra = '') => `style="background:${bgColor};padding:5px 8px;border:1px solid #e2e8f0;font-size:9.5pt;font-family:Calibri,Arial;vertical-align:top;${extra}"`;
        const lotoStyle = r.isLoto
          ? `style="background:#fee2e2;color:#dc2626;font-weight:bold;padding:5px 8px;border:1px solid #e2e8f0;font-size:9.5pt;font-family:Calibri,Arial;text-align:center;"`
          : `style="background:${bgColor};color:#059669;padding:5px 8px;border:1px solid #e2e8f0;font-size:9.5pt;font-family:Calibri,Arial;text-align:center;"`;
        const coBg = companyColors[r.company] || bgColor;
        const contBadge = r.continued ? '🔄 ' : '';

        html += '<tr>';
        html += `<td ${cellStyle('text-align:center;font-weight:bold;color:#4f46e5;')}>${r.num}</td>`;
        html += `<td style="background:${coBg};padding:5px 8px;border:1px solid #e2e8f0;font-size:9pt;font-family:Calibri,Arial;font-weight:bold;text-align:center;">${r.company}</td>`;
        html += `<td ${cellStyle('white-space:nowrap;font-weight:600;')}>${r.day}</td>`;
        html += `<td ${cellStyle('text-align:center;font-family:Consolas,monospace;')}>${r.start}</td>`;
        html += `<td ${cellStyle('text-align:center;font-family:Consolas,monospace;')}>${r.end}</td>`;
        html += `<td ${cellStyle('font-weight:500;')}>${r.resp}</td>`;
        html += `<td ${cellStyle('')}>${r.contact}</td>`;
        html += `<td ${cellStyle('font-weight:600;color:#1e293b;')}>${contBadge}${r.activity}</td>`;
        html += `<td ${cellStyle('text-align:center;font-family:Consolas,monospace;color:#4f46e5;')}>${r.folio}</td>`;
        html += `<td ${lotoStyle}>${r.loto}</td>`;
        html += `<td ${cellStyle('')}>${r.techs}</td>`;
        html += `<td ${cellStyle('')}>${r.supOperativo}</td>`;
        html += `<td ${cellStyle('')}>${r.dedicados}</td>`;
        html += `<td ${cellStyle('')}>${r.equip}</td>`;
        html += `<td ${cellStyle('font-style:italic;color:#475569;')}>${r.notes}</td>`;
        html += '</tr>';
      });

      // Company summary
      const companyCounts: Record<string, number> = {};
      rowsData.forEach(r => { companyCounts[r.company] = (companyCounts[r.company] || 0) + 1; });
      const summaryParts = Object.entries(companyCounts).map(([co, cnt]) => `${co}: ${cnt}`).join(' · ');

      html += `<tr><td colspan="${headers.length}" style="background:#ede9fe;color:#7c3aed;font-weight:bold;padding:8px;border:1px solid #c4b5fd;font-size:9.5pt;font-family:Calibri,Arial;">Total: ${rowsData.length} actividades · ${summaryParts} · Generado: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Tijuana' })} ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Tijuana' })} hrs</td></tr>`;
      html += '</table></body></html>';

      const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const dlUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = dlUrl;
      link.download = `Plan_Finde_${weekendOf}_MULTIEMPRESA.xls`;
      link.click();
      URL.revokeObjectURL(dlUrl);
    } catch (err) {
      alert('Error al generar el Excel multiempresa');
    } finally {
      setExportingMulti(false);
    }
  };

  // ── TECH PLANS MODAL ──
  const [showTechPlansModal, setShowTechPlansModal] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);

  const companyActivityIds = new Set(activities.map(a => a.id));
  const assignedTechIds = [...new Set(techAssignments.filter(x => x.role === 'TECNICO' && companyActivityIds.has(x.activityId)).map(x => x.technicianId))];
  const assignedTechs = technicians.filter(t => assignedTechIds.includes(t.id));

  // Helper: detect time overlaps within same day for a list of activities
  const detectOverlaps = (acts: { id: string; date: string; startTime: string | null; endTime: string | null }[]): Set<string> => {
    const overlapped = new Set<string>();
    // Group by date
    const byDate = new Map<string, typeof acts>();
    acts.forEach(a => {
      const dk = a.date.substring(0, 10);
      const arr = byDate.get(dk) || [];
      arr.push(a);
      byDate.set(dk, arr);
    });
    byDate.forEach(dayActs => {
      for (let i = 0; i < dayActs.length; i++) {
        for (let j = i + 1; j < dayActs.length; j++) {
          const a = dayActs[i], b = dayActs[j];
          if (!a.startTime || !a.endTime || !b.startTime || !b.endTime) continue;
          // Convert to minutes, handle overnight (endTime <= startTime = crosses midnight)
          const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
          let s1 = toMin(a.startTime), e1 = toMin(a.endTime);
          let s2 = toMin(b.startTime), e2 = toMin(b.endTime);
          if (e1 <= s1) e1 += 1440;
          if (e2 <= s2) e2 += 1440;
          if (s1 < e2 && s2 < e1) {
            overlapped.add(a.id);
            overlapped.add(b.id);
          }
        }
      }
    });
    return overlapped;
  };

  const generateTechPlan = (techId: string): string => {
    const tech = technicians.find(t => t.id === techId);
    if (!tech) return 'Técnico no encontrado.';

    // Get ALL activities for this tech across all companies
    const techActIds = techAssignments
      .filter(x => x.technicianId === techId && x.role === 'TECNICO')
      .map(x => x.activityId);

    const techActs = techActIds
      .map(actId => allCompanyActivities.find(a => a.id === actId))
      .filter((a): a is AllCompanyActivity => a !== undefined && a !== null);

    if (techActs.length === 0) {
      return `📋 PLAN DE TRABAJO — ${weekendLabel}\nTécnico: ${tech.name}\n\nSin actividades asignadas.\n`;
    }

    // Detect overlaps
    const overlapped = detectOverlaps(techActs);

    // Group by date
    const byDate = new Map<string, AllCompanyActivity[]>();
    techActs.forEach(a => {
      const dateKey = a.date.substring(0, 10);
      const existing = byDate.get(dateKey) || [];
      existing.push(a);
      byDate.set(dateKey, existing);
    });

    const dayNamesLong = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    let text = `📋 PLAN DE TRABAJO — ${weekendLabel}\nTécnico: ${tech.name}\nTotal actividades: ${techActs.length}\n`;

    if (overlapped.size > 0) {
      text += `⚠️ ATENCIÓN: Se detectaron actividades con horario traslapado\n`;
    }

    const sortedDates = [...byDate.keys()].sort();
    sortedDates.forEach(dateKey => {
      const dt = new Date(`${dateKey}T12:00:00`);
      const dayName = dayNamesLong[dt.getDay()];
      const monthName = monthNames[dt.getMonth()];
      text += `\n━━━━━━━━━━━━━━━━━━━━\n📅 ${dayName.toUpperCase()} ${dt.getDate()} de ${monthName} ${dt.getFullYear()}\n━━━━━━━━━━━━━━━━━━━━\n`;

      const acts = byDate.get(dateKey)!.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      acts.forEach((a, idx) => {
        const timeRange = a.startTime && a.endTime ? `${a.startTime} — ${a.endTime}` : 'Horario pendiente';
        const hasLoto = lotoState[a.id] !== undefined ? lotoState[a.id] : a.loto;
        const isOverlap = overlapped.has(a.id);

        text += `\n${idx + 1}️⃣ ${timeRange}`;
        if (isOverlap) text += ` ⚠️ ACTIVIDAD TRASLAPADA`;
        text += `\n`;
        text += `   🏢 ${a.companyName}\n`;
        text += `   📌 ${a.title}\n`;
        // Sup Operativo
        const supOps = [
          ...techAssignments.filter(x => x.activityId === a.id && x.role === 'SAFETY_DESIGNADO').map(x => x.technician.name),
          ...(userSafetyAssignments || []).filter((x: any) => x.activityId === a.id).map((x: any) => x.user.name),
          ...safetyAssignments.filter(x => x.activityId === a.id && x.role === 'DESIGNADO').map(x => x.safetyDedicado.name),
        ];
        text += `   👷 Sup Operativo: ${supOps.length > 0 ? supOps.join(', ') : 'Sin asignar'}\n`;
        text += `   🔒 LOTO: ${hasLoto ? '✅ SÍ — Requiere LOTO' : '❌ NO'}\n`;

        // Equipment
        const actEquips = equipAssignments.filter(x => x.activityId === a.id);
        if (actEquips.length > 0) {
          text += `   🏗️ Eq. Elevación: ✅ SÍ\n`;
          actEquips.forEach(x => {
            text += `      • ${x.equip.name} (${x.equip.ownership})\n`;
          });
        } else {
          text += `   🏗️ Eq. Elevación: ❌ NO\n`;
        }

        // Vehicle
        const actVehs = vehicleAssignments.filter(x => x.activityId === a.id);
        if (actVehs.length > 0) {
          text += `   🚗 Vehículo: ${actVehs.map(x => x.vehicle.name).join(', ')}\n`;
        }

        const noteText = notesState[a.id] || a.weekendNotes || '';
        if (noteText) {
          text += `   📝 Nota: ${noteText}\n`;
        }
      });
    });

    text += `\n\n_Mensaje de Perry App_\n_By CHIGÜIRE LABS_`;

    return text;
  };

  // ── CONTRACTOR PLANS MODAL ──
  const [showContractorPlansModal, setShowContractorPlansModal] = useState(false);
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);

  // Get contractors that have techs assigned in this plan
  const assignedContractors = (() => {
    const contractorMap = new Map<string, { id: string; name: string; techCount: number }>();
    assignedTechs.forEach(t => {
      if (t.contractorId && t.contractor) {
        const existing = contractorMap.get(t.contractorId);
        if (existing) {
          existing.techCount++;
        } else {
          contractorMap.set(t.contractorId, { id: t.contractorId, name: t.contractor.name, techCount: 1 });
        }
      }
    });
    return [...contractorMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  })();

  const generateContractorPlan = (contractorId: string): string => {
    const contractor = assignedContractors.find(c => c.id === contractorId);
    if (!contractor) return 'Contratista no encontrado.';

    // Get techs belonging to this contractor that are assigned
    const contractorTechs = assignedTechs.filter(t => t.contractorId === contractorId);
    if (contractorTechs.length === 0) return `📋 PLAN CONTRATISTA — ${contractor.name}\n\nSin técnicos asignados.`;

    const dayNamesLong = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    let text = `📋 *PLAN DE TRABAJO — ${weekendLabel}*\n🏭 *Contratista: ${contractor.name}*\n👷 Técnicos asignados: ${contractorTechs.length}\n`;

    // For each tech, list ALL activities across companies grouped by date
    contractorTechs.forEach(tech => {
      const techActIds = techAssignments
        .filter(x => x.technicianId === tech.id && x.role === 'TECNICO')
        .map(x => x.activityId);

      const techActs = techActIds
        .map(actId => allCompanyActivities.find(a => a.id === actId))
        .filter((a): a is AllCompanyActivity => a !== undefined && a !== null);

      if (techActs.length === 0) return;

      // Detect overlaps for this tech
      const overlapped = detectOverlaps(techActs);

      text += `\n━━━━━━━━━━━━━━━━━━━━\n👤 *${tech.name}* (${techActs.length} actividades)`;
      if (overlapped.size > 0) text += ` ⚠️`;
      text += `\n━━━━━━━━━━━━━━━━━━━━\n`;

      // Group by date
      const byDate = new Map<string, AllCompanyActivity[]>();
      techActs.forEach(a => {
        const dateKey = a.date.substring(0, 10);
        const existing = byDate.get(dateKey) || [];
        existing.push(a);
        byDate.set(dateKey, existing);
      });

      const sortedDates = [...byDate.keys()].sort();
      sortedDates.forEach(dateKey => {
        const dt = new Date(`${dateKey}T12:00:00`);
        const dayName = dayNamesLong[dt.getDay()];

        text += `\n📅 ${dayName.toUpperCase()} ${dt.getDate()} de ${monthNames[dt.getMonth()]}\n`;

        const acts = byDate.get(dateKey)!.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        acts.forEach((a, idx) => {
          const timeRange = a.startTime && a.endTime ? `${a.startTime} — ${a.endTime}` : 'Horario pendiente';
          const hasLoto = lotoState[a.id] !== undefined ? lotoState[a.id] : a.loto;
          const isOverlap = overlapped.has(a.id);

          text += `${idx + 1}️⃣ ${timeRange}`;
          if (isOverlap) text += ` ⚠️ ACTIVIDAD TRASLAPADA`;
          text += `\n`;
          text += `   🏢 ${a.companyName}\n`;
          text += `   📌 ${a.title}\n`;
          text += `   👷 Responsable: ${a.user?.name || 'Sin asignar'}\n`;
          text += `   🔒 LOTO: ${hasLoto ? '✅ SÍ' : '❌ NO'}\n`;

          // Equipment
          const actEquips = equipAssignments.filter(x => x.activityId === a.id);
          if (actEquips.length > 0) {
            text += `   🏗️ Eq. Elevación: ${actEquips.map(x => x.equip.name).join(', ')}\n`;
          }

          const noteText = notesState[a.id] || a.weekendNotes || '';
          if (noteText) {
            text += `   📝 Nota: ${noteText}\n`;
          }
        });
      });
    });

    text += `\n\n_Mensaje de Perry App_\n_By CHIGÜIRE LABS_`;
    return text;
  };

  const [showEquipReportModal, setShowEquipReportModal] = useState(false);

  const generateEquipReport = (): { text: string; data: { equip: string; ownership: string; day: string; time: string; activity: string; engineer: string }[] } => {
    const dayNames = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    // Group by equip
    const byEquip = new Map<string, { equip: ElevationEquip; assignments: { activity: Activity; dateStr: string }[] }>();
    equipAssignments.forEach(ea => {
      const act = activities.find(a => a.id === ea.activityId);
      if (!act) return;
      const key = ea.equipId;
      if (!byEquip.has(key)) byEquip.set(key, { equip: ea.equip, assignments: [] });
      byEquip.get(key)!.assignments.push({ activity: act, dateStr: act.date.substring(0, 10) });
    });

    let text = `═══════════════════════════════════\n🏗️ REPORTE DE EQUIPOS DE ELEVACIÓN\n   Plan Finde: ${weekendLabel}\n═══════════════════════════════════\n`;
    const csvData: { equip: string; ownership: string; day: string; time: string; activity: string; engineer: string }[] = [];
    let totalUses = 0;

    [...byEquip.entries()].sort((a, b) => a[1].equip.name.localeCompare(b[1].equip.name)).forEach(([, data]) => {
      const { equip, assignments } = data;
      text += `\n── ${equip.name} (${equip.ownership}) ──────────\n`;

      // Group assignments by date
      const byDate = new Map<string, typeof assignments>();
      assignments.forEach(a => {
        const arr = byDate.get(a.dateStr) || [];
        arr.push(a);
        byDate.set(a.dateStr, arr);
      });

      const sortedDates = [...byDate.keys()].sort();
      // Show all plan days for completeness
      visiblePlanDays.forEach(pd => {
        const dt = new Date(`${pd.date}T12:00:00`);
        const dayLabel = pd.isExtra
          ? (pd.label || dayNames[dt.getDay()] + ' ' + dt.getDate())
          : dayNames[dt.getDay()] + ' ' + dt.getDate();

        const dateAssignments = byDate.get(pd.date);
        if (!dateAssignments || dateAssignments.length === 0) {
          text += `📅 ${dayLabel}: Sin asignaciones\n`;
        } else {
          text += `📅 ${dayLabel}:\n`;
          dateAssignments.sort((a, b) => (a.activity.startTime || '').localeCompare(b.activity.startTime || '')).forEach(({ activity: a }) => {
            const timeRange = a.startTime && a.endTime ? `${a.startTime}-${a.endTime}` : 'S/H';
            const acaMatch = allCompanyActivities.find(ac => ac.id === a.id);
            const coName = acaMatch?.companyName || companyName;
            text += `  • ${timeRange} | ${coName} | ${a.title} | ${a.user?.name || 'Sin asignar'}\n`;
            totalUses++;
            csvData.push({
              equip: equip.name,
              ownership: equip.ownership,
              day: dayLabel,
              time: timeRange,
              activity: a.title,
              engineer: a.user?.name || 'Sin asignar',
            });
          });
        }
      });
    });

    text += `\n══════════════════════════════════\nTotal equipos: ${byEquip.size} | Total usos: ${totalUses}\n══════════════════════════════════\n\n_Mensaje de Perry App_\n_By CHIGÜIRE LABS_`;

    return { text, data: csvData };
  };

  const exportEquipCSV = () => {
    const { data } = generateEquipReport();
    const h = ['Equipo','Tipo','Día','Horario','Actividad','Ingeniero Responsable'];
    const rows = data.map(d => [
      `"${d.equip}"`, d.ownership, d.day, d.time, `"${d.activity}"`, `"${d.engineer}"`,
    ]);
    const csv = '\uFEFF' + [h.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `equipos_elevacion_${weekendOf}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  // ── HELPERS ──
  const getTechs = (id: string, role: string) => techAssignments.filter((x) => x.activityId === id && x.role === role);
  const getSafety = (id: string) => safetyAssignments.filter((x) => x.activityId === id);
  const getVehicles = (id: string) => vehicleAssignments.filter((x) => x.activityId === id);
  const getDrivers = (id: string) => driverAssignments.filter((x) => x.activityId === id);
  const getEquips = (id: string) => equipAssignments.filter((x) => x.activityId === id);

  // ── STATS ──
  const dayNames = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
  // Visible plan days: only those with activities OR extra days
  const visiblePlanDays = planDays.filter(d => d.hasActivities || d.isExtra);

  // Build per-day stats
  const dayStats = visiblePlanDays.map(d => {
    const dayActs = activities.filter(a => a.date.startsWith(d.date));
    const dayActIds = new Set(dayActs.map(a => a.id));
    const dayTechIds = new Set(techAssignments.filter(x => dayActIds.has(x.activityId) && x.role === 'TECNICO').map(x => x.technicianId));
    const dt = new Date(`${d.date}T12:00:00`);
    const dayLabel = d.isExtra
      ? (d.label || dayNames[dt.getDay()] + ' ' + dt.getDate())
      : dayNames[dt.getDay()];
    return { ...d, dayLabel, actCount: dayActs.length, techCount: dayTechIds.size };
  });

  const engMap = new Map<string, number>();
  activities.forEach((a) => { const n = a.user?.name || 'Sin asignar'; engMap.set(n, (engMap.get(n) || 0) + 1); });
  const allTechIds = new Set(techAssignments.filter(x => x.role === 'TECNICO').map((x) => x.technicianId));

  // ── Sup Operativo stats (3 sources: tech, user, safetyDedicado-as-designado) ──
  const supOpMap = new Map<string, { total: number; byDate: Map<string, number> }>();
  const addSupOp = (name: string, activityId: string) => {
    const act = activities.find(a => a.id === activityId);
    if (!act) return;
    if (!supOpMap.has(name)) supOpMap.set(name, { total: 0, byDate: new Map() });
    const entry = supOpMap.get(name)!;
    entry.total++;
    const dateKey = act.date.substring(0, 10);
    entry.byDate.set(dateKey, (entry.byDate.get(dateKey) || 0) + 1);
  };
  // Source 1: techAssignments with role SAFETY_DESIGNADO (Cruz Verde techs)
  techAssignments.filter(x => x.role === 'SAFETY_DESIGNADO' && companyActivityIds.has(x.activityId))
    .forEach(x => addSupOp(x.technician.name, x.activityId));
  // Source 2: userSafetyAssignments (engineers with isSafetyDesignado)
  userSafetyAssignments.filter(x => companyActivityIds.has(x.activityId))
    .forEach(x => addSupOp(x.user.name, x.activityId));
  // Source 3: safetyAssignments with role DESIGNADO (safety dedicados acting as designado)
  safetyAssignments.filter(x => x.role === 'DESIGNADO' && companyActivityIds.has(x.activityId))
    .forEach(x => addSupOp(x.safetyDedicado.name, x.activityId));
  const totalSupOp = Array.from(supOpMap.values()).reduce((sum, e) => sum + e.total, 0);

  // ── NEW: Stats for summary cards ──
  const lotoActivities = activities.filter(a => a.loto);
  const lotoByEngineer = new Map<string, number>();
  lotoActivities.forEach(a => { const n = a.user?.name || 'Sin asignar'; lotoByEngineer.set(n, (lotoByEngineer.get(n) || 0) + 1); });

  const activitiesWithDedicado = activities.filter(a =>
    safetyAssignments.some(s => s.activityId === a.id && s.role === 'DEDICADO')
  );

  // Per-day resource stats
  const resourceDayStats = visiblePlanDays.map(d => {
    const dayActs = activities.filter(a => a.date.startsWith(d.date));
    const dayActIds = new Set(dayActs.map(a => a.id));

    const dayVehicles = vehicleAssignments
      .filter(x => dayActIds.has(x.activityId))
      .map(x => x.vehicle.name);
    const uniqueVehicles = [...new Set(dayVehicles)];

    const dayDrivers = driverAssignments
      .filter(x => dayActIds.has(x.activityId))
      .map(x => x.driver.name);
    const uniqueDrivers = [...new Set(dayDrivers)];

    const dayEquips = equipAssignments
      .filter(x => dayActIds.has(x.activityId))
      .map(x => ({ name: x.equip.name, ownership: x.equip.ownership }));
    const uniqueEquipsMap = new Map<string, string>();
    dayEquips.forEach(x => uniqueEquipsMap.set(x.name, x.ownership));
    const uniqueEquips = Array.from(uniqueEquipsMap.entries()).map(([name, ownership]) => ({ name, ownership }));

    const dt = new Date(`${d.date}T12:00:00`);
    const dayLabel = d.isExtra
      ? (d.label || dayNames[dt.getDay()] + ' ' + dt.getDate())
      : dayNames[dt.getDay()];

    return { date: d.date, dayLabel, isExtra: d.isExtra, vehicles: uniqueVehicles, drivers: uniqueDrivers, equips: uniqueEquips };
  });

  // Extra day handlers
  const addExtraDay = async () => {
    if (!extraDayDate) return;
    setExtraDaySaving(true);
    try {
      const res = await fetch('/api/extra-plan-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: extraDayDate, weekendOf, label: extraDayLabel || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'Error');
      } else {
        setShowExtraDayDialog(false);
        setExtraDayDate('');
        setExtraDayLabel('');
        router.refresh();
      }
    } catch { alert('Error de conexión'); }
    setExtraDaySaving(false);
  };

  const removeExtraDay = async (id: string) => {
    if (!confirm('¿Eliminar este día extra del plan?')) return;
    try {
      const res = await fetch('/api/extra-plan-days', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) router.refresh();
    } catch { /* silent */ }
  };

  return (
    <div className="space-y-5 pb-20 md:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-indigo-600" /> Plan ATC FINDE
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-slate-500 text-sm">Plan: <span className="font-semibold text-indigo-600">{weekendLabel}</span></p>
            {/* Extra day badges */}
            {planDays.filter(d => d.isExtra).map(d => (
              <span key={d.date} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                🟡 {d.label || d.date}
                {canManageExtraDays && d.extraId && (
                  <button onClick={() => removeExtraDay(d.extraId!)} className="hover:text-red-600 ml-0.5"><X size={10} /></button>
                )}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {canManageExtraDays && (
            <button onClick={() => setShowExtraDayDialog(true)} className="btn-secondary !text-[10px] !py-1 !px-2 !gap-1 !bg-amber-50 !text-amber-700 !border-amber-300 hover:!bg-amber-100 leading-tight text-center">
              <Plus size={12} /> Día<br/>Extra
            </button>
          )}
          <button onClick={() => { setSelectedTechId(assignedTechs[0]?.id || null); setShowTechPlansModal(true); }} className="btn-secondary !text-[10px] !py-1 !px-2 !bg-sky-50 !text-sky-700 !border-sky-300 hover:!bg-sky-100 leading-tight text-center">📋 Planes<br/>Técnicos</button>
          {assignedContractors.length > 0 && (
            <button onClick={() => { setSelectedContractorId(assignedContractors[0]?.id || null); setShowContractorPlansModal(true); }} className="btn-secondary !text-[10px] !py-1 !px-2 !bg-purple-50 !text-purple-700 !border-purple-300 hover:!bg-purple-100 leading-tight text-center">🏭 Plan<br/>Contratista</button>
          )}
          <button onClick={() => setShowEquipReportModal(true)} className="btn-secondary !text-[10px] !py-1 !px-2 !bg-orange-50 !text-orange-700 !border-orange-300 hover:!bg-orange-100 leading-tight text-center">🏗️ Reporte<br/>Equipos</button>
          <button onClick={exportCSV} className="btn-secondary !text-[10px] !py-1 !px-2 !gap-1 !bg-emerald-50 !text-emerald-700 !border-emerald-300 hover:!bg-emerald-100 leading-tight text-center"><Download size={12} /> Exportar<br/>Excel</button>
          {['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(userRole) && (
            <button onClick={exportMultiCompanyExcel} disabled={exportingMulti} className="btn-secondary !text-[10px] !py-1 !px-2 !gap-1 !bg-violet-50 !text-violet-700 !border-violet-300 hover:!bg-violet-100 disabled:opacity-50 leading-tight text-center">
              {exportingMulti ? <><Loader2 size={12} className="animate-spin" /> Generando...</> : <><Download size={12} /> Excel<br/>Multiempresa</>}
            </button>
          )}
        </div>
      </div>

      {/* ── CONFLICT SUMMARY CARD ── */}
      {Object.keys(conflictAlerts).length > 0 && (() => {
        // Group conflicts by resource (techId, vehicleId, etc.)
        const resourceConflicts = new Map<string, { name: string; type: string; conflicts: { activityId: string; messages: string[] }[] }>();

        Object.entries(conflictAlerts).forEach(([key, msgs]) => {
          if (msgs.length === 0) return;
          const [activityId, resourceId] = [key.substring(0, key.lastIndexOf('-')), key.substring(key.lastIndexOf('-') + 1)];

          // Find the resource name
          const tech = technicians.find(t => t.id === resourceId);
          const vehicle = vehicles.find(v => v.id === resourceId);
          const driver = drivers.find(d => d.id === resourceId);
          const equip = elevationEquips.find(e => e.id === resourceId);
          const resName = tech?.name || vehicle?.name || driver?.name || equip?.name || resourceId;
          const resType = tech ? '🔧 Técnico' : vehicle ? '🚗 Vehículo' : driver ? '🚙 Chofer' : equip ? '🏗️ Equipo' : '❓ Recurso';

          if (!resourceConflicts.has(resourceId)) {
            resourceConflicts.set(resourceId, { name: resName, type: resType, conflicts: [] });
          }
          resourceConflicts.get(resourceId)!.conflicts.push({ activityId, messages: msgs });
        });

        const totalResources = resourceConflicts.size;
        const totalConflicts = [...resourceConflicts.values()].reduce((sum, r) => sum + r.conflicts.length, 0);

        return (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-red-800 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600" />
                ⚠️ TRASLAPE DE RECURSOS DETECTADO
              </h3>
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{totalResources} recurso{totalResources !== 1 ? 's' : ''}</span>
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{totalConflicts} traslape{totalConflicts !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {[...resourceConflicts.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([resId, res]) => (
                <div key={resId} className="bg-white/70 rounded-lg px-3 py-2 border border-red-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-red-800">{res.type}</span>
                    <span className="text-xs font-semibold text-slate-800">{res.name}</span>
                    <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{res.conflicts.length} traslape{res.conflicts.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-0.5">
                    {res.conflicts.map((c, i) => {
                      const act = activities.find(a => a.id === c.activityId) || allCompanyActivities.find(a => a.id === c.activityId);
                      const actLabel = act ? `"${act.title}" (${act.startTime || '?'} - ${act.endTime || '?'})` : c.activityId;
                      return (
                        <div key={i} className="text-[10px] text-red-700 leading-tight">
                          📌 {actLabel} → {c.messages.map(m => m.replace('⚠️ ', '')).join(', ')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── CANCELLED ACTIVITIES CARD ── */}
      {(() => {
        const cancelledActs = activities.filter(a => cancelledIds.has(a.id));
        if (cancelledActs.length === 0) return null;

        const REASON_LABELS: Record<string, string> = {
          PERMISOLOGIA_INCOMPLETA: 'Permisología Incompleta',
          AREA_NO_DESPEJADA: 'Área no despejada',
          FALTO_PERSONAL_NUESTRO: 'Faltó Personal nuestro',
          FALTO_PERSONAL_CLIENTE: 'Faltó Personal Cliente',
          FALTO_MATERIAL: 'Faltó Material',
          MEDIDAS_NO_COINCIDEN: 'Medidas no coinciden',
          ALCANCE_DISTINTO: 'Alcance distinto',
          OBSTRUCCION_OTRA_EMPRESA: 'Obstrucción otra empresa',
          OTRA: 'Otra',
        };

        const dayNamesShort = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];

        return (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Ban size={16} className="text-red-500" />
                ❌ ACTIVIDADES CANCELADAS
              </h3>
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{cancelledActs.length}</span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {cancelledActs.map(act => {
                const dt = new Date(`${act.date.substring(0, 10)}T12:00:00`);
                const dayLabel = dayNamesShort[dt.getDay()] + ' ' + dt.getDate();
                const timeRange = act.startTime && act.endTime ? `${act.startTime}-${act.endTime}` : 'S/H';
                const reasonLabel = act.cancelReason ? (REASON_LABELS[act.cancelReason] || act.cancelReason) : '';
                const cancelledBy = cancelledByMap[act.id] || act.cancelledBy || '';

                return (
                  <div key={act.id} className="bg-white rounded-lg px-3 py-2 border border-slate-100 flex items-start gap-2">
                    <span className="text-red-400 text-xs mt-0.5">❌</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{act.title}</p>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        📅 {dayLabel} · 🕐 {timeRange} · 👷 {act.user?.name || 'Sin asignar'}
                      </p>
                      {reasonLabel && <p className="text-[10px] text-red-600 leading-tight">📝 Motivo: {reasonLabel}</p>}
                      {act.cancelNotes && <p className="text-[10px] text-slate-500 leading-tight italic">💬 {act.cancelNotes}</p>}
                      {cancelledBy && <p className="text-[10px] text-slate-400 leading-tight">Cancelada por: {cancelledBy}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Extra Day Dialog */}
      {showExtraDayDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowExtraDayDialog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays size={20} className="text-amber-600" /> Agregar Día Extra
              </h3>
              <button onClick={() => setShowExtraDayDialog(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={extraDayDate}
                  onChange={e => setExtraDayDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Etiqueta <span className="text-slate-400">(opcional)</span></label>
                <input
                  type="text"
                  value={extraDayLabel}
                  onChange={e => setExtraDayLabel(e.target.value)}
                  placeholder="Ej: Lunes Festivo, Día del Trabajo"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <button
                onClick={addExtraDay}
                disabled={!extraDayDate || extraDaySaving}
                className="w-full py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {extraDaySaving ? 'Guardando...' : 'Agregar al Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Actividades</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-800">{activities.length}</span>
            <span className="text-xs text-slate-400">total</span>
          </div>
          <div className="flex gap-2 mt-2 text-xs flex-wrap">
            {dayStats.map(d => (
              <span key={d.date} className={`font-semibold ${d.isExtra ? 'text-amber-600' : 'text-indigo-600'}`}>
                {d.dayLabel} {d.actCount}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Técnicos Asignados</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-sky-700">{allTechIds.size}</span>
            <span className="text-xs text-slate-400">total</span>
          </div>
          <div className="flex gap-2 mt-2 text-xs flex-wrap">
            {dayStats.map(d => (
              <span key={d.date} className={`font-semibold ${d.isExtra ? 'text-amber-600' : 'text-indigo-600'}`}>
                {d.dayLabel} {d.techCount}
              </span>
            ))}
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

      {/* ── SUP OPERATIVO SUMMARY CARD (MERGED) ── */}
      <div className="bg-white rounded-xl border border-teal-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 text-sm">🛡️</span>
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Supervisiones Operativas</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left Column: Summary & Daily breakdown */}
          <div className="md:col-span-1 md:border-r border-slate-100 md:pr-4">
            <p className="text-xs text-slate-500 font-medium">Total Asignaciones</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-teal-700">{totalSupOp}</span>
              <span className="text-xs text-slate-400">en {activities.length} actividades</span>
            </div>
            {totalSupOp > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {dayStats.map(d => {
                  let dayCount = 0;
                  supOpMap.forEach(entry => { dayCount += entry.byDate.get(d.date) || 0; });
                  return dayCount > 0 ? (
                    <span key={d.date} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${d.isExtra ? 'bg-amber-100 text-amber-700' : 'bg-teal-50 text-teal-600'}`}>
                      {d.dayLabel} {dayCount}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Right Column: Breakdown by Person */}
          <div className="md:col-span-2">
            <p className="text-xs text-slate-500 font-medium mb-2">Desglose por Persona</p>
            {supOpMap.size === 0 ? (
              <p className="text-xs text-slate-400 mt-1">Sin asignaciones</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Array.from(supOpMap.entries()).sort((a, b) => b[1].total - a[1].total).map(([name, data]) => (
                  <div key={name} className="px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-100 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-teal-800 text-xs">{name}</span>
                      <span className="bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{data.total}</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {dayStats.map(d => {
                        const dayCount = data.byDate.get(d.date) || 0;
                        return dayCount > 0 ? (
                          <span key={d.date} className={`text-[9px] font-bold px-1 py-0.5 rounded ${d.isExtra ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-600'}`}>
                            {d.dayLabel} {dayCount}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RESOURCE SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* LOTO Total */}
        <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600 text-sm">🔒</span>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Actividades con LOTO</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-red-700">{lotoActivities.length}</span>
            <span className="text-xs text-slate-400">de {activities.length}</span>
          </div>
          {lotoActivities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {dayStats.map(d => {
                const dayLoto = lotoActivities.filter(a => a.date.startsWith(d.date)).length;
                return dayLoto > 0 ? (
                  <span key={d.date} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${d.isExtra ? 'bg-amber-100 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                    {d.dayLabel} {dayLoto}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* LOTO por Ingeniero */}
        <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600 text-sm"><HardHat size={14} /></span>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">LOTO por Ingeniero</p>
          </div>
          {lotoByEngineer.size === 0 ? (
            <p className="text-xs text-slate-400 mt-1">Sin actividades LOTO</p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {Array.from(lotoByEngineer.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                <div key={name} className="px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-red-800 text-xs">{name}</span>
                    <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {dayStats.map(d => {
                      const dayCount = lotoActivities.filter(a => a.date.startsWith(d.date) && (a.user?.name || 'Sin asignar') === name).length;
                      return dayCount > 0 ? (
                        <span key={d.date} className={`text-[9px] font-bold px-1 py-0.5 rounded ${d.isExtra ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                          {d.dayLabel} {dayCount}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Safety Dedicado */}
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-sm"><Shield size={14} /></span>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Con Safety Dedicado</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-700">{activitiesWithDedicado.length}</span>
            <span className="text-xs text-slate-400">de {activities.length}</span>
          </div>
          {activitiesWithDedicado.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {(() => {
                const dedicadoNames = new Set<string>();
                safetyAssignments.filter(s => s.role === 'DEDICADO').forEach(s => dedicadoNames.add(s.safetyDedicado.name));
                return Array.from(dedicadoNames).map(name => (
                  <span key={name} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">{name}</span>
                ));
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Per-day resource cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Vehículos por Día */}
        <div className="bg-white rounded-xl border border-violet-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 text-sm">🚗</span>
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">Vehículos por Día</p>
          </div>
          {resourceDayStats.map(d => (
            <div key={d.date} className="mb-2 last:mb-0">
              <span className={`text-[10px] font-bold uppercase ${d.isExtra ? 'text-amber-600' : 'text-violet-500'}`}>{d.dayLabel}</span>
              {d.vehicles.length === 0 ? (
                <p className="text-xs text-slate-300 ml-2">— Sin asignar</p>
              ) : (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {d.vehicles.map(v => (
                    <span key={v} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">{v}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Choferes por Día */}
        <div className="bg-white rounded-xl border border-cyan-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-600 text-sm">👤</span>
            <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wider">Choferes por Día</p>
          </div>
          {resourceDayStats.map(d => (
            <div key={d.date} className="mb-2 last:mb-0">
              <span className={`text-[10px] font-bold uppercase ${d.isExtra ? 'text-amber-600' : 'text-cyan-500'}`}>{d.dayLabel}</span>
              {d.drivers.length === 0 ? (
                <p className="text-xs text-slate-300 ml-2">— Sin asignar</p>
              ) : (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {d.drivers.map(dr => (
                    <span key={dr} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">{dr}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Equipos Elevación por Día */}
        <div className="bg-white rounded-xl border border-orange-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 text-sm">🏗️</span>
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Eq. Elevación por Día</p>
          </div>
          {resourceDayStats.map(d => (
            <div key={d.date} className="mb-2 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold uppercase ${d.isExtra ? 'text-amber-600' : 'text-orange-500'}`}>{d.dayLabel}</span>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">{d.equips.length} equipo{d.equips.length !== 1 ? 's' : ''}</span>
              </div>
              {d.equips.length === 0 ? (
                <p className="text-xs text-slate-300 ml-2">— Sin asignar</p>
              ) : (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {d.equips.map(eq => (
                    <span key={eq.name} className="inline-flex items-center gap-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                      {eq.name}
                      <span className={`text-[8px] px-1 rounded-sm font-bold ${eq.ownership === 'PROPIO' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-500 text-white'}`}>
                        {eq.ownership === 'PROPIO' ? 'P' : 'R'}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
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
                <th className="font-semibold w-[70px] text-center">Registro</th>
                <th className="font-semibold w-[120px]">Responsable</th>
                <th className="font-semibold w-[120px]">Contacto</th>
                <th className="font-semibold">Actividad</th>
                <th className="font-semibold w-[80px]">Folio Odoo</th>
                <th className="font-semibold w-[100px]">P.O.</th>
                <th className="font-semibold w-[55px] text-center">LOTO</th>
                <th className="font-semibold min-w-[180px]">Técnicos</th>
                <th className="font-semibold min-w-[160px]">Sup Operativo</th>
                <th className="font-semibold min-w-[140px]">Safety Dedicado</th>
                <th className="font-semibold min-w-[130px]">Vehículo</th>
                <th className="font-semibold min-w-[120px]">Chofer</th>
                <th className="font-semibold min-w-[140px]">Eq. Elevación</th>
                <th className="font-semibold min-w-[120px]">Notas Ingeniero</th>
                <th className="font-semibold min-w-[120px]">Auditoría</th>
                {canViewAlertNotes && <th className="font-semibold min-w-[120px]">Notas Alertas</th>}
                <th className="font-semibold w-[90px] text-center">TERA</th>
                <th className="font-semibold w-[90px] text-center">TERA Auditor</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr><td colSpan={canViewAlertNotes ? 20 : 19} className="text-center py-16">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
                  <p className="font-medium text-lg text-slate-400">Fin de Semana Despejado</p>
                  <p className="text-sm mt-1 text-slate-400">No hay actividades para este fin de semana.</p>
                </td></tr>
              ) : (() => {
                const dayNamesLong = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
                const monthNames = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
                const dayColors = ['bg-violet-600','bg-blue-700','bg-blue-700','bg-blue-700','bg-blue-700','bg-blue-700','bg-indigo-600'];
                let lastDateKey = '';
                const totalCols = canViewAlertNotes ? 21 : 20;
                return activities.map((act, idx) => {
                const dateKey = act.date.substring(0, 10);
                const showDaySeparator = dateKey !== lastDateKey;
                lastDateKey = dateKey;

                const aT = getTechs(act.id, 'TECNICO');
                const aD = getTechs(act.id, 'SAFETY_DESIGNADO');
                const aUserSafety = userSafetyAssignments.filter((x) => x.activityId === act.id);
                const allSafetyForAct = safetyAssignments.filter((x) => x.activityId === act.id);
                const aS = allSafetyForAct.filter((x) => x.role !== 'DESIGNADO');
                const aSDesignado = allSafetyForAct.filter((x) => x.role === 'DESIGNADO');
                const aV = getVehicles(act.id);
                const aDr = getDrivers(act.id);
                const aE = getEquips(act.id);

                const allDesignados = [
                  ...aD.map((x) => ({ assignmentId: x.id, id: x.technicianId, name: x.technician.name, removeType: 'TECH' as const })),
                  ...aUserSafety.map((x) => ({ assignmentId: x.id, id: `usr-${x.userId}`, name: x.user.name, removeType: 'USER_SAFETY_DESIGNADO' as const })),
                  ...aSDesignado.map((x) => ({ assignmentId: x.id, id: `sd-${x.safetyDedicadoId}`, name: x.safetyDedicado.name, removeType: 'SAFETY_DEDICADO' as const })),
                ];

                const hasAlert = canViewAlertNotes && !!(alertNotesState[act.id]);
                const dt = new Date(`${dateKey}T12:00:00`);
                const dayName = dayNamesLong[dt.getDay()] || '';
                const monthName = monthNames[dt.getMonth()] || '';
                const dayColor = dayColors[dt.getDay()] || 'bg-slate-700';
                const dayCount = activities.filter(a => a.date.substring(0, 10) === dateKey).length;

                return (
                  <React.Fragment key={act.id}>
                  {showDaySeparator && (
                    <tr className="day-separator">
                      <td colSpan={totalCols} className={`${dayColor} text-white py-2 px-4`}>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm tracking-wide">📅 {dayName} {dt.getDate()} DE {monthName}</span>
                          <span className="text-xs font-medium opacity-80 bg-white/20 px-2 py-0.5 rounded-full">{dayCount} actividad{dayCount !== 1 ? 'es' : ''}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr className={`transition-colors align-top ${cancelledIds.has(act.id) ? 'bg-red-100 hover:bg-red-100' : hasAlert ? 'bg-amber-50/40 hover:bg-slate-50/50' : 'hover:bg-slate-50/50'}`}>
                    <td className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${hasAlert ? 'bg-amber-400 text-white animate-pulse' : 'bg-slate-200 text-slate-700'}`}>{idx + 1}</span>
                        {hasAlert && <AlertTriangle size={12} className="text-amber-500" />}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 text-xs">{formatDate(act.date)}</span>
                        {(() => {
                          const actDate = act.date.substring(0, 10);
                          const pd = planDays.find(d => d.date === actDate);
                          const dow = dayNames[new Date(act.date).getUTCDay()];
                          if (pd?.isExtra) {
                            return <span className="text-[10px] text-amber-600 uppercase tracking-widest font-bold">🟡 {pd.label || dow}</span>;
                          }
                          return <span className="text-[10px] text-indigo-500 uppercase tracking-widest font-bold">{dow}</span>;
                        })()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono border border-slate-200">{act.startTime || '--:--'} — {act.endTime || '--:--'}</span>
                    </td>
                    {/* REGISTRO HORARIO */}
                    <td className="text-center">
                      {(() => {
                        const entries = timeRegistries[act.id] || [];
                        const count = entries.length;
                        const canEditRegistry = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole)
                          || (userRole === 'INGENIERO' && act.user?.id === userId)
                          || isSupOperativoForActivity(act.id);
                        return canEditRegistry ? (
                          <button
                            onClick={() => setTimeRegistryModal({ activityId: act.id, activityTitle: act.title })}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:shadow-md ${
                              count === 4
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200'
                                : count > 0
                                ? 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-300 hover:bg-slate-200'
                            }`}
                            title="Registro Horario"
                          >
                            {count === 4 ? '✅' : <Clock size={10} />}
                            {count}/4
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
                              count === 4
                                ? 'bg-emerald-50 text-emerald-600'
                                : count > 0
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-slate-50 text-slate-400'
                            }`}
                            title="Solo el Sup. Operativo puede registrar"
                          >
                            {count === 4 ? '✅' : <Clock size={10} />}
                            {count}/4
                          </span>
                        );
                      })()}
                    </td>
                    <td><span className="text-xs font-medium text-slate-700">{act.user?.name || '-'}</span></td>
                    <td><span className="text-xs font-medium text-slate-800">{act.contact?.name || '-'}</span></td>
                    <td>
                      <p className={`font-semibold text-xs leading-snug cursor-pointer hover:text-indigo-600 ${cancelledIds.has(act.id) ? 'line-through text-red-400' : 'text-slate-800'}`} onClick={() => router.push(`/actividades/${act.id}`)}>
                        {cancelledIds.has(act.id) && <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-red-100 text-red-700 border border-red-200 px-1 py-0.5 rounded-full mr-1 align-middle no-underline" style={{ textDecoration: 'none' }}>❌ CANCELADA</span>}
                        {act.continuedFromId && act.type === 'EJECUCION' && !cancelledIds.has(act.id) && <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-violet-100 text-violet-700 border border-violet-200 px-1 py-0.5 rounded-full mr-1 align-middle">🔄 CONT.</span>}
                        {act.title.length > 60 ? act.title.substring(0, 60) + '...' : act.title}
                      </p>
                    </td>

                    <td>
                      <div className="flex flex-col gap-1">
                        {canEditFields ? (
                          <div className="flex items-center gap-0.5">
                            <input type="text" maxLength={6} className={`w-[72px] text-xs px-1.5 py-1 rounded-l border font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${odooInfo[act.id]?.found === false ? 'border-red-300 bg-red-50' : odooInfo[act.id]?.found ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}
                              value={folioState[act.id] || ''} placeholder="—"
                              onChange={(e) => setFolioState((p) => ({ ...p, [act.id]: e.target.value.slice(0, 6).toUpperCase() }))}
                              onBlur={() => lookupOdoo(act.id, folioState[act.id])}
                            />
                            <button
                              type="button"
                              disabled={!folioState[act.id] || odooLoading[act.id]}
                              onClick={() => lookupOdoo(act.id, folioState[act.id], false)}
                              className="px-1 py-1 rounded-r border border-l-0 border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors disabled:opacity-30"
                              title="Buscar P.O. en Odoo"
                            >
                              {odooLoading[act.id] ? <Loader2 size={12} className="animate-spin text-indigo-500" /> : <Search size={12} className="text-indigo-500" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-slate-600">{act.workOrderFolio || '-'}</span>
                        )}
                        {((canEditFields && folioState[act.id]) || (!canEditFields && act.workOrderFolio)) && canViewEconomicAnalysis(currentUserEmail, userRole) && (
                          <a
                            href={`/reportes-especiales?tab=economico&activityId=${act.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 py-0.5 px-1.5 rounded transition-all max-w-fit"
                            title="Análisis Económico"
                          >
                            📊 $
                          </a>
                        )}
                      </div>
                    </td>

                    {/* P.O. */}
                    <td>
                      {canEditFields ? (
                        <div>
                          <input type="text" maxLength={10} className={`w-[90px] text-xs px-1.5 py-1 rounded border font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${poState[act.id] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}
                            value={poState[act.id] || ''} placeholder="PENDIENTE"
                            onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setPoState((p) => ({ ...p, [act.id]: v })); }}
                            onBlur={() => updateField(act.id, 'purchaseOrder', poState[act.id] || null)}
                          />
                          {!poState[act.id] && !odooInfo[act.id] && <span className="block text-[9px] text-red-500 font-bold mt-0.5">Sin Cotización</span>}
                          {odooInfo[act.id]?.found && odooInfo[act.id]?.hasPO && odooInfo[act.id]?.client && (
                            <span className="block text-[9px] text-emerald-600 mt-0.5 truncate max-w-[120px]" title={odooInfo[act.id].client}>✓ {odooInfo[act.id].client?.split(',')[0]}</span>
                          )}
                          {odooInfo[act.id]?.found && !odooInfo[act.id]?.hasPO && (
                            <span className="block text-[9px] text-amber-600 mt-0.5">⚠ Sin P.O. en Odoo</span>
                          )}
                          {odooInfo[act.id]?.found === false && (
                            <span className="block text-[9px] text-red-500 mt-0.5">✗ Folio no encontrado</span>
                          )}
                        </div>
                      ) : <span className={`text-xs font-mono ${act.purchaseOrder ? 'text-slate-700' : 'text-red-500 font-bold'}`}>{act.purchaseOrder || 'Sin Cotización'}</span>}
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
                    <td><AssignDropdown label="Designado" options={designadoOptions} assigned={allDesignados.map((x) => ({ assignmentId: x.assignmentId, id: x.id, name: x.name }))} onAssign={(id) => handleAssign('SAFETY_DESIGNADO', act.id, id)} onRemove={(assignmentId) => { const found = allDesignados.find((d) => d.assignmentId === assignmentId); handleRemove(assignmentId, found?.removeType || 'TECH'); }} disabled={!canAssign} colorClass="bg-emerald-100 text-emerald-700" /></td>

                    {/* SAFETY DEDICADO */}
                    <td><AssignDropdown label="Dedicado" options={safetyDedicados.map((s) => ({ id: s.id, name: s.name }))} assigned={aS.map((x) => ({ assignmentId: x.id, id: x.safetyDedicadoId, name: x.safetyDedicado.name }))} onAssign={(id) => handleAssign('SAFETY_DEDICADO', act.id, id)} onRemove={(id) => handleRemove(id, 'SAFETY_DEDICADO')} disabled={!canAssignSafetyDedicado} colorClass="bg-amber-100 text-amber-700" /></td>

                    {/* VEHÍCULO */}
                    <td><AssignDropdown label="Vehículo" options={vehicles.map((v) => ({ id: v.id, name: v.name }))} assigned={aV.map((x) => ({ assignmentId: x.id, id: x.vehicleId, name: x.vehicle.name, hasConflict: !!conflictAlerts[`${act.id}-${x.vehicleId}`] }))} onAssign={(id) => handleAssign('VEHICLE', act.id, id)} onRemove={(id) => handleRemove(id, 'VEHICLE')} disabled={!canAssign} colorClass="bg-violet-100 text-violet-700" /></td>

                    {/* CHOFER */}
                    <td><AssignDropdown label="Chofer" options={drivers.map((d) => ({ id: d.id, name: d.name }))} assigned={aDr.map((x) => ({ assignmentId: x.id, id: x.driverId, name: x.driver.name, hasConflict: !!conflictAlerts[`${act.id}-${x.driverId}`] }))} onAssign={(id) => handleAssign('DRIVER', act.id, id)} onRemove={(id) => handleRemove(id, 'DRIVER')} disabled={!canAssign} colorClass="bg-cyan-100 text-cyan-700" /></td>

                    {/* EQ. ELEVACIÓN */}
                    <td><AssignDropdown label="Equipo" options={elevationEquips.map((e) => ({ id: e.id, name: e.name, badge: e.ownership }))} assigned={aE.map((x) => ({ assignmentId: x.id, id: x.equipId, name: x.equip.name, hasConflict: !!conflictAlerts[`${act.id}-${x.equipId}`] }))} onAssign={(id) => handleAssign('EQUIP', act.id, id)} onRemove={(id) => handleRemove(id, 'EQUIP')} disabled={!canAssign} colorClass="bg-orange-100 text-orange-700" /></td>

                    {/* NOTAS INGENIERO */}
                    <td>
                      <NoteCell value={notesState[act.id] || ''} onChange={(v) => { setNotesState(p => ({ ...p, [act.id]: v })); updateField(act.id, 'weekendNotes', v); }} disabled={!canEditNotes(act)} placeholder="Agregar nota..." color="text-slate-700" />
                    </td>

                    {/* NOTAS AUDITORÍA — visible to all, editable only by Safety & LP */}
                    <td>
                      <NoteCell value={auditNotesState[act.id] || ''} onChange={(v) => { setAuditNotesState(p => ({ ...p, [act.id]: v })); updateField(act.id, 'auditNotes', v); }} disabled={!canEditAudit} placeholder={canEditAudit ? 'Nota auditoría...' : ''} color="text-red-600" />
                    </td>

                    {/* NOTAS ALERTAS — visible only to ADMIN + Safety LP, editable only by Safety & LP */}
                    {canViewAlertNotes && (
                      <td>
                        <div className="relative">
                          <NoteCell value={alertNotesState[act.id] || ''} onChange={(v) => { setAlertNotesState(p => ({ ...p, [act.id]: v })); updateField(act.id, 'alertNotes', v); }} disabled={!canEditAlertNotes} placeholder={canEditAlertNotes ? 'Nota alerta...' : ''} color="text-amber-700" />
                        </div>
                      </td>
                    )}

                    {/* SAFETY AUDIT IMAGE + TERA FOLIO */}
                    <td className="text-center">
                      {teraExemptState[act.id] ? (
                        /* ── EXEMPT BADGE ── */
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-200">
                            <ShieldCheck size={12} className="text-blue-500" />
                            N/A
                          </span>
                          <span className="text-[9px] text-slate-400 leading-tight">
                            {teraExemptByState[act.id] || '?'}
                          </span>
                          {(userRole === 'SUPERVISOR_SAFETY_LP' || userRole === 'ADMIN') && (
                            <button
                              onClick={() => toggleTeraExempt(act.id)}
                              disabled={teraExemptLoading[act.id]}
                              className="text-[9px] text-blue-500 hover:text-blue-700 underline mt-0.5"
                              title="Quitar exención TERA"
                            >
                              {teraExemptLoading[act.id] ? <Loader2 size={10} className="animate-spin" /> : 'Quitar'}
                            </button>
                          )}
                        </div>
                      ) : auditImageLoading[act.id] ? (
                        <Loader2 size={16} className="mx-auto animate-spin text-indigo-500" />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center justify-center gap-1">
                            {/* Visual indicator */}
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${auditImages[act.id] ? 'bg-emerald-500' : 'bg-slate-300'}`} title={auditImages[act.id] ? 'Imagen cargada' : 'Sin imagen'} />
                            {/* Upload */}
                            {canEditAuditImage(act) && (
                              <button
                                onClick={() => handleAuditImageUpload(act.id)}
                                className="p-1 rounded hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700 transition-colors"
                                title="Subir imagen TERA"
                              >
                                <ImagePlus size={14} />
                              </button>
                            )}
                            {/* View */}
                            {auditImages[act.id] && (
                              <button
                                onClick={() => setPreviewImage(auditImages[act.id])}
                                className="p-1 rounded hover:bg-violet-50 text-violet-500 hover:text-violet-700 transition-colors"
                                title="Ver imagen"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                            {/* Delete */}
                            {auditImages[act.id] && canEditAuditImage(act) && (
                              <button
                                onClick={() => handleAuditImageDelete(act.id)}
                                className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                title="Eliminar imagen"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                            {/* Exempt toggle — Safety & LP only */}
                            {(userRole === 'SUPERVISOR_SAFETY_LP' || userRole === 'ADMIN') && (
                              <button
                                onClick={() => toggleTeraExempt(act.id)}
                                disabled={teraExemptLoading[act.id]}
                                className="p-1 rounded hover:bg-blue-50 text-slate-300 hover:text-blue-500 transition-colors"
                                title="Marcar como exenta de TERA"
                              >
                                {teraExemptLoading[act.id] ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                              </button>
                            )}
                          </div>
                          {/* TERA Folio */}
                          {canEditAuditImage(act) ? (
                            <>
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
                                  className={`w-[76px] text-xs font-mono px-1.5 py-1 rounded border text-center ${
                                    teraFolios[act.id] && /^BC-\d{3,5}$/.test(teraFolios[act.id])
                                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-bold'
                                      : 'border-slate-200 text-slate-500'
                                  }`}
                                />
                                {teraFolioSaving[act.id] && <Loader2 size={10} className="animate-spin text-indigo-400" />}
                              </div>
                              {teraUploadInfo[act.id]?.at && (
                                <span className="text-[9px] text-slate-400 leading-tight text-center block" title={`Subido por ${teraUploadInfo[act.id]?.by || '?'}`}>
                                  {teraUploadInfo[act.id]?.by || '?'} · {new Date(teraUploadInfo[act.id]!.at!).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'America/Tijuana' })} {new Date(teraUploadInfo[act.id]!.at!).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Tijuana' })}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {teraFolios[act.id] && (
                                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {teraFolios[act.id]}
                                </span>
                              )}
                              {teraUploadInfo[act.id]?.at && (
                                <span className="text-[9px] text-slate-400 leading-tight text-center block">
                                  {teraUploadInfo[act.id]?.by || '?'} · {new Date(teraUploadInfo[act.id]!.at!).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'America/Tijuana' })} {new Date(teraUploadInfo[act.id]!.at!).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Tijuana' })}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>

                    {/* TERA AUDITOR */}
                    <td className="text-center">
                      {teraAuditorImageLoading[act.id] ? (
                        <Loader2 size={16} className="mx-auto animate-spin text-amber-500" />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center justify-center gap-1">
                            {/* Visual indicator */}
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${teraAuditorImages[act.id] ? 'bg-amber-500' : 'bg-slate-300'}`} title={teraAuditorImages[act.id] ? 'Imagen cargada' : 'Sin imagen'} />
                            {/* Upload */}
                            {canEditTeraAuditor() && (
                              <button
                                onClick={() => handleTeraAuditorImageUpload(act.id)}
                                className="p-1 rounded hover:bg-amber-50 text-amber-500 hover:text-amber-700 transition-colors"
                                title="Subir imagen TERA Auditor"
                              >
                                <ImagePlus size={14} />
                              </button>
                            )}
                            {/* View */}
                            {teraAuditorImages[act.id] && (
                              <button
                                onClick={() => setPreviewImage(teraAuditorImages[act.id])}
                                className="p-1 rounded hover:bg-violet-50 text-violet-500 hover:text-violet-700 transition-colors"
                                title="Ver imagen"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                            {/* Delete */}
                            {teraAuditorImages[act.id] && canEditTeraAuditor() && (
                              <button
                                onClick={() => handleTeraAuditorImageDelete(act.id)}
                                className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                title="Eliminar imagen"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                          {/* TERA Auditor Folio */}
                          {canEditTeraAuditor() ? (
                            <>
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="text"
                                  maxLength={8}
                                  placeholder="BC-000"
                                  value={teraAuditorFolios[act.id] || ''}
                                  onChange={(e) => {
                                    const v = e.target.value.toUpperCase();
                                    setTeraAuditorFolios((p) => ({ ...p, [act.id]: v }));
                                  }}
                                  onBlur={() => saveTeraAuditorFolio(act.id)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') saveTeraAuditorFolio(act.id); }}
                                  className={`w-[76px] text-xs font-mono px-1.5 py-1 rounded border text-center ${
                                    teraAuditorFolios[act.id] && /^BC-\d{3,5}$/.test(teraAuditorFolios[act.id])
                                      ? 'border-amber-300 bg-amber-50 text-amber-700 font-bold'
                                      : 'border-slate-200 text-slate-500'
                                  }`}
                                />
                                {teraAuditorFolioSaving[act.id] && <Loader2 size={10} className="animate-spin text-amber-400" />}
                              </div>
                              {teraAuditorUploadInfo[act.id]?.at && (
                                <span className="text-[9px] text-slate-400 leading-tight text-center block" title={`Subido por ${teraAuditorUploadInfo[act.id]?.by || '?'}`}>
                                  {teraAuditorUploadInfo[act.id]?.by || '?'} · {new Date(teraAuditorUploadInfo[act.id]!.at!).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'America/Tijuana' })} {new Date(teraAuditorUploadInfo[act.id]!.at!).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Tijuana' })}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {teraAuditorFolios[act.id] && (
                                <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  {teraAuditorFolios[act.id]}
                                </span>
                              )}
                              {teraAuditorUploadInfo[act.id]?.at && (
                                <span className="text-[9px] text-slate-400 leading-tight text-center block">
                                  {teraAuditorUploadInfo[act.id]?.by || '?'} · {new Date(teraAuditorUploadInfo[act.id]!.at!).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'America/Tijuana' })} {new Date(teraAuditorUploadInfo[act.id]!.at!).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Tijuana' })}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>

                    {/* CANCEL / UNDO BUTTON */}
                    <td className="text-center">
                      {cancelledIds.has(act.id) ? (
                        <div className="flex flex-col items-center gap-0.5">
                          {cancelledByMap[act.id] && (
                            <span className="text-[9px] text-red-400 leading-tight">por {cancelledByMap[act.id]}</span>
                          )}
                          {(canCancelAny || (canCancelOwn && act.user?.id === userId)) && (
                            <button
                              onClick={async () => {
                                if (!confirm('¿Restaurar actividad y recuperar recursos?')) return;
                                setUncancelLoading(p => ({ ...p, [act.id]: true }));
                                try {
                                  const res = await fetch(`/api/activities/${act.id}/uncancel`, { method: 'POST' });
                                  const data = await res.json();
                                  if (!res.ok) { alert(data.error || 'Error'); setUncancelLoading(p => ({ ...p, [act.id]: false })); return; }
                                  setCancelledIds(prev => { const next = new Set(prev); next.delete(act.id); return next; });
                                  const msg = [
                                    '✅ Actividad restaurada',
                                    data.restored.length > 0 ? `\nRecursos restaurados:\n${data.restored.join('\n')}` : '',
                                    data.conflicts.length > 0 ? `\n⚠️ No se pudieron restaurar:\n${data.conflicts.join('\n')}` : '',
                                  ].filter(Boolean).join('');
                                  alert(msg);
                                  router.refresh();
                                } catch { alert('Error de conexión'); }
                                setUncancelLoading(p => ({ ...p, [act.id]: false }));
                              }}
                              disabled={uncancelLoading[act.id]}
                              className="p-1 rounded hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700 transition-colors disabled:opacity-50"
                              title="Deshacer cancelación"
                            >
                              {uncancelLoading[act.id] ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                            </button>
                          )}
                        </div>
                      ) : (canCancelAny || (canCancelOwn && act.user?.id === userId)) && (
                        <button
                          onClick={() => { setCancelModal({ activity: act }); setCancelReason(''); setCancelNotes(''); setCancelHasCharges(false); setCancelResult(null); setCancelCopied(false); }}
                          className="inline-flex items-center gap-1 px-1.5 py-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors text-[10px]"
                          title="Cancelar actividad"
                        >
                          <Ban size={12} /> <span className="font-medium">Cancelar</span>
                        </button>
                      )}
                    </td>
                  </tr>
                  </React.Fragment>
                );
              });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X size={18} />
            </button>
            <img src={previewImage} alt="TERA" className="max-w-full max-h-[85vh] object-contain" />
          </div>
        </div>
      )}
      {/* ── TECH PLANS MODAL ── */}
      {showTechPlansModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowTechPlansModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">📋 Planes Técnicos — {weekendLabel}</h3>
              <button onClick={() => setShowTechPlansModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              {/* Left: Tech list */}
              <div className="w-64 border-r border-slate-200 overflow-y-auto bg-slate-50 p-3 shrink-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Técnicos asignados ({assignedTechs.length})</p>
                {assignedTechs.map(t => {
                  const actCount = techAssignments.filter(x => x.technicianId === t.id && x.role === 'TECNICO').length;
                  return (
                    <button key={t.id} onClick={() => setSelectedTechId(t.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors text-sm ${selectedTechId === t.id ? 'bg-sky-100 text-sky-800 font-semibold ring-1 ring-sky-300' : 'hover:bg-white text-slate-700'}`}>
                      <div className="flex items-center justify-between">
                        <span className="truncate">{t.name}</span>
                        <span className="bg-sky-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 shrink-0">{actCount}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {t.phone ? (
                          <span className="text-[9px] text-emerald-600">📱 {t.phone}</span>
                        ) : (
                          <span className="text-[9px] text-red-400">⚠ Sin celular</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {assignedTechs.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sin técnicos asignados</p>}
              </div>
              {/* Right: Generated text */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {selectedTechId ? (
                  <>
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <span className="text-xs text-slate-500">{technicians.find(t => t.id === selectedTechId)?.name}</span>
                      <button onClick={() => { navigator.clipboard.writeText(generateTechPlan(selectedTechId)); alert('📋 Plan copiado al portapapeles'); }}
                        className="btn-primary text-xs !py-1.5 !px-3">📋 Copiar texto</button>
                    </div>
                    <pre className="flex-1 overflow-y-auto p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-mono bg-white">{generateTechPlan(selectedTechId)}</pre>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Selecciona un técnico</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── CONTRACTOR PLANS MODAL ── */}
      {showContractorPlansModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowContractorPlansModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">🏭 Plan Contratista — {weekendLabel}</h3>
              <button onClick={() => setShowContractorPlansModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              {/* Left: Contractor list */}
              <div className="w-64 border-r border-slate-200 overflow-y-auto bg-slate-50 p-3 shrink-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Contratistas ({assignedContractors.length})</p>
                {assignedContractors.map(c => (
                  <button key={c.id} onClick={() => setSelectedContractorId(c.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors text-sm ${selectedContractorId === c.id ? 'bg-purple-100 text-purple-800 font-semibold ring-1 ring-purple-300' : 'hover:bg-white text-slate-700'}`}>
                    <div className="flex items-center justify-between">
                      <span className="truncate">{c.name}</span>
                      <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 shrink-0">{c.techCount}</span>
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{c.techCount} técnico{c.techCount !== 1 ? 's' : ''} asignado{c.techCount !== 1 ? 's' : ''}</div>
                  </button>
                ))}
                {assignedContractors.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sin contratistas en este plan</p>}
              </div>
              {/* Right: Generated text */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {selectedContractorId ? (
                  <>
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <span className="text-xs text-slate-500">🏭 {assignedContractors.find(c => c.id === selectedContractorId)?.name}</span>
                      <button onClick={() => { navigator.clipboard.writeText(generateContractorPlan(selectedContractorId)); alert('📋 Plan contratista copiado al portapapeles'); }}
                        className="btn-primary text-xs !py-1.5 !px-3">📋 Copiar para WhatsApp</button>
                    </div>
                    <pre className="flex-1 overflow-y-auto p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-mono bg-white">{generateContractorPlan(selectedContractorId)}</pre>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Selecciona una contratista</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EQUIPMENT REPORT MODAL ── */}
      {showEquipReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowEquipReportModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">🏗️ Reporte Equipos de Elevación — {weekendLabel}</h3>
              <button onClick={() => setShowEquipReportModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
              <button onClick={() => { navigator.clipboard.writeText(generateEquipReport().text); alert('📋 Reporte copiado al portapapeles'); }}
                className="btn-primary text-xs !py-1.5 !px-3">📋 Copiar texto</button>
              <button onClick={exportEquipCSV}
                className="btn-secondary text-xs !py-1.5 !px-3"><Download size={14} /> Exportar CSV</button>
            </div>
            <pre className="flex-1 overflow-y-auto p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-mono bg-white">{generateEquipReport().text}</pre>
          </div>
        </div>
      )}

      {/* TIME REGISTRY MODAL */}
      {timeRegistryModal && (
        <TimeRegistryModal
          activityId={timeRegistryModal.activityId}
          activityTitle={timeRegistryModal.activityTitle}
          entries={timeRegistries[timeRegistryModal.activityId] || []}
          onClose={() => setTimeRegistryModal(null)}
          onEntryAdded={(entry) => {
            setTimeRegistries((prev) => ({
              ...prev,
              [timeRegistryModal.activityId]: [...(prev[timeRegistryModal.activityId] || []), entry],
            }));
          }}
        />
      )}
      {/* ── CANCEL ACTIVITY MODAL ── */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => !cancelLoading && setCancelModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-slide-in" onClick={e => e.stopPropagation()}>
            {!cancelResult ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-red-600 flex items-center gap-2"><Ban size={20} /> Cancelar Actividad</h3>
                  <button onClick={() => setCancelModal(null)} className="p-2 hover:bg-slate-100 rounded-lg" disabled={cancelLoading}><X size={20} /></button>
                </div>
                {/* Activity info */}
                <div className="px-5 pt-4">
                  <p className="font-semibold text-slate-800 text-sm">{cancelModal.activity.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{cancelModal.activity.client?.name || 'Sin cliente'} · {formatDate(cancelModal.activity.date)} · {cancelModal.activity.startTime || '--:--'} — {cancelModal.activity.endTime || '--:--'}</p>
                </div>
                {/* Reason select */}
                <div className="px-5 pt-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo de cancelación *</label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Seleccionar motivo...</option>
                    <option value="PERMISOLOGIA_INCOMPLETA">Permisología Incompleta</option>
                    <option value="AREA_NO_DESPEJADA">Área no despejada de equipos Cliente</option>
                    <option value="FALTO_PERSONAL_NUESTRO">Faltó Personal nuestro</option>
                    <option value="FALTO_PERSONAL_CLIENTE">Faltó personal Cliente</option>
                    <option value="FALTO_MATERIAL">Faltó Material</option>
                    <option value="MEDIDAS_NO_COINCIDEN">Medidas de fabricación/Instalación no coinciden</option>
                    <option value="ALCANCE_DISTINTO">Alcance distinto al considerado en plan</option>
                    <option value="OBSTRUCCION_OTRA_EMPRESA">Obstrucción con otra empresa</option>
                    <option value="OTRA">Otra (especificar)</option>
                  </select>
                </div>
                {/* Notes */}
                <div className="px-5 pt-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Detalles / Notas {cancelReason === 'OTRA' && <span className="text-red-500">*</span>}</label>
                  <textarea
                    value={cancelNotes}
                    onChange={(e) => setCancelNotes(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    placeholder={cancelReason === 'OTRA' ? 'Obligatorio: describe el motivo...' : 'Opcional: detalles adicionales...'}
                  />
                </div>
                {/* Has charges */}
                <div className="px-5 pt-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cancelHasCharges}
                      onChange={(e) => setCancelHasCharges(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-800">¿La cancelación genera cargos al cliente?</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">Se creará automáticamente una cotización de cargo al ingeniero</p>
                    </div>
                  </label>
                </div>
                {/* Actions */}
                <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 mt-4">
                  <button onClick={() => setCancelModal(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" disabled={cancelLoading}>No, volver</button>
                  <button
                    onClick={async () => {
                      if (!cancelReason) { alert('Selecciona un motivo de cancelación'); return; }
                      if (cancelReason === 'OTRA' && !cancelNotes.trim()) { alert('Debes especificar detalles cuando el motivo es "Otra"'); return; }
                      setCancelLoading(true);
                      try {
                        const res = await fetch(`/api/activities/${cancelModal.activity.id}/cancel`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ reason: cancelReason, notes: cancelNotes, hasCharges: cancelHasCharges }),
                        });
                        const data = await res.json();
                        if (!res.ok) { alert(data.error || 'Error al cancelar'); setCancelLoading(false); return; }
                        setCancelResult(data);
                        setCancelledIds(prev => new Set([...prev, cancelModal.activity.id]));
                        setCancelledByMap(prev => ({ ...prev, [cancelModal.activity.id]: userName }));
                      } catch (err) {
                        alert('Error de conexión');
                      }
                      setCancelLoading(false);
                    }}
                    disabled={cancelLoading || !cancelReason}
                    className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {cancelLoading ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                    Cancelar Actividad
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Success result */}
                <div className="p-5 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2"><Check size={20} /> Actividad Cancelada</h3>
                </div>
                <div className="px-5 py-4 space-y-4">
                  {/* Released resources summary */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Recursos liberados</p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                      {cancelResult.releasedResources.techs.length > 0 && <p>🔧 {cancelResult.releasedResources.techs.join(', ')}</p>}
                      {cancelResult.releasedResources.safety.length > 0 && <p>🛡️ {cancelResult.releasedResources.safety.join(', ')}</p>}
                      {cancelResult.releasedResources.vehicles.length > 0 && <p>🚗 {cancelResult.releasedResources.vehicles.join(', ')}</p>}
                      {cancelResult.releasedResources.drivers.length > 0 && <p>🚙 {cancelResult.releasedResources.drivers.join(', ')}</p>}
                      {cancelResult.releasedResources.equips.length > 0 && <p>🏗️ {cancelResult.releasedResources.equips.join(', ')}</p>}
                      {[...Object.values(cancelResult.releasedResources) as any[]].every((a: any[]) => a.length === 0) && <p className="text-slate-400">Sin recursos asignados</p>}
                    </div>
                  </div>
                  {/* New cotización link */}
                  {cancelResult.newCotizacionId && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-800 flex items-center gap-1">💰 Se creó cotización de cargo automática</p>
                      <button onClick={() => router.push(`/actividades/${cancelResult!.newCotizacionId}`)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 mt-1">
                        <ExternalLink size={12} /> Ver cotización creada
                      </button>
                    </div>
                  )}
                  {/* WhatsApp notice */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Aviso para WhatsApp</p>
                    <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{cancelResult.whatsappNotice}</pre>
                    <button
                      onClick={() => { navigator.clipboard.writeText(cancelResult!.whatsappNotice); setCancelCopied(true); setTimeout(() => setCancelCopied(false), 2000); }}
                      className={`mt-2 px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${cancelCopied ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                      {cancelCopied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar Aviso para WhatsApp</>}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-end p-5 border-t border-slate-200">
                  <button onClick={() => { setCancelModal(null); router.refresh(); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cerrar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
