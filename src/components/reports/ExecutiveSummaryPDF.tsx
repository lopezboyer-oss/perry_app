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
}

interface ExecutiveSummaryPDFProps {
  activities: Activity[];
  aiSummary: string;
  onClose: () => void;
  reportContext: string; // e.g. "Semana del 1 al 7 de Julio"
}

export function ExecutiveSummaryPDF({ activities, aiSummary, onClose, reportContext }: ExecutiveSummaryPDFProps) {
  
  // -- Calculations --
  const totalDays = new Set(activities.map(a => a.date)).size;
  
  let totalHours = 0;
  const uniqueTechs = new Set<string>();
  
  const hoursByEquipo: Record<string, number> = {};
  const activitiesByEquipo: Record<string, number> = {};

  activities.forEach(act => {
    const equipo = act.manPowerEquipo || act.equipo || 'Sin Equipo';
    activitiesByEquipo[equipo] = (activitiesByEquipo[equipo] || 0) + 1;

    let actHours = 0;
    act.timeRegistryEntries?.forEach(entry => {
      uniqueTechs.add(entry.technicianId);
      // Ensure we treat manualTotalMinutes safely
      const mins = Number(entry.manualTotalMinutes) || 0;
      actHours += (mins / 60);
    });
    
    totalHours += actHours;
    hoursByEquipo[equipo] = (hoursByEquipo[equipo] || 0) + actHours;
  });

  const totalTechs = uniqueTechs.size;

  // -- Charts Data --
  const activitiesChartData = Object.entries(activitiesByEquipo)
    .map(([name, count]) => ({ name, value: count }))
    .sort((a, b) => b.value - a.value);

  const hoursChartData = Object.entries(hoursByEquipo)
    .map(([name, hours]) => ({ name, hours: Number(hours.toFixed(1)) }))
    .sort((a, b) => b.hours - a.hours);

  // Colors for charts
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4 overflow-y-auto print:bg-white print:p-0 print:block">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 relative print:shadow-none print:m-0 print:w-full print:max-w-none print:rounded-none">
        
        {/* Controls - Hidden in print */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-slate-200 p-4 flex justify-between items-center rounded-t-xl print:hidden z-10">
          <h2 className="text-lg font-bold text-slate-800">Vista Previa del Reporte</h2>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
              Imprimir / Guardar PDF
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-10 print:p-6" id="pdf-content">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-indigo-900 pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-black text-indigo-950 uppercase tracking-tight">Resumen Ejecutivo</h1>
              <p className="text-slate-500 mt-1 font-medium">{reportContext}</p>
              <p className="text-slate-400 text-sm mt-1">Generado el {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-indigo-600">MAN POWER</div>
              <p className="text-slate-500 text-sm font-medium">Reporte Gerencial</p>
            </div>
          </div>

          {/* AI Summary Section */}
          <div className="mb-8 bg-slate-50 border border-slate-200 rounded-xl p-6 print:bg-transparent print:border-slate-300">
            <h2 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="text-indigo-500">✨</span> Síntesis Ejecutiva
            </h2>
            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
              {aiSummary}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="border-l-4 border-indigo-500 bg-indigo-50/50 p-4 rounded-r-lg print:border-slate-300 print:bg-transparent">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Técnicos Involucrados</p>
              <p className="text-3xl font-black text-indigo-950">{totalTechs}</p>
            </div>
            <div className="border-l-4 border-emerald-500 bg-emerald-50/50 p-4 rounded-r-lg print:border-slate-300 print:bg-transparent">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Horas Hombre Totales</p>
              <p className="text-3xl font-black text-emerald-950">{totalHours.toFixed(1)} <span className="text-lg text-emerald-700 font-semibold">hrs</span></p>
            </div>
            <div className="border-l-4 border-amber-500 bg-amber-50/50 p-4 rounded-r-lg print:border-slate-300 print:bg-transparent">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Días Reportados</p>
              <p className="text-3xl font-black text-amber-950">{totalDays}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-8 mb-10 h-64">
            
            {/* Actividades por Equipo */}
            <div className="border border-slate-200 rounded-xl p-4 flex flex-col print:border-none print:p-0">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-center mb-4">Actividades por Equipo</h3>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activitiesChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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

            {/* Horas por Equipo */}
            <div className="border border-slate-200 rounded-xl p-4 flex flex-col print:border-none print:p-0">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-center mb-4">Horas por Equipo</h3>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hoursChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={24}>
                      {hoursChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
                .slice(0, 4) // Solo las 4 primeras actividades con fotos para no hacer el reporte tan grande
                .map((act, idx) => {
                  try {
                    const photos = JSON.parse(act.manPowerPhotos as string);
                    if (photos && photos.length > 0) {
                      return (
                        <div key={idx} className="aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photos[0].url} alt={`Evidencia ${act.equipo}`} className="w-full h-full object-cover grayscale-[20%] print:grayscale-0" />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                            <p className="text-[10px] text-white font-medium truncate text-center">{act.equipo || 'General'}</p>
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
