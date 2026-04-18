'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { activityTypeLabels, activityStatusLabels, calculateDuration, getLocalToday } from '@/lib/utils';

interface Props {
  users: { id: string; name: string }[];
  clients: { id: string; name: string; contacts: { id: string; name: string }[] }[];
  opportunities: { id: string; folio: string; title: string }[];
  currentUserId: string;
  userRole: string;
  initialData?: any;
}

export function ActivityForm({ users, clients, opportunities, currentUserId, userRole, initialData }: Props) {
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
    opportunityId: initialData?.opportunityId || '',
    workOrderFolio: initialData?.workOrderFolio || '',
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
        opportunityId: form.opportunityId || null,
        workOrderFolio: form.workOrderFolio || null,
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Oportunidad (OPP)</label>
            <select
              value={form.opportunityId}
              onChange={(e) => setForm({ ...form, opportunityId: e.target.value })}
              className="w-full"
            >
              <option value="">Sin oportunidad</option>
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>{o.folio} - {o.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Folio ODOO</label>
            <input
              type="text"
              value={form.workOrderFolio}
              onChange={(e) => setForm({ ...form, workOrderFolio: e.target.value })}
              placeholder="Ej: S012345"
              className="w-full"
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
