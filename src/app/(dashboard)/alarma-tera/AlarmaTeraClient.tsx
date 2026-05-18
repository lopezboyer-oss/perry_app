'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Shield, ShieldAlert, CheckCircle, XCircle, Image, FileText, X, Bell } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AlarmaActivity {
  id: string;
  title: string;
  status: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  workOrderFolio: string | null;
  teraFolio: string | null;
  teraUploadedAt: string | null;
  teraUploadedBy: string | null;
  hasImage: boolean;
  hasFolio: boolean;
  user: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
  company: { name: string; shortName: string | null } | null;
}

interface Props {
  activities: AlarmaActivity[];
  weekendDates: string[];
  selectedWeekend: string;
  totalActivities: number;
  compliantCount: number;
}

const DAY_NAMES = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export function AlarmaTeraClient({ activities, weekendDates, selectedWeekend, totalActivities, compliantCount }: Props) {
  const router = useRouter();
  const alarmaCount = activities.length;
  const complianceRate = totalActivities > 0 ? Math.round((compliantCount / totalActivities) * 100) : 100;

  // ── RECORDATORIO MODAL ──
  const [showRecordatorio, setShowRecordatorio] = useState(false);

  const generateRecordatorio = (): string => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

    if (activities.length === 0) {
      return `✅ *RECORDATORIO TERA — ${selectedWeekend}*\n\nTodas las actividades del plan cuentan con imagen y folio TERA. ¡Buen trabajo!\n\n_Mensaje de Perry App_\n_By CHIGÜIRE LABS_`;
    }

    let text = `⚠️ *RECORDATORIO TERA*\n`;
    text += `📅 Plan: *${selectedWeekend}*\n`;
    text += `🗓️ Fecha: ${dateStr}\n`;
    text += `❌ Pendientes: *${activities.length}* actividad${activities.length !== 1 ? 'es' : ''}\n`;
    text += `\nSe solicita cargar *Imagen TERA* y/o *Folio TERA* a las siguientes actividades:\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    // Group by company for clarity
    const byCompany = new Map<string, AlarmaActivity[]>();
    for (const act of activities) {
      const co = act.company?.name || 'Sin empresa';
      if (!byCompany.has(co)) byCompany.set(co, []);
      byCompany.get(co)!.push(act);
    }

    byCompany.forEach((acts, companyName) => {
      text += `\n🏢 *${companyName}*\n`;
      acts.forEach((act, i) => {
        const dayName = DAY_NAMES[new Date(act.date).getUTCDay()] || '';
        const folio = act.workOrderFolio || 'S/F';
        const missing = [];
        if (!act.hasImage) missing.push('📸 Imagen');
        if (!act.hasFolio) missing.push('📄 Folio');
        text += `\n  ${i + 1}. *${act.title}*\n`;
        text += `     👤 Sup: ${act.user?.name || '-'}\n`;
        text += `     📋 Folio Odoo: ${folio}\n`;
        text += `     📅 Día: ${dayName} ${act.date.substring(0, 10)}\n`;
        text += `     ⚡ Falta: ${missing.join(' · ')}\n`;
      });
      text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    });

    text += `\nFavor de subir la información al sistema a la brevedad.\n`;
    text += `\n_Mensaje de Perry App_\n_By CHIGÜIRE LABS_`;
    return text;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-red-500 to-amber-500 rounded-xl shadow-lg shadow-red-500/20">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Alarma TERA</h1>
            <p className="text-sm text-slate-500">Actividades sin imagen y/o folio TERA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* RECORDATORIO Button */}
          <button
            onClick={() => setShowRecordatorio(true)}
            className="btn-secondary !text-[10px] !py-1.5 !px-2.5 !bg-amber-50 !text-amber-700 !border-amber-300 hover:!bg-amber-100 leading-tight text-center flex items-center gap-1"
          >
            <Bell size={12} />
            <span>🔔 Recordatorio<br/>WhatsApp</span>
          </button>
          <select
            className="text-sm border border-slate-300 rounded-lg px-3 py-2"
            value={selectedWeekend}
            onChange={(e) => router.push(`/alarma-tera?weekend=${e.target.value}`)}
          >
            {weekendDates.map((d) => (
              <option key={d} value={d}>Fin de Semana: {d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Shield className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Total Actividades</p>
              <p className="text-2xl font-bold text-slate-800">{totalActivities}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Cumplidas</p>
              <p className="text-2xl font-bold text-emerald-600">{compliantCount}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${alarmaCount > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${alarmaCount > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Con Alarma</p>
              <p className={`text-2xl font-bold ${alarmaCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{alarmaCount}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${complianceRate >= 90 ? 'bg-emerald-100' : complianceRate >= 70 ? 'bg-amber-100' : 'bg-red-100'}`}>
              <Shield className={`w-5 h-5 ${complianceRate >= 90 ? 'text-emerald-600' : complianceRate >= 70 ? 'text-amber-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Cumplimiento</p>
              <p className={`text-2xl font-bold ${complianceRate >= 90 ? 'text-emerald-600' : complianceRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{complianceRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Resumen por Sup. Operativo ── */}
      {alarmaCount > 0 && (() => {
        const byUser = new Map<string, { name: string; count: number; missing: { image: number; folio: number } }>();
        for (const act of activities) {
          const key = act.user?.id || '__nouser__';
          const name = act.user?.name || 'Sin responsable';
          if (!byUser.has(key)) byUser.set(key, { name, count: 0, missing: { image: 0, folio: 0 } });
          const entry = byUser.get(key)!;
          entry.count++;
          if (!act.hasImage) entry.missing.image++;
          if (!act.hasFolio) entry.missing.folio++;
        }
        const sorted = [...byUser.values()].sort((a, b) => b.count - a.count);
        return (
          <div className="card overflow-hidden shadow-sm border-amber-200">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-amber-200">
              <h2 className="font-bold text-amber-800 flex items-center gap-2 text-sm">
                👤 Resumen por Sup. Operativo — TERA Pendiente
              </h2>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-3">
                {sorted.map(({ name, count, missing }) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm min-w-[200px]"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${count >= 3 ? 'bg-red-500' : count === 2 ? 'bg-amber-500' : 'bg-slate-400'}`}>
                      {count}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{name}</p>
                      <div className="flex gap-2 mt-0.5">
                        {missing.image > 0 && (
                          <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                            📸 {missing.image} img
                          </span>
                        )}
                        {missing.folio > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                            📄 {missing.folio} folio
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Table */}
      {alarmaCount === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500 opacity-60" />
          <h2 className="text-xl font-bold text-emerald-700 mb-2">¡Sin Alarmas!</h2>
          <p className="text-slate-500">Todas las actividades del plan cumplen con imagen y folio TERA.</p>
        </div>
      ) : (
        <div className="card overflow-hidden shadow-md border-red-200">
          <div className="bg-gradient-to-r from-red-50 to-amber-50 px-4 py-3 border-b border-red-200">
            <h2 className="font-bold text-red-800 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" />
              Actividades con TERA Pendiente ({alarmaCount})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr className="bg-red-50/50">
                  <th className="font-semibold w-[40px] text-center">#</th>
                  <th className="font-semibold w-[100px]">Día</th>
                  <th className="font-semibold w-[100px]">Horario</th>
                  <th className="font-semibold w-[120px]">Sup. Operativo</th>
                  <th className="font-semibold w-[110px]">Empresa</th>
                  <th className="font-semibold w-[120px]">Cliente</th>
                  <th className="font-semibold">Actividad</th>
                  <th className="font-semibold w-[80px]">Folio Odoo</th>
                  <th className="font-semibold w-[90px] text-center">Imagen</th>
                  <th className="font-semibold w-[90px] text-center">Folio TERA</th>
                  <th className="font-semibold w-[100px] text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((act, idx) => (
                  <tr key={act.id} className="hover:bg-red-50/30 transition-colors align-top">
                    <td className="text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="font-medium text-slate-800 text-xs">{formatDate(act.date)}</span>
                      <span className="block text-[10px] text-red-500 uppercase font-bold">
                        {DAY_NAMES[new Date(act.date).getUTCDay()]}
                      </span>
                      {act.date.substring(0, 10) >= new Date().toISOString().substring(0, 10) && (
                        <span className="block text-[9px] bg-amber-100 text-amber-700 font-bold px-1 rounded mt-0.5">⏳ pendiente</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono border border-slate-200">
                        {act.startTime || '--:--'} — {act.endTime || '--:--'}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-medium text-slate-700">{act.user?.name || '-'}</span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {act.company?.shortName || act.company?.name || '-'}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-slate-600">{act.client?.name || '-'}</span>
                    </td>
                    <td>
                      <p className="font-semibold text-slate-800 text-xs leading-snug">{act.title}</p>
                    </td>
                    <td>
                      <span className="text-xs font-mono text-slate-600">{act.workOrderFolio || '-'}</span>
                    </td>
                    <td className="text-center">
                      {act.hasImage ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          <Image size={10} />OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
                          <XCircle size={10} />FALTA
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      {act.hasFolio ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          <FileText size={10} />{act.teraFolio}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
                          <XCircle size={10} />FALTA
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      {!act.hasImage && !act.hasFolio ? (
                        <span className="inline-flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                          <AlertTriangle size={10} />CRÍTICO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          <AlertTriangle size={10} />PARCIAL
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RECORDATORIO MODAL ── */}
      {showRecordatorio && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowRecordatorio(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                🔔 Recordatorio TERA — {selectedWeekend}
              </h3>
              <button onClick={() => setShowRecordatorio(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Copy button */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <p className="text-xs text-amber-700 font-medium">
                {alarmaCount === 0
                  ? '✅ No hay pendientes — mensaje de confirmación listo'
                  : `⚠️ ${alarmaCount} actividad${alarmaCount !== 1 ? 'es' : ''} con TERA pendiente`}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateRecordatorio());
                  alert('🔔 Recordatorio copiado al portapapeles');
                }}
                className="btn-primary text-xs !py-1.5 !px-3 !bg-amber-500 hover:!bg-amber-600 !border-amber-600"
              >
                📋 Copiar para WhatsApp
              </button>
            </div>

            {/* Message preview */}
            <pre className="flex-1 overflow-y-auto p-5 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-mono bg-white">
              {generateRecordatorio()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
