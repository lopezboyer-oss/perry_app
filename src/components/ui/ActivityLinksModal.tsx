'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Link, HardHat, UserCheck, Loader2 } from 'lucide-react';

interface ActivityLinksModalProps {
  workOrderFolio: string;
  purchaseOrder?: string | null;
  clientName?: string | null;
  onClose: () => void;
}

export function ActivityLinksModal({ workOrderFolio, purchaseOrder, clientName, onClose }: ActivityLinksModalProps) {
  const [tokens, setTokens] = useState({
    techToken1: null as string | null,
    techToken2: null as string | null,
    clientToken: null as string | null,
  });
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchLinks();
  }, [workOrderFolio]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/odoo-links?workOrderFolio=${encodeURIComponent(workOrderFolio)}`);
      const data = await res.json();
      if (res.ok && data.link) {
        setTokens({
          techToken1: data.link.techToken1 || null,
          techToken2: data.link.techToken2 || null,
          clientToken: data.link.clientToken || null,
        });
      }
    } catch (err) {
      console.error('Error loading Odoo order links:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFullUrl = (type: 'tech' | 'client', token: string | null) => {
    if (!token || typeof window === 'undefined') return '';
    const origin = window.location.origin;
    if (type === 'tech') return `${origin}/campo/${token}`;
    return `${origin}/cliente-envio/${token}`;
  };

  const handleToggleLink = async (target: 'tech1' | 'tech2' | 'client', action: 'generate' | 'revoke') => {
    setLoadingKey(`${target}-${action}`);
    try {
      const res = await fetch('/api/odoo-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workOrderFolio, target, action }),
      });
      const data = await res.json();
      if (res.ok) {
        let fieldName: 'techToken1' | 'techToken2' | 'clientToken' = 'techToken1';
        if (target === 'tech1') fieldName = 'techToken1';
        if (target === 'tech2') fieldName = 'techToken2';
        if (target === 'client') fieldName = 'clientToken';

        setTokens((prev) => ({ ...prev, [fieldName]: data.token }));
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-slide-in">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
              <Link size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-tight">Enlaces Públicos Sin Login</h3>
              <p className="text-[11px] text-indigo-300 font-mono">
                Orden Odoo #{workOrderFolio} {purchaseOrder ? `• PO: ${purchaseOrder}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-4 text-xs">
          
          {clientName && (
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-700">Cliente:</span>
              <span className="font-extrabold text-indigo-700">{clientName}</span>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-indigo-600" />
              <span>Cargando enlaces de la Orden Odoo...</span>
            </div>
          ) : (
            <>
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
            </>
          )}

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
