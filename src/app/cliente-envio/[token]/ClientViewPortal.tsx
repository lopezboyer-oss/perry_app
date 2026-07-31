'use client';

import React, { useState } from 'react';
import { CheckCircle2, Clock, ShieldCheck, AlertTriangle, MessageSquare, Camera, Send, FileText, Check, Eye, X, ChevronDown, ChevronUp, Layers, AlertCircle, Bot, Sparkles, Calendar, RefreshCw, Copy, CheckCheck, Download, Printer } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface PhotoItem {
  id: string;
  url: string;
  uploadedBy?: string;
  uploadedAt: string;
}

interface ClientComment {
  id: string;
  author: string;
  comment: string;
  createdAt: string;
}

interface PendingItem {
  id: string;
  title: string;
  status: 'ABIERTO' | 'CERRADO' | 'CANCELADO';
  photos?: PhotoItem[];
  createdBy: string;
  createdAt: string;
  closedAt: string | null;
  closedBy: string | null;
}

interface ClientViewPortalProps {
  workOrderFolio: string;
  purchaseOrderOverride?: string | null;
  initialActivities: any[];
  initialComments: ClientComment[];
  token: string;
}

export function ClientViewPortal({ workOrderFolio, purchaseOrderOverride, initialActivities, initialComments, token }: ClientViewPortalProps) {
  const [activities, setActivities] = useState<any[]>(initialActivities);
  const [comments, setComments] = useState<ClientComment[]>(initialComments);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(
    initialActivities.length > 0 ? initialActivities[0].id : null
  );

  const [loading, setLoading] = useState(false);
  const [clientAuthor, setClientAuthor] = useState('Representante del Cliente');
  const [newComment, setNewComment] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // 🤖 AI Executive Summary Modal & State
  const [showAiModal, setShowAiModal] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'HOY' | 'AYER' | 'CUSTOM'>('CUSTOM');

  // Calculate Min and Max dates from existing activities
  const activityDates = activities.map((a) => a.date.substring(0, 10)).sort();
  const minDate = activityDates.length > 0 ? activityDates[0] : new Date().toISOString().substring(0, 10);
  const maxDate = activityDates.length > 0 ? activityDates[activityDates.length - 1] : new Date().toISOString().substring(0, 10);

  const [startDate, setStartDate] = useState(minDate);
  const [endDate, setEndDate] = useState(maxDate);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryResult, setAiSummaryResult] = useState<{ summary: string; periodLabel: string; activityCount: number } | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const clientName = initialActivities[0]?.client?.name || 'Cliente';
  const purchaseOrder = purchaseOrderOverride || initialActivities.find((a) => a.purchaseOrder)?.purchaseOrder || null;

  // Collect all pending items across activities
  const allPendingItems: { activityId: string; activityTitle: string; item: PendingItem }[] = [];
  activities.forEach((act) => {
    if (act.pendingItems) {
      const parsed: PendingItem[] = JSON.parse(act.pendingItems);
      parsed.forEach((item) => {
        allPendingItems.push({ activityId: act.id, activityTitle: act.title, item });
      });
    }
  });

  const handleExportPendingExcel = async () => {
    if (allPendingItems.length === 0) {
      alert('No hay pendientes registrados para exportar.');
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const rows = allPendingItems.map(({ activityTitle, item }) => {
        const act = activities.find((a) => a.id === item.id || a.title === activityTitle);
        return {
          '# Equipo': act?.manPowerEquipo || 'N/A',
          'Actividad': activityTitle,
          'Pendiente / Recomendación': item.title,
          'Estatus': item.status,
          'Registrado Por': item.createdBy || 'Técnico de Campo',
          'Fecha Registro': item.createdAt ? item.createdAt.substring(0, 10) : 'N/A',
          'Cerrado/Atendido Por': item.closedBy || 'N/A',
          'Fecha Cierre': item.closedAt ? item.closedAt.substring(0, 10) : 'N/A',
          'Cantidad de Fotos Evidencia': item.photos ? item.photos.length : 0,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Log_de_Pendientes');
      XLSX.writeFile(workbook, `Log_de_Pendientes_Odoo_${workOrderFolio}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Error al generar archivo Excel');
    }
  };

  const handleExportPendingPDF = () => {
    if (allPendingItems.length === 0) {
      alert('No hay pendientes registrados para exportar.');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Por favor permite las ventanas emergentes (popups) para ver el reporte PDF.');
      return;
    }

    const rowsHtml = allPendingItems
      .map(({ activityTitle, item }) => {
        const act = activities.find((a) => a.id === item.id || a.title === activityTitle);
        const photosHtml = item.photos && item.photos.length > 0
          ? item.photos.map((p: any) => `<img src="${p.url}" style="width:70px;height:70px;object-fit:cover;border-radius:6px;margin-right:4px;margin-bottom:4px;border:1px solid #ccc;" />`).join('')
          : '<span style="color:#999;font-style:italic;font-size:11px;">Sin fotos</span>';

        return `
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px;font-family:monospace;font-weight:bold;font-size:12px;">#${act?.manPowerEquipo || 'N/A'}</td>
            <td style="padding:10px;font-size:12px;font-weight:600;">${activityTitle}</td>
            <td style="padding:10px;font-size:12px;">${item.title}</td>
            <td style="padding:10px;font-size:11px;">
              <span style="padding:3px 8px;border-radius:12px;font-weight:bold;${
                item.status === 'CERRADO' ? 'background:#d1fae5;color:#065f46;' : item.status === 'ABIERTO' ? 'background:#fef3c7;color:#92400e;' : 'background:#f3f4f6;color:#374151;'
              }">${item.status}</span>
            </td>
            <td style="padding:10px;font-size:11px;color:#64748b;">${item.createdBy}<br/><small>${item.createdAt ? item.createdAt.substring(0, 10) : ''}</small></td>
            <td style="padding:10px;">${photosHtml}</td>
          </tr>
        `;
      })
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte de Pendientes - Orden Odoo #${workOrderFolio}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 30px; color: #1e293b; }
            h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
            .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 15px; text-align: right; font-weight: bold; font-size: 12px; color: #0f172a; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div style="font-size:10px;font-weight:800;color:#4f46e5;letter-spacing:1px;text-transform:uppercase;">PERRY APP • REPORTE OFICIAL DE CAMPO</div>
              <h1>Log de Pendientes y Recomendaciones</h1>
              <div style="font-size:12px;color:#64748b;">Orden Odoo #${workOrderFolio} ${purchaseOrder ? `• PO Cliente: ${purchaseOrder}` : ''}</div>
            </div>
            <div style="text-align:right;font-size:11px;color:#64748b;">
              Fecha de Emisión: ${new Date().toLocaleDateString('es-MX')}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th># Equipo</th>
                <th>Actividad</th>
                <th>Pendiente / Recomendación</th>
                <th>Estatus</th>
                <th>Registrado Por</th>
                <th>Evidencias Fotográficas</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            Servicio de Manpower By DROBOTS
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const postAction = async (payload: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cliente-envio/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, authorName: clientAuthor }),
      });
      const data = await res.json();
      if (res.ok) {
        if (payload.actionType === 'ENTERADO_ACTIVITY' && data.activity) {
          setActivities((prev) =>
            prev.map((a) => (a.id === data.activity.id ? { ...a, ...data.activity } : a))
          );
        } else if (payload.actionType === 'TOGGLE_PENDING' && data.activity) {
          setActivities((prev) =>
            prev.map((a) => (a.id === data.activity.id ? { ...a, ...data.activity } : a))
          );
        } else {
          const refreshRes = await fetch(`/api/cliente-envio/${token}`);
          const refreshData = await refreshRes.json();
          if (refreshRes.ok) {
            setActivities(refreshData.activities);
            setComments(refreshData.clientComments || []);
          }
        }
      } else {
        alert('Error: ' + (data.error || 'No se pudo registrar respuesta'));
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAiSummary = async () => {
    setAiSummaryLoading(true);
    try {
      const res = await fetch(`/api/cliente-envio/${token}/ai-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodFilter,
          startDate,
          endDate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiSummaryResult(data);
      } else {
        alert('Error: ' + (data.error || 'No se pudo generar el resumen ejecutivo'));
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al procesar con IA');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const handleCopyAiSummary = () => {
    if (!aiSummaryResult?.summary) return;
    navigator.clipboard.writeText(aiSummaryResult.summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleEnteradoActivity = (activityId: string) => {
    if (!clientAuthor.trim()) {
      alert('Por favor escribe tu nombre o representación');
      return;
    }
    postAction({ actionType: 'ENTERADO_ACTIVITY', activityId });
  };

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    postAction({ actionType: 'COMMENT', commentText: newComment });
    setNewComment('');
  };

  const handleTogglePending = (activityId: string, pendingId: string, pendingStatus: 'CERRADO' | 'CANCELADO') => {
    postAction({ actionType: 'TOGGLE_PENDING', activityId, pendingId, pendingStatus });
  };

  // Collect all out-of-service equipment activities
  const outOfServiceActivities = activities.filter((a) => a.equipmentStatus === 'FUERA_DE_SERVICIO');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-4 shadow-lg sticky top-0 z-30">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 font-extrabold text-white flex items-center justify-center text-sm shadow-md">
              P
            </div>
            <div>
              <div className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">
                PERRY APP • PORTAL DE CLIENTE
              </div>
              <h1 className="font-extrabold text-base leading-tight text-white">
                Orden Odoo #{workOrderFolio}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={clientAuthor}
              onChange={(e) => setClientAuthor(e.target.value)}
              placeholder="Tu nombre..."
              className="px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-indigo-500 max-w-[130px]"
            />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-xl mx-auto p-4 space-y-4">

        {/* Order Summary Card with AI Summary Button & PO Display */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {clientName}
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-1">Reporte de ManPower Odoo #{workOrderFolio}</h2>
            </div>
            
            {purchaseOrder ? (
              <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
                PO CLIENTE: {purchaseOrder}
              </span>
            ) : (
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                PO: S/N
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="text-xs text-slate-500">
              Total Actividades: <strong className="text-slate-800 font-bold">{activities.length}</strong>
            </div>

            {/* AI Executive Summary Trigger Button */}
            <button
              onClick={() => setShowAiModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md active:scale-[0.98] transition-all border border-slate-700"
            >
              <Bot size={16} className="text-indigo-400" />
              <span>RESUMEN EJECUTIVO IA</span>
            </button>
          </div>
        </div>

        {/* LISTA DE EQUIPOS INTERVENIDOS QUE QUEDARON FUERA DE SERVICIO */}
        {outOfServiceActivities.length > 0 && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
              <AlertCircle size={18} className="text-rose-600 animate-pulse" />
              <span>Equipos Intervenidos Que Quedaron FUERA DE SERVICIO ({outOfServiceActivities.length})</span>
            </div>

            <div className="space-y-2">
              {outOfServiceActivities.map((act) => (
                <div key={act.id} className="bg-white border border-rose-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {act.manPowerEquipo && (
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                          #{act.manPowerEquipo}
                        </span>
                      )}
                      <span className="font-extrabold text-xs text-slate-900">{act.title}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Fecha: {formatDate(act.date.substring(0, 10))}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-2xs">
                    FUERA DE SERVICIO
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI SUMMARY RESULT CARD (WHEN GENERATED) */}
        {aiSummaryResult && (
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl space-y-4 border border-slate-700 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md">
                  IA
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    Resumen Ejecutivo
                  </h3>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {aiSummaryResult.periodLabel} • {aiSummaryResult.activityCount} actividades evaluadas
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyAiSummary}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                >
                  {copiedSummary ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedSummary ? 'Copiado' : 'Copiar'}</span>
                </button>
                <button
                  onClick={() => setAiSummaryResult(null)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Structured Report Text */}
            <div className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap space-y-2 max-h-[60vh] overflow-y-auto pr-1 font-mono">
              {aiSummaryResult.summary}
            </div>
          </div>
        )}

        {/* Activities List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Layers size={16} className="text-indigo-600" /> Lista de Actividades Registradas
            </span>
          </div>

          {activities.map((act) => {
            const isExpanded = expandedActivityId === act.id;
            const photosBefore: PhotoItem[] = act.photosBefore ? JSON.parse(act.photosBefore) : [];
            const photosAfter: PhotoItem[] = act.photosAfter ? JSON.parse(act.photosAfter) : [];
            const isClosed = act.status === 'COMPLETADA' || act.status === 'CERRADA';
            const start = act.actualStartTime || act.startTime || 'S/H';
            const end = act.actualEndTime || act.endTime || 'S/H';

            return (
              <div
                key={act.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all"
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedActivityId(isExpanded ? null : act.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {act.manPowerEquipo && (
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          #{act.manPowerEquipo}
                        </span>
                      )}
                      <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{act.title}</h3>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Horarios: <strong className="font-mono text-slate-700">{start} - {end}</strong></span>
                      <span>• Fecha: <strong>{formatDate(act.date.substring(0, 10))}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {act.equipmentStatus === 'OPERATIVO' && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        🟢 Operativo
                      </span>
                    )}
                    {act.equipmentStatus === 'FUERA_DE_SERVICIO' && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                        🔴 Fuera Servicio
                      </span>
                    )}

                    {act.clientAcknowledged && (
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Enterado
                      </span>
                    )}

                    <div className="p-1 text-slate-400">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Activity Detail View */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs">
                    
                    {/* Botón Enterado específico para esta actividad si está cerrada */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      {act.clientAcknowledged ? (
                        <div className="flex items-center gap-2.5 text-emerald-800 font-bold">
                          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                          <div>
                            <div>✅ ENTERADO POR EL CLIENTE EN ESTA ACTIVIDAD</div>
                            <div className="text-[10px] font-normal text-emerald-600">
                              Confirmado por {act.clientAcknowledgedBy || 'Cliente'} el{' '}
                              {act.clientAcknowledgedAt ? formatDate(act.clientAcknowledgedAt.substring(0, 10)) : ''}
                            </div>
                          </div>
                        </div>
                      ) : isClosed ? (
                        <button
                          onClick={() => handleEnteradoActivity(act.id)}
                          disabled={loading}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                        >
                          <ShieldCheck size={18} />
                          MARCAR ESTA ACTIVIDAD COMO ENTERADO
                        </button>
                      ) : (
                        <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                          ⏳ Esta actividad aún está en progreso por el equipo técnico. El botón de confirmación se activará una vez finalizada.
                        </div>
                      )}
                    </div>

                    {/* Horarios */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Hora Inicio Real</div>
                        <div className="font-mono font-extrabold text-slate-800 text-sm mt-0.5">{start}</div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Hora Término Real</div>
                        <div className="font-mono font-extrabold text-slate-800 text-sm mt-0.5">{end}</div>
                      </div>
                    </div>

                    {/* Galería Fotos ANTES vs DESPUÉS */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Camera size={14} className="text-indigo-600" /> Evidencia Fotográfica
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-600">📸 Estado Inicial (ANTES)</div>
                        {photosBefore.length === 0 ? (
                          <div className="text-[10px] text-slate-400 italic">Sin fotos de estado inicial</div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {photosBefore.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => setPreviewPhoto(p.url)}
                                className="relative rounded-xl overflow-hidden aspect-square border border-slate-200 cursor-pointer group"
                              >
                                <img src={p.url} alt="Antes" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye size={16} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                        <div className="text-[11px] font-bold text-slate-600">✨ Trabajo Terminado (DESPUÉS)</div>
                        {photosAfter.length === 0 ? (
                          <div className="text-[10px] text-slate-400 italic">Sin fotos de trabajo terminado</div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {photosAfter.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => setPreviewPhoto(p.url)}
                                className="relative rounded-xl overflow-hidden aspect-square border border-slate-200 cursor-pointer group"
                              >
                                <img src={p.url} alt="Después" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye size={16} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bitácora de Campo */}
                    {act.weekendNotes && (
                      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                        <div className="font-bold text-slate-700 flex items-center gap-1">
                          <FileText size={14} className="text-slate-500" /> Observaciones / Bitácora de Campo
                        </div>
                        <p className="text-slate-600">{act.weekendNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Consolidado Log de Pendientes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={15} className="text-amber-500" /> Log de Pendientes / Recomendaciones
            </h3>

            {allPendingItems.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExportPendingExcel}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
                  title="Exportar a Excel"
                >
                  <Download size={13} /> Excel
                </button>
                <button
                  onClick={handleExportPendingPDF}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
                  title="Imprimir / Exportar PDF"
                >
                  <Printer size={13} /> PDF
                </button>
              </div>
            )}
          </div>

          {allPendingItems.length === 0 ? (
            <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              Sin pendientes registrados en esta Orden Odoo
            </div>
          ) : (
            <div className="space-y-2">
              {allPendingItems.map(({ activityId, activityTitle, item }) => (
                <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-xs text-slate-800">{item.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Actividad: {activityTitle} • Por {item.createdBy}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {item.status === 'ABIERTO' ? (
                        <>
                          <button
                            onClick={() => handleTogglePending(activityId, item.id, 'CERRADO')}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-colors"
                          >
                            Marcar Cerrado
                          </button>
                          <button
                            onClick={() => handleTogglePending(activityId, item.id, 'CANCELADO')}
                            className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-300 transition-colors"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'CERRADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.photos && item.photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-200">
                      {item.photos.map((p: any) => (
                        <div key={p.id} className="relative rounded-lg overflow-hidden aspect-square border border-slate-200 cursor-pointer group">
                          <img src={p.url} alt="Foto pendiente" className="w-full h-full object-cover group-hover:scale-105 transition-transform" onClick={() => setPreviewPhoto(p.url)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: Client Comments */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare size={15} className="text-indigo-600" /> Comentarios del Cliente
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe una observación o consulta..."
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            />
            <button
              onClick={handleSendComment}
              disabled={loading}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1"
            >
              <Send size={13} /> Enviar
            </button>
          </div>

          {comments.length === 0 ? (
            <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              Sin comentarios registrados
            </div>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">{c.author}</span>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(c.createdAt.substring(0, 10))}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{c.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fullscreen Lightbox Modal */}
        {previewPhoto && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewPhoto(null)}
          >
            <div className="relative max-w-3xl max-h-[90vh] bg-black rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
              >
                <X size={18} />
              </button>
              <img src={previewPhoto} alt="Evidencia" className="max-w-full max-h-[85vh] object-contain mx-auto" />
            </div>
          </div>
        )}

        {/* Modal: AI Executive Summary Period Filter */}
        {showAiModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-amber-300 flex items-center justify-center shadow-xs">
                    <Bot size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Generar Resumen Ejecutivo IA</h3>
                    <p className="text-[10px] text-slate-500">Formato conciso para Gerentes de Mantenimiento Tier 1</p>
                  </div>
                </div>
                <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {/* Period Selectors */}
              <div className="space-y-3 text-xs">
                <label className="block text-slate-700 font-bold">Seleccionar Periodo de Análisis:</label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPeriodFilter('HOY')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                      periodFilter === 'HOY'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    Hoy
                  </button>

                  <button
                    onClick={() => setPeriodFilter('AYER')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                      periodFilter === 'AYER'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    Ayer
                  </button>

                  <button
                    onClick={() => setPeriodFilter('CUSTOM')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                      periodFilter === 'CUSTOM'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    Periodo Orden
                  </button>
                </div>

                {/* Custom Period Constrained to Odoo Order bounds */}
                {periodFilter === 'CUSTOM' && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Calendar size={13} className="text-indigo-600" /> Rango de Fechas (Vigencia de la Orden):
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Desde</label>
                        <input
                          type="date"
                          min={minDate}
                          max={maxDate}
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Hasta</label>
                        <input
                          type="date"
                          min={minDate}
                          max={maxDate}
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 italic">
                      Fechas acotadas al periodo de actividades del folio (#{workOrderFolio}): {minDate} a {maxDate}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowAiModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowAiModal(false);
                    handleGenerateAiSummary();
                  }}
                  disabled={aiSummaryLoading}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  {aiSummaryLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Procesando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="text-amber-300" /> Generar Resumen
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="text-center text-[10px] text-slate-400 pt-2">
          Perry App | Portal de Atención e Inspección de Clientes
        </div>
      </div>
    </div>
  );
}
