'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { canAccessWhatsappCoPilot } from '@/lib/permissions';
import { 
  ArrowLeft,
  Bot, 
  MessageSquare, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles,
  Building2,
  Mic,
  Wrench,
  AlertTriangle,
  Package,
  FileText,
  Search,
  Filter,
  Layers,
  Activity as ActivityIcon,
  Tag,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Users,
  MessageCircle
} from 'lucide-react';

interface CompanyInfo {
  id: string;
  name: string;
  shortName: string | null;
  color: string | null;
}

interface GroupMapping {
  id: string;
  groupId: string;
  groupName: string | null;
  companyId: string | null;
  company?: CompanyInfo | null;
  isActive: boolean;
  createdAt: string;
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
  createdAt: string;
  activity?: {
    id: string;
    title: string;
    workOrderFolio: string | null;
    manPowerEquipo: string | null;
  } | null;
}

interface AISummary {
  executiveSummary: string;
  workAdvances: string[];
  equipmentAlerts: Array<{ equipo: string; status: string; issue: string }>;
  materialRequests: Array<{ name: string; quantity: number; providerType: string }>;
  operationalRecommendations: string[];
  period?: string;
  messageCount?: number;
}

const safeFormatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX');
  } catch {
    return '';
  }
};

const safeFormatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return 'Sin fecha';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Sin fecha';
    return d.toLocaleString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return 'Sin fecha';
  }
};

export default function GroupDetailPage({ params }: { params: { groupId: string } }) {
  const { data: session } = useSession();
  const userEmail = (session?.user as any)?.email || '';

  const rawGroupId = params?.groupId ? String(params.groupId) : '';
  let decodedGroupId = rawGroupId;
  try {
    decodedGroupId = decodeURIComponent(rawGroupId);
  } catch {
    decodedGroupId = rawGroupId;
  }

  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [activePeriod, setActivePeriod] = useState<string | null>(null);
  const [group, setGroup] = useState<GroupMapping | null>(null);
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalMedia: 0,
    totalAudios: 0,
    operationalCount: 0,
    operationalPercentage: 0,
    typeCounts: {} as Record<string, number>,
  });
  const [detectedOTs, setDetectedOTs] = useState<Array<{ folio: string; count: number; lastSeenAt: string }>>([]);
  const [detectedEquipments, setDetectedEquipments] = useState<Array<{ equipo: string; lastStatus: string | null; count: number; lastSeenAt: string }>>([]);
  const [partsList, setPartsList] = useState<Array<{ name: string; quantity: number; providerType: string; senderName: string; createdAt: string }>>([]);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'feed' | 'ots' | 'equipment' | 'parts'>('feed');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  const fetchGroupDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/groups/${encodeURIComponent(decodedGroupId)}`);
      if (res.ok) {
        const data = await res.json();
        setGroup(data.group);
        setStats(data.stats);
        setDetectedOTs(data.detectedOTs || []);
        setDetectedEquipments(data.detectedEquipments || []);
        setPartsList(data.partsList || []);
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error cargando detalle de grupo:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAISummary = async (period: string) => {
    setGeneratingAI(true);
    setActivePeriod(period);
    try {
      const res = await fetch(`/api/whatsapp/groups/${encodeURIComponent(decodedGroupId)}/ai-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
      } else {
        alert('No se pudo generar el diagnóstico con IA');
      }
    } catch (err) {
      console.error('Error generando resumen de IA:', err);
    } finally {
      setGeneratingAI(false);
      setActivePeriod(null);
    }
  };

  useEffect(() => {
    fetchGroupDetail();
  }, [decodedGroupId]);

  const getMessageTypeBadge = (type?: string) => {
    switch (type) {
      case 'WORK_REPORT':
        return <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center gap-1"><Wrench className="w-3 h-3" /> Bitácora / Avance</span>;
      case 'ISSUE_ALERT':
        return <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Alerta de Falla</span>;
      case 'MATERIAL_REQUEST':
        return <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold flex items-center gap-1"><Package className="w-3 h-3" /> Refacciones / Material</span>;
      case 'COORDINATION':
        return <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold flex items-center gap-1"><Users className="w-3 h-3" /> Coordinación</span>;
      case 'CLIENT_REQUEST':
        return <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold flex items-center gap-1"><Building2 className="w-3 h-3" /> Solicitud Cliente</span>;
      case 'DIRECT_PRIVATE_CHAT':
        return <span className="px-2 py-0.5 rounded-md bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 text-xs font-semibold flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Chat Privado 1 a 1</span>;
      case 'SOCIAL_CHAT':
        return <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-xs font-medium">Chat Social</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1"><Zap className="w-3 h-3" /> Evento Operativo</span>;
    }
  };

  const filteredLogs = logs.filter(log => {
    let parsed: any = {};
    try {
      parsed = JSON.parse(log.parsedData || '{}');
    } catch {}

    const matchesSearch = !searchTerm || 
      (log.rawMessage && log.rawMessage.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.senderName && log.senderName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (parsed.title && parsed.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (parsed.manPowerEquipo && parsed.manPowerEquipo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (parsed.workOrderFolio && parsed.workOrderFolio.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (parsed.transcription && parsed.transcription.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = selectedTypeFilter === 'all' || parsed.messageType === selectedTypeFilter;

    return matchesSearch && matchesType;
  });

  if (!canAccessWhatsappCoPilot(userEmail)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex items-center justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-md space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Acceso Restringido</h2>
          <p className="text-sm text-slate-400">
            El módulo Perry Co-Pilot (WhatsApp Intelligence) está disponible únicamente para administradores autorizados.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
        <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm text-slate-400">Cargando Inteligencia Operativa del grupo...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4 max-w-md mx-auto mt-20">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Grupo no encontrado</h2>
          <p className="text-sm text-slate-400">El grupo solicitado no existe o fue desvinculado.</p>
          <Link 
            href="/configuracion/whatsapp"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Regresar al listado de grupos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* NAVEGACIÓN DE RETORNO Y HEADER */}
      <div className="space-y-4">
        <Link 
          href="/configuracion/whatsapp"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Perry Co-Pilot (Grupos de WhatsApp)
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800/90 p-6 rounded-3xl backdrop-blur-md">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {group.company ? (
                <span 
                  className="px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5"
                  style={{
                    backgroundColor: `${group.company.color || '#10b981'}15`,
                    color: group.company.color || '#34d399',
                    borderColor: `${group.company.color || '#10b981'}35`,
                  }}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {group.company.name} {group.company.shortName ? `(${group.company.shortName})` : ''}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-medium text-slate-400 bg-slate-950 border border-slate-800">
                  Sin empresa asignada
                </span>
              )}

              <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                group.isActive 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {group.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {group.isActive ? 'Monitoreo 100% Pasivo Activo' : 'Monitoreo Pausado'}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
              <Bot className="w-8 h-8 text-emerald-400 shrink-0" />
              <span>{group.groupName || 'Grupo de WhatsApp'}</span>
            </h1>

            <p className="text-xs font-mono text-slate-500 flex items-center gap-1">
              <span>ID JID:</span>
              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">{group.groupId}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchGroupDetail}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* RESUMEN EJECUTIVO IA — CARD CON 4 PERIODOS */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Resumen Ejecutivo IA</h3>
            <p className="text-xs text-slate-400">Diagnóstico operativo generado con Gemini 2.5 Flash</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { key: 'today', label: 'Día', icon: '📅', desc: 'Hoy' },
            { key: 'yesterday', label: 'Ayer', icon: '⏪', desc: 'Día anterior' },
            { key: 'week', label: '7 Días', icon: '📊', desc: 'Última semana' },
            { key: 'month', label: 'Mes', icon: '📆', desc: 'Mes actual' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => handleGenerateAISummary(p.key)}
              disabled={generatingAI}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
                activePeriod === p.key
                  ? 'bg-emerald-500/20 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/30 hover:bg-slate-900'
              }`}
            >
              <div className="text-lg mb-1">{p.icon}</div>
              <div className="text-sm font-bold text-white">{p.label}</div>
              <div className="text-[10px] text-slate-400">{p.desc}</div>
              {activePeriod === p.key && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Generando...
                </div>
              )}
            </button>
          ))}
        </div>

        {aiSummary && (
          <div className="text-xs text-slate-400 flex items-center gap-2 pt-1 border-t border-slate-800/60">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            {aiSummary.period && <span className="font-semibold text-emerald-400">{aiSummary.period}</span>}
            {aiSummary.messageCount !== undefined && <span>· {aiSummary.messageCount} mensajes analizados</span>}
          </div>
        )}
      </div>

      {/* GRID DE KPIs Y METRICAS DE INTELIGENCIA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Mensajes */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Mensajes Recibidos</span>
            <MessageSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{stats.totalMessages}</div>
          <p className="text-xs text-slate-400">
            Registrados y respaldados de forma continua.
          </p>
        </div>

        {/* Card 2: Relevancia Operativa */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Índice Operativo</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{stats.operationalPercentage}%</div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats.operationalPercentage}%` }} 
            />
          </div>
        </div>

        {/* Card 3: Audios Transcritos */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Notas de Voz</span>
            <Mic className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-extrabold text-teal-300">{stats.totalAudios}</div>
          <p className="text-xs text-slate-400">
            Transcritas e interpretadas por Gemini IA.
          </p>
        </div>

        {/* Card 4: Evidencias Multimedia */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Fotos & Evidencias</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-purple-300">{stats.totalMedia}</div>
          <p className="text-xs text-slate-400">
            Imágenes de trabajo y reportes gráficos.
          </p>
        </div>
      </div>

      {/* WIDGET DE DIAGNÓSTICO EJECUTIVO CON IA (GEMINI 2.5 FLASH) */}
      {aiSummary && (
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Diagnóstico Ejecutivo de Inteligencia Operativa (Perry IA)</h3>
                <p className="text-xs text-emerald-300">Análisis sintético multimodular basado en los reportes e interacción de este grupo.</p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
              Gemini 2.5 Flash
            </span>
          </div>

          {/* Resumen Narrativo */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-emerald-500/20">
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              "{aiSummary.executiveSummary}"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Avances */}
            {aiSummary.workAdvances && aiSummary.workAdvances.length > 0 && (
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Avances y Trabajos Reportados
                </h4>
                <ul className="space-y-1.5">
                  {aiSummary.workAdvances.map((adv, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recomendaciones Operativas */}
            {aiSummary.operationalRecommendations && aiSummary.operationalRecommendations.length > 0 && (
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase text-teal-400 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Recomendaciones Tácticas de Perry IA
                </h4>
                <ul className="space-y-1.5">
                  {aiSummary.operationalRecommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-teal-500 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alertas de Maquinaria */}
            {aiSummary.equipmentAlerts && aiSummary.equipmentAlerts.length > 0 && (
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Alertas de Maquinaria / Equipos Afectados
                </h4>
                <div className="space-y-2">
                  {aiSummary.equipmentAlerts.map((eq, idx) => (
                    <div key={idx} className="bg-rose-950/30 border border-rose-500/20 p-2.5 rounded-xl text-xs flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-rose-300 font-mono block">{eq.equipo}</span>
                        <span className="text-slate-300 text-[11px]">{eq.issue}</span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                        {eq.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Materiales Solicitados */}
            {aiSummary.materialRequests && aiSummary.materialRequests.length > 0 && (
              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase text-purple-400 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Refacciones y Materiales Identificados
                </h4>
                <div className="space-y-1.5">
                  {aiSummary.materialRequests.map((mat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-200 font-medium">{mat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-300 font-mono font-bold">Cant: {mat.quantity}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{mat.providerType}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECCIÓN PESTAÑAS PRINCIPALES: FEED / OTs / EQUIPOS / MATERIALES */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'feed'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Feed Operativo del Grupo ({logs.length})
          </button>

          <button
            onClick={() => setActiveTab('ots')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ots'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> OTs Detectadas ({detectedOTs.length})
          </button>

          <button
            onClick={() => setActiveTab('equipment')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'equipment'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" /> Equipos Mencionados ({detectedEquipments.length})
          </button>

          <button
            onClick={() => setActiveTab('parts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'parts'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Materiales Solicitados ({partsList.length})
          </button>
        </div>

        {/* TAB 1: FEED OPERATIVO DEL GRUPO */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            {/* Buscador y filtro por tipo */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input 
                  type="text"
                  placeholder="Buscar por remmitente, equipo, OT, texto o transcripción de audio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 w-full sm:w-auto"
              >
                <option value="all">Todos los tipos de mensaje</option>
                <option value="WORK_REPORT">Bitácora / Avance</option>
                <option value="ISSUE_ALERT">Alertas de Falla</option>
                <option value="MATERIAL_REQUEST">Refacciones / Materiales</option>
                <option value="COORDINATION">Coordinación</option>
                <option value="CLIENT_REQUEST">Solicitudes Cliente</option>
                <option value="SOCIAL_CHAT">Chat Social</option>
              </select>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl space-y-2">
                <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">No hay mensajes cargados que coincidan con la búsqueda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => {
                  let parsed: any = {};
                  try {
                    parsed = JSON.parse(log.parsedData || '{}');
                  } catch {}

                  let mediaList: string[] = [];
                  if (log.mediaUrls) {
                    try {
                      const pMedia = JSON.parse(log.mediaUrls);
                      if (Array.isArray(pMedia)) {
                        mediaList = pMedia;
                      } else if (typeof pMedia === 'string') {
                        mediaList = [pMedia];
                      }
                    } catch {
                      mediaList = [log.mediaUrls];
                    }
                  }

                  return (
                    <div
                      key={log.id}
                      className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getMessageTypeBadge(parsed.messageType)}
                          
                          {parsed.manPowerEquipo && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-mono font-bold">
                              EQ: {parsed.manPowerEquipo}
                            </span>
                          )}

                          {parsed.workOrderFolio && parsed.workOrderFolio !== 'Sin asignar' && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-mono font-bold">
                              OT: {parsed.workOrderFolio}
                            </span>
                          )}

                          <span className="text-xs text-slate-400 font-medium">
                            De: <strong className="text-slate-200">{log.senderName || log.senderPhone}</strong>
                          </span>
                        </div>

                        <span className="text-xs text-slate-500 font-mono">
                          {safeFormatDateTime(log.createdAt)}
                        </span>
                      </div>

                      {/* Resumen IA */}
                      {parsed.title && (
                        <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{parsed.title}</span>
                        </div>
                      )}

                      {/* Transcripción de Audio Gemini */}
                      {parsed.transcription && (
                        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                            <Mic className="w-3.5 h-3.5" /> Transcripción de Audio (Gemini IA):
                          </div>
                          <p className="italic">"{parsed.transcription}"</p>
                        </div>
                      )}

                      {/* Texto original recibido */}
                      {log.rawMessage && (
                        <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 leading-relaxed whitespace-pre-wrap">
                          {log.rawMessage}
                        </p>
                      )}

                      {/* Fotos de Evidencia */}
                      {mediaList.length > 0 && (
                        <div className="pt-2">
                          <span className="text-xs text-slate-400 font-medium block mb-2">Evidencias multimedia ({mediaList.length}):</span>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {mediaList.map((url, idx) => (
                              <a 
                                key={idx} 
                                href={url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="block group relative shrink-0 rounded-xl overflow-hidden border border-slate-800 hover:border-emerald-500 transition-colors"
                              >
                                <img src={url} alt="Evidencia" className="w-24 h-24 object-cover" />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <ExternalLink className="w-4 h-4 text-white" />
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Etiquetas IA */}
                      {parsed.tags && parsed.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {parsed.tags.map((tag: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-950 text-slate-400 border border-slate-800">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OTs DETECTADAS */}
        {activeTab === 'ots' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Ordenes de Trabajo (OT) Detectadas Dinámicamente
              </h3>
              <p className="text-xs text-slate-400">
                Folios identificados automáticamente por Gemini IA en los mensajes y audios del grupo.
              </p>
            </div>

            {detectedOTs.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">No se han mencionado folios de OT específicos en este grupo aún.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {detectedOTs.map((ot) => (
                  <div key={ot.folio} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold text-slate-500 block">Folio OT</span>
                      <span className="text-lg font-extrabold text-amber-400 font-mono">{ot.folio}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">{ot.count} menciones</span>
                      <span className="text-[10px] text-slate-500">Última: {safeFormatDate(ot.lastSeenAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EQUIPOS MENCIONADOS */}
        {activeTab === 'equipment' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-400" /> Equipos y Maquinaria Identificados
              </h3>
              <p className="text-xs text-slate-400">
                Codificaciones y matrículas de equipo reportadas por el personal técnico.
              </p>
            </div>

            {detectedEquipments.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">No se han identificado matrículas de equipos en los mensajes de este grupo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {detectedEquipments.map((eq) => (
                  <div key={eq.equipo} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-extrabold text-emerald-400 font-mono">{eq.equipo}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        eq.lastStatus === 'FUERA_DE_SERVICIO'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : eq.lastStatus === 'DEGRADADO'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {eq.lastStatus || 'OPERATIVO'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center justify-between">
                      <span>Reportes: {eq.count}</span>
                      <span className="text-[10px] text-slate-500">Último: {safeFormatDate(eq.lastSeenAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MATERIALES SOLICITADOS */}
        {activeTab === 'parts' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-400" /> Histórico de Refacciones y Consumibles Solicitados
              </h3>
              <p className="text-xs text-slate-400">
                Resumen consolidado de compras o refacciones requeridas en el grupo.
              </p>
            </div>

            {partsList.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">No hay requerimientos de materiales registrados en este grupo.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {partsList.map((part, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-200 block">{part.name}</span>
                      <span className="text-slate-500 text-[11px]">Solicitado por {part.senderName || 'Personal de campo'} • {safeFormatDate(part.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold font-mono">
                        Cant: {part.quantity}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[10px]">
                        {part.providerType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
