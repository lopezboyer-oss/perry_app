'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Building2,
  Calendar,
  DollarSign,
  Users,
  AlertCircle,
} from 'lucide-react';

interface ManualPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPayrollCreated: (payroll: any) => void;
  isDirector: boolean;
  allowedCompanies: string[];
  defaultCompany?: string;
}

interface BankItem {
  bankOrSource: string;
  amount: number;
}

const ALL_COMPANIES = [
  'GRUPO CASEME',
  'DROBOTS',
  'OPUS INGENIUM',
  'VULCAN FORGE',
];

export function ManualPayrollModal({
  isOpen,
  onClose,
  onPayrollCreated,
  isDirector,
  allowedCompanies,
  defaultCompany,
}: ManualPayrollModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine available companies
  const availableCompanies = isDirector
    ? ALL_COMPANIES
    : allowedCompanies.length > 0
    ? allowedCompanies
    : ALL_COMPANIES;

  const initialCompany = defaultCompany && availableCompanies.includes(defaultCompany)
    ? defaultCompany
    : availableCompanies[0] || 'GRUPO CASEME';

  const [companyName, setCompanyName] = useState<string>(initialCompany);
  const [periodNumber, setPeriodNumber] = useState<string>('Raya Semanal');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [employeeCount, setEmployeeCount] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [bankList, setBankList] = useState<BankItem[]>([
    { bankOrSource: 'Santander', amount: 0 },
  ]);

  // File state
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Action states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysisNotes, setAiAnalysisNotes] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setError(null);
    setAiAnalysisNotes(null);

    // Limit to 15MB
    if (file.size > 15 * 1024 * 1024) {
      setError('El archivo seleccionado supera el límite de 15 MB.');
      return;
    }

    const isPdfType = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setIsPdf(isPdfType);
    setFileName(file.name);
    setFileSize(
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`
    );

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFileData(result);
    };
    reader.onerror = () => {
      setError('No se pudo leer el archivo. Intenta de nuevo.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Pre-analyze with Gemini Vision AI
  const handleAutoAnalyzeWithAi = async () => {
    if (!fileData) {
      setError('Primero selecciona o arrastra un archivo de nómina (PDF o imagen).');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAiAnalysisNotes(null);

    try {
      const res = await fetch('/api/treasury/nominas/pre-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData,
          companyHint: companyName,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error al analizar documento con IA');
      }

      const json = await res.json();
      const detected = json.detected;

      if (detected) {
        if (detected.totalAmount !== undefined && detected.totalAmount !== null && Number(detected.totalAmount) > 0) {
          setTotalAmount(Number(detected.totalAmount).toFixed(2));
        }
        if (detected.employeeCount && Number(detected.employeeCount) > 0) {
          setEmployeeCount(detected.employeeCount.toString());
        }
        if (detected.detectedPeriod) {
          setPeriodNumber(detected.detectedPeriod);
        }
        if (isDirector && detected.detectedCompany) {
          const matchCompany = availableCompanies.find(
            (c) => c.toLowerCase() === detected.detectedCompany.toLowerCase()
          );
          if (matchCompany) setCompanyName(matchCompany);
        }

        if (Array.isArray(detected.bankBreakdown) && detected.bankBreakdown.length > 0) {
          setBankList(
            detected.bankBreakdown.map((b: any) => ({
              bankOrSource: (b.bankOrSource || 'Banco').toUpperCase(),
              amount: parseFloat(Number(b.amount || 0).toFixed(2)),
            }))
          );
        }

        setAiAnalysisNotes(
          detected.auditNotes || 'Datos cuantitativos y desglose extraídos con éxito por Gemini.'
        );
      }
    } catch (err: any) {
      setError(err.message || 'Error durante el análisis con IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddBank = () => {
    setBankList([...bankList, { bankOrSource: 'Efectivo', amount: 0 }]);
  };

  const handleRemoveBank = (index: number) => {
    setBankList(bankList.filter((_, i) => i !== index));
  };

  const handleBankChange = (index: number, field: 'bankOrSource' | 'amount', value: any) => {
    const updated = [...bankList];
    if (field === 'amount') {
      updated[index].amount = parseFloat(value) || 0;
    } else {
      updated[index].bankOrSource = value;
    }
    setBankList(updated);
  };

  const handleSavePayroll = async () => {
    setError(null);

    const parsedTotal = parseFloat(totalAmount.replace(/,/g, ''));
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      setError('Ingresa un monto total válido mayor a $0.00 MXN.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/treasury/nominas/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          periodNumber: periodNumber.trim() || 'Raya Semanal',
          totalAmount: parsedTotal,
          employeeCount: parseInt(employeeCount, 10) || 0,
          bankBreakdown: bankList,
          observations,
          fileData,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Error al registrar la nómina');
      }

      const json = await res.json();
      onPayrollCreated(json.payroll);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error guardando nómina');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Carga Manual de Nómina</h2>
              <p className="text-xs text-slate-400">
                Registra la nómina de la semana y genera el token de firma digital
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Success Notes */}
          {aiAnalysisNotes && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{aiAnalysisNotes}</span>
            </div>
          )}

          {/* Company & Period Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                Empresa / Razón Social
              </label>
              {availableCompanies.length === 1 ? (
                <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white">
                  {availableCompanies[0]}
                </div>
              ) : (
                <select
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                  className="audit-input w-full p-3 rounded-xl border border-slate-700 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  {availableCompanies.map((c) => (
                    <option key={c} value={c} className="bg-slate-900 text-white">
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                Periodo / Raya
              </label>
              <input
                type="text"
                value={periodNumber}
                onChange={(e) => setPeriodNumber(e.target.value)}
                placeholder="Ej. Raya 35 o Semana 35"
                style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                className="audit-input w-full p-3 rounded-xl border border-slate-700 text-xs font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* File Upload Drop Area */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Documento de Nómina (PDF o Imagen)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".pdf,image/png,image/jpeg,image/jpg"
              className="hidden"
            />

            {!fileData ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-700 hover:border-indigo-500/60 bg-slate-950/50 hover:bg-slate-950'
                }`}
              >
                <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto mb-2 animate-pulse" />
                <p className="text-xs font-bold text-slate-200">
                  Arrastra tu archivo aquí o haz clic para examinar
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Soporta documentos PDF y fotografías de nómina (JPG, PNG) de hasta 15 MB
                </p>
              </div>
            ) : (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-100 truncate">{fileName}</p>
                    <p className="text-[11px] text-slate-400">
                      {isPdf ? 'Documento PDF' : 'Imagen'} • {fileSize}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleAutoAnalyzeWithAi}
                    disabled={isAnalyzing}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Analizando con IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>⚡ Auto-completar con IA</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFileData(null);
                      setFileName(null);
                      setFileSize(null);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                    title="Remover archivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Amount & Employees Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Gran Total a Dispersar (Neto MXN)
              </label>
              <div className="flex rounded-xl overflow-hidden border border-slate-700 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 bg-slate-900 shadow-inner">
                <span className="inline-flex items-center justify-center px-3.5 bg-slate-800 text-emerald-400 font-black font-mono text-sm border-r border-slate-700 select-none">
                  $
                </span>
                <input
                  type="text"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ backgroundColor: '#1e293b', color: '#10b981' }}
                  className="audit-input-total w-full px-3.5 py-3 text-sm font-black font-mono focus:outline-none border-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                Conteo Total de Empleados
              </label>
              <input
                type="number"
                min="0"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                placeholder="0"
                style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                className="audit-input w-full p-3 rounded-xl border border-slate-700 text-xs font-semibold focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Bank Breakdown List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Desglose por Banco / Fuente
              </label>
              <button
                type="button"
                onClick={handleAddBank}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Fuente
              </button>
            </div>

            <div className="space-y-2">
              {bankList.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.bankOrSource}
                    onChange={(e) => handleBankChange(idx, 'bankOrSource', e.target.value)}
                    placeholder="Banco / Fuente (ej. Santander, Efectivo)"
                    style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
                    className="audit-input flex-1 p-2.5 rounded-xl border border-slate-700 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex rounded-xl overflow-hidden border border-slate-700 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 bg-slate-900 shadow-inner w-36 sm:w-48 shrink-0">
                    <span className="inline-flex items-center justify-center px-2.5 bg-slate-800 text-emerald-400 font-bold font-mono text-xs border-r border-slate-700 select-none">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.amount || ''}
                      onChange={(e) => handleBankChange(idx, 'amount', e.target.value)}
                      placeholder="0.00"
                      style={{ backgroundColor: '#1e293b', color: '#10b981' }}
                      className="audit-input w-full px-2.5 py-2.5 text-xs font-mono font-bold focus:outline-none border-0"
                    />
                  </div>
                  {bankList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBank(idx)}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Live Bank Reconciliation Bar */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs gap-2 mt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">Suma del desglose:</span>
                <span className="font-mono font-bold text-slate-100">
                  ${bankList
                    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
                    .toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {(() => {
                  const sumBanks = bankList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                  const parsedTotal = parseFloat(totalAmount.replace(/,/g, '')) || 0;
                  const diff = Math.abs(parsedTotal - sumBanks);

                  if (parsedTotal > 0 && diff < 0.05) {
                    return (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[10px] border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Cuadrado al 100% con Gran Total
                      </span>
                    );
                  }
                  if (parsedTotal > 0 && diff >= 0.05) {
                    return (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold text-[10px] border border-amber-500/30">
                        Diferencia con Gran Total: ${(parsedTotal - sumBanks).toFixed(2)}
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              {(() => {
                const sumBanks = bankList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                const parsedTotal = parseFloat(totalAmount.replace(/,/g, '')) || 0;
                const diff = Math.abs(parsedTotal - sumBanks);

                if (sumBanks > 0 && diff >= 0.05) {
                  return (
                    <button
                      type="button"
                      onClick={() => setTotalAmount(sumBanks.toFixed(2))}
                      className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 active:scale-95 shadow-sm"
                      title="Copiar la suma de los bancos directamente al campo de Gran Total"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Igualar Gran Total a suma (${sumBanks.toFixed(2)})</span>
                    </button>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Observaciones Administrativas
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notas aclaratorias sobre esta nómina..."
              rows={2}
              style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
              className="audit-input w-full p-3 rounded-xl border border-slate-700 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSavePayroll}
            disabled={isSaving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar y Generar Token de Firma</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
