'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, ArrowLeft, Search, Loader2, Upload, Camera, X, 
  Zap, Clock, Building2, CheckCircle2, AlertCircle, 
  Mic, MicOff, User, Briefcase, FileText, Check, ChevronRight
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TimeInput24h } from '@/components/ui/TimeInput24h';
import { 
  activityTypeLabels, 
  activityStatusLabels, 
  calculateDuration, 
  getLocalToday, 
  CONSORTIUM_COMPANIES 
} from '@/lib/utils';

interface Props {
  users: { id: string; name: string }[];
  clients: { id: string; name: string; contacts: { id: string; name: string }[] }[];
  currentUserId: string;
  userRole: string;
  initialData?: any;
  prefillFolio?: string;
}

interface PhotoItem {
  id: string;
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

const ACTIVITY_TYPE_CONFIG: { [key: string]: { label: string; icon: string; desc: string; color: string } } = {
  VISITA_CAMPO: { label: 'Visita de Campo', icon: '🛠️', desc: 'Servicio en planta o sitio', color: 'indigo' },
  COTIZACION: { label: 'Cotización', icon: '📋', desc: 'Levantamiento y propuesta', color: 'blue' },
  SOPORTE_INTERNO: { label: 'Soporte Interempresa', icon: '🧑‍💻', desc: 'Apoyo técnico interno', color: 'cyan' },
  CONSORCIO: { label: 'Consorcio', icon: '🏢', desc: 'Soporte cruzado empresas', color: 'purple' },
  CAPACITACION: { label: 'Capacitación', icon: '🎓', desc: 'Entrenamiento técnico', color: 'emerald' },
};

export function ActivityForm({ users, clients, currentUserId, userRole, initialData, prefillFolio }: Props) {
  const router = useRouter();
  const isEdit = !!initialData?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    date: initialData?.date || getLocalToday(),
    userId: initialData?.userId || currentUserId,
    type: initialData?.type || 'VISITA_CAMPO',
    status: initialData?.status || 'PENDIENTE',
    title: initialData?.title || '',
    clientId: initialData?.clientId || '',
    contactId: initialData?.contactId || '',
    workOrderFolio: initialData?.workOrderFolio || '',
    purchaseOrder: initialData?.purchaseOrder || '',
    projectArea: initialData?.projectArea || '',
    result: initialData?.result || '',
    nextStep: initialData?.nextStep || '',
    commitmentDate: initialData?.commitmentDate || '',
    startTime: initialData?.startTime || '',
    endTime: initialData?.endTime || '',
    durationMinutes: initialData?.durationMinutes || '',
    location: initialData?.location || '',
    notes: initialData?.notes || '',
    consortiumCompany: initialData?.consortiumCompany || '',
    companyId: initialData?.companyId || '',
    continuedFromId: initialData?.continuedFromId || '',
    isManPower: initialData?.isManPower || false,
    manPowerEquipo: initialData?.manPowerEquipo || '',
    actualStartTime: initialData?.actualStartTime || initialData?.startTime || '',
    actualEndTime: initialData?.actualEndTime || initialData?.endTime || '',
    equipmentStatus: initialData?.equipmentStatus || '',
    suggestedAction: initialData?.suggestedAction || '',
    weekendNotes: initialData?.weekendNotes || '',
  });

  const [equiposList, setEquiposList] = useState<string[]>([]);
  const [photosList, setPhotosList] = useState<PhotoItem[]>(() => {
    if (!initialData?.photosBefore) return [];
    try {
      return typeof initialData.photosBefore === 'string'
        ? JSON.parse(initialData.photosBefore)
        : initialData.photosBefore;
    } catch {
      return [];
    }
  });
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Voice dictation states
  const [isListeningResult, setIsListeningResult] = useState(false);
  const [isListeningNotes, setIsListeningNotes] = useState(false);

  // Odoo lookup states
  const [odooLoading, setOdooLoading] = useState(false);
  const [odooMsg, setOdooMsg] = useState<{ type: 'ok' | 'warn' | 'err'; text: string; details?: any } | null>(null);

  // Client-side image compression for fast mobile & desktop bulk upload
  const compressFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 1200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
          }
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve((e.target?.result as string) || '');
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const availableSlots = 20 - photosList.length;
    if (availableSlots <= 0) {
      alert('Has alcanzado el límite máximo de 20 fotografías por actividad.');
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      alert(`Solo se procesarán ${availableSlots} foto(s) para no exceder el límite de 20.`);
    }

    setUploadingPhotos(true);
    try {
      const compressedUrls = await Promise.all(filesToProcess.map((f) => compressFile(f)));
      const validUrls = compressedUrls.filter(Boolean);
      const newItems: PhotoItem[] = validUrls.map((url, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        url,
        uploadedAt: new Date().toISOString(),
      }));
      setPhotosList((prev) => [...prev, ...newItems]);
    } catch (err) {
      console.error('Error al comprimir imágenes:', err);
      alert('Ocurrió un error al procesar algunas imágenes.');
    } finally {
      setUploadingPhotos(false);
      if (e.target) e.target.value = '';
    }
  };

  // Voice dictation toggle
  const toggleSpeechRecognition = (field: 'result' | 'notes') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta dictado por voz. Puedes escribir directamente en el campo.');
      return;
    }

    const isCurrent = field === 'result' ? isListeningResult : isListeningNotes;
    if (isCurrent) {
      setIsListeningResult(false);
      setIsListeningNotes(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-MX';
      recognition.continuous = false;
      recognition.interimResults = false;

      if (field === 'result') setIsListeningResult(true);
      else setIsListeningNotes(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setForm((prev) => ({
            ...prev,
            [field]: prev[field] ? `${prev[field]} ${transcript}` : transcript,
          }));
        }
        setIsListeningResult(false);
        setIsListeningNotes(false);
      };

      recognition.onerror = () => {
        setIsListeningResult(false);
        setIsListeningNotes(false);
      };

      recognition.onend = () => {
        setIsListeningResult(false);
        setIsListeningNotes(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Speech recognition error', err);
      setIsListeningResult(false);
      setIsListeningNotes(false);
    }
  };

  // Read active company cookie & fetch equipos
  useEffect(() => {
    if (!form.companyId) {
      const cookie = document.cookie.split('; ').find((c) => c.startsWith('perry_active_company='));
      const val = cookie?.split('=')[1];
      if (val && val !== 'ALL') {
        setForm((f) => ({ ...f, companyId: val }));
      }
    }

    fetch('/api/actividades/equipos')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEquiposList(data);
      })
      .catch((err) => console.error('Error fetching equipos', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Odoo lookup function
  const lookupOdoo = async (overrideFolio?: string) => {
    const folio = (overrideFolio || form.workOrderFolio)?.trim().toUpperCase();
    if (!folio || folio.length < 4) return;
    setOdooLoading(true);
    setOdooMsg(null);
    try {
      const res = await fetch(`/api/odoo/lookup?folio=${encodeURIComponent(folio)}`);
      const data = await res.json();
      if (data.found) {
        const updates: any = { workOrderFolio: folio };
        if (data.project && !form.title) updates.title = data.project;
        if (data.purchaseOrder) updates.purchaseOrder = data.purchaseOrder;
        if (data.clientId && !form.clientId) updates.clientId = data.clientId;
        if (data.contactId) updates.contactId = data.contactId;
        if (data.companyId) updates.companyId = data.companyId;

        if (Object.keys(updates).length) setForm((f) => ({ ...f, ...updates }));

        if (data.clientId || data.contactId) {
          setTimeout(() => router.refresh(), 500);
        }

        const parts = [];
        if (data.companyName) parts.push(data.companyName);
        if (data.contactName) parts.push(data.contactName);
        if (data.stateLabel) parts.push(data.stateLabel);
        setOdooMsg({ 
          type: 'ok', 
          text: `Sincronizado con Odoo: ${parts.join(' · ')}`,
          details: data 
        });
      } else {
        setOdooMsg({ type: 'err', text: 'Folio no encontrado en Odoo' });
      }
    } catch {
      setOdooMsg({ type: 'err', text: 'Error al conectar con Odoo' });
    }
    setOdooLoading(false);
  };

  // Auto-lookup if prefillFolio provided
  useEffect(() => {
    if (prefillFolio && prefillFolio.length >= 4 && !isEdit) {
      setForm((f) => ({ ...f, workOrderFolio: prefillFolio }));
      lookupOdoo(prefillFolio);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillFolio]);

  // Handle time changes & auto duration
  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    const actualField = field === 'startTime' ? 'actualStartTime' : 'actualEndTime';
    const newForm = { ...form, [field]: value, [actualField]: value };
    const start = field === 'startTime' ? value : form.startTime;
    const end = field === 'endTime' ? value : form.endTime;
    if (start && end) {
      const dur = calculateDuration(start, end);
      if (dur) newForm.durationMinutes = dur.toString();
    }
    setForm(newForm);
  };

  // Preset time setter
  const applyTimePreset = (start: string, end: string, durationMin: string) => {
    setForm((prev) => ({
      ...prev,
      startTime: start,
      endTime: end,
      actualStartTime: start,
      actualEndTime: end,
      durationMinutes: durationMin,
    }));
  };

  const selectedClient = clients.find((c) => c.id === form.clientId);
  const contacts = selectedClient?.contacts || [];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.title || !form.date || !form.type) {
      setError('Los campos Título, Fecha y Tipo de Actividad son obligatorios.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isInternal = form.type === 'CAPACITACION' || form.type === 'SOPORTE_INTERNO';
      const body = {
        ...form,
        clientId: isInternal ? null : (form.clientId || null),
        contactId: isInternal ? null : (form.contactId || null),
        workOrderFolio: isInternal ? null : (form.workOrderFolio || null),
        purchaseOrder: isInternal ? null : (form.purchaseOrder || null),
        consortiumCompany: form.type === 'CONSORCIO' ? (form.consortiumCompany || null) : null,
        projectArea: isInternal ? null : (form.projectArea || null),
        result: form.result || null,
        nextStep: form.nextStep || null,
        commitmentDate: form.commitmentDate || null,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        actualStartTime: form.actualStartTime || form.startTime || null,
        actualEndTime: form.actualEndTime || form.endTime || null,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes) : null,
        location: form.location || null,
        notes: form.notes || null,
        isManPower: form.isManPower,
        manPowerEquipo: form.isManPower ? (form.manPowerEquipo || null) : null,
        equipmentStatus: form.isManPower ? (form.equipmentStatus || null) : null,
        suggestedAction: form.isManPower ? (form.suggestedAction || null) : null,
        weekendNotes: form.isManPower ? (form.weekendNotes || null) : null,
        photosBefore: photosList.length > 0 ? JSON.stringify(photosList) : null,
      };

      const url = isEdit ? `/api/actividades/${initialData.id}` : '/api/actividades';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar actividad');
      }

      const saved = await res.json();

      if (saved.resourceConflicts && saved.resourceConflicts.length > 0) {
        alert(`⚠️ TRASLAPE DE RECURSOS DETECTADO:\n\n${saved.resourceConflicts.join('\n')}\n\nLa actividad fue guardada.`);
      }

      router.push(`/actividades/${saved.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la actividad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-28 sm:pb-12 max-w-5xl mx-auto">
      
      {/* ── FAST-TRACK ODOO ACCELERATOR HERO CARD ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 text-white p-5 md:p-6 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Zap size={13} className="text-amber-400 animate-pulse" />
              <span>Fast-Track Odoo ERP</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              {isEdit ? 'Editar Actividad Operacional' : 'Nueva Actividad Operacional'}
            </h1>
            <p className="text-xs md:text-sm text-slate-300">
              Ingresa el folio Odoo para autocompletar cliente, orden de compra y proyecto en 1 segundo.
            </p>
          </div>

          {/* Quick Folio Input */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-indigo-400/30 w-full md:w-auto">
            <input
              type="text"
              maxLength={6}
              value={form.workOrderFolio}
              onChange={(e) => setForm({ ...form, workOrderFolio: e.target.value.toUpperCase().slice(0, 6) })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  lookupOdoo();
                }
              }}
              placeholder="Folio Odoo (ej: S06309)"
              className="bg-transparent text-white font-mono text-sm px-3 py-1.5 focus:outline-hidden w-full md:w-48 placeholder:text-slate-500 uppercase"
            />
            <button
              type="button"
              onClick={() => lookupOdoo()}
              disabled={odooLoading || !form.workOrderFolio}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              {odooLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              <span>{odooLoading ? 'Buscando...' : 'Cargar Odoo'}</span>
            </button>
          </div>
        </div>

        {/* Live Odoo Status Banner */}
        {odooMsg && (
          <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-xs font-medium border animate-in fade-in duration-200 ${
            odooMsg.type === 'ok' 
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
              : 'bg-red-950/60 border-red-500/40 text-red-300'
          }`}>
            {odooMsg.type === 'ok' ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> : <AlertCircle size={16} className="text-red-400 shrink-0" />}
            <span className="truncate">{odooMsg.text}</span>
          </div>
        )}
      </div>

      {/* ── ERROR MESSAGE ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center gap-2 shadow-xs">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── SECTION 01: CLASIFICACIÓN Y RESPONSABLE ── */}
      <div className="card p-5 md:p-6 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-extrabold">
            01
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-800">Clasificación y Responsable</h2>
            <p className="text-xs text-slate-400">Tipo de servicio, fecha de ejecución y técnico a cargo</p>
          </div>
        </div>

        {/* Segmented Chips for Activity Type */}
        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Tipo de Actividad *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {Object.entries(ACTIVITY_TYPE_CONFIG).map(([typeKey, cfg]) => {
              const isSelected = form.type === typeKey;
              return (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setForm({ ...form, type: typeKey })}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer touch-manipulation ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300/50'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-lg">{cfg.icon}</span>
                    {isSelected && <Check size={14} className="text-white font-bold" />}
                  </div>
                  <span className="text-xs font-bold leading-snug">{cfg.label}</span>
                  <span className={`text-[10px] line-clamp-1 mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {cfg.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Consorcio Company Selection */}
        {form.type === 'CONSORCIO' && (
          <div className="p-4 mb-4 bg-purple-50/80 border border-purple-200 rounded-xl animate-in fade-in">
            <label className="block text-xs font-bold text-purple-900 mb-1.5">
              🏢 Empresa destino del soporte de consorcio *
            </label>
            <select
              value={form.consortiumCompany}
              onChange={(e) => setForm({ ...form, consortiumCompany: e.target.value })}
              className="w-full bg-white border-purple-300 focus:ring-purple-500 text-sm font-medium"
              required
            >
              <option value="">Seleccionar empresa destino...</option>
              {CONSORTIUM_COMPANIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Fecha *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full text-sm font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Responsable *</label>
            <select
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              className="w-full text-sm font-medium"
              required
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Estatus *</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full text-sm font-medium"
              disabled={!isEdit && form.date > getLocalToday()}
            >
              {Object.entries(activityStatusLabels).map(([k, v]) => {
                if (!isEdit && form.date > getLocalToday() && k !== 'PENDIENTE') return null;
                if (k === 'EN_PROGRESO' && form.type !== 'COTIZACION') return null;
                return <option key={k} value={k}>{v}</option>;
              })}
            </select>
          </div>
        </div>

        {/* Title / Description */}
        <div className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Título / Descripción de la Actividad *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ej: Mantenimiento correctivo a Robot Fanuc R-2000iB en Celda 04"
            className="w-full text-sm font-medium"
            required
          />
        </div>

        {/* ManPower Switch */}
        {(userRole === 'ADMIN' || userRole === 'SUPERVISOR' || userRole === 'SUPERVISOR_SAFETY_LP' || userRole === 'ADMINISTRACION') && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <label className="inline-flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={form.isManPower}
                onChange={(e) => setForm({ ...form, isManPower: e.target.checked })}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <div>
                <span className="text-sm font-bold text-slate-800">Designar como Actividad Man Power</span>
                <p className="text-xs text-slate-400">Soporte Técnico Especializado Tier One y Estatus de Campo</p>
              </div>
            </label>

            {form.isManPower && (
              <div className="mt-3 p-4 bg-amber-50/80 border border-amber-200 rounded-xl animate-in fade-in">
                <label className="block text-xs font-bold text-amber-900 mb-1.5">
                  # Identificador de Equipo <span className="text-amber-700 font-normal">(6 caracteres)</span>
                </label>
                <input
                  type="text"
                  list="equipos-list"
                  maxLength={6}
                  value={form.manPowerEquipo}
                  onChange={(e) => setForm({ ...form, manPowerEquipo: e.target.value.toUpperCase() })}
                  placeholder="Ej: ABC123"
                  className="w-44 font-mono uppercase text-sm font-bold bg-white"
                />
                <datalist id="equipos-list">
                  {equiposList.map((eq) => (
                    <option key={eq} value={eq} />
                  ))}
                </datalist>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 02: CLIENTE Y PROYECTO ── */}
      {form.type !== 'CAPACITACION' && form.type !== 'SOPORTE_INTERNO' && (
        <div className="card p-5 md:p-6 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-extrabold">
              02
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-800">Cliente y Proyecto</h2>
              <p className="text-xs text-slate-400">Información del cliente, orden Odoo y ubicación de planta</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Cliente</label>
              <SearchableSelect
                options={[
                  { id: '', name: 'Selecciona cliente...' },
                  ...clients.map((c) => ({ id: c.id, name: c.name }))
                ]}
                value={form.clientId}
                onChange={(val) => setForm({ ...form, clientId: val, contactId: '' })}
                placeholder="Buscar cliente..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Contacto</label>
              <SearchableSelect
                options={[
                  { id: '', name: 'Selecciona contacto...' },
                  ...contacts.map((c) => ({ id: c.id, name: c.name }))
                ]}
                value={form.contactId}
                onChange={(val) => setForm({ ...form, contactId: val })}
                placeholder="Buscar contacto..."
                disabled={!form.clientId}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Folio ODOO</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  maxLength={6}
                  value={form.workOrderFolio}
                  onChange={(e) => setForm({ ...form, workOrderFolio: e.target.value.toUpperCase().slice(0, 6) })}
                  onBlur={() => lookupOdoo()}
                  placeholder="Ej: S06309"
                  className="flex-1 font-mono uppercase text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={() => lookupOdoo()}
                  disabled={odooLoading || !form.workOrderFolio}
                  className="btn-secondary px-3 py-1.5 text-xs shrink-0 cursor-pointer"
                  title="Sincronizar con Odoo"
                >
                  <Search size={14} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">P.O. Cliente</label>
              <input
                type="text"
                value={form.purchaseOrder}
                onChange={(e) => setForm({ ...form, purchaseOrder: e.target.value })}
                placeholder="Ej: PO-4500982310"
                className="w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Proyecto / Área</label>
              <input
                type="text"
                value={form.projectArea}
                onChange={(e) => setForm({ ...form, projectArea: e.target.value })}
                placeholder="Ej: Carrocerías Línea 2 / Ensamble"
                className="w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Ubicación / Planta</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Ej: Planta Tecate / Nave C"
                className="w-full text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 03: HORARIO Y TIEMPOS ── */}
      <div className="card p-5 md:p-6 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-extrabold">
              03
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-800">Horario y Tiempos</h2>
              <p className="text-xs text-slate-400">Captura rápida de intervalo o ajuste manual en formato 24 horas</p>
            </div>
          </div>

          {/* Quick Preset Buttons with Active State Highlighting */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: '8:00 am - 10:00 am', start: '08:00', end: '10:00', dur: '120' },
              { label: '10:00 am - 12:00 pm', start: '10:00', end: '12:00', dur: '120' },
              { label: '1:00 pm - 3:00 pm', start: '13:00', end: '15:00', dur: '120' },
              { label: '3:00 pm - 5:00 pm', start: '15:00', end: '17:00', dur: '120' },
              { label: '☀️ Turno Regular', start: '08:00', end: '17:00', dur: '540', isRegular: true },
            ].map((p) => {
              const isActive = form.startTime === p.start && form.endTime === p.end;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyTimePreset(p.start, p.end, p.dur)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer touch-manipulation ${
                    isActive
                      ? p.isRegular
                        ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300/60'
                        : 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300/60'
                      : p.isRegular
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 border border-slate-200 hover:text-indigo-600'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Hora Inicio</label>
            <TimeInput24h
              value={form.startTime}
              onChange={(v) => handleTimeChange('startTime', v)}
              className="w-full text-sm font-mono font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Hora Fin</label>
            <TimeInput24h
              value={form.endTime}
              onChange={(v) => handleTimeChange('endTime', v)}
              className="w-full text-sm font-mono font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Duración (minutos)</label>
            <div className="relative">
              <input
                type="number"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                placeholder="Calculada automáticamente..."
                className="w-full text-sm font-mono font-semibold"
              />
              {form.durationMinutes && (
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">
                  {(parseInt(form.durationMinutes) / 60).toFixed(1)} hrs
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 04: REGISTRO Y ESTATUS DE CAMPO (MANPOWER) ── */}
      {form.isManPower && (
        <div className="card p-5 md:p-6 border-2 border-indigo-200/80 bg-indigo-50/20 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-indigo-100">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-extrabold">
              04
            </span>
            <div>
              <h2 className="text-base font-bold text-indigo-950">👷 Registro y Estatus de Campo (ManPower)</h2>
              <p className="text-xs text-indigo-600/80">Estatus del equipo intervenido y acciones recomendadas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Estatus del Equipo</label>
              <select
                value={form.equipmentStatus}
                onChange={(e) => setForm({ ...form, equipmentStatus: e.target.value })}
                className="w-full text-sm font-semibold bg-white"
              >
                <option value="">Seleccionar estatus...</option>
                <option value="OPERANDO_OK">🟢 Operando Correctamente (OK)</option>
                <option value="OPERANDO_OBSERVACION">🟡 Operando con Observación</option>
                <option value="FUERA_DE_SERVICIO">🔴 Fuera de Servicio / Crítico</option>
                <option value="MANTENIMIENTO_PENDIENTE">🟠 Mantenimiento Pendiente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Acción Sugerida</label>
              <select
                value={form.suggestedAction}
                onChange={(e) => setForm({ ...form, suggestedAction: e.target.value })}
                className="w-full text-sm font-semibold bg-white"
              >
                <option value="">Seleccionar acción...</option>
                <option value="MONITOREO">Monitoreo rutinario</option>
                <option value="COTIZAR_REFACCION">Cotizar Refacción / Componente</option>
                <option value="PROGRAMAR_INTERVENCION">Programar Intervención en Shutdown</option>
                <option value="REEMPLAZO_INMEDIATO">Reemplazo Inmediato</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Observaciones de Estatus Fin de Semana
              </label>
              <textarea
                value={form.weekendNotes}
                onChange={(e) => setForm({ ...form, weekendNotes: e.target.value })}
                placeholder="Detalle técnico relevante para el reporte ejecutivo..."
                rows={2}
                className="w-full text-sm bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 05: REGISTRO FOTOGRÁFICO (HASTA 20 FOTOS) ── */}
      <div className="card p-5 md:p-6 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-extrabold">
              05
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-800">📸 Evidencias Fotográficas de Campo</h2>
              <p className="text-xs text-slate-400">
                Sube hasta 20 fotos en bloque desde móvil o escritorio ({photosList.length}/20)
              </p>
            </div>
          </div>

          {photosList.length < 20 && (
            <label className={`inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all touch-manipulation ${
              uploadingPhotos ? 'opacity-50 pointer-events-none' : ''
            }`}>
              {uploadingPhotos ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              <span>{uploadingPhotos ? 'Comprimiendo...' : 'Subir Fotos en Bloque'}</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFilesSelected}
                className="hidden"
                disabled={uploadingPhotos || photosList.length >= 20}
              />
            </label>
          )}
        </div>

        {photosList.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50">
            <Camera className="mx-auto text-slate-300 mb-2" size={36} />
            <p className="text-sm font-bold text-slate-700">Sin fotos adjuntas</p>
            <p className="text-xs text-slate-400 mt-1">
              Pulsa en "Subir Fotos en Bloque" para adjuntar hasta 20 fotos de tu galería o cámara
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {photosList.map((photo, idx) => (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-950 aspect-square shadow-xs">
                <img
                  src={photo.url}
                  alt={`Evidencia ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={() => setPhotosList((prev) => prev.filter((p) => p.id !== photo.id))}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-colors z-10 touch-manipulation"
                  title="Eliminar foto"
                >
                  <X size={14} />
                </button>
                <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-white font-mono text-center">
                  #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 06: CIERRE, COMPROMISOS Y NOTAS ── */}
      <div className="card p-5 md:p-6 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-extrabold">
            06
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-800">Cierre, Compromisos y Notas</h2>
            <p className="text-xs text-slate-400">Resultados obtenidos, próximos compromisos y notas adicionales</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Resultado con Dictado por Voz */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Resultado Obtenido</label>
              <button
                type="button"
                onClick={() => toggleSpeechRecognition('result')}
                className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  isListeningResult 
                    ? 'bg-red-100 text-red-700 animate-pulse' 
                    : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600'
                }`}
                title="Dictar por voz"
              >
                {isListeningResult ? <MicOff size={13} /> : <Mic size={13} />}
                <span>{isListeningResult ? 'Escuchando...' : 'Dictar'}</span>
              </button>
            </div>
            <textarea
              value={form.result}
              onChange={(e) => setForm({ ...form, result: e.target.value })}
              placeholder="¿Qué se logró en la actividad?"
              rows={2}
              className="w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Siguiente Paso</label>
            <input
              type="text"
              value={form.nextStep}
              onChange={(e) => setForm({ ...form, nextStep: e.target.value })}
              placeholder="¿Qué acción procede?"
              className="w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Fecha Compromiso</label>
            <input
              type="date"
              value={form.commitmentDate}
              onChange={(e) => setForm({ ...form, commitmentDate: e.target.value })}
              className="w-full text-sm font-medium"
            />
          </div>

          {/* Observaciones con Dictado por Voz */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Observaciones Generales</label>
              <button
                type="button"
                onClick={() => toggleSpeechRecognition('notes')}
                className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  isListeningNotes 
                    ? 'bg-red-100 text-red-700 animate-pulse' 
                    : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600'
                }`}
                title="Dictar por voz"
              >
                {isListeningNotes ? <MicOff size={13} /> : <Mic size={13} />}
                <span>{isListeningNotes ? 'Escuchando...' : 'Dictar'}</span>
              </button>
            </div>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Comentarios adicionales o notas técnicas..."
              rows={2}
              className="w-full text-sm"
            />
          </div>
        </div>
      </div>

      {/* ── DESKTOP ACTION BUTTONS ── */}
      <div className="hidden sm:flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary px-5 py-2.5 text-sm font-bold flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Cancelar
        </button>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary px-8 py-2.5 text-sm font-bold flex items-center gap-2 shadow-md cursor-pointer"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Save size={16} /> {isEdit ? 'Guardar Cambios' : 'Crear Actividad'}
            </>
          )}
        </button>
      </div>

      {/* ── MOBILE STICKY FLOATING ACTION BAR ── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[11px] font-extrabold text-slate-800">
            {form.durationMinutes ? `${(parseInt(form.durationMinutes) / 60).toFixed(1)}h` : '0h'} · {photosList.length} foto(s)
          </span>
          <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
            {form.title || 'Nueva actividad'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={loading}
            className="btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 shadow-md touch-manipulation"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{isEdit ? 'Guardar' : 'Crear'}</span>
          </button>
        </div>
      </div>

    </form>
  );
}
