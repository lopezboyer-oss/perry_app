'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Edit, Trash2, Clock, MapPin, Calendar, User, Building, Copy, 
  CheckCircle2, AlertTriangle, ShieldCheck, Camera, FileText, X, Check, Eye
} from 'lucide-react';
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
  userAccessCrearPlanes?: boolean;
}

interface PhotoItem {
  id: string;
  url: string;
  uploadedBy?: string;
  uploadedAt: string;
}

interface PendingItem {
  id: string;
  title: string;
  status: 'ABIERTO' | 'CERRADO' | 'CANCELADO';
  photos?: PhotoItem[];
  createdBy: string;
  createdAt: string;
  closedAt: string | null;
  closedBy: string | null;
}

export function ActivityDetail({ activity, userRole, currentUserId, userAccessCrearPlanes }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>(() => {
    try {
      return activity.pendingItems ? JSON.parse(activity.pendingItems) : [];
    } catch {
      return [];
    }
  });

  const [photosBefore, setPhotosBefore] = useState<PhotoItem[]>(() => {
    try {
      return activity.photosBefore ? JSON.parse(activity.photosBefore) : [];
    } catch {
      return [];
    }
  });

  const [photosAfter, setPhotosAfter] = useState<PhotoItem[]>(() => {
    try {
      return activity.photosAfter ? JSON.parse(activity.photosAfter) : [];
    } catch {
      return [];
    }
  });

  const canEdit = userRole === 'ADMIN' || userRole === 'ADMINISTRACION' || userRole === 'SUPERVISOR' || userRole === 'SUPERVISOR_SAFETY_LP' || !!userAccessCrearPlanes || activity.userId === currentUserId;

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

  const handleTogglePendingStatus = async (pendingId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'CERRADO' ? 'ABIERTO' : 'CERRADO';
    const updated = pendingItems.map((item) => {
      if (item.id === pendingId) {
        return {
          ...item,
          status: newStatus as any,
          closedAt: newStatus === 'CERRADO' ? new Date().toISOString() : null,
          closedBy: newStatus === 'CERRADO' ? 'Usuario Dashboard' : null,
        };
      }
      return item;
    });

    setPendingItems(updated);

    try {
      await fetch(`/api/actividades/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingItems: JSON.stringify(updated) }),
      });
    } catch (err) {
      console.error('Error al actualizar estatus de pendiente:', err);
    }
  };

  const handleDeletePhoto = async (type: 'BEFORE' | 'AFTER', photoId: string) => {
    if (!confirm('¿Eliminar esta foto de evidencia?')) return;
    if (type === 'BEFORE') {
      const filtered = photosBefore.filter((p) => p.id !== photoId);
      setPhotosBefore(filtered);
      await fetch(`/api/actividades/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photosBefore: JSON.stringify(filtered) }),
      });
    } else {
      const filtered = photosAfter.filter((p) => p.id !== photoId);
      setPhotosAfter(filtered);
      await fetch(`/api/actividades/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photosAfter: JSON.stringify(filtered) }),
      });
    }
  };

  // User Directive: Prevalece el tiempo de campo o post-edición
  const effectiveStartTime = activity.actualStartTime || activity.startTime || '—';
  const effectiveEndTime = activity.actualEndTime || activity.endTime || '—';
  const isFieldRecordedTime = Boolean(activity.actualStartTime || activity.actualEndTime);

  return (
    <div className="max-w-4xl mx-auto pb-20 md:pb-0 animate-fade-in space-y-6">
      {/* Lightbox Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <X size={18} />
            </button>
            <img src={previewPhoto} alt="Evidencia en tamaño completo" className="max-w-full max-h-[85vh] object-contain mx-auto" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <button
            onClick={() => router.push('/actividades')}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2 font-medium"
          >
            <ArrowLeft size={14} /> Volver a Actividades
          </button>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">
            {activity.continuedFromId && activity.type === 'EJECUCION' && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 px-2 py-1 rounded-full mr-2 align-middle">
                🔄 CONTINUACIÓN
              </span>
            )}
            {activity.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`badge ${activityTypeColors[activity.type] || ''}`}>
              {activityTypeLabels[activity.type]}
            </span>
            <span className={`badge ${activityStatusColors[activity.status] || ''}`}>
              {activityStatusLabels[activity.status]}
            </span>
            {activity.manPowerEquipo && (
              <span className="badge bg-indigo-100 text-indigo-800 border-indigo-200 font-mono font-bold">
                #{activity.manPowerEquipo}
              </span>
            )}
            {activity.equipmentStatus === 'OPERATIVO' && (
              <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 font-bold flex items-center gap-1">
                🟢 Equipo Operativo
              </span>
            )}
            {activity.equipmentStatus === 'FUERA_DE_SERVICIO' && (
              <span className="badge bg-rose-100 text-rose-800 border-rose-300 font-bold flex items-center gap-1">
                🔴 Equipo Fuera de Servicio
              </span>
            )}
            {activity.equipmentStatus === 'DEGRADADO' && (
              <span className="badge bg-amber-100 text-amber-800 border-amber-300 font-bold flex items-center gap-1">
                🟡 Equipo Degradado
              </span>
            )}
            {activity.clientAcknowledged && (
              <span className="badge bg-emerald-50 text-emerald-700 border-emerald-300 font-bold flex items-center gap-1">
                <ShieldCheck size={13} /> Confirmado por Cliente
              </span>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/actividades/nueva?continuar=${activity.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <Copy size={14} /> Continuar
            </Link>
            <Link
              href={`/actividades/${activity.id}?editar=true`}
              className="btn-secondary text-sm font-bold"
            >
              <Edit size={14} /> Editar
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger text-sm font-bold"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        )}
      </div>

      {/* Banner de Confirmación de Cliente si existe */}
      {activity.clientAcknowledged && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-900 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="font-extrabold text-sm">Cliente Enterado y Conforme con el Servicio</div>
            <div className="text-xs text-emerald-700">
              Confirmado por: <strong>{activity.clientAcknowledgedBy || 'Representante de Cliente'}</strong>
              {activity.clientAcknowledgedAt && ` · ${new Date(activity.clientAcknowledgedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}`}
            </div>
          </div>
        </div>
      )}

      {/* Grid General */}
      <div className="grid gap-4">
        {/* Informacion General */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Información General</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailItem icon={Calendar} label="Fecha" value={formatDate(activity.date)} />
            <DetailItem icon={User} label="Responsable" value={activity.user?.name || '—'} />
            {activity.type !== 'CAPACITACION' && activity.type !== 'SOPORTE_INTERNO' && (
              <>
                <DetailItem icon={Building} label="Cliente" value={activity.client?.name || '—'} />
                <DetailItem icon={User} label="Contacto" value={activity.contact?.name || '—'} />
                <DetailItem label="Folio ODOO" value={
                  activity.workOrderFolio ? (
                    <Link href={`/trabajos-abiertos?search=${activity.workOrderFolio}`} className="font-mono font-bold text-indigo-600 hover:text-indigo-700">
                      #{activity.workOrderFolio}
                    </Link>
                  ) : '—'
                } />
                <DetailItem label="P.O. Cliente" value={
                  activity.purchaseOrder ? (
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">{activity.purchaseOrder}</span>
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

        {/* Horario Definitivo de Ejecución */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock size={18} className="text-indigo-600" /> Horario de Ejecución
            </h2>
            {isFieldRecordedTime && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
                ⏱️ Prevalece Captura de Campo / Post-edición
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DetailItem icon={Clock} label="Hora Inicio" value={<span className="font-mono font-bold text-slate-900">{effectiveStartTime}</span>} />
            <DetailItem icon={Clock} label="Hora Fin" value={<span className="font-mono font-bold text-slate-900">{effectiveEndTime}</span>} />
            <DetailItem icon={Clock} label="Duración Invertida" value={formatDuration(activity.durationMinutes)} />
          </div>
        </div>

        {/* 👷 SECCIÓN DE EVIDENCIA Y REGISTRO DE CAMPO (MANPOWER) */}
        <div className="card p-6 border-2 border-indigo-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                👷
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Evidencia y Registro de Campo</h2>
                <p className="text-xs text-slate-500">Información capturada por técnicos a través del enlace de servicio</p>
              </div>
            </div>
            {activity.manPowerEquipo && (
              <span className="font-mono text-xs font-black px-3 py-1 bg-indigo-600 text-white rounded-xl shadow-2xs">
                #{activity.manPowerEquipo}
              </span>
            )}
          </div>

          {/* Estatus del Equipo & Acción Sugerida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Estatus del Equipo Atendido</span>
              <div className="pt-0.5">
                {activity.equipmentStatus === 'OPERATIVO' && (
                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                    🟢 OPERATIVO
                  </span>
                )}
                {activity.equipmentStatus === 'FUERA_DE_SERVICIO' && (
                  <span className="text-xs font-extrabold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                    🔴 FUERA DE SERVICIO
                  </span>
                )}
                {activity.equipmentStatus === 'DEGRADADO' && (
                  <span className="text-xs font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                    🟡 DEGRADADO
                  </span>
                )}
                {!activity.equipmentStatus && (
                  <span className="text-xs text-slate-400 italic">No especificado en campo</span>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Acción Sugerida al Cliente</span>
              <p className="text-xs font-medium text-slate-800 pt-0.5">
                {activity.suggestedAction || '—'}
              </p>
            </div>
          </div>

          {/* Bitácora de Campo */}
          {activity.weekendNotes && (
            <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 space-y-1.5">
              <div className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={15} className="text-indigo-600" /> Bitácora / Observaciones de Campo
              </div>
              <p className="text-xs text-slate-700 font-medium whitespace-pre-line leading-relaxed">
                {activity.weekendNotes}
              </p>
            </div>
          )}

          {/* Fotos ANTES y DESPUÉS */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Camera size={16} className="text-indigo-600" /> Fotos de Evidencia
            </h3>

            {/* Fotos ANTES */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>📸 Fotos ANTES (Estado Inicial) — {photosBefore.length} foto(s)</span>
              </div>
              {photosBefore.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center text-xs text-slate-400">
                  Sin fotos del estado inicial capturadas
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {photosBefore.map((p) => (
                    <div key={p.id} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-200 bg-slate-100 shadow-2xs">
                      <img
                        src={p.url}
                        alt="Foto Antes"
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setPreviewPhoto(p.url)}
                      />
                      <button
                        onClick={() => handleDeletePhoto('BEFORE', p.id)}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 shadow-xs"
                        title="Eliminar foto"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fotos DESPUÉS */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>✨ Fotos DESPUÉS (Trabajo Terminado) — {photosAfter.length} foto(s)</span>
              </div>
              {photosAfter.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center text-xs text-slate-400">
                  Sin fotos del trabajo terminado capturadas
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {photosAfter.map((p) => (
                    <div key={p.id} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-200 bg-slate-100 shadow-2xs">
                      <img
                        src={p.url}
                        alt="Foto Después"
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setPreviewPhoto(p.url)}
                      />
                      <button
                        onClick={() => handleDeletePhoto('AFTER', p.id)}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 shadow-xs"
                        title="Eliminar foto"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pendientes y Recomendaciones */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={16} className="text-amber-500" /> Pendientes y Recomendaciones de Campo
            </h3>

            {pendingItems.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center text-xs text-slate-400">
                Sin pendientes registrados en campo
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingItems.map((item) => {
                  const isClosed = item.status === 'CERRADO';
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isClosed ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/60 border-amber-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTogglePendingStatus(item.id, item.status)}
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                                isClosed ? 'bg-emerald-600 text-white' : 'bg-amber-200 text-amber-800 hover:bg-amber-300'
                              }`}
                              title={isClosed ? 'Marcar como abierto' : 'Marcar como resuelto'}
                            >
                              {isClosed ? <Check size={14} /> : ''}
                            </button>
                            <h4 className={`text-xs font-extrabold ${isClosed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {item.title}
                            </h4>
                          </div>

                          <div className="text-[10px] text-slate-500 pl-7">
                            <span>Registrado por: <strong>{item.createdBy || 'Técnico de Campo'}</strong></span>
                            {item.closedAt && <span className="ml-2 text-emerald-700 font-bold">• Resuelto el {formatDate(item.closedAt)}</span>}
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          isClosed ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      {/* Fotos adjuntas al pendiente */}
                      {item.photos && item.photos.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 pt-2.5 pl-7">
                          {item.photos.map((p, idx) => (
                            <div key={idx} className="relative rounded-lg overflow-hidden aspect-square border border-slate-300 group">
                              <img
                                src={p.url}
                                alt="Foto pendiente"
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => setPreviewPhoto(p.url)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Resultado y Seguimiento */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Resultado y Seguimiento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <DetailItem label="Resultado" value={activity.result || '—'} />
            </div>
            <DetailItem label="Siguiente Paso" value={activity.nextStep || '—'} />
            <DetailItem label="Fecha Compromiso" value={activity.commitmentDate ? formatDate(activity.commitmentDate) : '—'} />
            <div className="sm:col-span-2">
              <DetailItem label="Observaciones Ingeniero" value={activity.notes || '—'} />
            </div>
          </div>
        </div>

        {/* Sección de Refacciones / Materiales Man Power */}
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
            <h2 className="text-lg font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Reporte Origen</h2>
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
        <div className="text-sm text-slate-800 font-medium">{value || '-'}</div>
      </div>
    </div>
  );
}
