import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Activity {
  id: string;
  date: string;
  title: string;
  equipo?: string | null;
  manPowerEquipo?: string | null;
  timeRegistryEntries?: any[];
  parts?: any[];
  manPowerPhotos?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  user?: { id: string; name: string } | null;
}

interface ExecutiveSummaryPDFProps {
  activities: Activity[];
  techAssignments: any[];
  aiSummary: string;
  aiSummaries?: {equipo: string, resumen: string}[];
  onClose: () => void;
  reportContext: string;
  reportEquipo?: string;
  userName: string;
}

export function ExecutiveSummaryPDF({ activities, techAssignments, aiSummary, aiSummaries, onClose, reportContext, reportEquipo, userName }: ExecutiveSummaryPDFProps) {
  
  // -- Calculations --
  const totalDays = new Set(activities.map(a => a.date)).size;
  
  let totalManHours = 0;
  const uniqueTechs = new Set<string>();
  
  const hoursByEquipo: Record<string, number> = {};
  const activitiesByEquipo: Record<string, number> = {};

  activities.forEach(act => {
    const equipo = act.manPowerEquipo || act.equipo || 'Sin Equipo';
    activitiesByEquipo[equipo] = (activitiesByEquipo[equipo] || 0) + 1;

    // Calculate duration of the activity
    let actDurationHours = 0;
    
    const startStr = (act.actualStartTime && act.actualEndTime) ? act.actualStartTime : act.startTime;
    const endStr = (act.actualStartTime && act.actualEndTime) ? act.actualEndTime : act.endTime;
    
    if (startStr && endStr) {
      const [sh, sm] = startStr.split(':').map(Number);
      const [eh, em] = endStr.split(':').map(Number);
      let sMins = sh * 60 + sm;
      let eMins = eh * 60 + em;
      if (eMins < sMins) eMins += 1440; // overnight
      actDurationHours = (eMins - sMins) / 60;
    }

    // Number of technicians assigned
    const actTechs = techAssignments.filter(ta => ta.activityId === act.id);
    if (actTechs.length > 0) {
      actTechs.forEach(ta => uniqueTechs.add(ta.technicianId));
    } else if (act.user) {
      uniqueTechs.add(act.user.id);
    } else {
      uniqueTechs.add('unknown-' + act.id);
    }
    
    const techsCount = actTechs.length || 1; // Default to 1 if no techs assigned but activity happened
    
    const actManHours = actDurationHours * techsCount;
    totalManHours += actManHours;
    
    hoursByEquipo[equipo] = (hoursByEquipo[equipo] || 0) + actDurationHours;
  });

  const totalTechs = uniqueTechs.size;

  // -- Charts Data --
  const activitiesChartData = Object.entries(activitiesByEquipo)
    .map(([name, count]) => ({ name, value: count }))
    .sort((a, b) => b.value - a.value);

  const activityHoursData = activities.map((act, index) => {
    let duration = 0;
    const startStr = (act.actualStartTime && act.actualEndTime) ? act.actualStartTime : act.startTime;
    const endStr = (act.actualStartTime && act.actualEndTime) ? act.actualEndTime : act.endTime;
    if (startStr && endStr) {
      const [sh, sm] = startStr.split(':').map(Number);
      const [eh, em] = endStr.split(':').map(Number);
      let sMins = sh * 60 + sm;
      let eMins = eh * 60 + em;
      if (eMins < sMins) eMins += 1440; // overnight
      duration = (eMins - sMins) / 60;
    }
    return {
      name: `Act. ${index + 1}`,
      hours: Number(duration.toFixed(1))
    };
  });

  const equipoHoursData = Object.entries(hoursByEquipo)
    .map(([name, hours]) => ({ name, hours: Number(hours.toFixed(1)) }))
    .sort((a, b) => b.hours - a.hours);

  // Colors for charts
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];

  // -- Custom Markdown Renderer for AI Summary --
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Make bold
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-slate-800">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.trim().match(/^[1-5]\.\s/)) {
        return (
          <h3 key={idx} className="text-sm font-black text-indigo-900 uppercase tracking-wider mt-6 mb-2 border-b border-indigo-100 pb-1">
            {formattedLine}
          </h3>
        );
      }
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return (
          <div key={idx} className="flex gap-2 mb-1.5 pl-2">
            <span className="text-indigo-400 font-bold">•</span>
            <span className="text-slate-700">{formattedLine}</span>
          </div>
        );
      }
      if (line.trim() === '') return <div key={idx} className="h-2"></div>;
      return <p key={idx} className="mb-2 text-slate-700">{formattedLine}</p>;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 flex items-start justify-center p-4 pt-10 overflow-y-auto print:static print:bg-white print:p-0 print:block print:overflow-visible print:h-auto">
      
      {/* Floating Controls - Hidden in print */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl z-[60] print:hidden border border-slate-700/50">
        <span className="text-white/90 font-medium text-sm hidden sm:block">Vista Previa del Reporte</span>
        <div className="w-px h-5 bg-white/20 hidden sm:block"></div>
        <button onClick={onClose} className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-2">
          Cerrar
        </button>
        <button onClick={handlePrint} className="px-5 py-2 bg-indigo-500 text-white rounded-full text-sm font-bold hover:bg-indigo-400 transition-colors shadow-lg flex items-center gap-2">
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 relative print:shadow-none print:my-0 print:w-full print:max-w-none print:rounded-none pb-20 print:pb-0 print:overflow-visible print:h-auto">
        
        {/* Printable Area */}
        <div className="p-10 print:p-0 relative z-10" id="pdf-content">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-indigo-900 pb-6 mb-8 print:pt-6">
            <div>
              <h1 className="text-3xl font-black text-indigo-950 uppercase tracking-tight">Resumen Ejecutivo</h1>
              <p className="text-slate-500 mt-1 font-medium">{reportContext}</p>
              <p className="text-slate-400 text-sm mt-1">Generado el {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
            </div>
            <div className="text-right flex flex-col items-end">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/LOGO_DROBOTS.png" alt="Drobots Logo" className="h-10 object-contain mb-2" />
              <div className="text-sm font-black text-indigo-950">DROBOTS S DE RL DE CV</div>
              <p className="text-slate-500 text-[11px] font-medium uppercase mt-0.5">{userName}</p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="border-l-4 border-indigo-500 bg-indigo-50/50 p-4 rounded-r-lg print:border-slate-300 print:bg-transparent">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Técnicos Involucrados</p>
              <p className="text-3xl font-black text-indigo-950">{totalTechs}</p>
            </div>
            <div className="border-l-4 border-emerald-500 bg-emerald-50/50 p-4 rounded-r-lg print:border-slate-300 print:bg-transparent">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Horas Hombre Totales</p>
              <p className="text-3xl font-black text-emerald-950">{totalManHours.toFixed(1)} <span className="text-lg text-emerald-700 font-semibold">hrs</span></p>
            </div>
            <div className="border-l-4 border-amber-500 bg-amber-50/50 p-4 rounded-r-lg print:border-slate-300 print:bg-transparent">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Días Reportados</p>
              <p className="text-3xl font-black text-amber-950">{totalDays}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-8 mb-10 min-h-[16rem] print:min-h-0 print:break-inside-avoid">
            
            {/* Actividades por Equipo */}
            <div className="border border-slate-200 rounded-xl p-4 flex flex-col print:border-none print:p-0">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-center mb-4">Actividades por Equipo</h3>
              <div className="flex-1 w-full h-[300px] print:h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activitiesChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent, value }: any) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={true}
                    >
                      {activitiesChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Horas Registradas por Actividad */}
            {/* Horas Registradas por Actividad/Equipo */}
            <div className="border border-slate-200 rounded-xl p-4 flex flex-col print:border-none print:p-0 overflow-hidden">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-center mb-4">
                {reportEquipo === 'ALL' ? 'Horas por Equipo' : 'Horas por Actividad'}
              </h3>
              <div className="w-full" style={{ height: `${Math.max(250, (reportEquipo === 'ALL' ? equipoHoursData.length : activityHoursData.length) * 45)}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportEquipo === 'ALL' ? equipoHoursData : activityHoursData} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={reportEquipo === 'ALL' ? 120 : 50} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: any) => [`${value} hrs`, 'Duración']} />
                    <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', formatter: (val: any) => `${val}h`, fill: '#64748b', fontSize: 12, fontWeight: 500 }}>
                      {(reportEquipo === 'ALL' ? equipoHoursData : activityHoursData).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* AI Summary Section */}
          {reportEquipo === 'ALL' && aiSummaries && aiSummaries.length > 0 ? (
            <div className="mb-8">
              {aiSummaries.map((summaryObj, sIdx) => {
                // Find photos for this equipment
                const eqActivities = activities.filter(a => (a.manPowerEquipo || a.equipo || 'Sin Equipo') === summaryObj.equipo);
                const eqPhotos = eqActivities.reduce((acc: any[], act) => {
                  try {
                    const photos = act.manPowerPhotos ? JSON.parse(act.manPowerPhotos) : [];
                    return [...acc, ...photos];
                  } catch(e) { return acc; }
                }, []);
                
                return (
                  <div key={sIdx} className="mb-10 bg-slate-50 border border-slate-200 rounded-xl p-8 print:bg-transparent print:border-slate-300 print:mb-8 print:break-inside-avoid">
                    <h2 className="text-lg font-black text-indigo-950 uppercase tracking-wider mb-4 flex items-center gap-2 border-b-2 border-indigo-900 pb-2">
                      <span className="text-indigo-600">✨</span> Resumen Ejecutivo Para Equipo {summaryObj.equipo}
                    </h2>
                    <div className="text-slate-700 text-[13px] leading-relaxed mb-6 whitespace-pre-wrap">
                      {summaryObj.resumen}
                    </div>
                    
                    {eqPhotos.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 border-b border-slate-200 pb-1">Evidencia Fotográfica ({summaryObj.equipo})</h3>
                        <div className="grid grid-cols-4 gap-4">
                          {eqPhotos.slice(0, 4).map((photo, pIdx) => (
                            <div key={pIdx} className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.url} alt={`Evidencia ${summaryObj.equipo}`} className="w-full h-full object-cover grayscale-[20%] print:grayscale-0" />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                                <p className="text-[10px] text-white font-medium truncate text-center">{photo.description || summaryObj.equipo}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <div className="mb-8 bg-slate-50 border border-slate-200 rounded-xl p-8 print:bg-transparent print:border-slate-300">
                <h2 className="text-lg font-black text-indigo-950 uppercase tracking-wider mb-6 flex items-center gap-2 border-b-2 border-indigo-900 pb-2">
                  <span className="text-indigo-600">✨</span> Síntesis Ejecutiva
                </h2>
                <div className="text-slate-700 text-[13px] leading-relaxed">
                  {renderMarkdown(aiSummary)}
                </div>
              </div>

              {/* Page Break for print if needed */}
              <div className="print:break-before-page"></div>

              {/* Opcional: Extracto de Evidencias */}
              <div className="mt-8">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Evidencia Destacada</h2>
                <div className="grid grid-cols-4 gap-4">
                  {activities
                    .filter(a => a.manPowerPhotos && a.manPowerPhotos !== "[]")
                    .slice(0, 4)
                    .map((act, idx) => {
                      try {
                        const photos = JSON.parse(act.manPowerPhotos as string);
                        if (photos && photos.length > 0) {
                          return (
                            <div key={idx} className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photos[0].url} alt={`Evidencia ${act.equipo}`} className="w-full h-full object-cover grayscale-[20%] print:grayscale-0" />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                                <p className="text-[10px] text-white font-medium truncate text-center">{photos[0].description || act.equipo || 'General'}</p>
                              </div>
                            </div>
                          );
                        }
                      } catch (e) {
                        return null;
                      }
                      return null;
                    })}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">*Muestra representativa de evidencias. El archivo completo se encuentra en plataforma.</p>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-slate-200 text-center print:fixed print:bottom-6 print:left-0 print:right-0 print:border-none print:pt-0">
            <p className="text-[10px] font-medium text-slate-400">
              Resumen Ejecutivo elaborado con Perry App y procesado con Gemini IA | By Chigüire Labs | Todos los derechos reservados
            </p>
          </div>

        </div>
      </div>
      
      {/* Estilos para impresión */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #pdf-content, #pdf-content * {
            visibility: visible;
          }
          #pdf-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          /* Ocultar scrollbars */
          ::-webkit-scrollbar {
            display: none;
          }
        }
      `}} />
    </div>
  );
}
