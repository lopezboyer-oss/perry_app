'use client';

import React, { useState } from 'react';
import { CheckCircle2, Clock, ShieldCheck, AlertTriangle, MessageSquare, Camera, Sparkles, Send, FileText, Check, Eye, X } from 'lucide-react';
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
  createdBy: string;
  createdAt: string;
  closedAt: string | null;
  closedBy: string | null;
}

interface ClientViewPortalProps {
  initialActivity: any;
  token: string;
}

export function ClientViewPortal({ initialActivity, token }: ClientViewPortalProps) {
  const [activity, setActivity] = useState(initialActivity);
  const [loading, setLoading] = useState(false);

  // Client Representative Name
  const [clientAuthor, setClientAuthor] = useState(activity.client?.name || 'Representante del Cliente');
  const [newComment, setNewComment] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const photosBefore: PhotoItem[] = activity.photosBefore ? JSON.parse(activity.photosBefore) : [];
  const photosAfter: PhotoItem[] = activity.photosAfter ? JSON.parse(activity.photosAfter) : [];
  const comments: ClientComment[] = activity.clientComments ? JSON.parse(activity.clientComments) : [];
  const pendingItems: PendingItem[] = activity.pendingItems ? JSON.parse(activity.pendingItems) : [];

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
        setActivity((prev: any) => ({ ...prev, ...data.activity }));
      } else {
        alert('Error: ' + (data.error || 'No se pudo registrar la respuesta'));
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterado = () => {
    if (!clientAuthor.trim()) {
      alert('Por favor escribe tu nombre o representación');
      return;
    }
    postAction({ actionType: 'ENTERADO' });
  };

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    postAction({ actionType: 'COMMENT', commentText: newComment });
    setNewComment('');
  };

  const handleTogglePending = (pendingId: string, pendingStatus: 'CERRADO' | 'CANCELADO') => {
    postAction({ actionType: 'TOGGLE_PENDING', pendingId, pendingStatus });
  };

  const start = activity.actualStartTime || activity.startTime || 'S/H';
  const end = activity.actualEndTime || activity.endTime || 'S/H';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* Header Banner */}
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
                {activity.client?.name || 'Seguimiento de Servicio'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={clientAuthor}
              onChange={(e) => setClientAuthor(e.target.value)}
              placeholder="Tu nombre..."
              className="px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-indigo-500 max-w-[140px]"
            />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-xl mx-auto p-4 space-y-4">

        {/* Enterado Banner / Action Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {activity.manPowerEquipo ? `#${activity.manPowerEquipo}` : 'Actividad'}
                </span>
                {activity.workOrderFolio && (
                  <span className="font-mono text-xs font-bold text-slate-500">
                    Odoo: #{activity.workOrderFolio}
                  </span>
                )}
                {activity.purchaseOrder && (
                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    PO: {activity.purchaseOrder}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2 leading-tight">
                {activity.title}
              </h2>
              <div className="text-xs text-slate-500 mt-1">
                Fecha: <strong>{formatDate(activity.date.substring(0, 10))}</strong>
              </div>
            </div>

            {/* Equipment status badge */}
            <div className="shrink-0">
              {activity.equipmentStatus === 'OPERATIVO' ? (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-xs flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  OPERATIVO
                </div>
              ) : activity.equipmentStatus === 'FUERA_DE_SERVICIO' ? (
                <div className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 font-extrabold text-xs flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                  FUERA DE SERVICIO
                </div>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs">
                  {activity.status}
                </div>
              )}
            </div>
          </div>

          {/* ── BOTÓN ENTERADO ── */}
          <div className="pt-1">
            {activity.clientAcknowledged ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div className="font-extrabold text-emerald-900 text-sm">✅ ENTERADO POR EL CLIENTE</div>
                  <div className="text-xs text-emerald-700 mt-0.5">
                    Confirmado por <strong>{activity.clientAcknowledgedBy || 'Cliente'}</strong> el{' '}
                    {activity.clientAcknowledgedAt ? formatDate(activity.clientAcknowledgedAt.substring(0, 10)) : ''}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleEnterado}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <ShieldCheck size={20} />
                MARCAR COMO ENTERADO
              </button>
            )}
          </div>
        </div>

        {/* Service Timeline & Schedule */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={15} className="text-indigo-600" /> Horarios de Trabajo
          </h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Hora de Inicio</div>
              <div className="font-mono font-extrabold text-slate-800 text-base mt-0.5">{start}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Hora de Término</div>
              <div className="font-mono font-extrabold text-slate-800 text-base mt-0.5">{end}</div>
            </div>
          </div>
        </div>

        {/* Suggested Action from Perry Team */}
        {activity.suggestedAction && (
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={16} className="text-indigo-600" /> Acción Sugerida por el Equipo Perry
            </div>
            <p className="text-xs text-indigo-950 font-semibold leading-relaxed bg-white/80 p-3 rounded-xl border border-indigo-100">
              {activity.suggestedAction}
            </p>
          </div>
        )}

        {/* Photo Gallery (ANTES vs DESPUÉS) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Camera size={15} className="text-indigo-600" /> Evidencia Fotográfica (Antes / Después)
          </h3>

          {/* Photos Before */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700">📸 Estado Inicial (ANTES)</div>
            {photosBefore.length === 0 ? (
              <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                Sin fotos iniciales registradas
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photosBefore.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setPreviewPhoto(p.url)}
                    className="relative group rounded-xl overflow-hidden aspect-square border border-slate-200 cursor-pointer shadow-2xs"
                  >
                    <img src={p.url} alt="Antes" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye size={18} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photos After */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="text-xs font-bold text-slate-700">✨ Trabajo Finalizado (DESPUÉS)</div>
            {photosAfter.length === 0 ? (
              <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                Sin fotos finales registradas
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photosAfter.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setPreviewPhoto(p.url)}
                    className="relative group rounded-xl overflow-hidden aspect-square border border-slate-200 cursor-pointer shadow-2xs"
                  >
                    <img src={p.url} alt="Después" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye size={18} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Log de Pendientes Abiertos */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText size={15} className="text-amber-500" /> Log de Pendientes
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              {pendingItems.filter((i) => i.status === 'ABIERTO').length} Abiertos
            </span>
          </h3>

          {pendingItems.length === 0 ? (
            <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              Sin pendientes asociados a esta actividad
            </div>
          ) : (
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-xs text-slate-800">{item.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Reportado por {item.createdBy}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.status === 'ABIERTO' ? (
                      <>
                        <button
                          onClick={() => handleTogglePending(item.id, 'CERRADO')}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-colors"
                        >
                          Marcar Cerrado
                        </button>
                        <button
                          onClick={() => handleTogglePending(item.id, 'CANCELADO')}
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
              ))}
            </div>
          )}
        </div>

        {/* Section: Client Comments */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare size={15} className="text-indigo-600" /> Comentarios del Cliente
          </h3>

          {/* Comment input */}
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

          {/* Comments list */}
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
