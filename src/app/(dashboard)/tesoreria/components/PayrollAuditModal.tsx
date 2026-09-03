'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Calendar,
  DollarSign,
  Users,
  Trash2,
  Save,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';

export interface PayrollAuditData {
  classification: 'NOMINA_COMPLETA' | 'REPORTE_PARCIAL_HORAS_EXTRA' | 'NO_ES_NOMINA';
  confidence: 'ALTA' | 'MEDIA' | 'BAJA';
  detectedCompany: string;
  detectedPeriod: string;
  totalAmount: number;
  employeeCount: number;
  bankBreakdown: Array<{ bankOrSource: string; amount: number }>;
  observations: string;
  auditNotes: string;
  hasDiscrepancies: boolean;
}

interface PayrollAuditModalProps {
  payroll: any;
  auditData: PayrollAuditData | null;
  isLoading: boolean;
  onClose: () => void;
  onUpdate: (updatedPayroll: any) => void;
  onDelete: (payrollId: string) => void;
}

export function PayrollAuditModal({
  payroll,
  auditData,
  isLoading,
  onClose,
  onUpdate,
  onDelete,
}: PayrollAuditModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Form state initialized with either auditData or current payroll values
  const [companyName, setCompanyName] = useState<string>(
    auditData?.detectedCompany || payroll.companyName || 'GRUPO CASEME'
  );
  const [periodNumber, setPeriodNumber] = useState<string>(
    auditData?.detectedPeriod || payroll.periodNumber || 'Raya 34'
  );
  const [totalAmount, setTotalAmount] = useState<number>(
    auditData?.totalAmount !== undefined ? auditData.totalAmount : payroll.totalAmount || 0
  );
  const [employeeCount, setEmployeeCount] = useState<number>(
    auditData?.employeeCount !== undefined ? auditData.employeeCount : payroll.employeeCount || 0
  );
  const [observations, setObservations] = useState<string>(
    auditData?.observations || payroll.observations || ''
  );
  const [bankBreakdown, setBankBreakdown] = useState<Array<{ bankOrSource: string; amount: number }>>(
    auditData?.bankBreakdown || (() => {
      try {
        return payroll.bankBreakdown ? JSON.parse(payroll.bankBreakdown) : [];
      } catch {
        return [];
      }
    })()
  );

  const imageUrl = payroll.imageUrl || payroll.signedImageUrl;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/treasury/nominas/${payroll.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          periodNumber,
          totalAmount,
          employeeCount,
          bankBreakdown,
          observations,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error al guardar: ${err.error || 'Error desconocido'}`);
        return;
      }

      const json = await res.json();
      onUpdate(json.log);
      onClose();
    } catch (error: any) {
      alert(`Error al actualizar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/treasury/nominas/${payroll.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error al eliminar: ${err.error || 'Error desconocido'}`);
        return;
      }

      onDelete(payroll.id);
      onClose();
    } catch (error: any) {
      alert(`Error al eliminar: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header Bar */}
        <div className="p-4 sm:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  Auditoría Visual & Validación con IA
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {payroll.companyName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Inspección lado a lado de la hoja original contra las cantidades estructuradas por Gemini 2.5
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir Original
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-all"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content - Side by Side Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* LEFT COLUMN: Visual Document Viewer (7 cols on desktop) */}
          <div className="lg:col-span-7 bg-black flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 relative h-72 lg:h-full overflow-hidden">
            {/* Viewer Controls Toolbar */}
            <div className="absolute top-3 left-3 z-10 flex items-center space-x-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg">
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-slate-800 text-slate-200 rounded-lg transition-colors"
                title="Acercar (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-slate-800 text-slate-200 rounded-lg transition-colors"
                title="Alejar (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 hover:bg-slate-800 text-slate-200 rounded-lg transition-colors"
                title="Restablecer vista"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono text-slate-400 px-2">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Image Canvas Container */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
              {imageUrl ? (
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="max-w-full max-h-full flex items-center justify-center"
                >
                  <img
                    src={imageUrl}
                    alt="Hoja de Nómina Auditada"
                    className="max-w-full max-h-[75vh] object-contain rounded-lg border border-slate-800 shadow-2xl"
                  />
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500 space-y-2">
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-600" />
                  <p className="text-xs">No se adjuntó imagen a este registro.</p>
                  <p className="text-[11px] text-slate-600">El reporte se basó en texto del chat.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: AI Audit Results & Interactive Validation Form (5 cols on desktop) */}
          <div className="lg:col-span-5 bg-slate-900/90 flex flex-col justify-between overflow-y-auto p-4 sm:p-6 space-y-5">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-16 text-center">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                <p className="text-sm font-bold text-slate-200">
                  Analizando cantidades y estructura con IA...
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Gemini 2.5 está auditando las sumas, dispersión por banco y clasificando la hoja.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* AI Classification Badge & Verdict */}
                {auditData ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                        Dictamen de Inteligencia Artificial:
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        Certeza {auditData.confidence}
                      </span>
                    </div>

                    {auditData.classification === 'NOMINA_COMPLETA' ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start space-x-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-emerald-300">
                            Nómina Oficial Completa (Raya Semanal)
                          </p>
                          <p className="text-[11px] text-emerald-400/80 mt-0.5">
                            El documento contiene concentrado general de dispersión con importes netos a pagar.
                          </p>
                        </div>
                      </div>
                    ) : auditData.classification === 'REPORTE_PARCIAL_HORAS_EXTRA' ? (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-300">
                            Reporte Parcial / Auxiliar de Horas Extras
                          </p>
                          <p className="text-[11px] text-amber-400/80 mt-0.5">
                            Advertencia: Este archivo parece ser solo un reporte secundario o desglose parcial, no la nómina total.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start space-x-3">
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-rose-300">
                            Documento No Corresponde a Nómina
                          </p>
                          <p className="text-[11px] text-rose-400/80 mt-0.5">
                            Falso positivo detectado: la imagen no corresponde a una hoja de sueldos o salarios.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Audit Notes from AI */}
                    {auditData.auditNotes && (
                      <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-1 text-xs">
                        <p className="font-bold text-indigo-300 text-[10px] uppercase">
                          Observaciones del Auditor IA:
                        </p>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          {auditData.auditNotes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Validation Form */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <span>Valores a Registrar en la Ficha</span>
                  </h4>

                  {/* Company & Period Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Empresa
                      </label>
                      <select
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="GRUPO CASEME">GRUPO CASEME</option>
                        <option value="DROBOTS">DROBOTS</option>
                        <option value="OPUS INGENIUM">OPUS INGENIUM</option>
                        <option value="VULCAN FORGE">VULCAN FORGE</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Periodo / Raya
                      </label>
                      <input
                        type="text"
                        value={periodNumber}
                        onChange={(e) => setPeriodNumber(e.target.value)}
                        placeholder="ej. Raya 34"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                      </input>
                    </div>
                  </div>

                  {/* Total Amount & Employees Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Gran Total ($ MXN)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                        <Users className="w-3.5 h-3.5 text-indigo-400" /> Conteo Empleados
                      </label>
                      <input
                        type="number"
                        value={employeeCount}
                        onChange={(e) => setEmployeeCount(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Bank Breakdown List */}
                  {bankBreakdown.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 block">
                        Desglose Detectado por Banco / Efectivo:
                      </label>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1 divide-y divide-slate-800/80">
                        {bankBreakdown.map((item, idx) => (
                          <div key={idx} className="flex justify-between pt-1">
                            <span className="text-slate-300 font-medium">{item.bankOrSource}</span>
                            <span className="font-mono text-emerald-400 font-bold">
                              ${item.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observations */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Observaciones / Notas:
                    </label>
                    <textarea
                      rows={2}
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Notas adicionales..."
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
              {showDeleteConfirm ? (
                <div className="w-full bg-rose-950/40 border border-rose-500/30 p-3 rounded-2xl flex items-center justify-between">
                  <div className="text-xs text-rose-300 font-semibold">
                    ¿Confirmar eliminación permanente?
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Sí, Borrar
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-xl text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-2 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    title="Descartar y borrar este registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Borrar Ficha</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={onClose}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-900/20"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Guardar Cambios</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
