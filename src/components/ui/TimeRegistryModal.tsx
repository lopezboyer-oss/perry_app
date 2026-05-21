'use client';

import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, Lock, Info, Loader2 } from 'lucide-react';

/** Get current time in Tijuana timezone as HH:MM */
function getCurrentTijuanaTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Tijuana',
  });
}

const PHASES = [
  {
    key: 'INICIO_LOGISTICO',
    label: 'Inicio Logístico',
    description: 'Hora en que inicia la actividad de preparativos previos a ingresar a planta.',
    color: 'indigo',
  },
  {
    key: 'INICIO_OPERATIVO',
    label: 'Inicio Operativo',
    description: 'Hora en que inicia de forma EFECTIVA la actividad en área de trabajo ya con permisos liberados.',
    color: 'blue',
  },
  {
    key: 'FINAL_OPERATIVO',
    label: 'Final Operativo',
    description: 'Hora en que se concluye el alcance, incluyendo confirmaciones, 5S y retiro de material y equipo del área de trabajo.',
    color: 'amber',
  },
  {
    key: 'FINAL_LOGISTICO',
    label: 'Final Logístico',
    description: 'Hora en que se culminan las tareas relacionadas a la actividad (material y equipo de regreso a trailer o zona de campamento en Obra).',
    color: 'emerald',
  },
] as const;

export interface TimeRegistryEntryData {
  id: string;
  phase: string;
  time: string;
  registeredBy: string;
  userId: string;
  registeredAt: string;
}

interface Props {
  activityId: string;
  activityTitle: string;
  entries: TimeRegistryEntryData[];
  onClose: () => void;
  onEntryAdded: (entry: TimeRegistryEntryData) => void;
}

export function TimeRegistryModal({ activityId, activityTitle, entries, onClose, onEntryAdded }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [liveTime, setLiveTime] = useState(() => getCurrentTijuanaTime());

  const entryMap = new Map(entries.map(e => [e.phase, e]));
  const registeredCount = entries.length;

  // Live clock update every second
  useEffect(() => {
    const interval = setInterval(() => setLiveTime(getCurrentTijuanaTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Find the next phase to register
  const nextPhaseIndex = PHASES.findIndex(p => !entryMap.has(p.key));

  const handleRegister = async () => {
    if (nextPhaseIndex < 0) return;
    const phase = PHASES[nextPhaseIndex];

    // Capture current Tijuana time at the moment of click
    const now = getCurrentTijuanaTime();

    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/activities/${activityId}/time-registry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: phase.key, time: now }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al registrar');
      } else {
        onEntryAdded({ ...data, registeredAt: data.registeredAt || new Date().toISOString() });
      }
    } catch {
      setError('Error de conexión');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Clock size={20} />
            <div>
              <h2 className="font-bold text-lg">Registro Horario</h2>
              <p className="text-indigo-100 text-xs leading-snug mt-0.5 max-w-[280px] truncate">{activityTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500">Progreso</span>
            <span className={`text-xs font-bold ${registeredCount === 4 ? 'text-emerald-600' : 'text-indigo-600'}`}>
              {registeredCount}/4 fases
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${registeredCount === 4 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${(registeredCount / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Phases */}
        <div className="px-5 py-3 space-y-3">
          {PHASES.map((phase, idx) => {
            const entry = entryMap.get(phase.key);
            const isActive = idx === nextPhaseIndex;
            const isLocked = idx > nextPhaseIndex && nextPhaseIndex >= 0;
            const isRegistered = !!entry;

            return (
              <div
                key={phase.key}
                className={`rounded-xl border-2 p-3 transition-all ${
                  isRegistered
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : isActive
                    ? 'border-indigo-300 bg-indigo-50/50 shadow-md shadow-indigo-100'
                    : 'border-slate-200 bg-slate-50/30 opacity-60'
                }`}
              >
                {/* Phase header */}
                <div className="flex items-center gap-2 mb-1.5">
                  {isRegistered ? (
                    <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                  ) : isActive ? (
                    <Clock size={16} className="text-indigo-600 flex-shrink-0 animate-pulse" />
                  ) : (
                    <Lock size={14} className="text-slate-400 flex-shrink-0" />
                  )}
                  <span className={`text-xs font-bold uppercase tracking-wide ${
                    isRegistered ? 'text-emerald-700' : isActive ? 'text-indigo-700' : 'text-slate-400'
                  }`}>
                    {idx + 1}. {phase.label}
                  </span>
                </div>

                {/* Registered data */}
                {isRegistered && entry && (
                  <div className="ml-6 mb-1.5">
                    <span className="text-lg font-bold font-mono text-emerald-700">{entry.time}</span>
                    <span className="text-[10px] text-slate-500 ml-2">
                      {entry.registeredBy} · {new Date(entry.registeredAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'America/Tijuana' })} {new Date(entry.registeredAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Tijuana' })}
                    </span>
                  </div>
                )}

                {/* Active — auto-register with current time */}
                {isActive && (
                  <div className="ml-6 flex items-center gap-2 mb-1.5">
                    <span className="text-lg font-bold font-mono text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200 animate-pulse">
                      {liveTime}
                    </span>
                    <button
                      onClick={handleRegister}
                      disabled={saving}
                      className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-md hover:shadow-lg"
                    >
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
                      Registrar Ahora
                    </button>
                  </div>
                )}

                {/* Locked message */}
                {isLocked && (
                  <p className="ml-6 text-[10px] text-slate-400 italic mb-1">
                    Pendiente — registra {PHASES[nextPhaseIndex]?.label} primero
                  </p>
                )}

                {/* Help description */}
                <div className="ml-6 flex items-start gap-1">
                  <Info size={10} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-slate-400 leading-snug">{phase.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
