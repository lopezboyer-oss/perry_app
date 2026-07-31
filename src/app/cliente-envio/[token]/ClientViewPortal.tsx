'use client';

import React, { useState } from 'react';
import { CheckCircle2, Clock, ShieldCheck, AlertTriangle, MessageSquare, Camera, Send, FileText, Check, Eye, X, ChevronDown, ChevronUp, Layers, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface PhotoItem {
  id: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface ClientComment {
  id: string;
  author: string;
  comment: string;
  createdAt: string;
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

interface ClientViewPortalProps {
  workOrderFolio: string;
  initialActivities: any[];
  initialComments: ClientComment[];
  token: string;
}

export function ClientViewPortal({ workOrderFolio, initialActivities, initialComments, token }: ClientViewPortalProps) {
  const [activities, setActivities] = useState<any[]>(initialActivities);
  const [comments, setComments] = useState<ClientComment[]>(initialComments);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(
    initialActivities.length > 0 ? initialActivities[0].id : null
  );

  const [loading, setLoading] = useState(false);
  const [clientAuthor, setClientAuthor] = useState('Representante del Cliente');
  const [newComment, setNewComment] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const clientName = initialActivities[0]?.client?.name || 'Cliente';
  const purchaseOrder = initialActivities[0]?.purchaseOrder || null;

  const postAction = async (payload: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cliente-envio/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, authorName: clientAuthor }),
      });
      const data = await res.json();
      if (res.ok) {
        if (payload.actionType === 'ENTERADO_ACTIVITY' && data.activity) {
          setActivities((prev) =>
            prev.map((a) => (a.id === data.activity.id ? { ...a, ...data.activity } : a))
          );
        } else if (payload.actionType === 'TOGGLE_PENDING' && data.activity) {
          setActivities((prev) =>
            prev.map((a) => (a.id === data.activity.id ? { ...a, ...data.activity } : a))
          );
        } else {
          const refreshRes = await fetch(`/api/cliente-envio/${token}`);
          const refreshData = await refreshRes.json();
          if (refreshRes.ok) {
            setActivities(refreshData.activities);
            setComments(refreshData.clientComments || []);
          }
        }
      } else {
        alert('Error: ' + (data.error || 'No se pudo registrar respuesta'));
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleEnteradoActivity = (activityId: string) => {
    if (!clientAuthor.trim()) {
      alert('Por favor escribe tu nombre o representación');
      return;
    }
    postAction({ actionType: 'ENTERADO_ACTIVITY', activityId });
  };

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    postAction({ actionType: 'COMMENT', commentText: newComment });
    setNewComment('');
  };

  const handleTogglePending = (activityId: string, pendingId: string, pendingStatus: 'CERRADO' | 'CANCELADO') => {
    postAction({ actionType: 'TOGGLE_PENDING', activityId, pendingId, pendingStatus });
  };

  // Collect all out-of-service equipment activities
  const outOfServiceActivities = activities.filter((a) => a.equipmentStatus === 'FUERA_DE_SERVICIO');

  // Collect all pending items across activities
  const allPendingItems: { activityId: string; activityTitle: string; item: PendingItem }[] = [];
  activities.forEach((act) => {
    if (act.pendingItems) {
      const parsed: PendingItem[] = JSON.parse(act.pendingItems);
      parsed.forEach((item) => {
        allPendingItems.push({ activityId: act.id, activityTitle: act.title, item });
      });
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-4 shadow-lg sticky top-0 z-30">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 font-extrabold text-white flex items-center justify-center text-sm shadow-md">
              P
            </div>
            <div>
              <div className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">
                PERRY APP • PORTAL DE CLIENTE
              </div>
              <h1 className="font-extrabold text-base leading-tight text-white">
                Orden Odoo #{workOrderFolio}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={clientAuthor}
              onChange={(e) => setClientAuthor(e.target.value)}
              placeholder="Tu nombre..."
              className="px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-indigo-500 max-w-[130px]"
            />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-xl mx-auto p-4 space-y-4">

        {/* Order Summary Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {clientName}
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-1">Reporte de ManPower Odoo #{workOrderFolio}</h2>
            </div>
            {purchaseOrder && (
              <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                PO: {purchaseOrder}
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2 border-t border-slate-100 pt-2.5">
            <span>Total de Actividades: <strong className="text-slate-800">{activities.length}</strong></span>
          </div>
        </div>

        {/* 🚨 LISTA DE EQUIPOS INTERVENIDOS QUE QUEDARON FUERA DE SERVICIO */}
        {outOfServiceActivities.length > 0 && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
              <AlertCircle size={18} className="text-rose-600 animate-pulse" />
              <span>Equipos Intervenidos Que Quedaron FUERA DE SERVICIO ({outOfServiceActivities.length})</span>
            </div>

            <div className="space-y-2">
              {outOfServiceActivities.map((act) => (
                <div key={act.id} className="bg-white border border-rose-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {act.manPowerEquipo && (
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                          #{act.manPowerEquipo}
                        </span>
                      )}
                      <span className="font-extrabold text-xs text-slate-900">{act.title}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Fecha: {formatDate(act.date.substring(0, 10))}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-2xs">
                    🔴 FUERA DE SERVICIO
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activities List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Layers size={16} className="text-indigo-600" /> Lista de Actividades Registradas
            </span>
          </div>

          {activities.map((act) => {
            const isExpanded = expandedActivityId === act.id;
            const photosBefore: PhotoItem[] = act.photosBefore ? JSON.parse(act.photosBefore) : [];
            const photosAfter: PhotoItem[] = act.photosAfter ? JSON.parse(act.photosAfter) : [];
            const isClosed = act.status === 'COMPLETADA' || act.status === 'CERRADA';
            const start = act.actualStartTime || act.startTime || 'S/H';
            const end = act.actualEndTime || act.endTime || 'S/H';

            return (
              <div
                key={act.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all"
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedActivityId(isExpanded ? null : act.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {act.manPowerEquipo && (
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          #{act.manPowerEquipo}
                        </span>
                      )}
                      <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{act.title}</h3>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Horarios: <strong className="font-mono text-slate-700">{start} - {end}</strong></span>
                      <span>• Fecha: <strong>{formatDate(act.date.substring(0, 10))}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {act.equipmentStatus === 'OPERATIVO' && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        🟢 Operativo
                      </span>
                    )}
                    {act.equipmentStatus === 'FUERA_DE_SERVICIO' && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                        🔴 Fuera Servicio
                      </span>
                    )}

                    {act.clientAcknowledged && (
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Enterado
                      </span>
                    )}

                    <div className="p-1 text-slate-400">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Activity Detail View */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs">
                    
                    {/* Botón Enterado específico para esta actividad si está cerrada */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      {act.clientAcknowledged ? (
                        <div className="flex items-center gap-2.5 text-emerald-800 font-bold">
                          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                          <div>
                            <div>✅ ENTERADO POR EL CLIENTE EN ESTA ACTIVIDAD</div>
                            <div className="text-[10px] font-normal text-emerald-600">
                              Confirmado por {act.clientAcknowledgedBy || 'Cliente'} el{' '}
                              {act.clientAcknowledgedAt ? formatDate(act.clientAcknowledgedAt.substring(0, 10)) : ''}
                            </div>
                          </div>
                        </div>
                      ) : isClosed ? (
                        <button
                          onClick={() => handleEnteradoActivity(act.id)}
                          disabled={loading}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                        >
                          <ShieldCheck size={18} />
                          MARCAR ESTA ACTIVIDAD COMO ENTERADO
                        </button>
                      ) : (
                        <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                          ⏳ Esta actividad aún está en progreso por el equipo técnico. El botón de confirmación se activará una vez finalizada.
                        </div>
                      )}
                    </div>

                    {/* Horarios */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Hora Inicio Real</div>
                        <div className="font-mono font-extrabold text-slate-800 text-sm mt-0.5">{start}</div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Hora Término Real</div>
                        <div className="font-mono font-extrabold text-slate-800 text-sm mt-0.5">{end}</div>
                      </div>
                    </div>

                    {/* Galería Fotos ANTES vs DESPUÉS */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Camera size={14} className="text-indigo-600" /> Evidencia Fotográfica
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-600">📸 Estado Inicial (ANTES)</div>
                        {photosBefore.length === 0 ? (
                          <div className="text-[10px] text-slate-400 italic">Sin fotos de estado inicial</div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {photosBefore.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => setPreviewPhoto(p.url)}
                                className="relative rounded-xl overflow-hidden aspect-square border border-slate-200 cursor-pointer group"
                              >
                                <img src={p.url} alt="Antes" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye size={16} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                        <div className="text-[11px] font-bold text-slate-600">✨ Trabajo Terminado (DESPUÉS)</div>
                        {photosAfter.length === 0 ? (
                          <div className="text-[10px] text-slate-400 italic">Sin fotos de trabajo terminado</div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {photosAfter.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => setPreviewPhoto(p.url)}
                                className="relative rounded-xl overflow-hidden aspect-square border border-slate-200 cursor-pointer group"
                              >
                                <img src={p.url} alt="Después" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye size={16} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bitácora de Campo */}
                    {act.weekendNotes && (
                      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                        <div className="font-bold text-slate-700 flex items-center gap-1">
                          <FileText size={14} className="text-slate-500" /> Observaciones / Bitácora de Campo
                        </div>
                        <p className="text-slate-600">{act.weekendNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Consolidado Log de Pendientes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText size={15} className="text-amber-500" /> Log de Pendientes / Recomendaciones
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              {allPendingItems.filter((i) => i.item.status === 'ABIERTO').length} Abiertos
            </span>
          </h3>

          {allPendingItems.length === 0 ? (
            <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              Sin pendientes registrados en esta Orden Odoo
            </div>
          ) : (
            <div className="space-y-2">
              {allPendingItems.map(({ activityId, activityTitle, item }) => (
                <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-xs text-slate-800">{item.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Actividad: {activityTitle} • Por {item.createdBy}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {item.status === 'ABIERTO' ? (
                        <>
                          <button
                            onClick={() => handleTogglePending(activityId, item.id, 'CERRADO')}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-colors"
                          >
                            Marcar Cerrado
                          </button>
                          <button
                            onClick={() => handleTogglePending(activityId, item.id, 'CANCELADO')}
                            className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-300 transition-colors"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'CERRADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.photos && item.photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-200">
                      {item.photos.map((p: any) => (
                        <div key={p.id} className="relative rounded-lg overflow-hidden aspect-square border border-slate-200 cursor-pointer group">
                          <img src={p.url} alt="Foto pendiente" className="w-full h-full object-cover group-hover:scale-105 transition-transform" onClick={() => setPreviewPhoto(p.url)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: Client Comments */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare size={15} className="text-indigo-600" /> Comentarios del Cliente
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe una observación o consulta..."
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            />
            <button
              onClick={handleSendComment}
              disabled={loading}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1"
            >
              <Send size={13} /> Enviar
            </button>
          </div>

          {comments.length === 0 ? (
            <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              Sin comentarios registrados
            </div>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">{c.author}</span>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(c.createdAt.substring(0, 10))}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{c.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fullscreen Lightbox Modal */}
        {previewPhoto && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewPhoto(null)}
          >
            <div className="relative max-w-3xl max-h-[90vh] bg-black rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
              >
                <X size={18} />
              </button>
              <img src={previewPhoto} alt="Evidencia" className="max-w-full max-h-[85vh] object-contain mx-auto" />
            </div>
          </div>
        )}

        <div className="text-center text-[10px] text-slate-400 pt-2">
          Perry App | Portal de Atención e Inspección de Clientes
        </div>
      </div>
    </div>
  );
}
