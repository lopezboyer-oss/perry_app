'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Search, Loader2, Upload, Camera, X } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TimeInput24h } from '@/components/ui/TimeInput24h';
import { activityTypeLabels, activityStatusLabels, calculateDuration, getLocalToday, CONSORTIUM_COMPANIES } from '@/lib/utils';

interface Props {
  users: { id: string; name: string }[];
  clients: { id: string; name: string; contacts: { id: string; name: string }[] }[];
  currentUserId: string;
  userRole: string;
  initialData?: any;
  prefillFolio?: string;
}

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

interface PhotoItem {
  id: string;
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

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

  // On mount, read active company from cookie if no companyId set, and fetch equipos
  useEffect(() => {
    if (!form.companyId) {
      const cookie = document.cookie.split('; ').find(c => c.startsWith('perry_active_company='));
      const val = cookie?.split('=')[1];
      if (val && val !== 'ALL') {
        setForm(f => ({ ...f, companyId: val }));
      }
    }
    
    // Fetch equipos for datalist
    fetch('/api/actividades/equipos')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEquiposList(data);
      })
      .catch(err => console.error('Error fetching equipos', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Odoo lookup
  const [odooLoading, setOdooLoading] = useState(false);
  const [odooMsg, setOdooMsg] = useState<{ type: 'ok' | 'warn' | 'err'; text: string } | null>(null);

  const lookupOdoo = async () => {
    const folio = form.workOrderFolio?.trim().toUpperCase();
    if (!folio || folio.length < 4) return;
    setOdooLoading(true);
    setOdooMsg(null);
    try {
      const res = await fetch(`/api/odoo/lookup?folio=${encodeURIComponent(folio)}`);
      const data = await res.json();
      if (data.found) {
        const updates: any = {};
        if (data.project && !form.title) updates.title = data.project;
        if (data.purchaseOrder) updates.purchaseOrder = data.purchaseOrder;

        // Use server-resolved client & contact IDs (auto-created if missing)
        if (data.clientId && !form.clientId) updates.clientId = data.clientId;
        if (data.contactId) updates.contactId = data.contactId;
        // Company from Odoo
        if (data.companyId) updates.companyId = data.companyId;

        if (Object.keys(updates).length) setForm((f) => ({ ...f, ...updates }));

        // If a new client/contact was created, refresh the page to get updated lists
        if (data.clientId || data.contactId) {
          // Soft-refresh: reload client list via router
          setTimeout(() => router.refresh(), 500);
        }

        const parts = [];
        if (data.companyName) parts.push(data.companyName);
        if (data.contactName) parts.push(data.contactName);
        if (data.stateLabel) parts.push(data.stateLabel);
        setOdooMsg({ type: 'ok', text: `✓ ${parts.join(' · ')}` });
      } else {
        setOdooMsg({ type: 'err', text: '✗ Folio no encontrado en Odoo' });
      }
    } catch {
      setOdooMsg({ type: 'err', text: 'Error al conectar con Odoo' });
    }
    setOdooLoading(false);
  };

  // Auto-lookup if prefillFolio is provided from URL
  useEffect(() => {
    if (prefillFolio && prefillFolio.length >= 4 && !isEdit) {
      setForm((f) => ({ ...f, workOrderFolio: prefillFolio }));
      setTimeout(() => {
        const doLookup = async () => {
          setOdooLoading(true);
          try {
            const res = await fetch(`/api/odoo/lookup?folio=${encodeURIComponent(prefillFolio)}`);
            const data = await res.json();
            if (data.found) {
              const updates: any = { workOrderFolio: prefillFolio };
              if (data.project) updates.title = data.project;
              if (data.purchaseOrder) updates.purchaseOrder = data.purchaseOrder;
              if (data.clientId) updates.clientId = data.clientId;
              if (data.contactId) updates.contactId = data.contactId;
              if (data.companyId) updates.companyId = data.companyId;
              setForm((f) => ({ ...f, ...updates }));
              if (data.clientId || data.contactId) {
                setTimeout(() => router.refresh(), 500);
              }
              const parts = [data.companyName, data.contactName, data.stateLabel].filter(Boolean);
              setOdooMsg({ type: 'ok', text: `✓ ${parts.join(' · ')}` });
            } else {
              setOdooMsg({ type: 'err', text: '✗ Folio no encontrado en Odoo' });
            }
          } catch { setOdooMsg({ type: 'err', text: 'Error al conectar con Odoo' }); }
          setOdooLoading(false);
        };
        doLookup();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-calculate duration and sync actual execution times
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

  // Get contacts for selected client
  const selectedClient = clients.find((c) => c.id === form.clientId);
  const contacts = selectedClient?.contacts || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date || !form.type) {
      setError('Los campos Título, Fecha y Tipo son requeridos');
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
        throw new Error(data.error || 'Error al guardar');
      }

      const saved = await res.json();

      // Show resource conflict warnings if any
      if (saved.resourceConflicts && saved.resourceConflicts.length > 0) {
        alert(`⚠️ TRASLAPE DE RECURSOS DETECTADO:\n\n${saved.resourceConflicts.join('\n')}\n\nLa actividad fue guardada. Revisa el Plan Finde para resolver los traslapes.`);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Información General</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => {
                const newDate = e.target.value;
                const newStatus = (!isEdit && newDate > getLocalToday()) ? 'PENDIENTE' : form.status;
                setForm({ ...form, date: newDate, status: newStatus });
              }}
              className="w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Responsable *</label>
            <select
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              className="w-full"
              disabled={userRole === 'INGENIERO'}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Actividad *</label>
            <select
              value={form.type}
              onChange={(e) => {
                const newType = e.target.value;
                const newStatus = (newType !== 'COTIZACION' && form.status === 'EN_PROGRESO') ? 'PENDIENTE' : form.status;
                setForm({ ...form, type: newType, status: newStatus });
              }}
              className="w-full"
              required
            >
              {Object.entries(activityTypeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          {form.type === 'CONSORCIO' && (
            <div className="animate-fade-in">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                🏢 Empresa destino del soporte *
              </label>
              <select
                value={form.consortiumCompany}
                onChange={(e) => setForm({ ...form, consortiumCompany: e.target.value })}
                className="w-full border-cyan-300 focus:ring-cyan-500 focus:border-cyan-500"
                required
              >
                <option value="">Seleccionar empresa...</option>
                {CONSORTIUM_COMPANIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estatus *</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full"
              disabled={!isEdit && form.date > getLocalToday()}
            >
              {Object.entries(activityStatusLabels).map(([k, v]) => {
                if (!isEdit && form.date > getLocalToday() && k !== 'PENDIENTE') return null;
                if (k === 'EN_PROGRESO' && form.type !== 'COTIZACION') return null;
                return <option key={k} value={k}>{v}</option>;
              })}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Título / Descripción breve *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Descripción breve de la actividad..."
              className="w-full"
              required
            />
          </div>
          {(userRole === 'ADMIN' || userRole === 'SUPERVISOR' || userRole === 'SUPERVISOR_SAFETY_LP' || userRole === 'ADMINISTRACION') && (
            <div className="md:col-span-2 mt-2 space-y-4">
              <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={form.isManPower}
                  onChange={(e) => setForm({ ...form, isManPower: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-5 h-5"
                />
                <span>Designar como Actividad Man Power (Soporte Técnico Especializado Tier One)</span>
              </label>
              
              {form.isManPower && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg animate-fade-in">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    # Equipo <span className="text-xs text-slate-500 font-normal">(6 caracteres)</span>
                  </label>
                  <input
                    type="text"
                    list="equipos-list"
                    maxLength={6}
                    value={form.manPowerEquipo}
                    onChange={(e) => setForm({ ...form, manPowerEquipo: e.target.value.toUpperCase() })}
                    placeholder="Ej: ABC123"
                    className="w-40 font-mono uppercase"
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
      </div>

      {form.type === 'CAPACITACION' || form.type === 'SOPORTE_INTERNO' ? (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            {form.type === 'CAPACITACION' ? 'Detalles de Capacitación' : 'Detalles de Soporte Interempresa'}
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación / Medio</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Ej: Sala de juntas, Teams, Zoom, Planta..."
                className="w-full"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Cliente y Proyecto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
              <SearchableSelect
                options={[
                  { id: '', name: 'Selecciona...' },
                  ...clients.map((c) => ({ id: c.id, name: c.name }))
                ]}
                value={form.clientId}
                onChange={(val) => setForm({ ...form, clientId: val, contactId: '' })}
                placeholder="Buscar cliente..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contacto</label>
              <SearchableSelect
                options={[
                  { id: '', name: 'Selecciona...' },
                  ...contacts.map((c) => ({ id: c.id, name: c.name }))
                ]}
                value={form.contactId}
                onChange={(val) => setForm({ ...form, contactId: val })}
                placeholder="Buscar contacto..."
                disabled={!form.clientId}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Folio ODOO</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  maxLength={6}
                  value={form.workOrderFolio}
                  onChange={(e) => setForm({ ...form, workOrderFolio: e.target.value.toUpperCase().slice(0, 6) })}
                  onBlur={lookupOdoo}
                  placeholder="Ej: S06309"
                  className={`flex-1 font-mono ${odooMsg?.type === 'ok' ? 'border-emerald-300 bg-emerald-50' : odooMsg?.type === 'err' ? 'border-red-300 bg-red-50' : ''}`}
                />
                <button
                  type="button"
                  disabled={!form.workOrderFolio || odooLoading}
                  onClick={lookupOdoo}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors disabled:opacity-30"
                  title="Buscar en Odoo"
                >
                  {odooLoading ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <Search size={16} className="text-indigo-500" />}
                </button>
              </div>
              {odooMsg && (
                <p className={`text-xs mt-1 ${odooMsg.type === 'ok' ? 'text-emerald-600' : odooMsg.type === 'warn' ? 'text-amber-600' : 'text-red-500'}`}>
                  {odooMsg.text}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">P.O. Cliente</label>
              <input
                type="text"
                maxLength={10}
                value={form.purchaseOrder}
                onChange={(e) => setForm({ ...form, purchaseOrder: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="Se autocompleta desde Odoo"
                className={`w-full font-mono ${form.purchaseOrder ? 'border-emerald-300 bg-emerald-50' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto / Área</label>
              <input
                type="text"
                value={form.projectArea}
                onChange={(e) => setForm({ ...form, projectArea: e.target.value })}
                placeholder="Ej: Nave 3, Producción"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Ej: Planta Monterrey"
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Horario y Duración</h2>
          <button
            type="button"
            onClick={() => {
              setForm({
                ...form,
                startTime: '08:00',
                endTime: '17:00',
                actualStartTime: '08:00',
                actualEndTime: '17:00',
                durationMinutes: '540'
              });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
            title="Llenar rápidamente horario regular de 08:00 a 17:00"
          >
            ☀️ Turno Regular (08:00 - 17:00)
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora Inicio</label>
            <TimeInput24h
              value={form.startTime}
              onChange={(v) => handleTimeChange('startTime', v)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora Fin</label>
            <TimeInput24h
              value={form.endTime}
              onChange={(v) => handleTimeChange('endTime', v)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Duración (min)</label>
            <input
              type="number"
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              placeholder="Auto-calculado"
              className="w-full"
            />
          </div>
        </div>
      </div>

      {form.isManPower && (
        <div className="card p-6 border border-indigo-200 animate-fade-in">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            👷 Registro y Estatus de Campo (ManPower)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estatus del Equipo Atendido</label>
              <select
                value={form.equipmentStatus}
                onChange={(e) => setForm({ ...form, equipmentStatus: e.target.value })}
                className="w-full"
              >
                <option value="">Seleccionar estatus...</option>
                <option value="OPERATIVO">🟢 OPERATIVO</option>
                <option value="FUERA_DE_SERVICIO">🔴 FUERA DE SERVICIO</option>
                <option value="DEGRADADO">🟡 DEGRADADO</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Acción Sugerida al Cliente</label>
              <input
                type="text"
                value={form.suggestedAction}
                onChange={(e) => setForm({ ...form, suggestedAction: e.target.value })}
                placeholder="Ej. Realizar mantenimiento preventivo en 30 días"
                className="w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Bitácora / Observaciones de Campo</label>
              <textarea
                value={form.weekendNotes}
                onChange={(e) => setForm({ ...form, weekendNotes: e.target.value })}
                placeholder="Notas detalladas capturadas en campo..."
                rows={3}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Resultado y Seguimiento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Resultado</label>
            <textarea
              value={form.result}
              onChange={(e) => setForm({ ...form, result: e.target.value })}
              placeholder="¿Qué se logró?"
              rows={2}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Siguiente Paso</label>
            <input
              type="text"
              value={form.nextStep}
              onChange={(e) => setForm({ ...form, nextStep: e.target.value })}
              placeholder="¿Qué sigue?"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Compromiso</label>
            <input
              type="date"
              value={form.commitmentDate}
              onChange={(e) => setForm({ ...form, commitmentDate: e.target.value })}
              className="w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas adicionales..."
              rows={2}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Registro Fotográfico y Evidencias (Hasta 20 fotos) */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              📸 Registro Fotográfico y Evidencias de Campo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Puedes subir hasta 20 fotos en bloque desde móvil o escritorio ({photosList.length}/20)
            </p>
          </div>
          {photosList.length < 20 && (
            <label className={`inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all touch-manipulation ${uploadingPhotos ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploadingPhotos ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              <span>{uploadingPhotos ? 'Procesando fotos...' : 'Subir Fotos en Bloque'}</span>
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
            <p className="text-sm font-semibold text-slate-700">Sin fotos adjuntas</p>
            <p className="text-xs text-slate-400 mt-1">
              Haz clic o pulsa en "Subir Fotos en Bloque" para seleccionar hasta 20 imágenes de tu galería o cámara
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {photosList.map((photo, idx) => (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-square shadow-xs">
                <img
                  src={photo.url}
                  alt={`Evidencia ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <button
                  type="button"
                  onClick={() => setPhotosList((prev) => prev.filter((p) => p.id !== photo.id))}
                  className="absolute top-1.5 right-1.5 p-2 bg-red-600/90 hover:bg-red-700 text-white rounded-full shadow-md transition-colors z-10 touch-manipulation"
                  title="Eliminar foto"
                >
                  <X size={14} />
                </button>
                <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/70 to-transparent text-[10px] text-white/90 font-mono text-center">
                  #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          <ArrowLeft size={16} /> Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex-1 sm:flex-initial"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save size={16} /> {isEdit ? 'Guardar Cambios' : 'Crear Actividad'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
