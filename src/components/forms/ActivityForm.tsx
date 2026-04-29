'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Search, Loader2 } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { activityTypeLabels, activityStatusLabels, calculateDuration, getLocalToday } from '@/lib/utils';

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
  const isEdit = !!initialData;
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
  });

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

        // Auto-match client by company name
        if (data.companyName && !form.clientId) {
          const odooCompany = data.companyName.toUpperCase();
          const matched = clients.find((c) =>
            odooCompany.includes(c.name.toUpperCase()) || c.name.toUpperCase().includes(odooCompany)
          );
          if (matched) {
            updates.clientId = matched.id;
            // Auto-match contact within that client
            if (data.contactName) {
              const odooContact = data.contactName.toUpperCase();
              const matchedContact = matched.contacts.find((ct) =>
                odooContact.includes(ct.name.toUpperCase()) || ct.name.toUpperCase().includes(odooContact)
              );
              if (matchedContact) updates.contactId = matchedContact.id;
            }
          }
        }

        if (Object.keys(updates).length) setForm((f) => ({ ...f, ...updates }));
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
      // Delay to let state settle, then trigger lookup
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
              if (data.companyName) {
                const odooCompany = data.companyName.toUpperCase();
                const matched = clients.find((c) => odooCompany.includes(c.name.toUpperCase()) || c.name.toUpperCase().includes(odooCompany));
                if (matched) {
                  updates.clientId = matched.id;
                  if (data.contactName) {
                    const ct = matched.contacts.find((ct) => data.contactName.toUpperCase().includes(ct.name.toUpperCase()) || ct.name.toUpperCase().includes(data.contactName.toUpperCase()));
                    if (ct) updates.contactId = ct.id;
                  }
                }
              }
              setForm((f) => ({ ...f, ...updates }));
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

  // Auto-calculate duration
  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    const newForm = { ...form, [field]: value };
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
      const body = {
        ...form,
        clientId: form.clientId || null,
        contactId: form.contactId || null,
        workOrderFolio: form.workOrderFolio || null,
        purchaseOrder: form.purchaseOrder || null,
        projectArea: form.projectArea || null,
        result: form.result || null,
        nextStep: form.nextStep || null,
        commitmentDate: form.commitmentDate || null,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes) : null,
        location: form.location || null,
        notes: form.notes || null,
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
              onChange={(e) => setForm({ ...form, date: e.target.value })}
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
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full"
              required
            >
              {Object.entries(activityTypeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estatus *</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full"
            >
              {Object.entries(activityStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
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
        </div>
      </div>

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

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Horario y Duración</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora Inicio</label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => handleTimeChange('startTime', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hora Fin</label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => handleTimeChange('endTime', e.target.value)}
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
