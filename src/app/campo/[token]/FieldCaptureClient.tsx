'use client';

import React, { useState, useRef } from 'react';
import { Camera, Clock, CheckCircle2, AlertTriangle, Send, Trash2, Plus, RefreshCw, Sparkles, HardHat, FileText, Check, ShieldCheck, X } from 'lucide-react';
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
  initialActivity: any;
  cuadrillaLabel: string;
  token: string;
}

// Compress image on client canvas for fast mobile uploads
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

        // Quality 0.75 JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function FieldCaptureClient({ initialActivity, cuadrillaLabel, token }: FieldCaptureClientProps) {
  const [activity, setActivity] = useState(initialActivity);
  const [loading, setLoading] = useState(false);
  const [techName, setTechName] = useState('Técnico de Campo');

  // Input states
  const [suggestedActionText, setSuggestedActionText] = useState(activity.suggestedAction || '');
  const [notesText, setNotesText] = useState(activity.weekendNotes || '');
  const [newPendingTitle, setNewPendingTitle] = useState('');
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  // Parsed photo arrays
  const photosBefore: PhotoItem[] = activity.photosBefore ? JSON.parse(activity.photosBefore) : [];
  const photosAfter: PhotoItem[] = activity.photosAfter ? JSON.parse(activity.photosAfter) : [];
  const pendingItems: PendingItem[] = activity.pendingItems ? JSON.parse(activity.pendingItems) : [];

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
        setActivity((prev: any) => ({ ...prev, ...data.activity }));
      } else {
        alert('Error: ' + (data.error || 'No se pudo guardar'));
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Time stamp handlers
  const handleStartTime = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    postAction({ actionType: 'START_TIME', timeStr });
  };

  const handleEndTime = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    postAction({ actionType: 'END_TIME', timeStr });
  };

  // Status toggle
  const handleEquipmentStatus = (status: string) => {
    postAction({ actionType: 'EQUIPMENT_STATUS', equipmentStatus: status });
  };

  // Photo uploads
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, photoType: 'BEFORE' | 'AFTER') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photoType === 'BEFORE') setUploadingBefore(true);
    if (photoType === 'AFTER') setUploadingAfter(true);

    try {
      const file = files[0];
      const compressedBase64 = await compressImage(file);
      await postAction({
        actionType: 'ADD_PHOTO',
        photoType,
        photoUrl: compressedBase64,
      });
    } catch (err) {
      console.error(err);
      alert('Error al procesar fotografía');
    } finally {
      if (photoType === 'BEFORE') setUploadingBefore(false);
      if (photoType === 'AFTER') setUploadingAfter(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeletePhoto = (photoType: 'BEFORE' | 'AFTER', photoId: string) => {
    if (!confirm('¿Eliminar esta fotografía?')) return;
    postAction({ actionType: 'DELETE_PHOTO', photoType, photoId });
  };

  // Suggested action chips
  const actionChips = [
    'Mantenimiento Mayor',
    'Reparación Inmediata',
    'Reemplazo de Componente',
    'Ajuste y Calibración',
    'Limpieza General',
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-12">
      {/* Top Header */}
      <div className="bg-slate-800 border-b border-slate-700/80 px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              P
            </div>
            <div>
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{cuadrillaLabel}</div>
              <h1 className="font-extrabold text-sm leading-tight text-white">Módulo de Campo</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={techName}
              onChange={(e) => setTechName(e.target.value)}
              placeholder="Tu nombre..."
              className="px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 max-w-[130px] font-medium"
            />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto p-4 space-y-4">

        {/* Activity Summary Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {activity.client?.name || 'Cliente'}
              </span>
              <h2 className="text-lg font-black text-white mt-1 leading-snug">{activity.title}</h2>
            </div>
            {activity.manPowerEquipo && (
              <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-indigo-600 text-white shadow-sm shrink-0">
                #{activity.manPowerEquipo}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 border-t border-slate-700/60 pt-2.5">
            {activity.workOrderFolio && <span>Odoo: <strong className="font-mono text-indigo-400">#{activity.workOrderFolio}</strong></span>}
            {activity.purchaseOrder && <span>• PO: <strong className="font-mono text-emerald-400">{activity.purchaseOrder}</strong></span>}
            <span>• Fecha: <strong>{formatDate(activity.date.substring(0, 10))}</strong></span>
          </div>

          {/* Client acknowledgment notice */}
          {activity.clientAcknowledged && (
            <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-xl p-2.5 text-xs text-emerald-300 flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <div>
                <strong>Confirmado por el Cliente (ENTERADO)</strong>
                <div className="text-[10px] text-emerald-400/80">Por: {activity.clientAcknowledgedBy || 'Cliente'}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── TIME REGISTRATION BUTTONS (1-TAP) ── */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={15} className="text-indigo-400" /> Registro de Horario de Actividad
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Start Button */}
            <button
              onClick={handleStartTime}
              disabled={loading}
              className={`p-3.5 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg ${
                activity.actualStartTime
                  ? 'bg-emerald-950/60 border border-emerald-700/50 text-emerald-300'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
              }`}
            >
              <span className="text-base">▶</span>
              <span>{activity.actualStartTime ? `Inicio: ${activity.actualStartTime}` : 'REGISTRAR INICIO'}</span>
            </button>

            {/* End Button */}
            <button
              onClick={handleEndTime}
              disabled={loading}
              className={`p-3.5 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg ${
                activity.actualEndTime
                  ? 'bg-indigo-950/60 border border-indigo-700/50 text-indigo-300'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40'
              }`}
            >
              <span className="text-base">🏁</span>
              <span>{activity.actualEndTime ? `Fin: ${activity.actualEndTime}` : 'REGISTRAR FIN'}</span>
            </button>
          </div>
        </div>

        {/* ── EQUIPMENT STATUS SELECTOR ── */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle size={15} className="text-amber-400" /> Estatus del Equipo Atendido
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleEquipmentStatus('OPERATIVO')}
              disabled={loading}
              className={`p-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                activity.equipmentStatus === 'OPERATIVO'
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>OPERATIVO</span>
            </button>

            <button
              onClick={() => handleEquipmentStatus('FUERA_DE_SERVICIO')}
              disabled={loading}
              className={`p-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                activity.equipmentStatus === 'FUERA_DE_SERVICIO'
                  ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-900/40'
                  : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse"></span>
              <span>FUERA DE SERVICIO</span>
            </button>
          </div>
        </div>

        {/* ── SUGGESTED ACTION FOR CLIENT ── */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={15} className="text-indigo-400" /> Acción Sugerida al Cliente
          </div>

          {/* Quick Chips */}
          <div className="flex flex-wrap gap-1.5">
            {actionChips.map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  setSuggestedActionText(chip);
                  postAction({ actionType: 'SUGGESTED_ACTION', suggestedAction: chip });
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  suggestedActionText === chip
                    ? 'bg-indigo-600 text-white border border-indigo-400'
                    : 'bg-slate-900/80 text-slate-300 border border-slate-700 hover:border-slate-600'
                }`}
              >
                + {chip}
              </button>
            ))}
          </div>

          {/* Text Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={suggestedActionText}
              onChange={(e) => setSuggestedActionText(e.target.value)}
              placeholder="Escribe la recomendación para el cliente..."
              className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
            <button
              onClick={() => postAction({ actionType: 'SUGGESTED_ACTION', suggestedAction: suggestedActionText })}
              disabled={loading}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>

        {/* ── PHOTO CAPTURE (BEFORE / AFTER) ── */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Camera size={15} className="text-indigo-400" /> Registro Fotográfico de Campo
            </span>
          </div>

          {/* Hidden inputs */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={beforeInputRef}
            onChange={(e) => handlePhotoUpload(e, 'BEFORE')}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={afterInputRef}
            onChange={(e) => handlePhotoUpload(e, 'AFTER')}
            className="hidden"
          />

          {/* Fotos ANTES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">📸 Fotos ANTES</span>
              <button
                onClick={() => beforeInputRef.current?.click()}
                disabled={uploadingBefore}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
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
                {photosBefore.map((photo) => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-700 bg-slate-950">
                    <img src={photo.url} alt="Antes" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleDeletePhoto('BEFORE', photo.id)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity"
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
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
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
                {photosAfter.map((photo) => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-700 bg-slate-950">
                    <img src={photo.url} alt="Después" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleDeletePhoto('AFTER', photo.id)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── LOG DE PENDIENTES ── */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={15} className="text-amber-400" /> Log de Pendientes
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newPendingTitle}
              onChange={(e) => setNewPendingTitle(e.target.value)}
              placeholder="Agregar pendiente (ej. Cambiar filtro, fuga menor)..."
              className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 font-medium"
            />
            <button
              onClick={() => {
                if (!newPendingTitle.trim()) return;
                postAction({ actionType: 'ADD_PENDING', pendingTitle: newPendingTitle });
                setNewPendingTitle('');
              }}
              disabled={loading}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold rounded-xl text-xs shrink-0 transition-colors"
            >
              + Agregar
            </button>
          </div>

          {pendingItems.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-2 italic">Sin pendientes registrados</div>
          ) : (
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <div key={item.id} className="bg-slate-900/90 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-xs text-slate-200">{item.title}</div>
                    <div className="text-[10px] text-slate-500">Por {item.createdBy}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.status === 'ABIERTO' ? (
                      <>
                        <button
                          onClick={() => postAction({ actionType: 'TOGGLE_PENDING', pendingId: item.id, pendingStatus: 'CERRADO' })}
                          className="px-2 py-1 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded text-[10px] font-bold"
                        >
                          Cerrar
                        </button>
                        <button
                          onClick={() => postAction({ actionType: 'TOGGLE_PENDING', pendingId: item.id, pendingStatus: 'CANCELADO' })}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px] font-bold"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'CERRADO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50' : 'bg-slate-800 text-slate-400'}`}>
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── BITÁCORA Y NOTAS LIBRES ── */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={15} className="text-indigo-400" /> Bitácora / Notas de la Actividad
          </div>

          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            rows={3}
            placeholder="Escribe observaciones adicionales o resumen de trabajo..."
            className="w-full p-3 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium"
          />

          <button
            onClick={() => postAction({ actionType: 'NOTES', notes: notesText })}
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors shadow-lg shadow-indigo-900/40"
          >
            Guardar Bitácora
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-500 pt-4">
          Perry App | Módulo de Campo Rápido
        </div>
      </div>
    </div>
  );
}
