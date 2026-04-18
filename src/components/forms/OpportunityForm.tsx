'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import { opportunityStatusLabels, getLocalToday } from '@/lib/utils';

interface Props {
  users: { id: string; name: string }[];
  clients: { id: string; name: string; contacts: { id: string; name: string }[] }[];
  currentUserId: string;
  nextFolio: string;
  initialData?: any;
}

export function OpportunityForm({ users, clients, currentUserId, nextFolio, initialData }: Props) {
  const router = useRouter();
  const isEdit = !!initialData;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    folio: initialData?.folio || nextFolio,
    clientId: initialData?.clientId || '',
    contactId: initialData?.contactId || '',
    userId: initialData?.userId || currentUserId,
    title: initialData?.title || '',
    description: initialData?.description || '',
    requestDate: initialData?.requestDate || getLocalToday(),
    scheduledVisitDate: initialData?.scheduledVisitDate || '',
    actualVisitDate: initialData?.actualVisitDate || '',
    infoCompleteDate: initialData?.infoCompleteDate || '',
    quotationDueDate: initialData?.quotationDueDate || '',
    quotationSentDate: initialData?.quotationSentDate || '',
    status: initialData?.status || 'PROGRAMADA',
    delayReason: initialData?.delayReason || '',
    notes: initialData?.notes || '',
  });

  const selectedClient = clients.find((c) => c.id === form.clientId);
  const contacts = selectedClient?.contacts || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.clientId || !form.userId) {
      setError('Título, Cliente y Responsable son requeridos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const body = {
        ...form,
        contactId: form.contactId || null,
        description: form.description || null,
        requestDate: form.requestDate || null,
        scheduledVisitDate: form.scheduledVisitDate || null,
        actualVisitDate: form.actualVisitDate || null,
        infoCompleteDate: form.infoCompleteDate || null,
        quotationDueDate: form.quotationDueDate || null,
        quotationSentDate: form.quotationSentDate || null,
        delayReason: form.delayReason || null,
        notes: form.notes || null,
      };

      const url = isEdit ? `/api/oportunidades/${initialData.id}` : '/api/oportunidades';
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
      router.push(`/oportunidades/${saved.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Información de la Oportunidad</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Folio ODOO *</label>
            <input type="text" value={form.folio} onChange={(e) => setForm({ ...form, folio: e.target.value })} required className="w-full font-mono" placeholder="Ej: S012345" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estatus</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full">
              {Object.entries(opportunityStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full" required placeholder="Descripción de la oportunidad" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, contactId: '' })} className="w-full" required>
              <option value="">Seleccionar...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contacto</label>
            <select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })} className="w-full" disabled={!form.clientId}>
              <option value="">Sin contacto</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Responsable *</label>
            <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="w-full">
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full" placeholder="Detalles de la oportunidad..." />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Cronología</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Solicitud</label>
            <input type="date" value={form.requestDate} onChange={(e) => setForm({ ...form, requestDate: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Visita Programada</label>
            <input type="date" value={form.scheduledVisitDate} onChange={(e) => setForm({ ...form, scheduledVisitDate: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Visita Realizada</label>
            <input type="date" value={form.actualVisitDate} onChange={(e) => setForm({ ...form, actualVisitDate: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Información Completa</label>
            <input type="date" value={form.infoCompleteDate} onChange={(e) => setForm({ ...form, infoCompleteDate: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Compromiso Cotización</label>
            <input type="date" value={form.quotationDueDate} onChange={(e) => setForm({ ...form, quotationDueDate: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cotización Enviada</label>
            <input type="date" value={form.quotationSentDate} onChange={(e) => setForm({ ...form, quotationSentDate: e.target.value })} className="w-full" />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Notas y Seguimiento</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo de Espera / Atraso</label>
            <input type="text" value={form.delayReason} onChange={(e) => setForm({ ...form, delayReason: e.target.value })} className="w-full" placeholder="¿Por qué está detenida?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full" placeholder="Notas adicionales..." />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">{error}</div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          <ArrowLeft size={16} /> Cancelar
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 sm:flex-initial">
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Save size={16} /> {isEdit ? 'Guardar Cambios' : 'Crear Oportunidad'}</>
          )}
        </button>
      </div>
    </form>
  );
}
