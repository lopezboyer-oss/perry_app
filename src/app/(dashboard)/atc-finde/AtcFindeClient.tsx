'use client';

import { useState, useRef, useEffect } from 'react';
import { CalendarDays, Download, Plus, X, AlertTriangle, Shield, HardHat, Search, MessageSquare, FileWarning, Loader2, ImagePlus, Trash2, Eye } from 'lucide-react';
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
  safetyAuditImage: string | null;
  teraFolio: string | null;
  user: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
}

interface Technician { id: string; name: string; type: string; isCruzVerde: boolean; }
interface SafetyDedicado { id: string; name: string; }
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
  weekendOf: string;
  weekendLabel: string;
  planDays: PlanDay[];
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
  userRole, userId, weekendOf, weekendLabel, planDays,
}: Props) {
  const router = useRouter();
  const [techAssignments, setTechAssignments] = useState(initialTechAssignments);
  const [safetyAssignments, setSafetyAssignments] = useState(initialSafetyAssignments);
  const [vehicleAssignments, setVehicleAssignments] = useState(initialVehicleAssignments);
  const [driverAssignments, setDriverAssignments] = useState(initialDriverAssignments);
  const [equipAssignments, setEquipAssignments] = useState(initialEquipAssignments);
  const [userSafetyAssignments, setUserSafetyAssignments] = useState(initialUserSafetyAssignments);
  const [conflictAlerts, setConflictAlerts] = useState<Record<string, string[]>>({});

  const [lotoState, setLotoState] = useState<Record<string, boolean>>(Object.fromEntries(activities.map((a) => [a.id, a.loto])));
  const [poState, setPoState] = useState<Record<string, string>>(Object.fromEntries(activities.map((a) => [a.id, a.purchaseOrder || ''])));
  const [folioState, setFolioState] = useState<Record<string, string>>(Object.fromEntries(activities.map((a) => [a.id, a.workOrderFolio || ''])));

  // Safety audit image state
  const [auditImages, setAuditImages] = useState<Record<string, string | null>>(Object.fromEntries(activities.map((a) => [a.id, a.safetyAuditImage || null])));
  const [auditImageLoading, setAuditImageLoading] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [teraFolios, setTeraFolios] = useState<Record<string, string>>(Object.fromEntries(activities.map((a) => [a.id, a.teraFolio || ''])));
  const [teraFolioSaving, setTeraFolioSaving] = useState<Record<string, boolean>>({});

  // Extra day dialog state
  const [showExtraDayDialog, setShowExtraDayDialog] = useState(false);
  const [extraDayDate, setExtraDayDate] = useState('');
  const [extraDayLabel, setExtraDayLabel] = useState('');
  const [extraDaySaving, setExtraDaySaving] = useState(false);

  const canAssign = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canAssignSafetyDedicado = ['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canEditFields = ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canViewAudit = ['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canEditAudit = ['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
  const canManageExtraDays = ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);

  const canEditAuditImage = (act: Activity) => {
    if (['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole)) return true;
    if (userRole === 'INGENIERO' && act.user?.id === userId) return true;
    return false;
  };

  // Odoo lookup state
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
    if (folio && !/^BC-\d{3,4}$/.test(folio)) {
      alert('Formato inválido. Use BC- seguido de 3 o 4 dígitos (ej: BC-123 o BC-1234)');
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

  // ── CSV EXPORT ──
  const exportCSV = () => {
    const h = ['#','Día','Inicio','Fin','Resp.','Contacto','Actividad','Folio','P.O.','LOTO','Técnicos','S.Designado','S.Dedicado','Vehículo','Chofer','Eq.Elev.','Notas','N.Auditoría','TERA'];
    const rows = activities.map((a, i) => {
      const t = techAssignments.filter((x) => x.activityId === a.id && x.role === 'TECNICO').map((x) => x.technician.name).join(';');
      const sd = techAssignments.filter((x) => x.activityId === a.id && x.role === 'SAFETY_DESIGNADO').map((x) => x.technician.name).join(';');
      const dd = safetyAssignments.filter((x) => x.activityId === a.id).map((x) => x.safetyDedicado.name).join(';');
      const v = vehicleAssignments.filter((x) => x.activityId === a.id).map((x) => x.vehicle.name).join(';');
      const dr = driverAssignments.filter((x) => x.activityId === a.id).map((x) => x.driver.name).join(';');
      const eq = equipAssignments.filter((x) => x.activityId === a.id).map((x) => x.equip.name).join(';');
      return [i+1,formatDate(a.date),a.startTime||'-',a.endTime||'-',a.user?.name||'-',a.contact?.name||'-',`"${a.title.replace(/"/g,'""')}"`,folioState[a.id]||'-',poState[a.id]||'PEND.',lotoState[a.id]?'SI':'NO',t||'-',sd||'-',dd||'-',v||'-',dr||'-',eq||'-',`"${(a.weekendNotes||'').replace(/"/g,'""')}"`,canViewAudit?`"${(a.auditNotes||'').replace(/"/g,'""')}"`:'-',auditImages[a.id]?'SI':'NO'];
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
  const dayNames = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
  // Visible plan days: only those with activities OR extra days
  const visiblePlanDays = planDays.filter(d => d.hasActivities || d.isExtra);

  // Build per-day stats
  const dayStats = visiblePlanDays.map(d => {
    const dayActs = activities.filter(a => a.date.startsWith(d.date));
    const dayTechIds = new Set(techAssignments.filter(x => dayActs.some(a => a.id === x.activityId)).map(x => x.technicianId));
    const dt = new Date(`${d.date}T12:00:00`);
    const dayLabel = d.isExtra
      ? (d.label || dayNames[dt.getDay()] + ' ' + dt.getDate())
      : dayNames[dt.getDay()];
    return { ...d, dayLabel, actCount: dayActs.length, techCount: dayTechIds.size };
  });

  const engMap = new Map<string, number>();
  activities.forEach((a) => { const n = a.user?.name || 'Sin asignar'; engMap.set(n, (engMap.get(n) || 0) + 1); });
  const allTechIds = new Set(techAssignments.map((x) => x.technicianId));

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
        <div className="flex items-center gap-2">
          {canManageExtraDays && (
            <button onClick={() => setShowExtraDayDialog(true)} className="btn-secondary text-sm shrink-0 !bg-amber-50 !text-amber-700 !border-amber-300 hover:!bg-amber-100">
              <Plus size={16} /> Día Extra
            </button>
          )}
          <button onClick={exportCSV} className="btn-secondary text-sm shrink-0"><Download size={16} /> Exportar Plan</button>
        </div>
      </div>

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
                <th className="font-semibold w-[90px] text-center">TERA</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr><td colSpan={canViewAudit ? 18 : 17} className="text-center py-16">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
                  <p className="font-medium text-lg text-slate-400">Fin de Semana Despejado</p>
                  <p className="text-sm mt-1 text-slate-400">No hay actividades para este fin de semana.</p>
                </td></tr>
              ) : activities.map((act, idx) => {
                const aT = getTechs(act.id, 'TECNICO');
                const aD = getTechs(act.id, 'SAFETY_DESIGNADO');
                const aUserSafety = userSafetyAssignments.filter((x) => x.activityId === act.id);
                const allSafetyForAct = safetyAssignments.filter((x) => x.activityId === act.id);
                const aS = allSafetyForAct.filter((x) => x.role !== 'DESIGNADO'); // Only DEDICADO
                const aSDesignado = allSafetyForAct.filter((x) => x.role === 'DESIGNADO'); // Safety Dedicado as Designado
                const aV = getVehicles(act.id);
                const aDr = getDrivers(act.id);
                const aE = getEquips(act.id);

                // Merge tech-based, user-based, and safety-dedicado-as-designado for display
                const allDesignados = [
                  ...aD.map((x) => ({ assignmentId: x.id, id: x.technicianId, name: x.technician.name, removeType: 'TECH' as const })),
                  ...aUserSafety.map((x) => ({ assignmentId: x.id, id: `usr-${x.userId}`, name: x.user.name, removeType: 'USER_SAFETY_DESIGNADO' as const })),
                  ...aSDesignado.map((x) => ({ assignmentId: x.id, id: `sd-${x.safetyDedicadoId}`, name: x.safetyDedicado.name, removeType: 'SAFETY_DEDICADO' as const })),
                ];

                return (
                  <tr key={act.id} className="hover:bg-slate-50/50 transition-colors align-top">
                    <td className="text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">{idx + 1}</span>
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
                        <div className="flex items-center gap-0.5">
                          <input type="text" maxLength={6} className={`w-[62px] text-[10px] px-1 py-1 rounded-l border font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${odooInfo[act.id]?.found === false ? 'border-red-300 bg-red-50' : odooInfo[act.id]?.found ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}
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
                      ) : <span className="text-xs font-mono text-slate-600">{act.workOrderFolio || '-'}</span>}
                    </td>

                    {/* P.O. */}
                    <td>
                      {canEditFields ? (
                        <div>
                          <input type="text" maxLength={10} className={`w-[80px] text-[10px] px-1 py-1 rounded border font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${poState[act.id] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}
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

                    {/* SAFETY AUDIT IMAGE + TERA FOLIO */}
                    <td className="text-center">
                      {auditImageLoading[act.id] ? (
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
                                  teraFolios[act.id] && /^BC-\d{3,4}$/.test(teraFolios[act.id])
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
    </div>
  );
}
