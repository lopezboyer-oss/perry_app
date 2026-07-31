'use client';

import React, { useState, useRef } from 'react';
import { Camera, Clock, CheckCircle2, AlertTriangle, Send, Trash2, Plus, RefreshCw, Sparkles, HardHat, FileText, Check, ShieldCheck, ChevronRight, X, Layers, Upload, Eye } from 'lucide-react';
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

  // Lightbox photo preview
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Selected Activity
  const selectedActivity = activities.find((a) => a.id === selectedActivityId) || activities[0];

  // Manual Time Input state
  const [manualStartTime, setManualStartTime] = useState(selectedActivity?.actualStartTime || selectedActivity?.startTime || '');
  const [manualEndTime, setManualEndTime] = useState(selectedActivity?.actualEndTime || selectedActivity?.endTime || '');

  // Inputs for selected activity
  const [notesText, setNotesText] = useState(selectedActivity?.weekendNotes || '');
  const [newPendingTitle, setNewPendingTitle] = useState('');
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);

  // File input refs for camera vs file upload
  const beforeCameraRef = useRef<HTMLInputElement>(null);
  const beforeFileRef = useRef<HTMLInputElement>(null);
  const afterCameraRef = useRef<HTMLInputElement>(null);
  const afterFileRef = useRef<HTMLInputElement>(null);

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
          setActivities((prev) => [data.activity, ...prev]);
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

  const handleSaveManualTimes = () => {
    if (!selectedActivity) return;
    if (manualStartTime) {
      postAction({ actionType: 'START_TIME', activityId: selectedActivity.id, timeStr: manualStartTime });
    }
    if (manualEndTime) {
      postAction({ actionType: 'END_TIME', activityId: selectedActivity.id, timeStr: manualEndTime });
    }
  };

  const processFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, photoType: 'BEFORE' | 'AFTER') => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedActivity) return;

    if (photoType === 'BEFORE') setUploadingBefore(true);
    if (photoType === 'AFTER') setUploadingAfter(true);

    try {
      const compressed = await compressImage(files[0]);
      await postAction({
        actionType: 'ADD_PHOTO',
        activityId: selectedActivity.id,
        photoType,
        photoUrl: compressed,
      });
    } catch (err) {
      console.error(err);
      alert('Error al procesar la imagen');
    } finally {
      if (photoType === 'BEFORE') setUploadingBefore(false);
      if (photoType === 'AFTER') setUploadingAfter(false);
      if (e.target) e.target.value = '';
    }
  };

  if (!selectedActivity && activities.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 p-6 flex flex-col items-center justify-center text-center">
        <h2 className="text-xl font-black mb-2">Orden Odoo #{workOrderFolio}</h2>
        <p className="text-xs text-slate-500 mb-4">No hay actividades registradas en esta orden de trabajo aún.</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md"
        >
          + Crear Primera Actividad de Campo
        </button>
      </div>
    );
  }

  const photosBefore: PhotoItem[] = selectedActivity?.photosBefore ? JSON.parse(selectedActivity.photosBefore) : [];
  const photosAfter: PhotoItem[] = selectedActivity?.photosAfter ? JSON.parse(selectedActivity.photosAfter) : [];
  const pendingItems: PendingItem[] = selectedActivity?.pendingItems ? JSON.parse(selectedActivity.pendingItems) : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans">
      {/* Light Theme Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-xs">
              P
            </div>
            <div>
              <div className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">{cuadrillaLabel}</div>
              <h1 className="font-extrabold text-sm leading-tight text-slate-900">Orden Odoo #{workOrderFolio}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={techName}
              onChange={(e) => setTechName(e.target.value)}
              placeholder="Tu nombre..."
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 max-w-[120px] font-medium"
            />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto p-4 space-y-4">
        
        {/* Activity Selector & Create Button */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Layers size={16} className="text-indigo-600" /> Actividades ({activities.length})
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs"
            >
              <Plus size={14} /> Nueva Actividad
            </button>
          </div>

          {/* Activity tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {activities.map((act) => (
              <button
                key={act.id}
                onClick={() => {
                  setSelectedActivityId(act.id);
                  setManualStartTime(act.actualStartTime || act.startTime || '');
                  setManualEndTime(act.actualEndTime || act.endTime || '');
                  setNotesText(act.weekendNotes || '');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedActivityId === act.id
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {act.manPowerEquipo && <span className="font-mono text-[10px] bg-slate-900/10 px-1.5 py-0.5 rounded">#{act.manPowerEquipo}</span>}
                <span className="truncate max-w-[130px]">{act.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Activity Content */}
        {selectedActivity && (
          <>
            {/* Summary Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {selectedActivity.client?.name || 'Cliente'}
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900 mt-1 leading-snug">{selectedActivity.title}</h2>
                </div>
                {selectedActivity.manPowerEquipo && (
                  <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-indigo-600 text-white shadow-2xs shrink-0">
                    #{selectedActivity.manPowerEquipo}
                  </span>
                )}
              </div>

              {selectedActivity.clientAcknowledged && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-800 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <strong>Confirmado por el Cliente (ENTERADO)</strong>
                    <div className="text-[10px] text-emerald-600">Por: {selectedActivity.clientAcknowledgedBy || 'Cliente'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* 1) REGISTRO Y EDICIÓN MANUAL DE HORARIOS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={15} className="text-indigo-600" /> Registro y Edición de Horarios
              </div>

              {/* Instant 1-tap buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const now = new Date();
                    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    setManualStartTime(timeStr);
                    postAction({ actionType: 'START_TIME', activityId: selectedActivity.id, timeStr });
                  }}
                  disabled={loading}
                  className={`p-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-2xs ${
                    selectedActivity.actualStartTime
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <span className="text-sm">▶</span>
                  <span>{selectedActivity.actualStartTime ? `Inicio: ${selectedActivity.actualStartTime}` : 'MARCAR INICIO'}</span>
                </button>

                <button
                  onClick={() => {
                    const now = new Date();
                    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    setManualEndTime(timeStr);
                    postAction({ actionType: 'END_TIME', activityId: selectedActivity.id, timeStr });
                  }}
                  disabled={loading}
                  className={`p-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-2xs ${
                    selectedActivity.actualEndTime
                      ? 'bg-indigo-50 border border-indigo-300 text-indigo-800'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <span className="text-sm">🏁</span>
                  <span>{selectedActivity.actualEndTime ? `Fin: ${selectedActivity.actualEndTime}` : 'MARCAR FIN'}</span>
                </button>
              </div>

              {/* Manual Time Edit Fields */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Edición Manual de Horas</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Hora Inicio</label>
                    <input
                      type="text"
                      value={manualStartTime}
                      onChange={(e) => setManualStartTime(e.target.value)}
                      placeholder="HH:MM (ej. 08:30)"
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Hora Término</label>
                    <input
                      type="text"
                      value={manualEndTime}
                      onChange={(e) => setManualEndTime(e.target.value)}
                      placeholder="HH:MM (ej. 17:00)"
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveManualTimes}
                  disabled={loading}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Guardar Horas Manuales
                </button>
              </div>
            </div>

            {/* 2) REGISTRO FOTOGRÁFICO (Cámara + Galería + Lightbox) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera size={15} className="text-indigo-600" /> Evidencia Fotográfica
                </span>
              </div>

              {/* Hidden file inputs */}
              <input type="file" accept="image/*" capture="environment" ref={beforeCameraRef} onChange={(e) => processFileUpload(e, 'BEFORE')} className="hidden" />
              <input type="file" accept="image/*" ref={beforeFileRef} onChange={(e) => processFileUpload(e, 'BEFORE')} className="hidden" />

              <input type="file" accept="image/*" capture="environment" ref={afterCameraRef} onChange={(e) => processFileUpload(e, 'AFTER')} className="hidden" />
              <input type="file" accept="image/*" ref={afterFileRef} onChange={(e) => processFileUpload(e, 'AFTER')} className="hidden" />

              {/* Fotos ANTES */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">📸 Fotos ANTES</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => beforeCameraRef.current?.click()}
                      disabled={uploadingBefore}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Camera size={13} /> {uploadingBefore ? '...' : 'Cámara'}
                    </button>
                    <button
                      onClick={() => beforeFileRef.current?.click()}
                      disabled={uploadingBefore}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Upload size={13} /> Archivo
                    </button>
                  </div>
                </div>

                {photosBefore.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 text-center text-xs text-slate-400">
                    Sin fotos del estado inicial
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {photosBefore.map((p) => (
                      <div key={p.id} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-200 cursor-pointer">
                        <img src={p.url} alt="Antes" className="w-full h-full object-cover" onClick={() => setPreviewPhoto(p.url)} />
                        <button
                          onClick={() => postAction({ actionType: 'DELETE_PHOTO', activityId: selectedActivity.id, photoType: 'BEFORE', photoId: p.id })}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fotos DESPUÉS */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">✨ Fotos DESPUÉS</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => afterCameraRef.current?.click()}
                      disabled={uploadingAfter}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Camera size={13} /> {uploadingAfter ? '...' : 'Cámara'}
                    </button>
                    <button
                      onClick={() => afterFileRef.current?.click()}
                      disabled={uploadingAfter}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Upload size={13} /> Archivo
                    </button>
                  </div>
                </div>

                {photosAfter.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 text-center text-xs text-slate-400">
                    Sin fotos del trabajo terminado
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {photosAfter.map((p) => (
                      <div key={p.id} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-200 cursor-pointer">
                        <img src={p.url} alt="Después" className="w-full h-full object-cover" onClick={() => setPreviewPhoto(p.url)} />
                        <button
                          onClick={() => postAction({ actionType: 'DELETE_PHOTO', activityId: selectedActivity.id, photoType: 'AFTER', photoId: p.id })}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3) LOG DE PENDIENTES */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={15} className="text-amber-500" /> Log de Pendientes / Recomendaciones
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPendingTitle}
                  onChange={(e) => setNewPendingTitle(e.target.value)}
                  placeholder="Agregar pendiente o recomendación..."
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500 font-medium"
                />
                <button
                  onClick={() => {
                    if (!newPendingTitle.trim()) return;
                    postAction({ actionType: 'ADD_PENDING', activityId: selectedActivity.id, pendingTitle: newPendingTitle });
                    setNewPendingTitle('');
                  }}
                  disabled={loading}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-xs shrink-0 transition-colors"
                >
                  + Agregar
                </button>
              </div>

              {pendingItems.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-1 italic">Sin pendientes registrados</div>
              ) : (
                <div className="space-y-2">
                  {pendingItems.map((item) => (
                    <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-xs text-slate-800">{item.title}</div>
                        <div className="text-[10px] text-slate-400">Por {item.createdBy}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.status === 'ABIERTO' ? (
                          <>
                            <button
                              onClick={() => postAction({ actionType: 'TOGGLE_PENDING', activityId: selectedActivity.id, pendingId: item.id, pendingStatus: 'CERRADO' })}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                            >
                              Cerrar
                            </button>
                            <button
                              onClick={() => postAction({ actionType: 'TOGGLE_PENDING', activityId: selectedActivity.id, pendingId: item.id, pendingStatus: 'CANCELADO' })}
                              className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-[10px] font-bold"
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

            {/* 4) BITÁCORA / OBSERVACIONES */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={15} className="text-indigo-600" /> Bitácora / Observaciones de Campo
              </div>

              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={3}
                placeholder="Observaciones adicionales..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
              />

              <button
                onClick={() => postAction({ actionType: 'NOTES', activityId: selectedActivity.id, notes: notesText })}
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
              >
                Guardar Bitácora
              </button>
            </div>

            {/* 5) ESTATUS DEL EQUIPO ATENDIDO (AL FINAL DE LA PANTALLA) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 border-t-4 border-t-amber-500">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-amber-500" /> Estatus del Equipo Atendido (Al Final del Servicio)
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => postAction({ actionType: 'EQUIPMENT_STATUS', activityId: selectedActivity.id, equipmentStatus: 'OPERATIVO' })}
                  disabled={loading}
                  className={`p-3.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                    selectedActivity.equipmentStatus === 'OPERATIVO'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span>OPERATIVO</span>
                </button>

                <button
                  onClick={() => postAction({ actionType: 'EQUIPMENT_STATUS', activityId: selectedActivity.id, equipmentStatus: 'FUERA_DE_SERVICIO' })}
                  disabled={loading}
                  className={`p-3.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                    selectedActivity.equipmentStatus === 'FUERA_DE_SERVICIO'
                      ? 'bg-rose-600 border-rose-600 text-white shadow-md'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse"></span>
                  <span>FUERA DE SERVICIO</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Lightbox Modal */}
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

      {/* Modal: Create New Activity */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900">Nueva Actividad de Campo</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Descripción / Título de Actividad *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Cambio de manguera de presión..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1"># Equipo / Identificador (Opcional)</label>
                <input
                  type="text"
                  value={newEquipo}
                  onChange={(e) => setNewEquipo(e.target.value)}
                  placeholder="Ej. EQ-001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Estado Inicial de Equipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus('OPERATIVO')}
                    className={`py-2 rounded-xl font-bold border ${newStatus === 'OPERATIVO' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-300'}`}
                  >
                    🟢 Operativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('FUERA_DE_SERVICIO')}
                    className={`py-2 rounded-xl font-bold border ${newStatus === 'FUERA_DE_SERVICIO' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-600 border-slate-300'}`}
                  >
                    🔴 Fuera Servicio
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateActivity}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md"
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
