'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  BrainCircuit, Repeat, Copy, Check, Filter, Search, Plus, 
  ShieldAlert, Sparkles, AlertTriangle, Building, ArrowUpRight, CheckCircle2, Clock, X
} from 'lucide-react';
import { canAccessWhatsappCoPilot } from '@/lib/permissions';

interface ImprovementItem {
  id: string;
  title: string;
  category: string;
  companyName: string | null;
  groupId: string | null;
  incidentSummary: string;
  recurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  rawContextText: string;
  aiAnalysis: string | null;
  proposedImprovement: string;
  copypastaPrompt: string;
  status: 'DETECTADO' | 'EN_PROGRESO' | 'RESUELTO' | 'ARCHIVADO';
  createdAt: string;
  updatedAt: string;
}

export default function PerryImprovementsPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<ImprovementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New pattern form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('LOGISTICA');
  const [newCompany, setNewCompany] = useState('MULTIEMPRESA');
  const [newSummary, setNewSummary] = useState('');
  const [newAnalysis, setNewAnalysis] = useState('');
  const [newProposal, setNewProposal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);

  const userEmail = (session?.user as any)?.email || '';
  const isAuthorized = canAccessWhatsappCoPilot(userEmail);

  const handleLiveScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/whatsapp/improvements?scan=true');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Error escaneando mejoras en vivo:', err);
    } finally {
      setScanning(false);
    }
  };

  const fetchImprovements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedCompany) params.append('company', selectedCompany);
      if (selectedStatus) params.append('status', selectedStatus);
      if (search) params.append('search', search);

      const res = await fetch(`/api/whatsapp/improvements?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Error cargando mejoras:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchImprovements();
    }
  }, [selectedCategory, selectedCompany, selectedStatus, isAuthorized]);

  // Copy to clipboard
  const handleCopyPrompt = async (item: ImprovementItem) => {
    try {
      await navigator.clipboard.writeText(item.copypastaPrompt);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  // Update status
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/whatsapp/improvements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        fetchImprovements();
      }
    } catch (err) {
      console.error('Error actualizando estatus:', err);
    }
  };

  // Submit new pattern
  const handleCreatePattern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newSummary || !newProposal) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/whatsapp/improvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          companyName: newCompany,
          incidentSummary: newSummary,
          aiAnalysis: newAnalysis,
          proposedImprovement: newProposal,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewTitle('');
        setNewSummary('');
        setNewAnalysis('');
        setNewProposal('');
        fetchImprovements();
      }
    } catch (err) {
      console.error('Error creando patrón:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return <div className="p-8 text-center text-slate-400">Cargando Perry Intelligence Improvements...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Acceso Restringido</h2>
          <p className="text-sm text-slate-400">
            El módulo de Perry Intelligence Improvements está reservado únicamente para la Dirección (Iván López).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/70 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
              <BrainCircuit className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Perry Intelligence Improvements
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
                  Exclusivo Dirección
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Detección de patrones, análisis de causas raíz y copiado directo de contexto para Antigravity
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleLiveScan}
              disabled={scanning}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/30 shrink-0"
            >
              <Sparkles className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Escaneando con IA...' : '⚡ Escanear Actividad Reciente (IA)'}
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 shrink-0"
            >
              <Plus className="w-4 h-4" /> Registrar Patrón / Incidencia
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Patrones Registrados</p>
            <h3 className="text-2xl font-black text-white mt-1">{items.length}</h3>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <BrainCircuit className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Mayor Recurrencia</p>
            <h3 className="text-2xl font-black text-rose-400 mt-1">
              {Math.max(0, ...items.map((i) => i.recurrenceCount))} Ocurrencias
            </h3>
          </div>
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
            <Repeat className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">En Progreso</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">
              {items.filter((i) => i.status === 'EN_PROGRESO').length}
            </h3>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Mejoras Resueltas</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">
              {items.filter((i) => i.status === 'RESUELTO').length}
            </h3>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-6 space-y-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Category Dropdown */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-400" /> Categoría
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 shadow-inner"
            >
              <option value="" className="bg-slate-900 text-white">Todas las categorías</option>
              <option value="SEGURIDAD" className="bg-slate-900 text-white">🦺 Seguridad / Normativa</option>
              <option value="LOGISTICA" className="bg-slate-900 text-white">🚛 Logística y Tiempos</option>
              <option value="COTIZACIONES" className="bg-slate-900 text-white">💵 Cotizaciones / Compras</option>
              <option value="PERMISOS" className="bg-slate-900 text-white">📄 Permisos y Firmas</option>
              <option value="PROVEEDORES" className="bg-slate-900 text-white">🏢 Proveedores</option>
              <option value="RECURSOS" className="bg-slate-900 text-white">👥 Traslape de Recursos</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> Estado
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 shadow-inner"
            >
              <option value="" className="bg-slate-900 text-white">Todos los estados</option>
              <option value="DETECTADO" className="bg-slate-900 text-white">🔴 Detectado</option>
              <option value="EN_PROGRESO" className="bg-slate-900 text-white">🟡 En Progreso</option>
              <option value="RESUELTO" className="bg-slate-900 text-white">🟢 Resuelto</option>
              <option value="ARCHIVADO" className="bg-slate-900 text-white">⚪ Archivado</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="flex-[1.5] min-w-[220px]">
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-400" /> Buscar patrón o propuesta
            </label>
            <form onSubmit={(e) => { e.preventDefault(); fetchImprovements(); }} className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ej. arnés, Aidco, plano, firma..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-inner"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/30 shrink-0"
              >
                Buscar
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Pattern Cards List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <BrainCircuit className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No se encontraron patrones de mejora</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Prueba ajustando los filtros o haciendo clic en "Registrar Patrón / Incidencia".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 md:p-6 shadow-xl transition-all space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                        {item.category}
                      </span>
                      {item.companyName && (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold">
                          {item.companyName}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1">
                        <Repeat className="w-3 h-3" /> {item.recurrenceCount} Ocurrencia{item.recurrenceCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    <h2 className="text-base md:text-lg font-bold text-white mt-1 leading-snug">
                      {item.title}
                    </h2>
                  </div>

                  {/* Status Dropdown */}
                  <div className="shrink-0 flex items-center gap-2">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                        item.status === 'RESUELTO'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                          : item.status === 'EN_PROGRESO'
                          ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                          : item.status === 'ARCHIVADO'
                          ? 'bg-slate-950 text-slate-400 border-slate-800'
                          : 'bg-rose-950 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      <option value="DETECTADO">🔴 Detectado</option>
                      <option value="EN_PROGRESO">🟡 En Progreso</option>
                      <option value="RESUELTO">🟢 Resuelto</option>
                      <option value="ARCHIVADO">⚪ Archivado</option>
                    </select>
                  </div>
                </div>

                {/* Grid info: Summary, Root cause, Proposal */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Summary */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                    <h4 className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Antecedentes / Incidencia
                    </h4>
                    <p className="text-slate-200 leading-relaxed">
                      {item.incidentSummary}
                    </p>
                  </div>

                  {/* AI Root cause */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                    <h4 className="font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Causa Raíz (Perry IA)
                    </h4>
                    <p className="text-indigo-200/90 leading-relaxed">
                      {item.aiAnalysis || 'Análisis de causa raíz en curso.'}
                    </p>
                  </div>

                  {/* Proposed Fix */}
                  <div className="bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-500/20 space-y-1">
                    <h4 className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Propuesta de Solución
                    </h4>
                    <p className="text-emerald-200/90 leading-relaxed">
                      {item.proposedImprovement}
                    </p>
                  </div>
                </div>

                {/* Copypasta Button Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] text-slate-500 font-medium">
                    Registrado: {new Date(item.firstSeenAt).toLocaleDateString('es-MX')} • Última ocurrencia: {new Date(item.lastSeenAt).toLocaleDateString('es-MX')}
                  </div>

                  <button
                    onClick={() => handleCopyPrompt(item)}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                      isCopied
                        ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-white" /> ¡Contexto Copiado al Portapapeles!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> 📋 Copiar Contexto para Antigravity
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add Pattern */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-400" /> Registrar Nuevo Patrón de Incidencia
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePattern} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Título del Patrón / Incidencia</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Faltante de EPP en maniobras nocturnas"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Categoría</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SEGURIDAD">Seguridad</option>
                    <option value="LOGISTICA">Logística</option>
                    <option value="COTIZACIONES">Cotizaciones</option>
                    <option value="PERMISOS">Permisos</option>
                    <option value="PROVEEDORES">Proveedores</option>
                    <option value="RECURSOS">Recursos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Empresa</label>
                  <select
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="MULTIEMPRESA">Multiempresa</option>
                    <option value="DROBOTS">Drobots</option>
                    <option value="OPUS INGENIUM">Opus Ingenium</option>
                    <option value="GRUPO CASEME">Grupo Caseme</option>
                    <option value="VULCAN FORGE">Vulcan Forge</option>
                    <option value="SAINPRO">Sainpro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Antecedentes / Resumen de la Incidencia</label>
                <textarea
                  required
                  rows={3}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Describe qué ocurrió y en qué grupos de WhatsApp o trabajos..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Análisis de Causa Raíz (Opcional)</label>
                <textarea
                  rows={2}
                  value={newAnalysis}
                  onChange={(e) => setNewAnalysis(e.target.value)}
                  placeholder="¿Por qué está ocurriendo esta fricción repetida?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Propuesta de Solución Operativa / Software</label>
                <textarea
                  required
                  rows={3}
                  value={newProposal}
                  onChange={(e) => setNewProposal(e.target.value)}
                  placeholder="¿Qué regla, campo o validación debe agregarse?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  {submitting ? 'Guardando...' : 'Guardar Patrón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
