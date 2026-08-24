'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Images, Calendar, Search, Filter, RefreshCw, Download, 
  X, User, Building, ExternalLink, ShieldAlert, Sparkles, ZoomIn, Eye
} from 'lucide-react';
import { canAccessWhatsappCoPilot } from '@/lib/permissions';

interface EvidenciaItem {
  id: string;
  logId: string;
  url: string;
  senderName: string;
  senderPhone?: string;
  groupId: string;
  groupName: string;
  companyName: string;
  caption: string;
  summary?: string;
  workOrderFolio?: string;
  createdAt: string;
}

export default function GaleriaEvidenciasPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<EvidenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<EvidenciaItem | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [activeDatePreset, setActiveDatePreset] = useState<string>('all');

  const userEmail = (session?.user as any)?.email || '';
  const isAuthorized = canAccessWhatsappCoPilot(userEmail);

  // Fetch evidencias
  const fetchEvidencias = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany) params.append('company', selectedCompany);
      if (selectedGroup) params.append('groupId', selectedGroup);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (search) params.append('search', search);

      const res = await fetch(`/api/whatsapp/evidencias?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Error cargando evidencias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchEvidencias();
    }
  }, [selectedCompany, selectedGroup, startDate, endDate, isAuthorized]);

  // Date Presets
  const setPresetLastWeekend = () => {
    setActiveDatePreset('last-weekend');
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
    let satDate: Date;
    if (dayOfWeek === 6) {
      satDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    } else if (dayOfWeek === 0) {
      satDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 8);
    } else {
      satDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dayOfWeek + 1));
    }
    const sunDate = new Date(satDate.getFullYear(), satDate.getMonth(), satDate.getDate() + 1);

    setStartDate(satDate.toISOString().split('T')[0]);
    setEndDate(sunDate.toISOString().split('T')[0]);
  };

  const setPresetLast7Days = () => {
    setActiveDatePreset('last-7-days');
    const now = new Date();
    const ago7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    setStartDate(ago7.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  };

  const setPresetThisMonth = () => {
    setActiveDatePreset('this-month');
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  };

  const resetPreset = () => {
    setActiveDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  // Run backfill for persistent images
  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const res = await fetch('/api/whatsapp/evidencias?action=backfill');
      if (res.ok) {
        await fetchEvidencias();
      }
    } catch {}
    setBackfilling(false);
  };

  if (status === 'loading') {
    return <div className="p-8 text-center text-slate-400">Cargando Galería de Evidencias...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Acceso Restringido</h2>
          <p className="text-sm text-slate-400">
            La Galería de Evidencias de WhatsApp está reservada únicamente para la Dirección (Iván López).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
              <Images className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Galería de Evidencias WhatsApp
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
                  Exclusivo Dirección
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Respaldos y fotos enviadas en los grupos operativos de Drobots, Opus, Caseme y Vulcan
              </p>
            </div>
          </div>

          <button
            onClick={handleBackfill}
            disabled={backfilling}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0"
            title="Respaldar imágenes antiguas para que nunca expiren"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${backfilling ? 'animate-spin' : ''}`} />
            {backfilling ? 'Respaldando fotos...' : 'Respaldar Fotos'}
          </button>
        </div>
      </div>

      {/* Bar Filters */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-6 space-y-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Company Dropdown */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-400" /> Empresa / Proyecto
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
            >
              <option value="" className="bg-slate-900 text-white">Todas las empresas</option>
              <option value="DROBOTS" className="bg-slate-900 text-white">Drobots (Pilot Ensamble)</option>
              <option value="OPUS INGENIUM" className="bg-slate-900 text-white">Opus Ingenium (Infineon)</option>
              <option value="GRUPO CASEME" className="bg-slate-900 text-white">Grupo Caseme (TMMBC)</option>
              <option value="VULCAN FORGE" className="bg-slate-900 text-white">Vulcan Forge</option>
              <option value="SAINPRO" className="bg-slate-900 text-white">Sainpro</option>
            </select>
          </div>

          {/* Keyword Search */}
          <div className="flex-[1.5] min-w-[240px]">
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-400" /> Buscar por texto o remitente
            </label>
            <form onSubmit={(e) => { e.preventDefault(); fetchEvidencias(); }} className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ej. Carlos, cotización, bomba, sticker..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
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

        {/* Date Presets Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Fechas:
          </span>

          <button
            type="button"
            onClick={setPresetLastWeekend}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeDatePreset === 'last-weekend'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            🗓️ Fin de Semana Pasado
          </button>

          <button
            type="button"
            onClick={setPresetLast7Days}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeDatePreset === 'last-7-days'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            ⏱️ Últimos 7 Días
          </button>

          <button
            type="button"
            onClick={setPresetThisMonth}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeDatePreset === 'this-month'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            📅 Este Mes
          </button>

          {activeDatePreset !== 'all' && (
            <button
              type="button"
              onClick={resetPreset}
              className="px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/40 border border-rose-500/20 transition-colors cursor-pointer"
            >
              Limpiar Fechas
            </button>
          )}

          <div className="ml-auto text-xs text-slate-400 font-medium">
            Mostrando <strong className="text-white">{items.length}</strong> evidencias
          </div>
        </div>
      </div>

      {/* Photos Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Images className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No se encontraron evidencias</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Prueba cambiando el filtro de empresa, o selecciona "Fin de Semana Pasado" para ver fotos registradas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => {
            const dateStr = new Date(item.createdAt).toLocaleString('es-MX', {
              timeZone: 'America/Tijuana',
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between"
              >
                {/* Photo Container */}
                <div className="relative aspect-square bg-slate-950 overflow-hidden">
                  <img
                    src={item.url}
                    alt={item.caption || 'Evidencia WhatsApp'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Overlay badge */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className="px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-[10px] font-bold text-indigo-300">
                      {item.companyName}
                    </span>
                  </div>
                  {/* Hover zoom icon */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="p-3 rounded-full bg-indigo-600/90 text-white shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                      <ZoomIn className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Info Metadata */}
                <div className="p-3 space-y-1.5 bg-slate-900/90">
                  <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                    <span className="truncate flex items-center gap-1">
                      <User className="w-3 h-3 text-indigo-400 shrink-0" />
                      {item.senderName}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0">{dateStr}</span>
                  </div>

                  {item.caption && (
                    <p className="text-xs text-slate-300 line-clamp-2 leading-snug">
                      {item.caption}
                    </p>
                  )}

                  {item.workOrderFolio && (
                    <div className="text-[10px] font-mono text-emerald-400">
                      OT: {item.workOrderFolio}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row">
            {/* Image Preview Container */}
            <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-[500px] p-4 relative">
              <img
                src={selectedItem.url}
                alt={selectedItem.caption || 'Evidencia WhatsApp'}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
              />
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sidebar Details */}
            <div className="w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                    {selectedItem.companyName}
                  </span>
                  <h3 className="text-base font-bold text-white mt-2 leading-snug">
                    {selectedItem.groupName}
                  </h3>
                </div>

                <div className="space-y-2 text-xs border-t border-b border-slate-800 py-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Enviado por:</span>
                    <span className="font-semibold text-white">{selectedItem.senderName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fecha y Hora:</span>
                    <span className="font-semibold text-slate-300">
                      {new Date(selectedItem.createdAt).toLocaleString('es-MX', { timeZone: 'America/Tijuana' })}
                    </span>
                  </div>
                  {selectedItem.workOrderFolio && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Folio OT:</span>
                      <span className="font-mono text-emerald-400 font-bold">{selectedItem.workOrderFolio}</span>
                    </div>
                  )}
                </div>

                {selectedItem.caption && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pie de Foto / Mensaje</h4>
                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                      "{selectedItem.caption}"
                    </p>
                  </div>
                )}

                {selectedItem.summary && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Contexto Perry IA
                    </h4>
                    <p className="text-xs text-indigo-200/90 leading-relaxed bg-indigo-950/30 p-3 rounded-xl border border-indigo-500/20">
                      {selectedItem.summary}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2">
                <a
                  href={selectedItem.url}
                  download={`Evidencia_${selectedItem.companyName}_${selectedItem.id}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  <Download className="w-4 h-4" /> Descargar Imagen
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
