'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';

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
              <span className="text-[10px] uppercase font-bold bg-white/10 text-indigo-200 px-2.5 py-0.5 rounded-full">Actividad Perry</span>
              {economicData.perryActivity ? (
                <>
                  <h2 className="text-lg font-bold mt-1.5">{economicData.perryActivity.title}</h2>
                  <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                    <span>📅 {new Date(economicData.perryActivity.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>⏰ {economicData.perryActivity.startTime || '--:--'} a {economicData.perryActivity.endTime || '--:--'} ({economicData.perryActivity.durationHours} hrs)</span>
                    <span>🏢 Cliente: <strong className="text-white">{economicData.perryActivity.clientName}</strong></span>
                    <span>🏢 Empresa: <strong className="text-white">{economicData.perryActivity.companyName}</strong></span>
                  </p>
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
            const totalCost = economicData.perryResources?.summary?.totalCost || 0;
            const grossMargin = amountUntaxed - totalCost;
            const marginPercent = amountUntaxed > 0 ? (grossMargin / amountUntaxed) * 100 : 0;
            
            const marginColorClass = grossMargin >= 0 
              ? marginPercent >= 30 ? 'text-emerald-600 bg-emerald-50/50 border-emerald-200' : 'text-amber-600 bg-amber-50/50 border-amber-200'
              : 'text-rose-600 bg-rose-50/50 border-rose-200';

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              { name: 'Materiales y Suministros', odoo: odooMaterials, perry: 0, note: 'Perry no planifica costos de materiales' },
              { name: 'Indirectos', odoo: odooIndirects, perry: 0, note: 'Perry no planifica costos indirectos' },
              { name: 'Otros Conceptos', odoo: odooOther, perry: 0 },
            ];

            const amountUntaxed = economicData.odooOrder.amountUntaxed || 0;
            const totalCost = economicData.perryResources?.summary?.totalCost || 0;

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
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 font-semibold text-slate-800">{c.name}</td>
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
                  <h4 className="text-xs font-bold text-indigo-600 mb-2 uppercase tracking-wide">Mano de Obra (Técnicos)</h4>
                  {economicData.perryResources.technicians?.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                            <th className="px-4 py-2">Nombre</th>
                            <th className="px-4 py-2">Contratista / Tipo</th>
                            <th className="px-4 py-2 text-right">Horas</th>
                            <th className="px-4 py-2 text-right">Tarifa / Hora</th>
                            <th className="px-4 py-2 text-right">Costo Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {economicData.perryResources.technicians.map((t: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 font-medium text-slate-700">{t.name}</td>
                              <td className="px-4 py-2 text-slate-500">{t.contractor} ({t.type})</td>
                              <td className="px-4 py-2 text-right">{t.hours} h</td>
                              <td className="px-4 py-2 text-right">${t.rate.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-2 text-right font-bold text-slate-800">${t.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No hay técnicos asignados en esta actividad.</p>
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
    </div>
  );
}
