'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { canAccessWhatsappCoPilot } from '@/lib/permissions';
import { 
  Bot, 
  MessageSquare, 
  MessageCircle,
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
  Image,
  Tag,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Wrench,
  AlertTriangle,
  Package,
  Calendar,
  Users,
  Building2,
  Edit3,
  Mic,
  Printer,
  FileText,
  Share2,
  Sun,
  History,
  CalendarRange,
  CalendarDays,
  Archive,
  Globe,
  Building,
  Briefcase,
  ChevronRight,
  X
} from 'lucide-react';

interface DirectorSummaryData {
  executiveSummary: string;
  companySummaries?: Array<{
    companyName: string;
    summary: string;
  }>;
  sharedTopicsSummary?: string;
  resolvedCrossIssues: Array<{
    issue: string;
    originGroup: string;
    resolutionGroup: string;
    resolutionDetails: string;
  }>;
  unresolvedCriticalPending: Array<{
    issue: string;
    reportedGroup: string;
    status: string;
  }>;
  globalEquipmentStatus: Array<{
    equipo: string;
    status: string;
    issue: string;
  }>;
  globalMaterialRequests: Array<{
    name: string;
    quantity: number;
    providerType: string;
    requestedInGroup: string;
  }>;
  directorRecommendations: string[];
  period?: string;
  messageCount?: number;
  totalGroupsAnalyzed?: number;
}

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
  workOrderFolio: string | null;
  companyId: string | null;
  company?: CompanyInfo | null;
  isActive: boolean;
  messageCount?: number;
  mediaCount?: number;
  lastActivityAt?: string;
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

export default function WhatsappConfigPage() {
  const { data: session, status } = useSession();
  const userEmail = (session?.user as any)?.email || '';

  const [activeTab, setActiveTab] = useState<'groups' | 'logs'>('groups');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<GroupMapping[]>([]);
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [stats, setStats] = useState({ totalGroups: 0, totalIngestedMessages: 0, totalMediaFiles: 0 });
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

  // Form state for adding/editing group
  const [editingId, setEditingId] = useState<string | null>(null);
  const [groupIdInput, setGroupIdInput] = useState('');
  const [groupNameInput, setGroupNameInput] = useState('');
  const [companyIdInput, setCompanyIdInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('https://perryapp.netlify.app/api/whatsapp/webhook');

  // Director Summary State
  const [directorSummary, setDirectorSummary] = useState<DirectorSummaryData | null>(null);
  const [generatingDirectorAI, setGeneratingDirectorAI] = useState(false);
  const [activeDirectorPeriod, setActiveDirectorPeriod] = useState<string | null>(null);
  const [showDirectorModal, setShowDirectorModal] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const handleExportDirectorPDF = () => {
    if (typeof window === 'undefined') return;
    const container = document.getElementById('director-modal-container');
    if (!container) return;

    // Clone modal content without buttons
    const clone = container.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('button').forEach(btn => btn.remove());
    clone.querySelectorAll('style').forEach(s => s.remove());
    // Remove the inline dark-mode styles
    clone.removeAttribute('style');
    clone.removeAttribute('id');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Resumen Ejecutivo - Perry Intelligence</title>
  <style>
    @page { size: letter; margin: 0.5in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      background: #fff;
      padding: 20px;
      line-height: 1.5;
      font-size: 12px;
    }
    h3 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    h4 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    h5 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    p { font-size: 12px; line-height: 1.6; }
    strong { font-weight: 700; }
    ul { padding-left: 18px; }
    li { margin-bottom: 4px; }
    svg { display: none; }

    /* Layout */
    .space-y-6 > * + * { margin-top: 16px; }
    .space-y-3 > * + * { margin-top: 10px; }
    .space-y-2 > * + * { margin-top: 8px; }
    .space-y-1 > * + * { margin-top: 4px; }
    .space-y-1\\.5 > * + * { margin-top: 5px; }
    .space-y-2\\.5 > * + * { margin-top: 9px; }

    /* Flex helpers */
    .flex { display: flex; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .justify-between { justify-content: space-between; }
    .gap-1 { gap: 4px; }
    .gap-1\\.5 { gap: 6px; }
    .gap-2 { gap: 8px; }
    .gap-3 { gap: 12px; }
    .flex-wrap { flex-wrap: wrap; }
    .flex-1 { flex: 1; }
    .shrink-0 { flex-shrink: 0; }

    /* Cards and sections */
    [class*="rounded-xl"],
    [class*="rounded-lg"] {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Badges */
    [class*="rounded-full"],
    [class*="rounded-md"] {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
    }

    /* Grid → stack for print */
    .grid { display: block !important; }
    .grid > * { margin-bottom: 10px; }

    /* Semantic colors */
    .text-indigo-400, .text-indigo-300 { color: #4338ca; }
    .text-emerald-400, .text-emerald-300 { color: #059669; }
    .text-rose-400, .text-rose-300 { color: #e11d48; }
    .text-amber-400, .text-amber-300 { color: #d97706; }
    .text-purple-400, .text-purple-300 { color: #7c3aed; }
    .text-white { color: #0f172a; }
    .text-slate-200, .text-slate-300 { color: #334155; }
    .text-slate-400, .text-slate-500 { color: #64748b; }

    /* Text sizes */
    .text-xl { font-size: 18px; }
    .text-lg { font-size: 16px; }
    .text-sm { font-size: 12px; }
    .text-xs { font-size: 11px; }
    .text-\\[10px\\] { font-size: 10px; }
    .text-\\[11px\\] { font-size: 11px; }
    .font-bold { font-weight: 700; }
    .font-extrabold { font-weight: 800; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .uppercase { text-transform: uppercase; }
    .tracking-wider { letter-spacing: 0.05em; }
    .italic { font-style: italic; }
    .list-disc { list-style-type: disc; }

    /* Border helpers */
    .border-b { border-bottom: 1px solid #e2e8f0; }
    .border-t { border-top: 1px solid #e2e8f0; }
    .pb-2 { padding-bottom: 8px; }
    .pb-3 { padding-bottom: 12px; }
    .pb-4 { padding-bottom: 14px; }
    .pt-1 { padding-top: 4px; }
    .mt-2 { margin-top: 8px; }

    /* Hidden items */
    .hidden, [class*="backdrop-blur"] { display: none; }

    /* Dot indicator */
    .w-2.h-2 { width: 8px; height: 8px; display: inline-block; border-radius: 50%; background: #4338ca; }
  </style>
</head>
<body>${clone.innerHTML}</body>
</html>`);
    printWindow.document.close();
    // Wait for rendering then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      // Don't close immediately — let user finish the print dialog
    }, 400);
  };

  const handleCopyDirectorWhatsApp = () => {
    if (!directorSummary) return;

    const periodLabelMap: Record<string, string> = {
      today: 'Día (Hoy)',
      yesterday: 'Ayer',
      week: 'Última Semana (7 Días)',
      month: 'Mes Actual',
      all: 'Histórico Completo',
    };

    const periodName = directorSummary.period || periodLabelMap['today'];

    let text = `👔 *RESUMEN EJECUTIVO PARA DIRECCIÓN*\n`;
    text += `*PERRY INTELLIGENCE*\n`;
    text += `📅 *Periodo:* ${periodName}\n`;
    text += `👥 *Grupos Analizados:* ${directorSummary.totalGroupsAnalyzed || 0} | 💬 *Mensajes Procesados:* ${directorSummary.messageCount || 0}\n\n`;

    text += `📌 *SÍNTESIS GENERAL:* \n${directorSummary.executiveSummary}\n\n`;

    if (directorSummary.companySummaries && directorSummary.companySummaries.length > 0) {
      text += `🏢 *DESGLOSE POR EMPRESA*\n`;
      directorSummary.companySummaries.forEach((c) => {
        text += `• *${c.companyName}:*\n  ${c.summary}\n\n`;
      });
    }

    if (directorSummary.sharedTopicsSummary) {
      text += `🌐 *RECURSOS Y TEMAS TRANSVERSALES COMPARTIDOS*\n${directorSummary.sharedTopicsSummary}\n\n`;
    }

    if (directorSummary.resolvedCrossIssues && directorSummary.resolvedCrossIssues.length > 0) {
      text += `🟢 *ASUNTOS RESUELTOS CRUZADOS (${directorSummary.resolvedCrossIssues.length})*\n`;
      directorSummary.resolvedCrossIssues.forEach((item, i) => {
        text += `${i + 1}. *${item.issue}*\n   • Detalle: ${item.resolutionDetails}\n   • Campo: _${item.originGroup}_ -> Gestión: _${item.resolutionGroup}_\n`;
      });
      text += `\n`;
    }

    if (directorSummary.unresolvedCriticalPending && directorSummary.unresolvedCriticalPending.length > 0) {
      text += `🔴 *PENDIENTES CRÍTICOS REALES (${directorSummary.unresolvedCriticalPending.length})*\n`;
      directorSummary.unresolvedCriticalPending.forEach((item, i) => {
        text += `${i + 1}. *${item.issue}*\n   • Grupo: _${item.reportedGroup}_ | Estatus: *${item.status}*\n`;
      });
      text += `\n`;
    }

    if (directorSummary.globalEquipmentStatus && directorSummary.globalEquipmentStatus.length > 0) {
      text += `🛠️ *ESTATUS DE EQUIPOS & MAQUINARIA (${directorSummary.globalEquipmentStatus.length})*\n`;
      directorSummary.globalEquipmentStatus.forEach((eq) => {
        text += `• *${eq.equipo}* [${eq.status}]: ${eq.issue}\n`;
      });
      text += `\n`;
    }

    if (directorSummary.globalMaterialRequests && directorSummary.globalMaterialRequests.length > 0) {
      text += `📦 *SOLICITUDES DE MATERIALES (${directorSummary.globalMaterialRequests.length})*\n`;
      directorSummary.globalMaterialRequests.forEach((mat) => {
        text += `• *${mat.name}* (Cant: ${mat.quantity}) - _${mat.requestedInGroup}_\n`;
      });
      text += `\n`;
    }

    if (directorSummary.directorRecommendations && directorSummary.directorRecommendations.length > 0) {
      text += `👔 *RECOMENDACIONES DIRECTIVAS*\n`;
      directorSummary.directorRecommendations.forEach((rec, i) => {
        text += `${i + 1}. ${rec}\n`;
      });
      text += `\n`;
    }

    text += `_\nReporte generado automáticamente por Perry Intelligence_`;

    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 3000);
    }
  };

  const handleGenerateDirectorSummary = async (period: string) => {
    setGeneratingDirectorAI(true);
    setActiveDirectorPeriod(period);
    try {
      const res = await fetch('/api/whatsapp/director-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      if (res.ok) {
        const data = await res.json();
        setDirectorSummary(data.summary);
        setShowDirectorModal(true);
      } else {
        let errorMsg = 'No se pudo generar el Resumen para Dirección';
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch {}
        alert(`Error (${res.status}): ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('Error generando Resumen para Dirección:', err);
      alert(`Error de red: ${err.message || 'No se pudo conectar al servidor'}`);
    } finally {
      setGeneratingDirectorAI(false);
      setActiveDirectorPeriod(null);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/whatsapp/webhook`);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = selectedGroupFilter !== 'all' 
        ? `/api/whatsapp/groups?groupId=${encodeURIComponent(selectedGroupFilter)}`
        : '/api/whatsapp/groups';
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        setCompanies(data.companies || []);
        setLogs(data.recentLogs || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Error cargando configuración de WhatsApp:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedGroupFilter]);

  const openNewModal = () => {
    setEditingId(null);
    setGroupIdInput('');
    setGroupNameInput('');
    setCompanyIdInput('');
    setShowModal(true);
  };

  const openEditModal = (group: GroupMapping) => {
    setEditingId(group.id);
    setGroupIdInput(group.groupId);
    setGroupNameInput(group.groupName || '');
    setCompanyIdInput(group.companyId || '');
    setShowModal(true);
  };

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
          groupName: groupNameInput.trim() || 'Grupo Operaciones',
          companyId: companyIdInput ? companyIdInput : null,
          isActive: true,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        alert('Error al guardar la configuración del grupo.');
      }
    } catch (err) {
      console.error('Error guardando grupo:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas desvincular este grupo?')) return;
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
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getMessageTypeBadge = (messageType?: string) => {
    switch (messageType) {
      case 'man_power':
        return <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center gap-1"><Users className="w-3 h-3" /> Personal</span>;
      case 'refaccion':
        return <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold flex items-center gap-1"><Package className="w-3 h-3" /> Refacción</span>;
      case 'falla_equipo':
        return <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1"><Wrench className="w-3 h-3" /> Falla Equipo</span>;
      case 'audio_note':
        return <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-semibold flex items-center gap-1"><Mic className="w-3 h-3" /> Bitácora Voz</span>;
      case 'greeting':
        return <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-xs font-medium">Social / Saludo</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1"><Zap className="w-3 h-3" /> Operativo</span>;
    }
  };

  const renderBadgeType = (missingField: string | null, parsedDataStr: string | null) => {
    if (missingField) {
      return <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Falta: {missingField}</span>;
    }
    
    let type = 'operativo';
    try {
      if (parsedDataStr) {
        const parsed = JSON.parse(parsedDataStr);
        type = parsed.type || 'operativo';
      }
    } catch {}

    return getMessageTypeBadge(type);
  };

  // Filtered logs based on search term
  const filteredLogs = logs.filter((log) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const rawMatch = log.rawMessage?.toLowerCase().includes(term);
    const senderMatch = (log.senderName || log.senderPhone || '').toLowerCase().includes(term);
    const groupMatch = (log.groupId || '').toLowerCase().includes(term);
    let parsedMatch = false;
    try {
      const parsed = JSON.parse(log.parsedData || '{}');
      parsedMatch = 
        (parsed.title || '').toLowerCase().includes(term) ||
        (parsed.workOrderFolio || '').toLowerCase().includes(term) ||
        (parsed.manPowerEquipo || '').toLowerCase().includes(term) ||
        (parsed.transcription || '').toLowerCase().includes(term) ||
        (parsed.tags || []).some((t: string) => t.toLowerCase().includes(term));
    } catch {}
    return rawMatch || senderMatch || groupMatch || parsedMatch;
  });

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Perry Intelligence <span className="text-emerald-400 text-sm font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">WhatsApp Base de Conocimiento</span>
                </h1>
              </div>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                Ingesta pasiva y estructuración continua de mensajes, fotos y bitácoras operativas sin fricción ni interrupciones para los equipos de campo.
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
              onClick={openNewModal}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/30 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Registrar Grupo
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Grupos Operativos</span>
              <div className="text-xl font-bold text-white">{groups.filter(g => g.groupId.endsWith('@g.us')).length}</div>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Mensajes Registrados</span>
              <div className="text-xl font-bold text-white">{stats.totalIngestedMessages}</div>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Image className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Evidencias / Fotos</span>
              <div className="text-xl font-bold text-white">{stats.totalMediaFiles}</div>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Modo Operativo</span>
              <div className="text-sm font-bold text-teal-400">100% Silencioso / Pasivo</div>
            </div>
          </div>
        </div>

        {/* Webhook Connection Box */}
        <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
          <div className="flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Endpoint Webhook</span>
              <p className="text-xs font-mono text-emerald-300 select-all truncate max-w-md md:max-w-xl">{webhookUrl}</p>
            </div>
          </div>
          
          <button
            onClick={handleCopyWebhook}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors self-end md:self-auto"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            {copied ? '¡Copiado!' : 'Copiar Endpoint'}
          </button>
        </div>
      </div>

      {/* TARJETA DE INTELIGENCIA DIRECTIVA (SÍNTESIS MULTI-GRUPO C-LEVEL) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-indigo-500/20 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-md">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white tracking-tight">Resumen Ejecutivo para Dirección</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
                  Síntesis 360° Multi-Grupo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Conciliación sintética cruzada entre chats de campo (técnicos) y grupos de gestión (coordinación).
              </p>
            </div>
          </div>

          {directorSummary && (
            <button
              onClick={() => setShowDirectorModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-colors self-end md:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Ver Último Resumen Directivo
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          {[
            { key: 'today', label: 'Día', icon: Sun, iconColor: 'text-amber-400', desc: 'Hoy' },
            { key: 'yesterday', label: 'Ayer', icon: History, iconColor: 'text-blue-400', desc: 'Día anterior' },
            { key: 'week', label: '7 Días', icon: CalendarRange, iconColor: 'text-indigo-400', desc: 'Última semana' },
            { key: 'month', label: 'Mes', icon: CalendarDays, iconColor: 'text-purple-400', desc: 'Mes actual' },
            { key: 'all', label: 'Histórico', icon: Archive, iconColor: 'text-emerald-400', desc: 'Todos los grupos' },
          ].map((p) => {
            const IconComp = p.icon;
            return (
              <button
                key={p.key}
                onClick={() => handleGenerateDirectorSummary(p.key)}
                disabled={generatingDirectorAI}
                className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
                  activeDirectorPeriod === p.key && generatingDirectorAI
                    ? 'bg-indigo-600/30 border-indigo-500 text-white animate-pulse'
                    : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 hover:border-indigo-500/50 text-slate-200 shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <IconComp className={`w-4 h-4 ${p.iconColor}`} />
                  </div>
                  {activeDirectorPeriod === p.key && generatingDirectorAI && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  )}
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-white">{p.label}</div>
                  <div className="text-[10px] text-slate-400">{p.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'groups'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" /> Grupos Conectados ({groups.length})
          </button>
          
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Feed Operativo ({logs.length})
          </button>
        </div>

        {activeTab === 'logs' && (
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Buscar en mensajes, OTs, fallas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {groups.length > 0 && (
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Todos los grupos</option>
                {groups.map(g => (
                  <option key={g.groupId} value={g.groupId}>{g.groupName || g.groupId}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: GRUPOS VINCULADOS */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          {/* ── GRUPOS OPERATIVOS (@g.us) ── */}
          {groups.filter(g => g.groupId.endsWith('@g.us')).length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-emerald-400">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">¡Listo para conectar tu primer grupo!</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Agrega el número del bot al grupo de WhatsApp. En cuanto reciba el primer mensaje, se registrará automáticamente aquí o puedes pre-registrarlo con el botón superior.
                </p>
              </div>
              <button
                onClick={openNewModal}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm inline-flex items-center gap-2 shadow-lg shadow-emerald-600/30"
              >
                <Plus className="w-4 h-4" /> Registrar Primer Grupo Manualmente
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.filter(g => g.groupId.endsWith('@g.us')).map((g) => (
                <div 
                  key={g.id}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 transition-all shadow-md group relative flex flex-col justify-between hover:shadow-emerald-500/10 hover:shadow-xl"
                >
                  <Link 
                    href={`/configuracion/whatsapp/${encodeURIComponent(g.groupId)}`}
                    className="block space-y-3 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                          {g.groupName || 'Grupo de WhatsApp'}
                        </h4>
                        <span className="text-xs font-mono text-slate-500 block mt-0.5 truncate max-w-[200px]" title={g.groupId}>
                          {g.groupId}
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 shrink-0 ${
                        g.isActive 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {g.isActive ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {g.isActive ? 'Monitoreando' : 'Pausado'}
                      </span>
                    </div>

                    {/* Company Badge */}
                    <div>
                      {g.company ? (
                        <span 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border"
                          style={{
                            backgroundColor: `${g.company.color || '#10b981'}15`,
                            color: g.company.color || '#34d399',
                            borderColor: `${g.company.color || '#10b981'}35`,
                          }}
                        >
                          <Building2 className="w-3 h-3" />
                          {g.company.name} {g.company.shortName ? `(${g.company.shortName})` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-500 bg-slate-950 border border-slate-800">
                          <Building2 className="w-3 h-3 text-slate-600" />
                          Sin empresa asignada
                        </span>
                      )}
                    </div>

                    {/* Stats pill */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Mensajes</span>
                        <span className="text-base font-extrabold text-slate-200">{g.messageCount ?? 0}</span>
                      </div>
                      <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Fotos / Evidencias</span>
                        <span className="text-base font-extrabold text-emerald-400">{g.mediaCount ?? 0}</span>
                      </div>
                    </div>

                    <div className="pt-2 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 flex items-center justify-between bg-emerald-950/30 border border-emerald-500/20 px-3 py-2 rounded-xl transition-colors">
                      <span>Ver Inteligencia de Grupo</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>

                  <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {g.lastActivityAt ? safeFormatDateTime(g.lastActivityAt) : 'Sin actividad'}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          openEditModal(g);
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Editar grupo y empresa"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDeleteGroup(g.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Desvincular grupo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── CONVERSACIONES DIRECTAS (1 a 1 — @c.us) ── */}
          {groups.filter(g => !g.groupId.endsWith('@g.us')).length > 0 && (
            <div className="space-y-3 mt-8">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Conversaciones Directas (1 a 1)</h3>
                  <p className="text-xs text-slate-400">Contactos que han escrito directamente al bot de Perry por chat privado.</p>
                </div>
                <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  {groups.filter(g => !g.groupId.endsWith('@g.us')).length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {groups.filter(g => !g.groupId.endsWith('@g.us')).map((c) => (
                  <div
                    key={c.id}
                    className="bg-slate-900/60 border border-slate-800 hover:border-pink-500/30 rounded-xl p-4 transition-all flex items-center gap-3"
                  >
                    <div className="p-2 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate">
                        {c.groupName || c.groupId.replace('@c.us', '')}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-500 block truncate">{c.groupId}</span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-slate-400">{c.messageCount ?? 0} mensajes</span>
                        <span className="text-[10px] text-slate-500">{c.lastActivityAt ? safeFormatDateTime(c.lastActivityAt) : 'Sin actividad'}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 shrink-0">
                      Auto-Reply
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: FEED DE MENSAJES Y ANÁLISIS EN TIEMPO REAL */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" /> Feed Operativo en Vivo
              </h2>
              <p className="text-xs text-slate-400">
                Historial de todos los mensajes, fotos y reportes respaldados y analizados con Gemini IA.
              </p>
            </div>

            <button
              onClick={fetchData}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">No se encontraron mensajes registrados aún.</p>
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
                    className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 transition-all flex flex-col md:flex-row items-start justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
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

                      {/* Etiquetas detectadas por IA */}
                      {parsed.tags && parsed.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {parsed.tags.map((tag: string, idx: number) => (
                            <span key={idx} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-0.5">
                              <Tag className="w-2.5 h-2.5 text-emerald-400" /> {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Fotos / Archivos multimedia */}
                      {mediaList.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {mediaList.map((url, idx) => {
                              const isAudioFile = /\.(ogg|mp3|wav|m4a|opus)(\?|$)/i.test(url);
                              if (isAudioFile) {
                                return (
                                  <div key={idx} className="w-full max-w-xs bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center gap-2">
                                    <audio controls src={url} className="w-full h-8" />
                                  </div>
                                );
                              }
                              return (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 relative group cursor-pointer hover:border-emerald-400 transition-colors"
                                >
                                  <img src={url} alt="Evidencia" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                </a>
                              );
                            })}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{mediaList.length} archivo(s) adjunto(s)</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right text-xs text-slate-400 shrink-0 self-end md:self-auto space-y-1">
                      <div className="flex items-center gap-1 justify-end font-medium text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {safeFormatDateTime(log.createdAt)}
                      </div>
                      {log.groupId && (
                        <div className="font-mono text-slate-400 truncate max-w-[160px] text-[11px] bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                          {log.groupId.replace('@g.us', '')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Registrar / Editar Grupo */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}
            className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" /> {editingId ? 'Editar Grupo y Empresa' : 'Vincular Grupo de WhatsApp'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-base transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {editingId 
                ? 'Asigna la empresa correspondiente y ajusta el nombre o la orden de trabajo predeterminada para este grupo.'
                : 'Si ya agregaste el bot al grupo de WhatsApp, se auto-registrará al recibir el primer mensaje. O puedes pre-registrarlo aquí.'}
            </p>

            <form onSubmit={handleSaveGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                  Nombre Identificador del Grupo
                </label>
                <input
                  type="text"
                  placeholder="ej. Mantenimiento Caseme Planta Norte"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  autoComplete="off"
                  style={{ backgroundColor: '#020617', color: '#ffffff' }}
                  className="w-full bg-slate-950 border-2 border-slate-600 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-inner"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                  Empresa a la que Pertenece
                </label>
                <select
                  value={companyIdInput}
                  onChange={(e) => setCompanyIdInput(e.target.value)}
                  style={{ backgroundColor: '#020617', color: '#ffffff' }}
                  className="w-full bg-slate-950 border-2 border-slate-600 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer"
                >
                  <option value="" style={{ backgroundColor: '#020617', color: '#ffffff' }} className="bg-slate-950 text-white">
                    -- Sin empresa asignada / General --
                  </option>
                  {companies.map((c) => (
                    <option 
                      key={c.id} 
                      value={c.id} 
                      style={{ backgroundColor: '#020617', color: '#ffffff' }} 
                      className="bg-slate-950 text-white"
                    >
                      {c.name} {c.shortName ? `(${c.shortName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                  ID del Grupo / JID en WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="ej. 120363049123456789@g.us"
                  value={groupIdInput}
                  onChange={(e) => setGroupIdInput(e.target.value)}
                  disabled={!!editingId}
                  autoComplete="off"
                  style={{ 
                    backgroundColor: editingId ? '#1e293b' : '#020617', 
                    color: editingId ? '#34d399' : '#ffffff' 
                  }}
                  className={`w-full border-2 rounded-xl px-3.5 py-2.5 text-sm font-mono font-medium placeholder:text-slate-400 focus:outline-none transition-all shadow-inner ${
                    editingId 
                      ? 'bg-slate-800 border-slate-700 text-emerald-400 cursor-not-allowed opacity-90' 
                      : 'bg-slate-950 border-slate-600 focus:border-emerald-500 text-white focus:ring-2 focus:ring-emerald-500/30'
                  }`}
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-sm font-semibold transition-colors cursor-pointer border border-slate-700"
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  {saving ? 'Guardando...' : editingId ? 'Actualizar Cambios' : 'Guardar Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: RESUMEN EJECUTIVO PARA DIRECCIÓN */}
      {showDirectorModal && directorSummary && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div 
            id="director-modal-container"
            style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}
            className="bg-slate-900 border border-indigo-500/40 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 p-6"
          >

            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-indigo-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-white">
                      Resumen Ejecutivo para Dirección
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
                      Perry Intelligence
                    </span>
                  </div>
                  
                  {/* Badges de Métricas de Análisis */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Periodo: <strong className="text-white">{directorSummary.period || 'General'}</strong>
                    </span>

                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-indigo-300 font-medium flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      Grupos: <strong className="text-white">{directorSummary.totalGroupsAnalyzed || 0}</strong>
                    </span>

                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-emerald-300 font-medium flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      Mensajes Procesados: <strong className="text-white">{directorSummary.messageCount || 0}</strong>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExportDirectorPDF}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-95"
                  title="Imprimir o guardar como documento PDF"
                >
                  <Printer className="w-4 h-4 text-blue-400" />
                  Exportar PDF
                </button>

                <button
                  onClick={handleCopyDirectorWhatsApp}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/30 cursor-pointer active:scale-95"
                  title="Copiar resumen formateado para WhatsApp"
                >
                  {copiedWhatsApp ? <Check className="w-4 h-4 text-white" /> : <MessageCircle className="w-4 h-4 text-white" />}
                  {copiedWhatsApp ? '¡Copiado!' : 'Copiar para WhatsApp'}
                </button>

                <button
                  onClick={() => setShowDirectorModal(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Síntesis Ejecutiva C-Level */}
            <div className="bg-slate-950/80 border border-indigo-500/20 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Síntesis Directiva General
              </h4>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                {directorSummary.executiveSummary}
              </p>
            </div>

            {/* SECCIÓN ESTRUCTURADA POR EMPRESA */}
            {directorSummary.companySummaries && directorSummary.companySummaries.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-indigo-400" /> Desglose Operativo por Empresa
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {directorSummary.companySummaries.map((c, idx) => (
                    <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1.5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">{c.companyName}</h5>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {c.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN RECURSOS Y TEMAS TRANSVERSALES COMPARTIDOS */}
            {directorSummary.sharedTopicsSummary && (
              <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-400" /> Recursos & Temas Transversales Compartidos
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {directorSummary.sharedTopicsSummary}
                </p>
              </div>
            )}

            {/* Grid 2 Columnas: Asuntos Resueltos Cruzados vs Pendientes Reales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Asuntos Resueltos Cruzados */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Asuntos Resueltos Cruzados ({(directorSummary.resolvedCrossIssues || []).length})
                  </h4>
                  <span className="text-[10px] text-emerald-300/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Conciliado Campo vs Gestión
                  </span>
                </div>
                {(!directorSummary.resolvedCrossIssues || directorSummary.resolvedCrossIssues.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">No hay temas cruzados resueltos en este periodo.</p>
                ) : (
                  <div className="space-y-2.5">
                    {directorSummary.resolvedCrossIssues.map((item, idx) => (
                      <div key={idx} className="bg-slate-900/90 border border-emerald-500/20 rounded-lg p-3 space-y-1">
                        <div className="text-xs font-bold text-emerald-300">🟢 {item.issue}</div>
                        <div className="text-[11px] text-slate-300">{item.resolutionDetails}</div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          <span>Reportado en: <strong className="text-slate-200">{item.originGroup}</strong></span>
                          <span>Resuelto en: <strong className="text-emerald-400">{item.resolutionGroup}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pendientes Críticos Reales */}
              <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" /> Pendientes Críticos Reales ({(directorSummary.unresolvedCriticalPending || []).length})
                  </h4>
                  <span className="text-[10px] text-rose-300/80 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    Sin Seguimiento en Gestión
                  </span>
                </div>
                {(!directorSummary.unresolvedCriticalPending || directorSummary.unresolvedCriticalPending.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">🎉 ¡Excelente! No hay pendientes críticos sin resolver.</p>
                ) : (
                  <div className="space-y-2.5">
                    {directorSummary.unresolvedCriticalPending.map((item, idx) => (
                      <div key={idx} className="bg-slate-900/90 border border-rose-500/20 rounded-lg p-3 space-y-1">
                        <div className="text-xs font-bold text-rose-300">🔴 {item.issue}</div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          <span>Grupo: <strong className="text-slate-200">{item.reportedGroup}</strong></span>
                          <span className="text-amber-400 font-semibold">{item.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Estatus Global de Equipos y Refacciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Equipos */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-400" /> Equipos Mencionados ({(directorSummary.globalEquipmentStatus || []).length})
                </h4>
                {(!directorSummary.globalEquipmentStatus || directorSummary.globalEquipmentStatus.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">Sin novedades de maquinaria o equipos.</p>
                ) : (
                  <div className="space-y-2">
                    {directorSummary.globalEquipmentStatus.map((eq, idx) => (
                      <div key={idx} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-white">{eq.equipo}</div>
                          <div className="text-[11px] text-slate-400">{eq.issue}</div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                          eq.status?.toLowerCase().includes('operativo') ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {eq.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Materiales */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-purple-400" /> Solicitudes de Materiales ({(directorSummary.globalMaterialRequests || []).length})
                </h4>
                {(!directorSummary.globalMaterialRequests || directorSummary.globalMaterialRequests.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">No hay solicitudes de refacciones o insumos.</p>
                ) : (
                  <div className="space-y-2">
                    {directorSummary.globalMaterialRequests.map((mat, idx) => (
                      <div key={idx} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-white">{mat.name}</div>
                          <div className="text-[11px] text-slate-400">Grupo: {mat.requestedInGroup}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-purple-300">Cant: {mat.quantity}</span>
                          <div className="text-[10px] text-slate-400">{mat.providerType}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recomendaciones de Dirección */}
            {directorSummary.directorRecommendations && directorSummary.directorRecommendations.length > 0 && (
              <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-indigo-400" /> Recomendaciones Perry Co-Pilot para la Dirección
                </h4>
                <ul className="space-y-1.5 pl-4 list-disc text-xs text-slate-200">
                  {directorSummary.directorRecommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
