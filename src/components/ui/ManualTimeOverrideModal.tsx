'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Loader2, Save, Users } from 'lucide-react';

interface Props {
  activityId: string;
  activityTitle: string;
  initialInicio: string;
  initialFinal: string;
  initialTechCount: number;
  onClose: () => void;
  onSaved: () => void;
}

export function ManualTimeOverrideModal({ 
  activityId, 
  activityTitle, 
  initialInicio, 
  initialFinal, 
  initialTechCount, 
  onClose, 
  onSaved 
}: Props) {
  const [inicio, setInicio] = useState(initialInicio);
  const [final, setFinal] = useState(initialFinal);
  const [techCount, setTechCount] = useState(initialTechCount.toString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Prevenir scroll en el body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    
    try {
      const payload = {
        inicioTime: inicio || null,
        finalTime: final || null,
        actualTechCount: techCount ? parseInt(techCount, 10) : null
      };

      const res = await fetch(`/api/activities/${activityId}/manual-time-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Error al guardar los registros.');
      } else {
        onSaved();
      }
    } catch {
      setError('Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">Registro Manual</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 pr-4">{activityTitle}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Users size={14} className="text-indigo-500" /> Cantidad Real de Técnicos
              </label>
              <input 
                type="number" 
                min="0"
                value={techCount} 
                onChange={e => setTechCount(e.target.value)} 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                placeholder="Ej. 5"
              />
              <p className="text-[10px] text-slate-400 mt-1">Este número sobrescribirá la cantidad oficial asignada a la actividad.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Clock size={14} className="text-blue-500" /> Inicio Logístico
                </label>
                <input 
                  type="time" 
                  value={inicio} 
                  onChange={e => setInicio(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Clock size={14} className="text-emerald-500" /> Final Logístico
                </label>
                <input 
                  type="time" 
                  value={final} 
                  onChange={e => setFinal(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save size={14} /> Guardar Cambios
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
