'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, Clock, MapPin, Calendar, User, Building, Copy } from 'lucide-react';
import {
  activityTypeLabels, activityStatusLabels, activityTypeColors,
  activityStatusColors, formatDate, formatDuration,
} from '@/lib/utils';
import { useState } from 'react';
import { ManPowerDetailSection } from './ManPowerDetailSection';

interface Props {
  activity: any;
  userRole: string;
  currentUserId: string;
}

export function ActivityDetail({ activity, userRole, currentUserId }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const canEdit = userRole === 'ADMIN' || userRole === 'SUPERVISOR' || activity.userId === currentUserId;

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de eliminar esta actividad?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/actividades/${activity.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/actividades');
        router.refresh();
      }
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <button
            onClick={() => router.push('/actividades')}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={14} /> Volver
          </button>
          <h1 className="text-2xl font-bold text-slate-800">
            {activity.continuedFromId && activity.type === 'EJECUCION' && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 px-2 py-1 rounded-full mr-2 align-middle">🔄 CONTINUACIÓN</span>}
            {activity.title}
          </h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`badge ${activityTypeColors[activity.type] || ''}`}>
              {activityTypeLabels[activity.type]}
            </span>
            <span className={`badge ${activityStatusColors[activity.status] || ''}`}>
              {activityStatusLabels[activity.status]}
            </span>
            {activity.type === 'CONSORCIO' && activity.consortiumCompany && (
              <span className="badge bg-cyan-100 text-cyan-800 border-cyan-200">
                🏢 Soporte a: {activity.consortiumCompany}
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link
              href={`/actividades/nueva?continuar=${activity.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Copy size={14} /> Continuar
            </Link>
            <Link
              href={`/actividades/${activity.id}?editar=true`}
              className="btn-secondary text-sm"
            >
              <Edit size={14} /> Editar
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger text-sm"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        )}
      </div>

      {/* Detail cards */}
      <div className="grid gap-4">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Información General</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailItem icon={Calendar} label="Fecha" value={formatDate(activity.date)} />
            <DetailItem icon={User} label="Responsable" value={activity.user?.name || '—'} />
            {activity.type !== 'CAPACITACION' && activity.type !== 'SOPORTE_INTERNO' && (
              <>
                <DetailItem icon={Building} label="Cliente" value={activity.client?.name || '—'} />
                <DetailItem icon={User} label="Contacto" value={activity.contact?.name || '—'} />
                <DetailItem label="Folio ODOO" value={
                  activity.workOrderFolio ? (
                    <Link href={`/oportunidades/${activity.workOrderFolio}`} className="font-mono text-indigo-600 hover:text-indigo-700">
                      {activity.workOrderFolio}
                    </Link>
                  ) : '—'
                } />
                <DetailItem label="P.O. Cliente" value={
                  activity.purchaseOrder ? (
                    <span className="font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">{activity.purchaseOrder}</span>
                  ) : activity.workOrderFolio ? (
                    <span className="text-amber-600 font-bold text-xs">Sin P.O.</span>
                  ) : '—'
                } />
                <DetailItem label="Proyecto / Área" value={activity.projectArea || '—'} />
              </>
            )}
            <DetailItem icon={MapPin} label="Ubicación" value={activity.location || '—'} />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Horario</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DetailItem icon={Clock} label="Inicio" value={activity.startTime || '—'} />
            <DetailItem icon={Clock} label="Fin" value={activity.endTime || '—'} />
            <DetailItem icon={Clock} label="Duración" value={formatDuration(activity.durationMinutes)} />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Resultado y Seguimiento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <DetailItem label="Resultado" value={activity.result || '—'} />
            </div>
            <DetailItem label="Siguiente Paso" value={activity.nextStep || '—'} />
            <DetailItem label="Fecha Compromiso" value={activity.commitmentDate ? formatDate(activity.commitmentDate) : '—'} />
            <div className="sm:col-span-2">
              <DetailItem label="Observaciones" value={activity.notes || '—'} />
            </div>
          </div>
        </div>

        {activity.isManPower && (
          <ManPowerDetailSection 
            activityId={activity.id} 
            equipo={activity.manPowerEquipo} 
            folioOdoo={activity.workOrderFolio}
            initialPhotos={activity.manPowerPhotos}
            userName={activity.user?.name || 'Usuario'}
          />
        )}

        {activity.dailyReport && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Reporte Origen</h2>
            <p className="text-sm text-slate-500">
              Importado el {formatDate(activity.dailyReport.reportDate)} — Fuente: {activity.dailyReport.source}
            </p>
          </div>
        )}

        <div className="card p-4 text-xs text-slate-400">
          Creada: {formatDate(activity.createdAt)} · Actualizada: {formatDate(activity.updatedAt)}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon?: any;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />}
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-slate-800 font-medium">{value || '-'}</p>
      </div>
    </div>
  );
}
