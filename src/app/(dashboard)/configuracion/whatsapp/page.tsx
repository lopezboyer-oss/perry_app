'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  MessageSquare, 
  RefreshCw, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Copy, 
  Check, 
  Layers, 
  Sparkles,
  Smartphone,
  ExternalLink
} from 'lucide-react';

interface GroupMapping {
  id: string;
  groupId: string;
  groupName: string | null;
  workOrderFolio: string | null;
  isActive: boolean;
  updatedAt: string;
}

interface MessageLog {
  id: string;
  messageId: string;
  groupId: string | null;
  senderPhone: string;
  senderName: string | null;
  rawMessage: string | null;
  mediaUrls: string | null;
  parsedData: string | null;
  status: string;
  missingField: string | null;
  createdAt: string;
  activity?: {
    id: string;
    title: string;
    workOrderFolio: string | null;
    manPowerEquipo: string | null;
  } | null;
}

export default function WhatsappConfigPage() {
  const [activeTab, setActiveTab] = useState<'groups' | 'logs'>('groups');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<GroupMapping[]>([]);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [copied, setCopied] = useState(false);

  // Form state for adding/editing group
  const [groupIdInput, setGroupIdInput] = useState('');
  const [groupNameInput, setGroupNameInput] = useState('');
  const [folioInput, setFolioInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/whatsapp/webhook`
    : 'https://perry.netlify.app/api/whatsapp/webhook';

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        setLogs(data.recentLogs || []);
      }
    } catch (err) {
      console.error('Error cargando configuración de WhatsApp:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupIdInput.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/whatsapp/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: groupIdInput.trim(),
          groupName: groupNameInput.trim() || 'Grupo WhatsApp',
          workOrderFolio: folioInput.trim() ? folioInput.trim().toUpperCase() : null,
          isActive: true,
        }),
      });

      if (res.ok) {
        setGroupIdInput('');
        setGroupNameInput('');
        setFolioInput('');
        setShowModal(false);
        setEditingId(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar grupo');
      }
    } catch (err) {
      console.error('Error guardando grupo:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('¿Deseas eliminar este mapeo de grupo?')) return;
    try {
      const res = await fetch(`/api/whatsapp/groups?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error eliminando grupo:', err);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Bot className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Perry Co-Pilot <span className="text-emerald-400 text-sm font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">WhatsApp Bot</span>
                </h1>
              </div>
              <p className="text-slate-400 text-sm mt-1">
                Captura automática de reportes de campo y refacciones mediante IA Multimodal desde grupos de WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              Actualizar
            </button>
            
            <button
              onClick={() => {
                setEditingId(null);
                setGroupIdInput('');
                setGroupNameInput('');
                setFolioInput('');
                setShowModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/30 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Vincular Grupo
            </button>
          </div>
        </div>

        {/* Webhook Connection Card */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">URL del Webhook de WhatsApp</span>
              <p className="text-sm font-mono text-emerald-300 select-all truncate max-w-md md:max-w-xl">{webhookUrl}</p>
            </div>
          </div>
          
          <button
            onClick={handleCopyWebhook}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors self-end md:self-auto"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            {copied ? '¡Copiado!' : 'Copiar URL'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('groups')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'groups'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Grupos Vinculados ({groups.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'logs'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Registro de Auditoría ({logs.length})
        </button>
      </div>

      {/* TAB 1: GRUPOS VINCULADOS */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          {groups.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">No hay grupos vinculados aún</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Agrega un grupo de WhatsApp asignando su ID y la Orden de Trabajo (OT) correspondiente para comenzar a procesar reportes automáticamente.
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Vincular Primer Grupo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((g) => (
                <div 
                  key={g.id}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 transition-all shadow-md group relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h4 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">
                          {g.groupName || 'Grupo de WhatsApp'}
                        </h4>
                        <span className="text-xs font-mono text-slate-400 block mt-0.5 truncate max-w-[220px]">
                          ID: {g.groupId}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                        g.isActive 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {g.isActive ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {g.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 mb-4 space-y-1.5">
                      <div className="text-xs text-slate-400 font-medium">Orden de Trabajo (OT / Folio) predeterminada:</div>
                      <div className="text-sm font-bold text-emerald-300 font-mono flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        {g.workOrderFolio || 'Sin OT asignada (Se detecta del texto)'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                    <span>Actualizado: {new Date(g.updatedAt).toLocaleDateString('es-MX')}</span>
                    <button
                      onClick={() => handleDeleteGroup(g.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Eliminar mapeo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Últimos Mensajes Procesados por Perry Co-Pilot</h3>
            <span className="text-xs text-slate-400">{logs.length} registros</span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No hay registros de mensajes procesados aún. Los mensajes enviados a los grupos configurados aparecerán aquí.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {logs.map((log) => {
                let parsedObj: any = null;
                try { parsedObj = JSON.parse(log.parsedData || '{}'); } catch {}

                return (
                  <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{log.senderName || log.senderPhone}</span>
                        <span className="text-xs text-slate-400 font-mono">({log.senderPhone})</span>
                        
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                          log.status === 'PROCESSED' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : log.status === 'PENDING_INFO'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {log.status === 'PROCESSED' ? '🤖 Registrado' : log.status === 'PENDING_INFO' ? '⏳ Pidiendo Info' : log.status}
                        </span>

                        {parsedObj?.manPowerEquipo && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-mono font-bold">
                            #{parsedObj.manPowerEquipo}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-300 italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 font-sans">
                        "{log.rawMessage}"
                      </p>

                      {log.activity && (
                        <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Guardado en Perry App: <strong>{log.activity.title}</strong> (OT: {log.activity.workOrderFolio || 'N/A'})</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right text-xs text-slate-500 shrink-0 self-end md:self-auto space-y-1">
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(log.createdAt).toLocaleString('es-MX')}
                      </div>
                      {log.groupId && <div className="font-mono text-slate-400 truncate max-w-[180px]">JID: {log.groupId}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Vincular Nuevo Grupo */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" /> Vincular Grupo de WhatsApp
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nombre del Grupo
                </label>
                <input
                  type="text"
                  placeholder="ej. OT S06447 - Mantenimiento Planta"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-inner"
                  style={{ color: '#ffffff', backgroundColor: '#020617' }}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  ID del Grupo / JID en WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="ej. 120363049123456789@g.us (Se genera al añadir el bot)"
                  value={groupIdInput}
                  onChange={(e) => setGroupIdInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-medium text-emerald-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-inner"
                  style={{ color: '#6ee7b7', backgroundColor: '#020617' }}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Orden de Trabajo (OT / Folio Odoo)
                </label>
                <input
                  type="text"
                  placeholder="ej. S06447 (Opcional - Si todas las fotos de este grupo corresponden a una OT)"
                  value={folioInput}
                  onChange={(e) => setFolioInput(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-medium text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-inner"
                  style={{ color: '#ffffff', backgroundColor: '#020617' }}
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium"
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                >
                  {saving ? 'Guardando...' : 'Guardar Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
