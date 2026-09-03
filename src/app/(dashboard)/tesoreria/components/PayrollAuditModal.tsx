'use client';

import React, { useState, useEffect } from 'react';
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
  FileText,
  Eye,
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

  // Determine if it's a PDF initially
  const rawFileUrl = payroll.imageUrl || payroll.signedImageUrl;
  const initialIsPdf =
    Boolean(rawFileUrl && rawFileUrl.toLowerCase().includes('.pdf')) ||
    payroll.companyName?.includes('CASEME');

  const [isPdf, setIsPdf] = useState<boolean>(initialIsPdf);

  // Form state
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

  // When AI audit finishes, automatically populate fields with AI findings
  useEffect(() => {
    if (auditData) {
      if (auditData.detectedCompany) setCompanyName(auditData.detectedCompany);
      if (auditData.detectedPeriod) setPeriodNumber(auditData.detectedPeriod);
      if (auditData.totalAmount !== undefined) setTotalAmount(auditData.totalAmount);
      if (auditData.employeeCount !== undefined) setEmployeeCount(auditData.employeeCount);
      if (auditData.observations) setObservations(auditData.observations);
      if (auditData.bankBreakdown) setBankBreakdown(auditData.bankBreakdown);
    }
  }, [auditData]);

  // Clean media streaming endpoint from our backend proxy
  const mediaProxyUrl = `/api/treasury/nominas/${payroll.id}/media`;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header Bar */}
        <div className="p-3 sm:px-6 border-b border-slate-700 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Auditoría Visual & Validación con IA
                </h3>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-indigo-500/30">
                  {payroll.companyName}
                </span>
                {isPdf && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> PDF
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Inspección del documento original contra las cifras de nómina y desglose bancario
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {rawFileUrl && (
              <a
                href={mediaProxyUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir Original
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-all border border-slate-700"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content - Side by Side Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* LEFT COLUMN: Visual Document Viewer (7 cols on desktop) */}
          <div className="lg:col-span-7 bg-slate-950 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 relative h-80 lg:h-full overflow-hidden">
            {/* Viewer Controls Toolbar */}
            <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10">
              <div className="flex items-center space-x-1.5">
                {!isPdf && (
                  <>
                    <button
                      onClick={handleZoomIn}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
                      title="Acercar (+)"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleZoomOut}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
                      title="Alejar (-)"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
                      title="Restablecer vista"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-mono text-slate-300 px-2 font-bold">
                      {Math.round(zoom * 100)}%
                    </span>
                  </>
                )}
                {isPdf && (
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-400" /> Visor de Documento PDF
                  </span>
                )}
              </div>

              {rawFileUrl && (
                <button
                  onClick={() => setIsPdf(!isPdf)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold border border-slate-700 transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  {isPdf ? 'Cambiar a Imagen' : 'Ver como PDF'}
                </button>
              )}
            </div>

            {/* Document Canvas Container */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4 bg-slate-950">
              {rawFileUrl ? (
                isPdf ? (
                  <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-slate-700 shadow-xl bg-white">
                    <iframe
                      src={`${mediaProxyUrl}#toolbar=1&navpanes=0`}
                      className="w-full h-full min-h-[400px] border-0"
                      title="Documento PDF de Nómina"
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.15s ease-out',
                    }}
                    className="max-w-full max-h-full flex items-center justify-center"
                  >
                    <img
                      src={mediaProxyUrl}
                      alt="Hoja de Nómina Auditada"
                      className="max-w-full max-h-[70vh] object-contain rounded-lg border border-slate-700 shadow-2xl"
                      onError={() => setIsPdf(true)}
                    />
                  </div>
                )
              ) : (
                <div className="text-center p-8 text-slate-500 space-y-2">
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-600" />
                  <p className="text-xs text-slate-400 font-semibold">No se adjuntó archivo a este registro.</p>
                  <p className="text-[11px] text-slate-500">El reporte se basó en texto del chat.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: AI Audit Results & Interactive Validation Form (5 cols on desktop) */}
          <div className="lg:col-span-5 bg-slate-900 flex flex-col justify-between overflow-y-auto p-4 sm:p-6 space-y-5">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-16 text-center">
                <div className="p-4 bg-indigo-600/20 border border-indigo-500/30 rounded-3xl animate-pulse">
                  <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                </div>
                <p className="text-base font-bold text-white">
                  Analizando cantidades y estructura con IA...
                </p>
                <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                  Gemini está auditando las cifras, dispersión por banco y clasificando el documento de nómina.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* AI Diagnostic Badge & Notes */}
                {auditData ? (
                  <div className="p-4 rounded-2xl border space-y-3 bg-slate-950 border-slate-700 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400">
                        Veredicto del Auditor IA
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          auditData.confidence === 'ALTA'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : auditData.confidence === 'MEDIA'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        Certeza: {auditData.confidence}
                      </span>
                    </div>

                    {/* Classification Banner */}
                    <div className="flex items-center gap-2.5">
                      {auditData.classification === 'NOMINA_COMPLETA' ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-emerald-300">
                              Nómina Principal Confirmada
                            </p>
                            <p className="text-[11px] text-slate-300">
                              Contiene la dispersión completa de sueldos de la plantilla.
                            </p>
                          </div>
                        </>
                      ) : auditData.classification === 'REPORTE_PARCIAL_HORAS_EXTRA' ? (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-amber-300">
                              Reporte Parcial / Horas Extra
                            </p>
                            <p className="text-[11px] text-slate-300">
                              Parece ser un anexo de tiempo extra, no la nómina total.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-rose-300">
                              No Corresponde a Nómina
                            </p>
                            <p className="text-[11px] text-slate-300">
                              El documento no parece ser un reporte de dispersión de raya.
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Discrepancy warning */}
                    {auditData.hasDiscrepancies && (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl flex items-start gap-2 text-xs text-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Discrepancia detectada: </span>
                          Las cantidades detectadas difieren del monto registrado originalmente (${payroll.totalAmount.toLocaleString('es-MX')}).
                        </div>
                      </div>
                    )}

                    {/* Audit Notes from AI */}
                    {auditData.auditNotes && (
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl space-y-1 text-xs">
                        <p className="font-bold text-indigo-300 text-[10px] uppercase tracking-wider">
                          Observaciones de la IA:
                        </p>
                        <p className="text-slate-200 text-xs leading-relaxed">
                          {auditData.auditNotes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Validation Form */}
                <div className="bg-slate-950 border border-slate-700 p-4 sm:p-5 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <span>Valores a Registrar en la Ficha</span>
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">Campos editables</span>
                  </div>

                  {/* Company & Period Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-1.5">
                        <Building2 className="w-4 h-4 text-indigo-400" /> Empresa
                      </label>
                      <select
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-800 border-2 border-slate-600 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-400 focus:bg-slate-700 transition-all shadow-inner"
                      >
                        <option value="GRUPO CASEME" className="bg-slate-800 text-white">GRUPO CASEME</option>
                        <option value="DROBOTS" className="bg-slate-800 text-white">DROBOTS</option>
                        <option value="OPUS INGENIUM" className="bg-slate-800 text-white">OPUS INGENIUM</option>
                        <option value="VULCAN FORGE" className="bg-slate-800 text-white">VULCAN FORGE</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-1.5">
                        <Calendar className="w-4 h-4 text-indigo-400" /> Periodo / Raya
                      </label>
                      <input
                        type="text"
                        value={periodNumber}
                        onChange={(e) => setPeriodNumber(e.target.value)}
                        placeholder="ej. Raya 34"
                        className="w-full px-3.5 py-2.5 bg-slate-800 border-2 border-slate-600 rounded-xl text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-slate-700 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Total Amount & Employees Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 mb-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-400" /> Gran Total ($ MXN)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 bg-slate-800 border-2 border-emerald-500 rounded-xl text-base font-black text-emerald-300 font-mono tracking-tight focus:outline-none focus:border-emerald-400 focus:bg-slate-700 transition-all shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-1.5">
                        <Users className="w-4 h-4 text-indigo-400" /> Conteo Empleados
                      </label>
                      <input
                        type="number"
                        value={employeeCount}
                        onChange={(e) => setEmployeeCount(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3.5 py-2.5 bg-slate-800 border-2 border-slate-600 rounded-xl text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-slate-700 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Bank Breakdown List */}
                  {bankBreakdown.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-200 block">
                        Desglose Detectado por Banco / Efectivo:
                      </label>
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 text-xs space-y-1.5 divide-y divide-slate-800">
                        {bankBreakdown.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center pt-1.5">
                            <span className="text-slate-200 font-semibold">{item.bankOrSource}</span>
                            <span className="font-mono text-emerald-400 font-bold text-xs">
                              ${item.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observations */}
                  <div>
                    <label className="text-xs font-bold text-slate-200 block mb-1.5">
                      Observaciones / Notas:
                    </label>
                    <textarea
                      rows={2}
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Notas adicionales..."
                      className="w-full px-3.5 py-2 bg-slate-800 border-2 border-slate-600 rounded-xl text-xs font-semibold text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-slate-700 transition-all resize-none shadow-inner"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              {showDeleteConfirm ? (
                <div className="flex items-center space-x-2 bg-rose-950/60 border border-rose-800/80 p-2 rounded-2xl">
                  <span className="text-xs font-bold text-rose-300">¿Confirmas borrar?</span>
                  <button
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    {isDeleting ? 'Borrando...' : 'Sí, eliminar'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 border border-rose-800/60 rounded-xl text-xs font-bold transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Descartar Nómina
                </button>
              )}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSaving || isLoading}
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/20"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Guardar y Validar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
