'use client';

import React from 'react';
import { X, Printer, Calendar, FileText, CheckCircle2, AlertCircle, Building2, UserCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Activity {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  workOrderFolio: string | null;
  purchaseOrder: string | null;
  loto: boolean;
  weekendNotes: string | null;
  auditNotes: string | null;
  alertNotes: string | null;
  manPowerEquipo?: string | null;
  user: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
  timeRegistryEntries?: any[];
}

interface TechAssignment {
  id: string;
  activityId: string;
  technicianId: string;
  role: string;
  technician: { id: string; name: string };
}

interface OdooOrderReportModalProps {
  workOrderFolio: string;
  purchaseOrder: string | null;
  clientName: string | null;
  companyName: string;
  activities: Activity[];
  techAssignments: TechAssignment[];
  userName: string;
  onClose: () => void;
}

export function OdooOrderReportModal({
  workOrderFolio,
  purchaseOrder,
  clientName,
  companyName,
  activities,
  techAssignments,
  userName,
  onClose,
}: OdooOrderReportModalProps) {
  // Sort activities chronologically
  const sortedActivities = [...activities].sort((a, b) => a.date.localeCompare(b.date));

  // Extract dates and date range
  const dates = [...new Set(sortedActivities.map((a) => a.date.substring(0, 10)))].sort();
  const startDateStr = dates.length > 0 ? dates[0] : '';
  const endDateStr = dates.length > 0 ? dates[dates.length - 1] : '';

  // Group activities by date for readable daily breakdown
  const activitiesByDate: Record<string, Activity[]> = {};
  sortedActivities.forEach((act) => {
    const d = act.date.substring(0, 10);
    if (!activitiesByDate[d]) activitiesByDate[d] = [];
    activitiesByDate[d].push(act);
  });

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `REPORTE_MANPOWER_ODOO_${workOrderFolio}_${startDateStr}_AL_${endDateStr}`;
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      {/* Container */}
      <div className="bg-white w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden print:max-h-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Print Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: portrait; margin: 12mm; }
            body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .print\\:hidden { display: none !important; }
            .print\\:shadow-none { box-shadow: none !important; }
            .print\\:p-0 { padding: 0 !important; }
          }
        ` }} />

        {/* Modal Toolbar (hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Reporte de ManPower — Orden Odoo #{workOrderFolio}</h2>
              <p className="text-xs text-slate-400">Cliente: {clientName || 'N/A'} {purchaseOrder ? `| PO: ${purchaseOrder}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              <Printer size={15} /> Imprimir / Exportar PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body / Printable Document */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 print:overflow-visible print:p-0">
          
          {/* Document Header */}
          <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
                <span>PERRY APP</span>
                <span>•</span>
                <span>{companyName}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Reporte de ManPower
              </h1>
              <p className="text-slate-500 text-xs mt-1">
                Generado el {new Date().toLocaleDateString('es-MX')} {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} por {userName}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:text-right min-w-[200px]">
              <div className="text-xs text-slate-500">Orden Odoo:</div>
              <div className="font-mono font-extrabold text-indigo-700 text-lg">#{workOrderFolio}</div>
              <div className="text-xs text-slate-500 mt-1">PO Cliente:</div>
              <div className="font-mono font-bold text-slate-800 text-sm">
                {purchaseOrder || 'Sin PO asignada'}
              </div>
            </div>
          </div>

          {/* Encabezado Informativo de la Orden */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Building2 size={18} />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase text-slate-400 block tracking-wider">Empresa</span>
                <span className="text-sm font-bold text-slate-800">{companyName}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <UserCheck size={18} />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase text-slate-400 block tracking-wider">Cliente</span>
                <span className="text-sm font-bold text-slate-800">{clientName || 'Sin asignar'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <Calendar size={18} />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase text-slate-400 block tracking-wider">Periodo de Trabajo</span>
                <span className="text-sm font-bold text-slate-800">
                  {dates.length > 0 ? `${formatDate(startDateStr)} — ${formatDate(endDateStr)}` : 'Sin fechas'}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Activity Breakdown Table */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-200 pb-2">
              <FileText size={18} className="text-indigo-600" />
              Desglose Diario de Actividades Registradas
            </h3>

            {Object.entries(activitiesByDate).map(([dateKey, dayActs]) => (
              <div key={dateKey} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                {/* Date subheader */}
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                    <Calendar size={14} className="text-indigo-600" />
                    <span>{formatDate(dateKey)}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {dayActs.length} {dayActs.length === 1 ? 'actividad' : 'actividades'}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Horario</th>
                        <th className="px-4 py-2.5">Actividad</th>
                        <th className="px-4 py-2.5">Equipo</th>
                        <th className="px-4 py-2.5">Ingeniero / Técnicos</th>
                        <th className="px-4 py-2.5 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dayActs.map((act) => {
                        const assignedTechs = techAssignments.filter((ta) => ta.activityId === act.id);
                        const start = act.actualStartTime || act.startTime || 'S/H';
                        const end = act.actualEndTime || act.endTime || 'S/H';

                        return (
                          <tr key={act.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3 font-mono font-medium text-slate-700 whitespace-nowrap">
                              {start} - {end}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800 leading-snug">{act.title}</div>
                              {act.weekendNotes && (
                                <div className="text-[11px] text-slate-500 mt-1 italic">
                                  Nota: {act.weekendNotes}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600 font-medium whitespace-nowrap">
                              {act.manPowerEquipo ? (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[11px] font-bold">
                                  {act.manPowerEquipo}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-800">
                                {act.user?.name || 'Sin asignación'}
                              </div>
                              {assignedTechs.length > 0 && (
                                <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-1">
                                  {assignedTechs.map((ta) => (
                                    <span key={ta.id} className="text-slate-600">
                                      • {ta.technician.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  act.status === 'COMPLETADA' || act.status === 'CERRADA'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : act.status === 'EN_PROGRESO'
                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {act.status === 'COMPLETADA' || act.status === 'CERRADA' ? (
                                  <CheckCircle2 size={12} />
                                ) : (
                                  <AlertCircle size={12} />
                                )}
                                {act.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Document Footer */}
          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-2">
            <div>Perry App | Control de ManPower & Gestión de Operaciones</div>
            <div>Orden Odoo #{workOrderFolio}</div>
          </div>

        </div>
      </div>
    </div>
  );
}
