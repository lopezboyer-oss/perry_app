'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Clock, Calendar, User, Building, Target, FileText, AlertTriangle } from 'lucide-react';
import {
  opportunityStatusLabels, opportunityStatusColors, activityTypeLabels,
  activityTypeColors, activityStatusLabels, formatDate, daysBetween,
} from '@/lib/utils';
import { useState } from 'react';

interface Props {
  opportunity: any;
  userRole: string;
  currentUserId: string;
}

export function OpportunityDetail({ opportunity, userRole, currentUserId }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const opp = opportunity;

  const canEdit = userRole === 'ADMIN' || userRole === 'SUPERVISOR' || opp.userId === currentUserId;

  const leadTime = opp.actualVisitDate && opp.quotationSentDate
    ? daysBetween(opp.actualVisitDate, opp.quotationSentDate)
    : null;

  const visitDelay = opp.scheduledVisitDate && opp.actualVisitDate
    ? daysBetween(opp.scheduledVisitDate, opp.actualVisitDate)
    : null;

  const isOverdue = opp.quotationDueDate && !opp.quotationSentDate &&
    !['COTIZACION_ENVIADA', 'GANADA', 'PERDIDA'].includes(opp.status) &&
    new Date(opp.quotationDueDate) < new Date();

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar esta oportunidad?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/oportunidades/${opp.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/oportunidades');
        router.refresh();
      }
    } catch {
      setDeleting(false);
    }
  };

  // Timeline items
  const timeline = [
    { label: 'Solicitud', date: opp.requestDate, done: !!opp.requestDate },
    { label: 'Visita Programada', date: opp.scheduledVisitDate, done: !!opp.scheduledVisitDate },
    { label: 'Visita Realizada', date: opp.actualVisitDate, done: !!opp.actualVisitDate },
    { label: 'Info Completa', date: opp.infoCompleteDate, done: !!opp.infoCompleteDate },
    { label: 'Compromiso Cotización', date: opp.quotationDueDate, done: !!opp.quotationDueDate },
    { label: 'Cotización Enviada', date: opp.quotationSentDate, done: !!opp.quotationSentDate },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Volver
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{opp.folio}</span>
            <span className={`badge ${opportunityStatusColors[opp.status] || ''}`}>
              {opportunityStatusLabels[opp.status]}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{opp.title}</h1>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link href={`/oportunidades/${opp.id}?editar=true`} className="btn-secondary text-sm">
              <Edit size={14} /> Editar
            </Link>
            <button onClick={handleDelete} disabled={deleting} className="btn-danger text-sm">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {/* Overdue alert */}
        {isOverdue && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Oportunidad Atrasada</p>
              <p className="text-sm text-red-600">
                La fecha compromiso de cotización ({formatDate(opp.quotationDueDate)}) ha sido superada.
                {opp.delayReason && <> Motivo: {opp.delayReason}</>}
              </p>
            </div>
          </div>
        )}

        {/* Key metrics */}
        {(leadTime !== null || visitDelay !== null) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {leadTime !== null && (
              <div className="card p-4 border-l-4 border-l-indigo-500">
                <p className="text-xs text-slate-500">Lead Time (visita → cotización)</p>
                <p className="text-2xl font-bold text-slate-800">{leadTime} <span className="text-base font-normal text-slate-400">días</span></p>
              </div>
            )}
            {visitDelay !== null && (
              <div className="card p-4 border-l-4 border-l-amber-500">
                <p className="text-xs text-slate-500">Tiempo programada → realizada</p>
                <p className="text-2xl font-bold text-slate-800">{visitDelay} <span className="text-base font-normal text-slate-400">días</span></p>
              </div>
            )}
          </div>
        )}

        {/* General info */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Información General</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Building className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Cliente</p>
                <p className="text-sm font-medium">{opp.client?.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Contacto</p>
                <p className="text-sm font-medium">{opp.contact?.name || '-'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Responsable</p>
                <p className="text-sm font-medium">{opp.user?.name}</p>
              </div>
            </div>
            {opp.description && (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Descripción</p>
                <p className="text-sm">{opp.description}</p>
              </div>
            )}
            {opp.delayReason && (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Motivo de Atraso</p>
                <p className="text-sm text-amber-700">{opp.delayReason}</p>
              </div>
            )}
            {opp.notes && (
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Notas</p>
                <p className="text-sm">{opp.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Cronología</h2>
          <div className="space-y-3">
            {timeline.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${item.done ? 'bg-green-500' : 'bg-slate-200'}`} />
                <div className="flex-1 flex items-center justify-between">
                  <span className={`text-sm ${item.done ? 'text-slate-800' : 'text-slate-400'}`}>{item.label}</span>
                  <span className="text-sm text-slate-500">{item.done ? formatDate(item.date) : 'Pendiente'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Related activities */}
        <div className="card overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Actividades Vinculadas ({opp.activities.length})</h2>
          </div>
          {opp.activities.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No hay actividades vinculadas a esta oportunidad
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Título</th>
                    <th>Tipo</th>
                    <th>Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {opp.activities.map((act: any) => (
                    <tr key={act.id} className="cursor-pointer" onClick={() => router.push(`/actividades/${act.id}`)}>
                      <td className="text-sm whitespace-nowrap">{formatDate(act.date)}</td>
                      <td className="text-sm font-medium text-indigo-600">{act.title}</td>
                      <td><span className={`badge ${activityTypeColors[act.type] || ''}`}>{activityTypeLabels[act.type]}</span></td>
                      <td><span className="badge bg-slate-100 text-slate-600">{activityStatusLabels[act.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-4 text-xs text-slate-400">
          Creada: {formatDate(opp.createdAt)} · Actualizada: {formatDate(opp.updatedAt)}
        </div>
      </div>
    </div>
  );
}
