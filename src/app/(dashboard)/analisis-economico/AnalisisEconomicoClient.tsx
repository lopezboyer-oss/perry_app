'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import {
  Search,
  RefreshCw,
  AlertCircle,
  FileText,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  BarChart3,
  Clock,
  CheckCircle,
  Calendar,
  User,
  Timer,
  Zap,
  Hash,
  Award,
  Activity,
  BarChart2,
  Target,
} from 'lucide-react';
import { formatDuration, formatDate, activityTypeLabels, activityStatusLabels, activityTypeColors, activityStatusColors } from '@/lib/utils';
import { TimeRegistryModal, TimeRegistryEntryData } from '@/components/ui/TimeRegistryModal';

interface CompanyInfo {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

interface ClientProps {
  companies: CompanyInfo[];
  currentUserEmail: string;
}

export function AnalisisEconomicoClient({ companies, currentUserEmail }: ClientProps) {
  const [economicData, setEconomicData] = useState<any>(null);
  const [economicLoading, setEconomicLoading] = useState(false);
  const [economicError, setEconomicError] = useState<string | null>(null);
  const [economicSearchFolio, setEconomicSearchFolio] = useState('');
  const [showOdooDetail, setShowOdooDetail] = useState(true);
  const [showPerryDetail, setShowPerryDetail] = useState(true);

  // Executive summary state
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(false);
  const [folioActivities, setFolioActivities] = useState<any[] | null>(null);
  const [folioLoading, setFolioLoading] = useState(false);
  const [expandMaterials, setExpandMaterials] = useState(false);
  
  const [timeRegistryModal, setTimeRegistryModal] = useState<{ activityId: string; activityTitle: string; entries: TimeRegistryEntryData[] } | null>(null);

  const loadEconomicData = async (targetId: string | null, targetFolio: string | null) => {
    setEconomicLoading(true);
    setEconomicError(null);
    try {
      const param = targetId 
        ? `activityId=${encodeURIComponent(targetId)}` 
        : `folio=${encodeURIComponent(targetFolio || '')}`;
      const res = await fetch(`/api/odoo/trabajos-abiertos/breakdown?${param}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar el análisis económico');
      setEconomicData(data);
      if (data.folio) {
        setEconomicSearchFolio(data.folio);
      }
    } catch (err: any) {
      setEconomicError(err.message || 'Error de conexión');
      setEconomicData(null);
    } finally {
      setEconomicLoading(false);
    }
  };

  // Read URL params on mount for deep-links from Actividades, ATC Finde, etc.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const actParam = params.get('activityId');
      const folioParam = params.get('folio');
      
      if (actParam) {
        loadEconomicData(actParam, null);
      } else if (folioParam) {
        setEconomicSearchFolio(folioParam);
        loadEconomicData(null, folioParam);
      }
    }
  }, []);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-emerald-600" />
            Análisis Económico
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Conciliación de cotización (Odoo) vs operación programada (Perry App).
          </p>
        </div>
      </div>

      {/* Search Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Buscar por Folio Odoo (Orden de Venta)</label>
            <div className="relative">
              <input
                type="text"
                value={economicSearchFolio}
                onChange={(e) => setEconomicSearchFolio(e.target.value.toUpperCase().trim())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && economicSearchFolio.trim()) {
                    loadEconomicData(null, economicSearchFolio);
                  }
                }}
                placeholder="Ej: S06435"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-10 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-mono"
              />
              <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadEconomicData(null, economicSearchFolio)}
              disabled={economicLoading || !economicSearchFolio.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              {economicLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Consultar Odoo
            </button>
            {economicData && (
              <button
                onClick={() => loadEconomicData(economicData.perryActivity?.id || null, economicData.folio)}
                disabled={economicLoading}
                className="border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 font-semibold text-sm px-3 py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center"
                title="Recargar datos"
              >
                <RefreshCw className={`w-4 h-4 ${economicLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {economicLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Cargando desglose económico...</p>
        </div>
      )}

      {/* Error State */}
      {economicError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Error al cargar datos</h4>
            <p className="text-xs mt-1 text-rose-600">{economicError}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!economicData && !economicLoading && !economicError && (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-slate-300" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-slate-600 text-lg">Ingresa un folio para comenzar</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-md">
              Escribe el número de orden de venta de Odoo (ej: S06435) y presiona "Consultar Odoo" para ver el desglose económico comparativo.
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {economicData && !economicLoading && (
        <>
          {/* General Info Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-xl p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold bg-white/10 text-indigo-200 px-2.5 py-0.5 rounded-full">
                Perry App — {economicData.perryActivities?.length || 1} actividad{(economicData.perryActivities?.length || 1) !== 1 ? 'es' : ''} del folio
              </span>
              {economicData.perryActivity ? (
                <>
                  <h2 className="text-lg font-bold mt-1.5">{economicData.perryActivity.title}</h2>
                  <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                    <span>⏱️ {Number(economicData.perryActivity.durationHours).toFixed(1)} hrs-hombre totales</span>
                    <span>🏢 Cliente: <strong className="text-white">{economicData.perryActivity.clientName}</strong></span>
                    <span>🏢 Empresa: <strong className="text-white">{economicData.perryActivity.companyName}</strong></span>
                  </p>
                  {economicData.perryActivities && economicData.perryActivities.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {economicData.perryActivities.map((a: any) => (
                        <span key={a.id} className="text-[9px] bg-white/10 border border-white/10 text-slate-300 px-2 py-0.5 rounded">
                          📅 {new Date(a.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · {a.durationHours.toFixed(1)}h · {a.userName || 'Sin asignar'}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400 italic mt-2">Sin actividad Perry asociada (Búsqueda por folio directo)</p>
              )}
            </div>
            <div className="bg-white/10 rounded-lg p-3 md:text-right shrink-0 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-indigo-200">Cotización Odoo</span>
              <h3 className="text-xl font-mono font-bold mt-1 text-emerald-400">{economicData.odooOrder.name}</h3>
              <p className="text-[11px] text-slate-300 mt-1">{economicData.odooOrder.companyName || '—'}</p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          {(() => {
            const amountUntaxed = economicData.odooOrder.amountUntaxed || 0;
            const totalCost = (economicData.perryResources?.summary?.totalCost || 0) + (economicData.totalMaterialsCost || 0);
            const grossMargin = amountUntaxed - totalCost;
            const marginPercent = amountUntaxed > 0 ? (grossMargin / amountUntaxed) * 100 : 0;
            
            const marginColorClass = grossMargin >= 0 
              ? marginPercent >= 30 ? 'text-emerald-600 bg-emerald-50/50 border-emerald-200' : 'text-amber-600 bg-amber-50/50 border-amber-200'
              : 'text-rose-600 bg-rose-50/50 border-rose-200';

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cotizado (Odoo Subtotal)</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    ${amountUntaxed.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Monto base sin IVA</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Costo Programado (Perry)</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    ${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Operación y recursos</p>
                </div>

                <div className={`rounded-xl border shadow-sm p-4 ${marginColorClass}`}>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">Margen Bruto Estimado</p>
                  <p className="text-2xl font-bold mt-1">
                    ${grossMargin.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] opacity-80 mt-1">Diferencia bruta</p>
                </div>

                <div className={`rounded-xl border shadow-sm p-4 ${marginColorClass}`}>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">Porcentaje de Margen</p>
                  <p className="text-2xl font-bold mt-1">
                    {marginPercent.toFixed(1)}%
                  </p>
                  <p className="text-[10px] opacity-80 mt-1">Sobre el monto cotizado</p>
                </div>
                
                {/* Horas Hombre Card */}
                {(() => {
                  const projectedHours = economicData.perryResources?.summary?.projectedManHours || 0;
                  const realHours = economicData.perryResources?.summary?.realManHours || 0;
                  const hasMissing = economicData.perryResources?.summary?.hasMissingLogistics;
                  const overHours = realHours > projectedHours;
                  
                  return (
                    <div className={`rounded-xl border shadow-sm p-4 ${hasMissing ? 'border-amber-300 bg-amber-50/30' : overHours ? 'border-rose-300 bg-rose-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Horas Hombre</p>
                        <Timer className={`w-4 h-4 ${hasMissing ? 'text-amber-500' : overHours ? 'text-rose-500' : 'text-emerald-500'}`} />
                      </div>
                      
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className={`text-2xl font-bold ${overHours ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {realHours.toFixed(1)}
                        </span>
                        <span className="text-sm font-medium text-slate-400">/ {projectedHours.toFixed(1)} h</span>
                      </div>
                      
                      {hasMissing ? (
                        <div className="mt-2 flex flex-col gap-1">
                          <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Faltan registros (Inicio/Fin)
                          </p>
                          <div className="flex flex-col gap-1 mt-1">
                            {economicData.perryActivities?.filter((a: any) => {
                               const hasInicio = a.timeRegistryEntries?.some((e: any) => e.type === 'INICIO_LOGISTICO');
                               const hasFin = a.timeRegistryEntries?.some((e: any) => e.type === 'FINAL_LOGISTICO');
                               return !(hasInicio && hasFin);
                             }).map((a: any) => (
                              <button
                                key={a.id}
                                onClick={() => setTimeRegistryModal({ activityId: a.id, activityTitle: a.title, entries: a.timeRegistryEntries || [] })}
                                className="text-[10px] text-left px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded transition-colors"
                              >
                                + Completar: {a.title} ({new Date(a.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })})
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className={`text-[10px] mt-1 ${overHours ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {overHours ? `Excede por ${(realHours - projectedHours).toFixed(1)} h` : 'Dentro de lo proyectado'}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* Category Comparison Table */}
          {(() => {
            const odooLabor = economicData.odooBreakdown.labor?.reduce((acc: number, x: any) => acc + (x.subtotal || 0), 0) || 0;
            const odooLifts = economicData.odooBreakdown.equipmentRental?.reduce((acc: number, x: any) => acc + (x.subtotal || 0), 0) || 0;
            const odooSafety = economicData.odooBreakdown.coordination?.reduce((acc: number, x: any) => acc + (x.subtotal || 0), 0) || 0;
            const odooMaterials = economicData.odooBreakdown.materials?.reduce((acc: number, x: any) => acc + (x.subtotal || 0), 0) || 0;
            const odooIndirects = economicData.odooBreakdown.indirects?.reduce((acc: number, x: any) => acc + (x.subtotal || 0), 0) || 0;
            const odooOther = economicData.odooBreakdown.other?.reduce((acc: number, x: any) => acc + (x.subtotal || 0), 0) || 0;

            const perryLabor = economicData.perryResources?.summary?.laborCost || 0;
            const perryLifts = economicData.perryResources?.summary?.equipmentCost || 0;
            const perrySafety = economicData.perryResources?.summary?.safetyCost || 0;

            const categories = [
              { name: 'Mano de Obra / Servicios', odoo: odooLabor, perry: perryLabor },
              { name: 'Renta de Equipos (Elevación)', odoo: odooLifts, perry: perryLifts },
              { name: 'Seguridad y Coordinación', odoo: odooSafety, perry: perrySafety },
              { 
                name: 'Materiales y Suministros', 
                odoo: odooMaterials, 
                perry: economicData.totalMaterialsCost || 0,
                isMaterials: true 
              },
              { name: 'Indirectos', odoo: odooIndirects, perry: 0, note: 'Perry no planifica costos indirectos' },
              { name: 'Otros Conceptos', odoo: odooOther, perry: 0 },
            ];

            const amountUntaxed = economicData.odooOrder.amountUntaxed || 0;
            const totalCost = (economicData.perryResources?.summary?.totalCost || 0) + (economicData.totalMaterialsCost || 0);

            return (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-semibold text-slate-800">Comparativa de Recursos: Odoo vs Perry</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Conciliación de lo cotizado frente a los recursos programados para el fin de semana.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        <th className="px-5 py-3">Categoría de Costo</th>
                        <th className="px-5 py-3 text-right">Cotizado (Odoo)</th>
                        <th className="px-5 py-3 text-right">Programado (Perry)</th>
                        <th className="px-5 py-3 text-right">Desviación</th>
                        <th className="px-5 py-3">Estado / Nota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {categories.map((c, i) => {
                        const variance = c.odoo - c.perry;
                        const isNegative = variance < 0;
                        const displayVariance = variance === 0 ? '—' : `$${Math.abs(variance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
                        
                        let statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            Dentro de margen
                          </span>
                        );
                        if (isNegative) {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                              ⚠ Costo excedido
                            </span>
                          );
                        } else if (c.note) {
                          statusBadge = (
                            <span className="text-[10px] text-slate-400 italic">
                              {c.note}
                            </span>
                          );
                        } else if (variance > 0 && c.perry > 0) {
                          statusBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                              Ahorro estimado
                            </span>
                          );
                        }

                        return (
                          <Fragment key={i}>
                            <tr className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3 font-semibold text-slate-800 flex items-center flex-wrap gap-2">
                                <span>{c.name}</span>
                                {(c as any).isMaterials && economicData.vendorBills && economicData.vendorBills.length > 0 && (
                                  <button
                                    onClick={() => setExpandMaterials(!expandMaterials)}
                                    className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-all select-none shadow-sm"
                                  >
                                    {expandMaterials ? 'Ocultar' : 'Ver'} {economicData.vendorBills.length} factura{economicData.vendorBills.length !== 1 ? 's' : ''}
                                    {expandMaterials ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right text-slate-600">
                                {c.odoo > 0 ? `$${c.odoo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}
                              </td>
                              <td className="px-5 py-3 text-right text-slate-600">
                                {c.perry > 0 ? `$${c.perry.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}
                              </td>
                              <td className={`px-5 py-3 text-right font-bold ${isNegative ? 'text-rose-600' : variance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {isNegative ? '-' : variance > 0 ? '+' : ''}{displayVariance}
                              </td>
                              <td className="px-5 py-3">{statusBadge}</td>
                            </tr>
                            {(c as any).isMaterials && expandMaterials && economicData.vendorBills && economicData.vendorBills.length > 0 && (
                              <tr key="materials-details" className="bg-slate-50/50">
                                <td colSpan={5} className="px-5 py-4 border-t border-slate-100">
                                  <div className="space-y-3 pl-4 border-l-2 border-indigo-500">
                                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Desglose de Facturas de Proveedores (Odoo)</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-5xl">
                                      {economicData.vendorBills.map((bill: any) => (
                                        <div key={bill.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm text-xs space-y-2">
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-bold text-slate-800">{bill.name}</span>
                                              <span className="text-[10px] text-slate-400">({bill.date})</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-indigo-600 text-[10px]">{bill.supplierName}</span>
                                              <span className="font-bold text-slate-800">${bill.amountUntaxed.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                          </div>
                                          <p className="text-[10px] text-slate-500 font-mono break-words leading-relaxed"><strong className="text-slate-600 font-sans">Ref:</strong> {bill.ref}</p>
                                          {bill.lines && bill.lines.length > 0 && (
                                            <div className="bg-slate-50 rounded p-2 text-[10px] space-y-1.5">
                                              <p className="font-bold text-slate-500 uppercase tracking-wider text-[8px] mb-1">Conceptos:</p>
                                              {bill.lines.map((l: any) => (
                                                <div key={l.id} className="flex justify-between gap-4 text-slate-600 leading-snug">
                                                  <span className="truncate flex-1" title={l.name}>{l.name}</span>
                                                  <span className="shrink-0 font-medium text-slate-500">
                                                    {l.quantity} x ${l.priceUnit.toLocaleString('es-MX', { minimumFractionDigits: 2 })} = <strong className="text-slate-800">${l.priceSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                      
                      {/* Totals Row */}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                        <td className="px-5 py-4 text-slate-800">TOTAL GENERAL (Subtotal sin IVA)</td>
                        <td className="px-5 py-4 text-right text-slate-800">
                          ${amountUntaxed.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-800">
                          ${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`px-5 py-4 text-right text-sm ${amountUntaxed - totalCost < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {amountUntaxed - totalCost >= 0 ? '+' : '-'}${Math.abs(amountUntaxed - totalCost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4">
                          {amountUntaxed - totalCost >= 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                              Operación Rentable
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300">
                              Operación Deficitaria
                            </span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* ── Executive Summary Section (collapsible) ── */}
          {economicData.folio && (
            <ExecutiveSummarySection
              folio={economicData.folio}
              showExecutiveSummary={showExecutiveSummary}
              setShowExecutiveSummary={setShowExecutiveSummary}
              folioActivities={folioActivities}
              setFolioActivities={setFolioActivities}
              folioLoading={folioLoading}
              setFolioLoading={setFolioLoading}
            />
          )}

          {/* Odoo Detail Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button 
              onClick={() => setShowOdooDetail(!showOdooDetail)}
              className="w-full px-5 py-4 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-indigo-500" />
                Desglose Detallado de Cotización (Odoo Sale Order Lines)
              </h3>
              {showOdooDetail ? <ChevronUp className="w-4.5 h-4.5 text-slate-400" /> : <ChevronDown className="w-4.5 h-4.5 text-slate-400" />}
            </button>
            
            {showOdooDetail && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <th className="px-5 py-3">Producto</th>
                      <th className="px-5 py-3">Descripción</th>
                      <th className="px-5 py-3 text-right">Cant.</th>
                      <th className="px-5 py-3 text-right">Precio Unitario</th>
                      <th className="px-5 py-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {Object.entries(economicData.odooBreakdown).flatMap(([catKey, lines]: [string, any]) => {
                      if (!lines || lines.length === 0) return [];
                      return lines.map((l: any, idx: number) => (
                        <tr key={`${catKey}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-700 max-w-[150px] truncate" title={l.product}>
                            {l.product}
                          </td>
                          <td className="px-5 py-3 text-slate-600 max-w-[300px] truncate" title={l.description}>
                            {l.description}
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-slate-700">{l.qty}</td>
                          <td className="px-5 py-3 text-right text-slate-500">${l.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          <td className="px-5 py-3 text-right font-bold text-slate-800">${l.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Perry Resources Detail */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button 
              onClick={() => setShowPerryDetail(!showPerryDetail)}
              className="w-full px-5 py-4 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-500" />
                Desglose de Recursos Asignados (Perry App)
              </h3>
              {showPerryDetail ? <ChevronUp className="w-4.5 h-4.5 text-slate-400" /> : <ChevronDown className="w-4.5 h-4.5 text-slate-400" />}
            </button>

            {showPerryDetail && (
              <div className="p-5 space-y-6">
                {/* Técnicos */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-600 mb-2 uppercase tracking-wide">
                    Mano de Obra (Técnicos)
                    {(economicData.perryActivities?.length || 0) > 1 && (
                      <span className="ml-2 text-[10px] font-medium text-slate-400 normal-case">
                        — Agregado de {economicData.perryActivities.length} actividades
                      </span>
                    )}
                  </h4>
                  {economicData.perryResources.technicians?.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                            <th className="px-4 py-2">Nombre</th>
                            <th className="px-4 py-2">Contratista / Tipo</th>
                            <th className="px-4 py-2 text-right">Horas Totales</th>
                            <th className="px-4 py-2 text-right">Tarifa / Hora</th>
                            <th className="px-4 py-2 text-right">Costo Total</th>
                            {(economicData.perryActivities?.length || 0) > 1 && (
                              <th className="px-4 py-2 text-center">Actividades</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {economicData.perryResources.technicians.map((t: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 font-medium text-slate-700">{t.name}</td>
                              <td className="px-4 py-2 text-slate-500">{t.contractor} ({t.type})</td>
                              <td className="px-4 py-2 text-right">{Number(t.hours).toFixed(1)} h</td>
                              <td className="px-4 py-2 text-right">${t.rate.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-2 text-right font-bold text-slate-800">${t.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                              {(economicData.perryActivities?.length || 0) > 1 && (
                                <td className="px-4 py-2 text-center">
                                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-200">
                                    {t.activityCount || 1}
                                  </span>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No hay técnicos asignados en las actividades de este folio.</p>
                  )}
                </div>

                {/* Seguridad */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-600 mb-2 uppercase tracking-wide">Seguridad e Higiene / Supervisores</h4>
                  {economicData.perryResources.safety?.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                            <th className="px-4 py-2">Nombre</th>
                            <th className="px-4 py-2">Rol Asignado</th>
                            <th className="px-4 py-2 text-right">Costo Estimado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {economicData.perryResources.safety.map((s: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 font-medium text-slate-700">{s.name}</td>
                              <td className="px-4 py-2 text-slate-500">{s.role}</td>
                              <td className="px-4 py-2 text-right font-bold text-slate-800">${s.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No hay personal de seguridad o supervisores asignados.</p>
                  )}
                </div>

                {/* Equipos */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-600 mb-2 uppercase tracking-wide">Equipos de Elevación</h4>
                  {economicData.perryResources.equipment?.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                            <th className="px-4 py-2">Equipo</th>
                            <th className="px-4 py-2">Propiedad</th>
                            <th className="px-4 py-2 text-right">Costo Diario</th>
                            <th className="px-4 py-2 text-right">Costo Flete</th>
                            <th className="px-4 py-2 text-right">Costo Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {economicData.perryResources.equipment.map((eq: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 font-medium text-slate-700">{eq.name}</td>
                              <td className="px-4 py-2 text-slate-500">{eq.ownership}</td>
                              <td className="px-4 py-2 text-right">${eq.costPerDay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-2 text-right">${eq.freightCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-2 text-right font-bold text-slate-800">${eq.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No hay equipos de elevación asignados en esta actividad.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {timeRegistryModal && (
        <TimeRegistryModal
          activityId={timeRegistryModal.activityId}
          activityTitle={timeRegistryModal.activityTitle}
          entries={timeRegistryModal.entries}
          onClose={() => setTimeRegistryModal(null)}
          onEntryAdded={() => {
            setTimeRegistryModal(null);
            if (economicData) {
              loadEconomicData(economicData.perryActivity?.id || null, economicData.folio);
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Executive Summary Collapsible Section ───────────────────────────────────

interface ExecutiveSummaryProps {
  folio: string;
  showExecutiveSummary: boolean;
  setShowExecutiveSummary: (v: boolean) => void;
  folioActivities: any[] | null;
  setFolioActivities: (v: any[]) => void;
  folioLoading: boolean;
  setFolioLoading: (v: boolean) => void;
}

function ExecutiveSummarySection({
  folio, showExecutiveSummary, setShowExecutiveSummary,
  folioActivities, setFolioActivities, folioLoading, setFolioLoading,
}: ExecutiveSummaryProps) {

  const handleToggle = async () => {
    const next = !showExecutiveSummary;
    setShowExecutiveSummary(next);
    // Lazy load on first expand
    if (next && !folioActivities && !folioLoading) {
      setFolioLoading(true);
      try {
        const res = await fetch(`/api/activities/folio-summary?folio=${encodeURIComponent(folio)}`);
        const data = await res.json();
        if (res.ok && data.activities) {
          setFolioActivities(data.activities);
        }
      } catch { /* silent */ }
      setFolioLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full px-5 py-4 border-b border-indigo-100 flex items-center justify-between hover:bg-indigo-50/50 transition-colors"
      >
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Target className="w-[18px] h-[18px] text-indigo-500" />
          Resumen Ejecutivo del Folio — {folio}
        </h3>
        <div className="flex items-center gap-2">
          {folioActivities && (
            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
              {folioActivities.length} actividades
            </span>
          )}
          {showExecutiveSummary ? <ChevronUp className="w-[18px] h-[18px] text-slate-400" /> : <ChevronDown className="w-[18px] h-[18px] text-slate-400" />}
        </div>
      </button>

      {showExecutiveSummary && (
        <div className="p-5 space-y-5">
          {folioLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
              <p className="text-slate-500 text-sm">Cargando actividades del folio...</p>
            </div>
          )}

          {folioActivities && folioActivities.length > 0 && (
            <FolioSummaryContent activities={folioActivities} folio={folio} />
          )}

          {folioActivities && folioActivities.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No se encontraron actividades para el folio {folio}.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Folio Summary Content (replicates OportunidadDetalle logic) ─────────────

function FolioSummaryContent({ activities, folio }: { activities: any[]; folio: string }) {
  // Derived state
  const cotizaciones = activities.filter(a => a.type === 'COTIZACION');
  const first = cotizaciones[0] || activities[0];
  const enProgreso = cotizaciones.find((a: any) => a.status === 'EN_PROGRESO');
  const completada = cotizaciones.find((a: any) => a.status === 'COMPLETADA');

  const fechaInicio = new Date(enProgreso?.date || first.date);
  const fechaFin = completada ? new Date(completada.date) : null;
  let leadTimeDays: number | null = null;
  if (fechaFin) {
    leadTimeDays = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
    if (leadTimeDays < 0) leadTimeDays = 0;
  }

  let estado: 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA' = 'EN_PROGRESO';
  if (completada) estado = 'COMPLETADA';
  else if (cotizaciones.length > 0 && cotizaciones.every((a: any) => a.status === 'CANCELADA')) estado = 'CANCELADA';

  const totalMinutos = activities.reduce((s: number, a: any) => s + (a.durationMinutes || 0), 0);
  const daysSinceStart = Math.ceil((new Date().getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));

  // By type
  const byType: Record<string, { count: number; minutos: number }> = {};
  for (const a of activities) {
    if (!byType[a.type]) byType[a.type] = { count: 0, minutos: 0 };
    byType[a.type].count++;
    byType[a.type].minutos += a.durationMinutes || 0;
  }

  // By status
  const byStatus: Record<string, number> = {};
  for (const a of activities) {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
  }

  // By person
  const byPerson: Record<string, { name: string; count: number; minutos: number }> = {};
  for (const a of activities) {
    const id = a.user?.id || 'unknown';
    const name = a.user?.name || 'Sin asignar';
    if (!byPerson[id]) byPerson[id] = { name, count: 0, minutos: 0 };
    byPerson[id].count++;
    byPerson[id].minutos += a.durationMinutes || 0;
  }

  const activitiesWithTime = activities.filter((a: any) => a.durationMinutes);
  const avgDuration = activitiesWithTime.length > 0
    ? Math.round(activitiesWithTime.reduce((s: number, a: any) => s + (a.durationMinutes || 0), 0) / activitiesWithTime.length)
    : null;

  const maxType = Object.entries(byType).sort((a, b) => b[1].minutos - a[1].minutos)[0];

  const estadoConfig: Record<string, { label: string; color: string }> = {
    EN_PROGRESO: { label: 'En Progreso', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    COMPLETADA: { label: 'Completada', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    CANCELADA: { label: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-200' },
  };
  const cfg = estadoConfig[estado] || estadoConfig.EN_PROGRESO;

  return (
    <>
      {/* Status Badge */}
      <div className="flex items-center gap-3 mb-1">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
          {estado === 'COMPLETADA' ? <CheckCircle size={12} /> : estado === 'CANCELADA' ? <AlertCircle size={12} /> : <Clock size={12} />}
          {cfg.label}
        </span>
        <span className="text-xs text-slate-400">
          {first.client?.name || '—'} · Resp: {first.user?.name || '—'}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniKpi icon={<Hash size={16} className="text-indigo-500" />} label="Actividades" value={activities.length} />
        <MiniKpi icon={<Timer size={16} className="text-violet-500" />} label="Tiempo Total" value={formatDuration(totalMinutos)} />
        <MiniKpi
          icon={<TrendingUp size={16} className="text-emerald-500" />}
          label="Lead Time"
          value={leadTimeDays !== null ? `${leadTimeDays}d` : estado === 'EN_PROGRESO' ? `${daysSinceStart}d*` : '—'}
          sub={leadTimeDays !== null ? undefined : estado === 'EN_PROGRESO' ? 'transcurridos' : undefined}
        />
        <MiniKpi icon={<Calendar size={16} className="text-blue-500" />} label="Inicio" value={formatDate(fechaInicio.toISOString())} />
        <MiniKpi icon={<CheckCircle size={16} className="text-emerald-500" />} label="Cierre" value={fechaFin ? formatDate(fechaFin.toISOString()) : '—'} />
        <MiniKpi icon={<Zap size={16} className="text-amber-500" />} label="Duración Prom." value={avgDuration ? formatDuration(avgDuration) : '—'} sub="por actividad" />
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* By Type */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h4 className="font-semibold text-slate-700 text-xs mb-3 flex items-center gap-1.5">
            <BarChart2 size={14} className="text-indigo-500" /> Por Tipo
          </h4>
          <div className="space-y-2.5">
            {Object.entries(byType).sort((a, b) => b[1].minutos - a[1].minutos).map(([type, data]) => {
              const pct = totalMinutos > 0 ? Math.round(data.minutos / totalMinutos * 100) : 0;
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${activityTypeColors[type] || 'bg-slate-100 text-slate-700'}`}>
                      {activityTypeLabels[type] || type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">{data.count} act · {formatDuration(data.minutos)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Status */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h4 className="font-semibold text-slate-700 text-xs mb-3 flex items-center gap-1.5">
            <Activity size={14} className="text-violet-500" /> Por Estado
          </h4>
          <div className="space-y-2">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${activityStatusColors[status] || 'bg-slate-100 text-slate-700'}`}>
                  {activityStatusLabels[status] || status}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 rounded-full bg-slate-200 w-16 overflow-hidden">
                    <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.round(count / activities.length * 100)}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 w-4 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Person */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h4 className="font-semibold text-slate-700 text-xs mb-3 flex items-center gap-1.5">
            <User size={14} className="text-rose-500" /> Participación
          </h4>
          <div className="space-y-2.5">
            {Object.entries(byPerson).sort((a, b) => b[1].minutos - a[1].minutos).map(([id, data]) => {
              const pct = totalMinutos > 0 ? Math.round(data.minutos / totalMinutos * 100) : 0;
              return (
                <div key={id}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-medium text-slate-700">{data.name}</span>
                    <span className="text-[10px] text-slate-500">{data.count} act · {formatDuration(data.minutos)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Executive Strip */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-4">
        <h4 className="font-semibold text-slate-700 text-xs mb-2 flex items-center gap-1.5">
          <Award size={13} className="text-indigo-600" /> Resumen
        </h4>
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
          <div><span className="text-slate-500">Tipo dominante:</span> <span className="font-semibold text-slate-800">{maxType ? `${activityTypeLabels[maxType[0]] || maxType[0]} (${formatDuration(maxType[1].minutos)})` : '—'}</span></div>
          <div><span className="text-slate-500">Personas:</span> <span className="font-semibold text-slate-800">{Object.keys(byPerson).length}</span></div>
          <div><span className="text-slate-500">Completadas:</span> <span className="font-semibold text-slate-800">{byStatus['COMPLETADA'] || 0} de {activities.length}</span></div>
          {leadTimeDays !== null && leadTimeDays > 0 && (
            <div><span className="text-slate-500">Eficiencia:</span> <span className="font-semibold text-slate-800">{Math.round(totalMinutos / leadTimeDays)}min/día</span></div>
          )}
        </div>
      </div>

      {/* Timeline Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h4 className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
            <FileText size={13} className="text-slate-500" /> Timeline de Actividades
          </h4>
          <span className="text-[10px] text-slate-400">{activities.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <th className="px-4 py-2 w-[30px] text-center">#</th>
                <th className="px-4 py-2 w-[85px]">Fecha</th>
                <th className="px-4 py-2 w-[75px]">Tipo</th>
                <th className="px-4 py-2">Título</th>
                <th className="px-4 py-2 w-[100px]">Responsable</th>
                <th className="px-4 py-2 w-[70px]">Horario</th>
                <th className="px-4 py-2 w-[55px] text-center">Tiempo</th>
                <th className="px-4 py-2 w-[75px] text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {activities.map((act: any, idx: number) => (
                <tr key={act.id} className="hover:bg-slate-50/50 transition-colors align-top">
                  <td className="px-4 py-2 text-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">{idx + 1}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-700 font-medium whitespace-nowrap">{formatDate(act.date)}</td>
                  <td className="px-4 py-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${activityTypeColors[act.type] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {activityTypeLabels[act.type] || act.type}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/actividades/${act.id}`} className="text-xs font-medium text-slate-800 hover:text-indigo-600 leading-snug">
                      {act.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{act.user?.name || '-'}</td>
                  <td className="px-4 py-2 font-mono text-slate-600 whitespace-nowrap">
                    {act.startTime ? `${act.startTime}${act.endTime ? `–${act.endTime}` : ''}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-center text-slate-600">{act.durationMinutes ? formatDuration(act.durationMinutes) : '—'}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${activityStatusColors[act.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {activityStatusLabels[act.status] || act.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function MiniKpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
      <div className="p-1.5 rounded-lg bg-white border border-slate-100 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500">{label}</p>
        <p className="text-sm font-bold text-slate-800 leading-tight">{value}</p>
        {sub && <p className="text-[9px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}
