'use client';

import React, { useState, useRef } from 'react';
import { Camera, Clock, CheckCircle2, AlertTriangle, Send, Trash2, Plus, RefreshCw, Sparkles, HardHat, FileText, Check, ShieldCheck, ChevronRight, X, Layers } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface PhotoItem {
  id: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
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

interface FieldCaptureClientProps {
  workOrderFolio: string;
  initialActivities: any[];
  cuadrillaLabel: string;
  token: string;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function FieldCaptureClient({ workOrderFolio, initialActivities, cuadrillaLabel, token }: FieldCaptureClientProps) {
  const [activities, setActivities] = useState<any[]>(initialActivities);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    initialActivities.length > 0 ? initialActivities[0].id : null
  );
  const [loading, setLoading] = useState(false);
  const [techName, setTechName] = useState('Técnico de Campo');

  // Modal: Create New Activity
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newEquipo, setNewEquipo] = useState('');
  const [newStatus, setNewStatus] = useState('OPERATIVO');

  // Selected Activity
  const selectedActivity = activities.find((a) => a.id === selectedActivityId) || activities[0];

  // Inputs for selected activity
  const [suggestedActionText, setSuggestedActionText] = useState(selectedActivity?.suggestedAction || '');
  const [notesText, setNotesText] = useState(selectedActivity?.weekendNotes || '');
  const [newPendingTitle, setNewPendingTitle] = useState('');
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const postAction = async (payload: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campo/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, authorName: techName }),
      });
      const data = await res.json();
      if (res.ok) {
        if (payload.actionType === 'CREATE_ACTIVITY') {
          setActivities((prev) => [...prev, data.activity]);
          setSelectedActivityId(data.activity.id);
          setShowCreateModal(false);
          setNewTitle('');
          setNewEquipo('');
        } else {
          setActivities((prev) =>
            prev.map((a) => (a.id === data.activity.id ? { ...a, ...data.activity } : a))
          );
        }
      } else {
        alert('Error: ' + (data.error || 'No se pudo guardar la información'));
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Create Activity Handler
  const handleCreateActivity = () => {
    if (!newTitle.trim()) {
      alert('Por favor ingresa la descripción o título de la actividad');
      return;
    }
    postAction({
      actionType: 'CREATE_ACTIVITY',
      title: newTitle,
      manPowerEquipo: newEquipo,
      equipmentStatus: newStatus,
    });
  };

  if (!selectedActivity && activities.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center justify-center text-center">
        <h2 className="text-lg font-bold mb-2">Orden Odoo #{workOrderFolio}</h2>
        <p className="text-xs text-slate-400 mb-4">No hay actividades registradas en esta orden aún.</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs rounded-xl"
        >
          + Crear Primera Actividad de Campo
        </button>
      </div>
    );
  }

  const photosBefore: PhotoItem[] = selectedActivity?.photosBefore ? JSON.parse(selectedActivity.photosBefore) : [];
  const photosAfter: PhotoItem[] = selectedActivity?.photosAfter ? JSON.parse(selectedActivity.photosAfter) : [];
  const pendingItems: PendingItem[] = selectedActivity?.pendingItems ? JSON.parse(selectedActivity.pendingItems) : [];

  const actionChips = ['Mantenimiento Mayor', 'Reparación Inmediata', 'Reemplazo de Componente', 'Ajuste y Calibración', 'Limpieza General'];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-12">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              P
            </div>
            <div>
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{cuadrillaLabel}</div>
              <h1 className="font-black text-sm leading-tight text-white">Orden Odoo #{workOrderFolio}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={techName}
              onChange={(e) => setTechName(e.target.value)}
              placeholder="Tu nombre..."
              className="px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 max-w-[120px] font-medium"
            />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto p-4 space-y-4">
        
        {/* Activity Selector & Create Button */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Layers size={15} className="text-indigo-400" /> Actividades ({activities.length})
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-colors"
            >
              <Plus size={13} /> Nueva Actividad
            </button>
          </div>

          {/* Activity tabs / chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {activities.map((act) => (
              <button
                key={act.id}
                onClick={() => {
                  setSelectedActivityId(act.id);
                  setSuggestedActionText(act.suggestedAction || '');
                  setNotesText(act.weekendNotes || '');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedActivityId === act.id
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                {act.manPowerEquipo && <span className="font-mono text-[10px] bg-slate-950/60 px-1.5 py-0.5 rounded">#{act.manPowerEquipo}</span>}
                <span className="truncate max-w-[130px]">{act.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Activity Details */}
        {selectedActivity && (
          <>
            {/* Summary Card */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {selectedActivity.client?.name || 'Cliente'}
                  </span>
                  <h2 className="text-base font-black text-white mt-1 leading-snug">{selectedActivity.title}</h2>
                </div>
                {selectedActivity.manPowerEquipo && (
                  <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-indigo-600 text-white shadow-sm shrink-0">
                    #{selectedActivity.manPowerEquipo}
                  </span>
                )}
              </div>

              {selectedActivity.clientAcknowledged && (
                <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-xl p-2.5 text-xs text-emerald-300 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                  <div>
                    <strong>Confirmado por el Cliente (ENTERADO)</strong>
                    <div className="text-[10px] text-emerald-400/80">Por: {selectedActivity.clientAcknowledgedBy || 'Cliente'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Time Registration (1-Tap Buttons) */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={15} className="text-indigo-400" /> Registro de Horario de Actividad
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const now = new Date();
                    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    postAction({ actionType: 'START_TIME', activityId: selectedActivity.id, timeStr });
                  }}
                  disabled={loading}
                  className={`p-3.5 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg ${
                    selectedActivity.actualStartTime
                      ? 'bg-emerald-950/60 border border-emerald-700/50 text-emerald-300'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                  }`}
                >
                  <span className="text-base">▶</span>
                  <span>{selectedActivity.actualStartTime ? `Inicio: ${selectedActivity.actualStartTime}` : 'REGISTRAR INICIO'}</span>
                </button>

                <button
                  onClick={() => {
                    const now = new Date();
                    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    postAction({ actionType: 'END_TIME', activityId: selectedActivity.id, timeStr });
                  }}
                  disabled={loading}
                  className={`p-3.5 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg ${
                    selectedActivity.actualEndTime
                      ? 'bg-indigo-950/60 border border-indigo-700/50 text-indigo-300'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40'
                  }`}
                >
                  <span className="text-base">🏁</span>
                  <span>{selectedActivity.actualEndTime ? `Fin: ${selectedActivity.actualEndTime}` : 'REGISTRAR FIN'}</span>
                </button>
              </div>
            </div>

            {/* Equipment Status Selector */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-amber-400" /> Estatus del Equipo Atendido
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => postAction({ actionType: 'EQUIPMENT_STATUS', activityId: selectedActivity.id, equipmentStatus: 'OPERATIVO' })}
                  disabled={loading}
                  className={`p-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                    selectedActivity.equipmentStatus === 'OPERATIVO'
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/40'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span>OPERATIVO</span>
                </button>

                <button
                  onClick={() => postAction({ actionType: 'EQUIPMENT_STATUS', activityId: selectedActivity.id, equipmentStatus: 'FUERA_DE_SERVICIO' })}
                  disabled={loading}
                  className={`p-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                    selectedActivity.equipmentStatus === 'FUERA_DE_SERVICIO'
                      ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-900/40'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse"></span>
                  <span>FUERA DE SERVICIO</span>
                </button>
              </div>
            </div>

            {/* Suggested Action */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={15} className="text-indigo-400" /> Acción Sugerida al Cliente
              </div>

              <div className="flex flex-wrap gap-1.5">
                {actionChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setSuggestedActionText(chip);
                      postAction({ actionType: 'SUGGESTED_ACTION', activityId: selectedActivity.id, suggestedAction: chip });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      suggestedActionText === chip
                        ? 'bg-indigo-600 text-white border border-indigo-400'
                        : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    + {chip}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={suggestedActionText}
                  onChange={(e) => setSuggestedActionText(e.target.value)}
                  placeholder="Escribe la recomendación para el cliente..."
                  className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium"
                />
                <button
                  onClick={() => postAction({ actionType: 'SUGGESTED_ACTION', activityId: selectedActivity.id, suggestedAction: suggestedActionText })}
                  disabled={loading}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>

            {/* Photos (Before / After) */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera size={15} className="text-indigo-400" /> Registro Fotográfico
                </span>
              </div>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={beforeInputRef}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  setUploadingBefore(true);
                  try {
                    const compressed = await compressImage(files[0]);
                    await postAction({ actionType: 'ADD_PHOTO', activityId: selectedActivity.id, photoType: 'BEFORE', photoUrl: compressed });
                  } finally {
                    setUploadingBefore(false);
                    if (e.target) e.target.value = '';
                  }
                }}
                className="hidden"
              />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={afterInputRef}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  setUploadingAfter(true);
                  try {
                    const compressed = await compressImage(files[0]);
                    await postAction({ actionType: 'ADD_PHOTO', activityId: selectedActivity.id, photoType: 'AFTER', photoUrl: compressed });
                  } finally {
                    setUploadingAfter(false);
                    if (e.target) e.target.value = '';
                  }
                }}
                className="hidden"
              />

              {/* Fotos ANTES */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">📸 Fotos ANTES</span>
                  <button
                    onClick={() => beforeInputRef.current?.click()}
                    disabled={uploadingBefore}
                    className="px-3 py-1.5 bg-slate-700 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Camera size={14} /> {uploadingBefore ? 'Cargando...' : '+ Foto Antes'}
                  </button>
                </div>

                {photosBefore.length === 0 ? (
                  <div className="bg-slate-900/60 border border-dashed border-slate-700 rounded-xl p-3 text-center text-xs text-slate-500">
                    Sin fotos del estado inicial
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {photosBefore.map((p) => (
                      <div key={p.id} className="relative rounded-xl overflow-hidden aspect-square border border-slate-700 bg-slate-950">
                        <img src={p.url} alt="Antes" className="w-full h-full object-cover" />
                        <button
                          onClick={() => postAction({ actionType: 'DELETE_PHOTO', activityId: selectedActivity.id, photoType: 'BEFORE', photoId: p.id })}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fotos DESPUÉS */}
              <div className="space-y-2 border-t border-slate-700/60 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">✨ Fotos DESPUÉS</span>
                  <button
                    onClick={() => afterInputRef.current?.click()}
                    disabled={uploadingAfter}
                    className="px-3 py-1.5 bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Camera size={14} /> {uploadingAfter ? 'Cargando...' : '+ Foto Después'}
                  </button>
                </div>

                {photosAfter.length === 0 ? (
                  <div className="bg-slate-900/60 border border-dashed border-slate-700 rounded-xl p-3 text-center text-xs text-slate-500">
                    Sin fotos del trabajo terminado
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {photosAfter.map((p) => (
                      <div key={p.id} className="relative rounded-xl overflow-hidden aspect-square border border-slate-700 bg-slate-950">
                        <img src={p.url} alt="Después" className="w-full h-full object-cover" />
                        <button
                          onClick={() => postAction({ actionType: 'DELETE_PHOTO', activityId: selectedActivity.id, photoType: 'AFTER', photoId: p.id })}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Log de Pendientes */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={15} className="text-amber-400" /> Log de Pendientes
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPendingTitle}
                  onChange={(e) => setNewPendingTitle(e.target.value)}
                  placeholder="Agregar pendiente (ej. Cambiar filtro)..."
                  className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 font-medium"
                />
                <button
                  onClick={() => {
                    if (!newPendingTitle.trim()) return;
                    postAction({ actionType: 'ADD_PENDING', activityId: selectedActivity.id, pendingTitle: newPendingTitle });
                    setNewPendingTitle('');
                  }}
                  disabled={loading}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold rounded-xl text-xs shrink-0 transition-colors"
                >
                  + Agregar
                </button>
              </div>

              {pendingItems.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-1 italic">Sin pendientes registrados</div>
              ) : (
                <div className="space-y-2">
                  {pendingItems.map((item) => (
                    <div key={item.id} className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-xs text-slate-200">{item.title}</div>
                        <div className="text-[10px] text-slate-500">Por {item.createdBy}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.status === 'ABIERTO' ? (
                          <>
                            <button
                              onClick={() => postAction({ actionType: 'TOGGLE_PENDING', activityId: selectedActivity.id, pendingId: item.id, pendingStatus: 'CERRADO' })}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                            >
                              Cerrar
                            </button>
                            <button
                              onClick={() => postAction({ actionType: 'TOGGLE_PENDING', activityId: selectedActivity.id, pendingId: item.id, pendingStatus: 'CANCELADO' })}
                              className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-[10px] font-bold"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'CERRADO' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                            {item.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bitácora / Notas */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={15} className="text-indigo-400" /> Bitácora de Campo
              </div>

              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={3}
                placeholder="Observaciones de campo..."
                className="w-full p-3 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium"
              />

              <button
                onClick={() => postAction({ actionType: 'NOTES', activityId: selectedActivity.id, notes: notesText })}
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors shadow-lg"
              >
                Guardar Bitácora
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal: Create New Activity */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="font-extrabold text-sm text-white">Nueva Actividad de Campo</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descripción / Título de Actividad *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Cambio de manguera de presión..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1"># Equipo / Identificador (Opcional)</label>
                <input
                  type="text"
                  value={newEquipo}
                  onChange={(e) => setNewEquipo(e.target.value)}
                  placeholder="Ej. EQ-001"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Estado Inicial de Equipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus('OPERATIVO')}
                    className={`py-2 rounded-xl font-bold border ${newStatus === 'OPERATIVO' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-900 text-slate-400 border-slate-700'}`}
                  >
                    🟢 Operativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('FUERA_DE_SERVICIO')}
                    className={`py-2 rounded-xl font-bold border ${newStatus === 'FUERA_DE_SERVICIO' ? 'bg-rose-600 text-white border-rose-400' : 'bg-slate-900 text-slate-400 border-slate-700'}`}
                  >
                    🔴 Fuera Servicio
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateActivity}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg"
              >
                Crear Actividad
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
