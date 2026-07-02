'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Loader2, Save, UserPlus } from 'lucide-react';

interface Technician {
  id: string;
  name: string;
  type: string;
  contractor?: { name: string };
}

interface Props {
  activityId: string;
  activityTitle: string;
  assignmentId?: string;
  initialTimeIn?: string;
  initialTimeOut?: string;
  initialTechnicianId?: string;
  initialTechnicianName?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function TechAssignmentModal({ 
  activityId, 
  activityTitle, 
  assignmentId,
  initialTimeIn = '', 
  initialTimeOut = '', 
  initialTechnicianId = '',
  initialTechnicianName = '',
  onClose, 
  onSaved 
}: Props) {
  const [technicianId, setTechnicianId] = useState(initialTechnicianId);
  const [timeIn, setTimeIn] = useState(initialTimeIn);
  const [timeOut, setTimeOut] = useState(initialTimeOut);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechs, setLoadingTechs] = useState(false);

  const isEditing = !!assignmentId;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setLoadingTechs(true);
      fetch('/api/technicians')
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data)) {
            setTechnicians(data.filter(t => t.isActive !== false));
          }
        })
        .finally(() => setLoadingTechs(false));
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!isEditing && !technicianId) {
      setError('Debes seleccionar un técnico');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let res;
      if (isEditing) {
        res = await fetch(`/api/activities/${activityId}/tech-assignments/${assignmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeIn: timeIn || null, timeOut: timeOut || null }),
        });
      } else {
        res = await fetch(`/api/activities/${activityId}/tech-assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ technicianId, timeIn: timeIn || null, timeOut: timeOut || null }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar');
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-500" />
              {isEditing ? 'Editar Horario del Técnico' : 'Agregar Técnico'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{activityTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          {!isEditing ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Técnico
              </label>
              {loadingTechs ? (
                <div className="p-3 border border-slate-200 rounded-lg text-sm text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando técnicos...
                </div>
              ) : (
                <select
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                >
                  <option value="">Selecciona un técnico...</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.type === 'SUBCONTRATADO' ? t.contractor?.name || 'Sub' : 'Interno'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Técnico
              </label>
              <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                {initialTechnicianName}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Entrada Logística
              </label>
              <input
                type="time"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Salida Logística
              </label>
              <input
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic">
            * Si dejas las horas en blanco, se usarán las horas globales de la actividad.
          </p>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!isEditing && !technicianId)}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
