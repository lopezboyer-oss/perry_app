'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Wand2, Save, X, Check, Edit3, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { activityTypeLabels, activityTypeColors, activityStatusLabels, calculateDuration } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

interface ParsedLine {
  index: number;
  originalText: string;
  cleanText: string;
  suggestedType: string;
  suggestedContact: string | null;
  isHeader: boolean;
}

interface Props {
  users: { id: string; name: string }[];
  clients: { id: string; name: string; contacts: { id: string; name: string }[] }[];
  currentUserId: string;
}

interface EditedLine {
  selected: boolean;
  isExpanded: boolean;
  title: string;
  type: string;
  status: string;
  clientId: string;
  contactId: string;
  opportunityId: string;
  workOrderFolio: string;
  projectArea: string;
  result: string;
  nextStep: string;
  commitmentDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: string;
  location: string;
  notes: string;
}

export function ImportClient({ users, clients, currentUserId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<'input' | 'preview' | 'done'>('input');
  const [rawText, setRawText] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [userId, setUserId] = useState(currentUserId);
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [editedLines, setEditedLines] = useState<EditedLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedCount, setSavedCount] = useState(0);

  const exampleText = `Buena tarde anexo reporte de actividades:
- Se atiende reunión con Ing Alexis Campos para instalación de guarda para botonera
- Reemplazo de cableado expuesto
- Instalación de lámparas de 2ft en MR1`;

  const handleParse = async () => {
    if (!rawText.trim()) {
      setError('Pega el texto del reporte antes de continuar');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reportes/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });

      if (!res.ok) throw new Error('Error al parsear');

      const lines: ParsedLine[] = await res.json();
      setParsedLines(lines);
      setEditedLines(
        lines.map((line) => ({
          selected: true,
          isExpanded: false,
          title: line.cleanText,
          type: line.suggestedType,
          status: 'COMPLETADA',
          clientId: '',
          contactId: '',
          opportunityId: '',
          workOrderFolio: '',
          projectArea: '',
          result: '',
          nextStep: '',
          commitmentDate: '',
          startTime: '',
          endTime: '',
          durationMinutes: '',
          location: '',
          notes: '',
        }))
      );
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Error al procesar el texto');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const selected = editedLines.filter((l) => l.selected);
    if (selected.length === 0) {
      setError('Selecciona al menos una actividad para guardar');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reportes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          reportDate,
          userId,
          activities: editedLines
            .map((line) => {
              if (!line.selected) return null;
              return {
                title: line.title,
                type: line.type,
                status: line.status,
                clientId: line.clientId || null,
                contactId: line.contactId || null,
                opportunityId: line.opportunityId || null,
                workOrderFolio: line.workOrderFolio || null,
                projectArea: line.projectArea || null,
                result: line.result || null,
                nextStep: line.nextStep || null,
                commitmentDate: line.commitmentDate || null,
                startTime: line.startTime || null,
                endTime: line.endTime || null,
                durationMinutes: line.durationMinutes ? parseInt(line.durationMinutes) : null,
                location: line.location || null,
                notes: line.notes || null,
              };
            })
            .filter(Boolean),
        }),
      });

      if (!res.ok) throw new Error('Error al guardar');

      const result = await res.json();
      setSavedCount(result.count);
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Error al guardar las actividades');
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (index: number, updates: Partial<EditedLine>) => {
    setEditedLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const newLine = { ...line, ...updates };

        // Auto-calculate duration if times changed
        if (updates.startTime !== undefined || updates.endTime !== undefined) {
          const start = updates.startTime !== undefined ? updates.startTime : line.startTime;
          const end = updates.endTime !== undefined ? updates.endTime : line.endTime;
          if (start && end) {
            const dur = calculateDuration(start, end);
            if (dur) newLine.durationMinutes = dur.toString();
          }
        }

        return newLine;
      })
    );
  };

  if (step === 'done') {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Importación Exitosa!</h2>
        <p className="text-slate-500 mb-6">
          Se guardaron <span className="font-bold text-green-600">{savedCount}</span> actividades del reporte
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setStep('input');
              setRawText('');
              setParsedLines([]);
              setEditedLines([]);
            }}
            className="btn-secondary"
          >
            Importar Otro
          </button>
          <button onClick={() => router.push('/actividades')} className="btn-primary">
            Ver Actividades
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Importar Reporte</h1>
        <p className="text-slate-500 text-sm mt-1">
          Pega el texto de un reporte de WhatsApp para crear actividades automáticamente
        </p>
      </div>

      {step === 'input' && (
        <>
          <div className="card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha del Reporte</label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="block text-sm font-medium text-slate-700 mb-1">
              Texto del Reporte
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Pega aquí el reporte de WhatsApp..."
              rows={12}
              className="w-full font-mono text-sm"
            />

            <button
              type="button"
              onClick={() => setRawText(exampleText)}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-700 underline"
            >
              Cargar texto de ejemplo
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            onClick={handleParse}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Wand2 size={16} /> Analizar y Clasificar
              </>
            )}
          </button>
        </>
      )}

      {step === 'preview' && (
        <>
          <div className="flex max-sm:flex-col items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Previsualización — {editedLines.filter((l) => l.selected).length} seleccionadas
              </h2>
              <p className="text-sm text-slate-500">
                Opcionalmente expande las actividades para cargar el resto de detalles operativos.
              </p>
            </div>
            <button onClick={() => setStep('input')} className="btn-ghost text-sm shrink-0">
              <ArrowLeft size={14} /> Volver a Pegar
            </button>
          </div>

          <div className="space-y-4">
            {editedLines.map((line, index) => {
              const selectedClient = clients.find((c) => c.id === line.clientId);
              const contactsOpts = selectedClient?.contacts || [];

              return (
                <div
                  key={index}
                  className={`card p-4 transition-all duration-300 ${!line.selected ? 'opacity-50 grayscale' : 'border-l-4 border-l-indigo-500'}`}
                >
                  {/* Básico Header Visible siempre */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={line.selected}
                      onChange={(e) => updateLine(index, { selected: e.target.checked })}
                      className="mt-1.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-bold text-slate-600">REQ. {index + 1}</span>
                        <span>·</span>
                        <span className="italic truncate">{parsedLines[index]?.originalText.substring(0, 80)}...</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-12">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Título de la Actividad</label>
                          <input
                            type="text"
                            value={line.title}
                            placeholder="Título Analizado"
                            onChange={(e) => updateLine(index, { title: e.target.value })}
                            className="w-full font-medium"
                          />
                        </div>
                        
                        <div className="md:col-span-3">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Estatus</label>
                          <select
                            value={line.status}
                            onChange={(e) => updateLine(index, { status: e.target.value })}
                            className="w-full text-sm font-semibold text-slate-800 border-slate-300"
                          >
                            {Object.entries(activityStatusLabels).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                          <select
                            value={line.type}
                            onChange={(e) => updateLine(index, { type: e.target.value })}
                            className="w-full text-sm"
                          >
                            {Object.entries(activityTypeLabels).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="md:col-span-3">
                           <label className="block text-xs font-medium text-slate-700 mb-1">Cliente</label>
                           <SearchableSelect
                              options={[
                                { id: '', name: 'Sin Asignar' },
                                ...clients.map((c) => ({ id: c.id, name: c.name }))
                              ]}
                              value={line.clientId}
                              onChange={(val) => updateLine(index, { clientId: val, contactId: '' })}
                              placeholder="Buscar cliente..."
                              size="sm"
                           />
                        </div>
                        
                        <div className="md:col-span-3 flex items-end gap-2">
                           <div className="flex-1">
                             <label className="block text-xs font-medium text-slate-700 mb-1">Contacto</label>
                             <SearchableSelect
                                options={[
                                  { id: '', name: 'No específico' },
                                  ...contactsOpts.map((c) => ({ id: c.id, name: c.name }))
                                ]}
                                value={line.contactId}
                                onChange={(val) => updateLine(index, { contactId: val })}
                                placeholder="Buscar contacto..."
                                disabled={!line.clientId}
                                size="sm"
                             />
                           </div>
                           <button 
                             type="button" 
                             onClick={() => updateLine(index, { isExpanded: !line.isExpanded })}
                             className={`px-3 py-[7px] text-xs shrink-0 rounded-lg border transition-colors ${line.isExpanded ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'}`}
                             title="Expandir Módulo de Control (OT, Tiempos, Resultados)"
                           >
                              {line.isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                           </button>
                        </div>
                      </div>

                      {/* --- CAMPOS EXTRA (ACORDEÓN) --- */}
                      {line.isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 animate-fade-in bg-slate-50 p-4 rounded-xl shadow-inner">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">ID Oportunidad (OPP)</label>
                            <input
                              type="text"
                              value={line.opportunityId}
                              onChange={(e) => updateLine(index, { opportunityId: e.target.value })}
                              className="w-full text-sm"
                              placeholder="Ej. OPP-2024-001"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Inicio</label>
                              <input
                                type="time"
                                value={line.startTime}
                                onChange={(e) => updateLine(index, { startTime: e.target.value })}
                                className="w-full text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Fin</label>
                              <input
                                type="time"
                                value={line.endTime}
                                onChange={(e) => updateLine(index, { endTime: e.target.value })}
                                className="w-full text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Mins</label>
                              <input
                                type="number"
                                value={line.durationMinutes}
                                onChange={(e) => updateLine(index, { durationMinutes: e.target.value })}
                                className="w-full text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Folio (O.T. / Ticket)</label>
                            <input
                              type="text"
                              value={line.workOrderFolio}
                              onChange={(e) => updateLine(index, { workOrderFolio: e.target.value })}
                              className="w-full text-sm uppercase"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Célula / Área</label>
                            <input
                              type="text"
                              value={line.projectArea}
                              onChange={(e) => updateLine(index, { projectArea: e.target.value })}
                              className="w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Lugar de Ejecución</label>
                            <input
                              type="text"
                              value={line.location}
                              onChange={(e) => updateLine(index, { location: e.target.value })}
                              className="w-full text-sm"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-slate-700 mb-1">Resultados</label>
                            <textarea
                              value={line.result}
                              onChange={(e) => updateLine(index, { result: e.target.value })}
                              className="w-full text-sm"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Siguiente Paso</label>
                            <textarea
                              value={line.nextStep}
                              onChange={(e) => updateLine(index, { nextStep: e.target.value })}
                              className="w-full text-sm"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Notas / Bitácora</label>
                            <textarea
                              value={line.notes}
                              onChange={(e) => updateLine(index, { notes: e.target.value })}
                              className="w-full text-sm"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Fecha de Compromiso</label>
                            <input
                              type="date"
                              value={line.commitmentDate}
                              onChange={(e) => updateLine(index, { commitmentDate: e.target.value })}
                              className="w-full text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 shrink-0">
            <button onClick={() => setStep('input')} className="btn-secondary justify-center">
              <X size={16} /> Cancelar Reconstrucción
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary flex-1 justify-center"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={16} /> Guardar (x{editedLines.filter((l) => l.selected).length}) e Ingresar
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ArrowLeft({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
