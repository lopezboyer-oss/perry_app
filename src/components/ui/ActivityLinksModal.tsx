'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Link, Trash2, ExternalLink, ShieldCheck, HardHat, UserCheck, AlertTriangle } from 'lucide-react';

interface ActivityLinksModalProps {
  activity: {
    id: string;
    title: string;
    techToken1: string | null;
    techToken2: string | null;
    clientToken: string | null;
    clientAcknowledged: boolean;
    clientAcknowledgedBy: string | null;
    equipmentStatus: string | null;
  };
  onClose: () => void;
  onLinksUpdated: (activityId: string, updatedFields: any) => void;
}

export function ActivityLinksModal({ activity, onClose, onLinksUpdated }: ActivityLinksModalProps) {
  const [tokens, setTokens] = useState({
    techToken1: activity.techToken1,
    techToken2: activity.techToken2,
    clientToken: activity.clientToken,
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const getFullUrl = (type: 'tech' | 'client', token: string | null) => {
    if (!token || typeof window === 'undefined') return '';
    const origin = window.location.origin;
    if (type === 'tech') return `${origin}/campo/${token}`;
    return `${origin}/cliente-envio/${token}`;
  };

  const handleToggleLink = async (target: 'tech1' | 'tech2' | 'client', action: 'generate' | 'revoke') => {
    setLoadingKey(`${target}-${action}`);
    try {
      const res = await fetch(`/api/actividades/${activity.id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, action }),
      });
      const data = await res.json();
      if (res.ok) {
        let fieldName = '';
        if (target === 'tech1') fieldName = 'techToken1';
        if (target === 'tech2') fieldName = 'techToken2';
        if (target === 'client') fieldName = 'clientToken';

        setTokens((prev) => ({ ...prev, [fieldName]: data.token }));
        onLinksUpdated(activity.id, { [fieldName]: data.token });
      } else {
        alert('Error: ' + (data.error || 'No se pudo actualizar enlace'));
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setLoadingKey(null);
    }
  };

  const copyToClipboard = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-slide-in">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Link size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Enlaces Públicos Sin Login</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[240px]" title={activity.title}>
                {activity.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-4 text-xs">
          
          {/* Status indicators */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-700">Estado del Cliente:</span>
            {activity.clientAcknowledged ? (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md font-bold text-[10px] flex items-center gap-1">
                <ShieldCheck size={12} /> ENTERADO ({activity.clientAcknowledgedBy || 'Cliente'})
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-medium">
                ⏳ Pendiente de Confirmar
              </span>
            )}
          </div>

          {/* LINK TÉCNICO 1 */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <HardHat size={14} className="text-indigo-600" /> Enlace Técnico 1 (Campo)
              </span>
              {tokens.techToken1 ? (
                <button
                  onClick={() => handleToggleLink('tech1', 'revoke')}
                  disabled={loadingKey === 'tech1-revoke'}
                  className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-0.5 rounded transition-colors"
                >
                  Cancelar Enlace
                </button>
              ) : (
                <button
                  onClick={() => handleToggleLink('tech1', 'generate')}
                  disabled={loadingKey === 'tech1-generate'}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition-colors"
                >
                  Generar Enlace
                </button>
              )}
            </div>

            {tokens.techToken1 && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={getFullUrl('tech', tokens.techToken1)}
                  className="flex-1 px-2.5 py-1 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700 select-all"
                />
                <button
                  onClick={() => copyToClipboard('tech1', getFullUrl('tech', tokens.techToken1))}
                  className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold hover:bg-slate-700 transition-colors flex items-center gap-1"
                >
                  {copiedKey === 'tech1' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedKey === 'tech1' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            )}
          </div>

          {/* LINK TÉCNICO 2 */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <HardHat size={14} className="text-sky-600" /> Enlace Técnico 2 (Cuadrilla 2)
              </span>
              {tokens.techToken2 ? (
                <button
                  onClick={() => handleToggleLink('tech2', 'revoke')}
                  disabled={loadingKey === 'tech2-revoke'}
                  className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-0.5 rounded transition-colors"
                >
                  Cancelar Enlace
                </button>
              ) : (
                <button
                  onClick={() => handleToggleLink('tech2', 'generate')}
                  disabled={loadingKey === 'tech2-generate'}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] rounded-lg transition-colors"
                >
                  Generar Enlace
                </button>
              )}
            </div>

            {tokens.techToken2 && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={getFullUrl('tech', tokens.techToken2)}
                  className="flex-1 px-2.5 py-1 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700 select-all"
                />
                <button
                  onClick={() => copyToClipboard('tech2', getFullUrl('tech', tokens.techToken2))}
                  className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold hover:bg-slate-700 transition-colors flex items-center gap-1"
                >
                  {copiedKey === 'tech2' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedKey === 'tech2' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            )}
          </div>

          {/* LINK CLIENTE */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck size={14} className="text-emerald-600" /> Enlace Vista del Cliente
              </span>
              {tokens.clientToken ? (
                <button
                  onClick={() => handleToggleLink('client', 'revoke')}
                  disabled={loadingKey === 'client-revoke'}
                  className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-0.5 rounded transition-colors"
                >
                  Cancelar Enlace
                </button>
              ) : (
                <button
                  onClick={() => handleToggleLink('client', 'generate')}
                  disabled={loadingKey === 'client-generate'}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-colors"
                >
                  Generar Enlace
                </button>
              )}
            </div>

            {tokens.clientToken && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={getFullUrl('client', tokens.clientToken)}
                  className="flex-1 px-2.5 py-1 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700 select-all"
                />
                <button
                  onClick={() => copyToClipboard('client', getFullUrl('client', tokens.clientToken))}
                  className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold hover:bg-slate-700 transition-colors flex items-center gap-1"
                >
                  {copiedKey === 'client' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedKey === 'client' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
