'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Printer, CalendarDays, Clock, FileWarning } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface GanttViewModalProps {
  activities: any[];
  techAssignments: any[];
  safetyAssignments: any[];
  equipAssignments: any[];
  userSafetyAssignments: any[];
  lotoState: Record<string, boolean>;
  folioState: Record<string, string>;
  companyName: string;
  onClose: () => void;
}

type ViewMode = 'TODAY' | 'TOMORROW' | 'ALL' | 'SPECIFIC';

export function GanttViewModal({
  activities,
  techAssignments,
  safetyAssignments,
  equipAssignments,
  userSafetyAssignments,
  lotoState,
  folioState,
  companyName,
  onClose,
}: GanttViewModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('ALL');
  
  // Get unique dates from activities
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    activities.forEach(a => {
      if (a.date) {
        // Just the date part YYYY-MM-DD
        const dateStr = new Date(a.date).toISOString().split('T')[0];
        dates.add(dateStr);
      }
    });
    return Array.from(dates).sort();
  }, [activities]);

  const [specificDate, setSpecificDate] = useState<string>(availableDates[0] || '');

  // Today and Tomorrow strings
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  // The actual days to display
  const displayDates = useMemo(() => {
    if (viewMode === 'TODAY') {
      return [todayStr];
    }
    if (viewMode === 'TOMORROW') {
      return [tomorrowStr];
    }
    if (viewMode === 'SPECIFIC') {
      return specificDate ? [specificDate] : [];
    }
    return availableDates;
  }, [viewMode, specificDate, availableDates, todayStr, tomorrowStr]);

  // Filter activities that match the selected dates
  const displayedActivities = useMemo(() => {
    return activities.filter(a => {
      const actDate = new Date(a.date).toISOString().split('T')[0];
      return displayDates.includes(actDate);
    }).sort((a, b) => {
      // Sort by date, then by startTime, then by title
      const dateA = new Date(a.date).toISOString().split('T')[0];
      const dateB = new Date(b.date).toISOString().split('T')[0];
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const startA = a.startTime || '24:00';
      const startB = b.startTime || '24:00';
      if (startA !== startB) return startA.localeCompare(startB);
      return a.title.localeCompare(b.title);
    });
  }, [activities, displayDates]);

  // Split into those with schedule and without
  const scheduledActivities = displayedActivities.filter(a => a.startTime && a.endTime);
  const unscheduledActivities = displayedActivities.filter(a => !a.startTime || !a.endTime);

  const isMultiDay = viewMode === 'ALL';

  const handlePrint = () => {
    const originalTitle = document.title;
    
    try {
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      
      // Replace spaces with underscores and remove special chars
      const sanitizedCompany = companyName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
      
      document.title = `GANTT_SSD_${sanitizedCompany}_${dateStr}_${timeStr}`;
      window.print();
    } finally {
      // Always restore the title even if print fails
      document.title = originalTitle;
    }
  };

  // Helper to parse "HH:mm" to decimal hours (0 to 24)
  const timeToDecimal = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h + (m / 60);
  };

  // Calculate left % and width % for an activity
  const calculateBarStyles = (act: any) => {
    if (!act.startTime || !act.endTime) return { left: '0%', width: '0%' };
    
    let start = timeToDecimal(act.startTime);
    let end = timeToDecimal(act.endTime);
    
    if (end <= start) end += 24; // Handle past midnight cases simply (if any)

    if (isMultiDay) {
      // In ALL view, we show ALL dates consecutively.
      // Total timeline width = displayDates.length * 24 hours.
      const dateIndex = displayDates.indexOf(new Date(act.date).toISOString().split('T')[0]);
      if (dateIndex === -1) return { left: '0%', width: '0%' };

      const totalHours = displayDates.length * 24;
      const absoluteStartHours = (dateIndex * 24) + start;
      const durationHours = end - start;

      return {
        left: `${(absoluteStartHours / totalHours) * 100}%`,
        width: `${(durationHours / totalHours) * 100}%`,
      };
    } else {
      // Single day view (24 hours)
      return {
        left: `${(start / 24) * 100}%`,
        width: `${((end - start) / 24) * 100}%`,
      };
    }
  };

  // Helper to get formatted assignees
  const getAssigneesText = (actId: string) => {
    const techs = techAssignments.filter((x) => x.activityId === actId && x.role === 'TECNICO').map((x) => x.technician.name);
    
    const allSafetyForAct = safetyAssignments.filter((x) => x.activityId === actId);
    const supOperativo = [
      ...techAssignments.filter((x) => x.activityId === actId && x.role === 'SAFETY_DESIGNADO').map((x) => x.technician.name),
      ...(userSafetyAssignments || []).filter((x) => x.activityId === actId).map((x) => x.user.name),
      ...allSafetyForAct.filter((x) => x.role === 'DESIGNADO').map((x) => x.safetyDedicado.name),
    ];
    
    const dedicados = allSafetyForAct.filter((x) => x.role !== 'DESIGNADO').map((x) => x.safetyDedicado.name);
    
    let textParts = [];
    if (techs.length) textParts.push(`Téc: ${techs.join(', ')}`);
    if (supOperativo.length) textParts.push(`SupOp: ${supOperativo.join(', ')}`);
    if (dedicados.length) textParts.push(`Dedicado: ${dedicados.join(', ')}`);
    
    return textParts.join(' | ');
  };

  const getEqText = (actId: string) => {
    const eqs = equipAssignments.filter((x) => x.activityId === actId).map((x) => x.equip.name);
    return eqs.length > 0 ? `Eq: ${eqs.join(', ')}` : '';
  };

  return (
    <div id="gantt-modal-wrapper" className="fixed inset-0 z-50 bg-slate-900/50 flex flex-col items-center justify-center p-2 sm:p-4 backdrop-blur-sm print:bg-white print:p-0 print:block">
      
      {/* Hide this controls container when printing */}
      <div className="bg-white rounded-t-xl shadow-lg w-full max-w-7xl flex flex-col overflow-hidden print:hidden border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <CalendarDays size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Vista Gantt</h2>
              <p className="text-xs text-slate-500">Plan de trabajo visual</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Selector */}
            <div className="bg-slate-200 p-1 rounded-lg flex text-xs">
              <button 
                onClick={() => setViewMode('TODAY')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${viewMode === 'TODAY' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-slate-300'}`}
              >
                Hoy
              </button>
              <button 
                onClick={() => setViewMode('TOMORROW')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${viewMode === 'TOMORROW' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-slate-300'}`}
              >
                Mañana
              </button>
              <button 
                onClick={() => setViewMode('ALL')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${viewMode === 'ALL' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-slate-300'}`}
              >
                Todo el Shutdown
              </button>
              <button 
                onClick={() => setViewMode('SPECIFIC')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${viewMode === 'SPECIFIC' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-slate-300'}`}
              >
                Día Específico
              </button>
            </div>

            {viewMode === 'SPECIFIC' && (
              <select 
                className="text-sm border-slate-200 rounded-lg focus:ring-indigo-500"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
              >
                {availableDates.map(d => (
                  <option key={d} value={d}>{formatDate(d)}</option>
                ))}
              </select>
            )}

            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Printer size={16} /> Imprimir
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Printable Area */}
      <div className="bg-white w-full max-w-7xl flex-1 overflow-y-auto print:overflow-visible print:max-w-none print:shadow-none shadow-xl rounded-b-xl border border-t-0 border-slate-200">
        
        {/* CSS for print layout */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              size: landscape;
              margin: 0;
            }
            body, html {
              height: auto !important;
              overflow: visible !important;
              background-color: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            /* Hide the rest of the application so it doesn't take up space and generate blank pages */
            .print-gantt-mode > *:not(#gantt-modal-wrapper) {
              display: none !important;
            }
            header, nav, aside {
              display: none !important;
            }
            
            #gantt-modal-wrapper {
              position: relative !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 10mm !important; /* Only side padding, top/bottom handled by thead/tfoot */
              background: white !important;
              display: block !important;
            }
            .break-inside-avoid {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
            .print\\:bg-white { background-color: white !important; }
            .print\\:shadow-none { box-shadow: none !important; }
            .print\\:max-w-none { max-width: none !important; }
            .print\\:overflow-visible { overflow: visible !important; }
            .print\\:text-\\[10px\\] { font-size: 10px !important; }
            .print\\:text-\\[9px\\] { font-size: 9px !important; }
            .print\\:text-\\[8px\\] { font-size: 8px !important; }
            .print\\:leading-tight { line-height: 1.2 !important; }
          }
        `}} />

        <table className="w-full block print:table">
          <thead className="hidden print:table-header-group">
            <tr><td><div className="h-[10mm]"></div></td></tr>
          </thead>
          <tfoot className="hidden print:table-footer-group">
            <tr>
              <td className="pt-2 text-center text-[10px] text-slate-500 font-bold border-t border-slate-200" style={{ paddingBottom: '10mm' }}>
                Perry App | By Chigüire Labs
              </td>
            </tr>
          </tfoot>
          <tbody className="block print:table-row-group">
            <tr className="block print:table-row">
              <td className="block print:table-cell p-4 print:p-0">
          
          {/* Header Info */}
          <div className="mb-4 flex justify-between items-end border-b-2 border-slate-800 pb-2">
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight uppercase">Diagrama de Gantt - {companyName}</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">
                {viewMode === 'ALL' 
                  ? `Todo el Plan (${displayDates.length > 0 ? `${formatDate(displayDates[0])} al ${formatDate(displayDates[displayDates.length - 1])}` : 'Sin fechas'})`
                  : viewMode === 'TODAY' 
                    ? `Hoy (${formatDate(todayStr)})`
                    : viewMode === 'TOMORROW'
                      ? `Mañana (${formatDate(tomorrowStr)})`
                      : `Día: ${formatDate(specificDate)}`}
              </p>
            </div>
            <div className="text-right text-[10px] text-slate-500 font-mono">
              Generado: {new Date().toLocaleString()}
            </div>
          </div>

          {displayDates.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl mt-4">
              <CalendarDays size={48} className="mx-auto opacity-20 mb-3" />
              <p>No hay fechas o actividades para la vista seleccionada.</p>
            </div>
          ) : (
            <>
              {/* GANTT CONTAINER */}
              <div className="border border-slate-300 rounded overflow-hidden shadow-sm print:shadow-none text-xs">
                
                {/* TIMELINE HEADER */}
                <div className="flex bg-slate-100 border-b border-slate-300">
                  {/* Left Column (Details Header) */}
                  <div className="w-[300px] shrink-0 border-r border-slate-300 p-2 font-bold text-slate-700 flex items-center bg-slate-200">
                    Detalles de la Actividad
                  </div>
                  
                  {/* Right Column (Time Axis) */}
                  <div className="flex-1 flex flex-col">
                    {/* Days Row (only if ALL view) */}
                    {isMultiDay && (
                      <div className="flex border-b border-slate-300">
                        {displayDates.map((dateStr) => (
                          <div key={dateStr} className="flex-1 text-center font-bold text-slate-700 border-l first:border-l-0 border-slate-300 py-1 bg-slate-200" style={{ width: `${100 / displayDates.length}%` }}>
                            {formatDate(dateStr)}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Hours Row */}
                    <div className="flex">
                      {isMultiDay ? (
                        /* Multi-day hours blocks (4 blocks of 6 hours per day) */
                        displayDates.flatMap((dateStr) => [
                          <div key={`${dateStr}-1`} className="flex-1 text-center text-[9px] font-bold text-slate-600 border-l first:border-l-0 border-slate-300 py-1">00-06h</div>,
                          <div key={`${dateStr}-2`} className="flex-1 text-center text-[9px] font-bold text-slate-600 border-l border-slate-300 py-1">06-12h</div>,
                          <div key={`${dateStr}-3`} className="flex-1 text-center text-[9px] font-bold text-slate-600 border-l border-slate-300 py-1 bg-slate-50">12-18h</div>,
                          <div key={`${dateStr}-4`} className="flex-1 text-center text-[9px] font-bold text-slate-600 border-l border-slate-300 py-1 bg-slate-50">18-24h</div>,
                        ])
                      ) : (
                        /* Single-day hours (24 columns) */
                        Array.from({ length: 24 }).map((_, i) => (
                          <div key={i} className="flex-1 text-center text-[9px] font-bold text-slate-500 border-l first:border-l-0 border-slate-200 py-1">
                            {i}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* SCHEDULED ACTIVITIES ROWS */}
                <div className="divide-y divide-slate-200">
                  {scheduledActivities.map((act, index) => {
                    const isLoto = lotoState[act.id] !== undefined ? lotoState[act.id] : act.loto;
                    const folio = folioState[act.id] || act.workOrderFolio;
                    const assignees = getAssigneesText(act.id);
                    const eqText = getEqText(act.id);
                    const isEven = index % 2 === 0;

                    const barStyles = calculateBarStyles(act);
                    const originalIndex = activities.findIndex(a => a.id === act.id) + 1;

                    return (
                      <div key={act.id} className={`flex ${isEven ? 'bg-white' : 'bg-slate-50/50'} break-inside-avoid`}>
                        {/* Details Column */}
                        <div className="w-[300px] shrink-0 border-r border-slate-300 p-1.5 flex flex-col justify-center">
                          <div className="flex items-start gap-1">
                            <span className="bg-slate-200 text-slate-700 text-[8px] font-bold px-1 rounded inline-block mt-0.5 whitespace-nowrap">#{originalIndex}</span>
                            {isLoto && <span className="bg-red-600 text-white text-[8px] font-bold px-1 rounded inline-block mt-0.5 whitespace-nowrap">LOTO</span>}
                            {!!eqText && <span className="bg-sky-600 text-white text-[8px] font-bold px-1 rounded inline-block mt-0.5 whitespace-nowrap">ELEV</span>}
                            <span className="font-bold text-slate-800 leading-tight print:leading-tight print:text-[10px] break-words line-clamp-2" title={act.title}>
                              {act.title}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-x-2 mt-0.5 text-[9px] print:text-[9px] text-slate-500">
                            {folio && <span className="text-indigo-600 font-mono font-medium">#{folio}</span>}
                            {act.user?.name && <span>Resp: {act.user.name.split(' ')[0]}</span>}
                            <span>{act.startTime} - {act.endTime}</span>
                          </div>

                          {(assignees || eqText) && (
                            <div className="text-[9px] print:text-[8px] text-slate-500 mt-0.5 leading-tight opacity-90 break-words">
                              {assignees} {eqText ? ` | ${eqText}` : ''}
                            </div>
                          )}
                        </div>

                        {/* Timeline Column */}
                        <div className="flex-1 relative bg-slate-50/30">
                          {/* Grid Lines */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {isMultiDay ? (
                              displayDates.flatMap((dateStr) => [
                                <div key={`g-${dateStr}-1`} className="flex-1 border-l first:border-l-0 border-slate-200"></div>,
                                <div key={`g-${dateStr}-2`} className="flex-1 border-l border-slate-200"></div>,
                                <div key={`g-${dateStr}-3`} className="flex-1 border-l border-slate-200 bg-slate-100/30"></div>,
                                <div key={`g-${dateStr}-4`} className="flex-1 border-l border-slate-200 border-r border-slate-300 bg-slate-100/30"></div>,
                              ])
                            ) : (
                              Array.from({ length: 24 }).map((_, i) => (
                                <div key={`g-${i}`} className="flex-1 border-l first:border-l-0 border-slate-100"></div>
                              ))
                            )}
                          </div>

                          {/* The Gantt Bar */}
                          <div className="absolute top-0 bottom-0 py-1.5 px-0.5 pointer-events-none w-full">
                            <div 
                              className="h-full bg-indigo-500 rounded border border-indigo-700 shadow-sm relative overflow-hidden flex items-center justify-center print:border-indigo-800"
                              style={{ 
                                left: barStyles.left, 
                                width: barStyles.width,
                                minWidth: '4px' // Ensure very short tasks are visible
                              }}
                            >
                              {/* Add striping for LOTO activities to make them stand out in B/W print */}
                              {isLoto && (
                                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, #fff 5px, #fff 10px)' }}></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* UNSCHEDULED ACTIVITIES (if any) */}
              {unscheduledActivities.length > 0 && (
                <div className="mt-4 border border-orange-200 rounded overflow-hidden shadow-sm print:shadow-none text-xs break-inside-avoid">
                  <div className="bg-orange-50 border-b border-orange-200 p-2 font-bold text-orange-800 flex items-center gap-2">
                    <Clock size={14} /> Actividades sin Horario Definido
                  </div>
                  <div className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 bg-white">
                    {unscheduledActivities.map((act) => {
                       const isLoto = lotoState[act.id] !== undefined ? lotoState[act.id] : act.loto;
                       const folio = folioState[act.id] || act.workOrderFolio;
                       const assignees = getAssigneesText(act.id);
                       const eqText = getEqText(act.id);
                       const originalIndex = activities.findIndex(a => a.id === act.id) + 1;
                       
                       return (
                         <div key={act.id} className="border border-slate-200 p-2 rounded bg-slate-50 flex flex-col gap-1">
                           <div className="flex items-start gap-1">
                              <span className="bg-slate-200 text-slate-700 text-[8px] font-bold px-1 rounded inline-block whitespace-nowrap">#{originalIndex}</span>
                              {isLoto && <span className="bg-red-600 text-white text-[8px] font-bold px-1 rounded inline-block whitespace-nowrap">LOTO</span>}
                              {!!eqText && <span className="bg-sky-600 text-white text-[8px] font-bold px-1 rounded inline-block whitespace-nowrap">ELEV</span>}
                              <span className="font-bold text-slate-800 leading-tight print:leading-tight print:text-[10px] break-words">
                                {act.title}
                              </span>
                           </div>
                           <div className="text-[9px] print:text-[9px] text-slate-500 flex justify-between">
                              {folio ? <span className="text-indigo-600 font-mono font-medium">#{folio}</span> : <span></span>}
                              {act.user?.name && <span>Resp: {act.user.name.split(' ')[0]}</span>}
                           </div>
                           {assignees && (
                              <div className="text-[8px] text-slate-400 mt-auto pt-1 border-t border-slate-200">{assignees}</div>
                           )}
                         </div>
                       );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
