'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Wand2, Save, X, Check, Edit3, AlertCircle
} from 'lucide-react';
import { activityTypeLabels, activityTypeColors } from '@/lib/utils';

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

export function ImportClient({ users, clients, currentUserId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<'input' | 'preview' | 'done'>('input');
  const [rawText, setRawText] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [userId, setUserId] = useState(currentUserId);
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [editedLines, setEditedLines] = useState<
    {
      selected: boolean;
      title: string;
      type: string;
      clientId: string;
      contactId: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedCount, setSavedCount] = useState(0);

  const exampleText = `Buena tarde anexo reporte de actividades:
- Se atiende reunión con Ing Alexis Campos para instalación de guarda para botonera
- Se atiende reunión con Ing Jesus Montalvo para instalación de alumbrado led en P2
- Se atiende reunión con Ing Jesus Montalvo para cálculo estructural para barandal
- Se envía documentación para liberación de permisos de fin de semana
- Se anexa solicitud de materiales para actividades
- Reemplazo de cableado expuesto
- Instalación de lámparas de 2ft en MR1
- Instalación de guarda para botonera
- Conexión de sistema neumático en lado RH
- Se atiende reunión con Miguel González para determinar datos pendientes para trabajos de fin de semana en casa de aire`;

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
          title: line.cleanText,
          type: line.suggestedType,
          clientId: '',
          contactId: '',
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
            .map((line, index) => {
              if (!line.selected) return null;
              return {
                title: line.title,
                type: line.type,
                clientId: line.clientId || null,
                contactId: line.contactId || null,
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

  const updateLine = (index: number, updates: Partial<typeof editedLines[0]>) => {
    setEditedLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...updates } : line))
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Previsualización — {editedLines.filter((l) => l.selected).length} actividades seleccionadas
              </h2>
              <p className="text-sm text-slate-500">
                Revisa y edita cada línea antes de guardar. Puedes cambiar el tipo, título, cliente y contacto.
              </p>
            </div>
            <button onClick={() => setStep('input')} className="btn-ghost text-sm">
              <ArrowLeft size={14} /> Volver
            </button>
          </div>

          <div className="space-y-3">
            {editedLines.map((line, index) => {
              const selectedClient = clients.find((c) => c.id === line.clientId);
              return (
                <div
                  key={index}
                  className={`card p-4 transition-opacity ${!line.selected ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={line.selected}
                      onChange={(e) => updateLine(index, { selected: e.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>Línea {index + 1}</span>
                        <span>·</span>
                        <span className="italic">{parsedLines[index]?.originalText.substring(0, 60)}...</span>
                      </div>
                      <input
                        type="text"
                        value={line.title}
                        onChange={(e) => updateLine(index, { title: e.target.value })}
                        className="w-full text-sm"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select
                          value={line.type}
                          onChange={(e) => updateLine(index, { type: e.target.value })}
                          className="text-sm"
                        >
                          {Object.entries(activityTypeLabels).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <select
                          value={line.clientId}
                          onChange={(e) => updateLine(index, { clientId: e.target.value, contactId: '' })}
                          className="text-sm"
                        >
                          <option value="">Sin cliente</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <select
                          value={line.contactId}
                          onChange={(e) => updateLine(index, { contactId: e.target.value })}
                          className="text-sm"
                          disabled={!line.clientId}
                        >
                          <option value="">Sin contacto</option>
                          {(selectedClient?.contacts || []).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <span className={`badge ${activityTypeColors[line.type] || ''} text-xs`}>
                        {activityTypeLabels[line.type] || line.type}
                      </span>
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

          <div className="flex gap-3">
            <button onClick={() => setStep('input')} className="btn-secondary">
              <X size={16} /> Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary flex-1 sm:flex-initial"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={16} /> Guardar {editedLines.filter((l) => l.selected).length} Actividades
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
