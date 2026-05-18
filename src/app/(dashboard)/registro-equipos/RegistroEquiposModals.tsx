'use client';
import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Camera, Save, Loader2, Trash2 } from 'lucide-react';
import { CHECKLIST_ITEMS, type EquipRecordData, type FolioReportRow } from './registro-equipos-types';
import { formatDate } from '@/lib/utils';

/* ── CHECKLIST MODAL ── */
interface ChecklistModalProps {
  record: EquipRecordData;
  equipName: string;
  activityTitle: string;
  canEdit: boolean;
  onClose: () => void;
  onSave: (recordId: string, checklist: Record<string, boolean>) => Promise<void>;
}
export function ChecklistModal({ record, equipName, activityTitle, canEdit, onClose, onSave }: ChecklistModalProps) {
  const [values, setValues] = useState<Record<string, boolean>>({
    chkCondicionesGenerales: record.chkCondicionesGenerales,
    chkCargaBateria100: record.chkCargaBateria100,
    chk5sEquipo: record.chk5sEquipo,
    chkPaseClienteVigente: record.chkPaseClienteVigente,
    chkExtintorFuncional: record.chkExtintorFuncional,
  });
  const [saving, setSaving] = useState(false);
  const score = Object.values(values).filter(Boolean).length;

  const handleSave = async () => {
    setSaving(true);
    await onSave(record.id, values);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-800">✅ Checklist de Seguridad</h3>
            <p className="text-xs text-slate-500 mt-0.5">{equipName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="px-5 py-2 bg-slate-50 border-b border-slate-100">
          <p className="text-[10px] text-slate-500 truncate">{activityTitle}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {CHECKLIST_ITEMS.map(item => (
            <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${values[item.key] ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
              <input type="checkbox" checked={values[item.key] || false} disabled={!canEdit}
                onChange={e => setValues(v => ({ ...v, [item.key]: e.target.checked }))}
                className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium text-slate-700">{item.label}</span>
              {values[item.key] ? <CheckCircle size={16} className="ml-auto text-emerald-500" /> : <XCircle size={16} className="ml-auto text-slate-300" />}
            </label>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between">
          <div>
            <span className={`text-sm font-bold ${score === 5 ? 'text-emerald-600' : score >= 3 ? 'text-amber-600' : 'text-red-600'}`}>{score}/5</span>
            {record.checklistUpdatedBy && <p className="text-[10px] text-slate-400">Últ: {record.checklistUpdatedBy}</p>}
          </div>
          {canEdit && (
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── EVIDENCIAS MODAL ── */
interface EvidenciasModalProps {
  record: EquipRecordData;
  equipName: string;
  canEdit: boolean;
  onClose: () => void;
  onSave: (recordId: string, evidencias: string[]) => Promise<void>;
}
export function EvidenciasModal({ record, equipName, canEdit, onClose, onSave }: EvidenciasModalProps) {
  const [images, setImages] = useState<string[]>(record.evidencias || []);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleAdd = () => {
    if (images.length >= 4) { alert('Máximo 4 evidencias'); return; }
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { alert('Imagen muy grande (máx 5MB)'); return; }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) { const r = Math.min(MAX / w, MAX / h); w *= r; h *= r; }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const b64 = canvas.toDataURL('image/jpeg', 0.7);
        setImages(prev => [...prev, b64]);
      };
      img.src = URL.createObjectURL(file);
    };
    input.click();
  };

  const handleRemove = (idx: number) => { setImages(prev => prev.filter((_, i) => i !== idx)); };

  const handleSave = async () => {
    setSaving(true);
    await onSave(record.id, images);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-800">📸 Evidencias</h3>
            <p className="text-xs text-slate-500 mt-0.5">{equipName} — {images.length}/4</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {images.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Camera size={40} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sin evidencias</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square">
                  <img src={img} alt={`Evidencia ${i + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreview(img)} />
                  {canEdit && (
                    <button onClick={() => handleRemove(i)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={14} />
                    </button>
                  )}
                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">{i + 1}/4</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between">
          {canEdit && images.length < 4 && (
            <button onClick={handleAdd} className="btn-secondary text-sm flex items-center gap-1"><Camera size={14} /> Agregar</button>
          )}
          <div className="flex-1" />
          {canEdit && (
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
            </button>
          )}
        </div>
      </div>
      {/* Full-screen preview */}
      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80" onClick={() => setPreview(null)}>
          <img src={preview} alt="Preview" className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl" />
          <button onClick={() => setPreview(null)} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/30"><X size={24} /></button>
        </div>
      )}
    </div>
  );
}

/* ── FOLIO REPORT MODAL ── */
interface FolioReportModalProps {
  folio: string;
  onClose: () => void;
}
export function FolioReportModal({ folio, onClose }: FolioReportModalProps) {
  const [rows, setRows] = useState<FolioReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/equip-records/folio-report?folio=${encodeURIComponent(folio)}`)
      .then(r => r.json())
      .then(data => { setRows(data.rows || []); setLoading(false); })
      .catch(() => { setError('Error al cargar reporte'); setLoading(false); });
  }, [folio]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-800">📋 Historial de Folio</h3>
            <p className="text-xs text-slate-500 mt-0.5">Folio Odoo: <span className="font-mono font-bold text-indigo-600">{folio}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="text-center py-12"><Loader2 size={32} className="mx-auto animate-spin text-indigo-500 mb-2" /><p className="text-sm text-slate-500">Cargando historial...</p></div>
          ) : error ? (
            <div className="text-center py-12 text-red-500"><p>{error}</p></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><p className="font-medium">Sin registros para este folio</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="bg-indigo-50/50">
                    <th className="font-semibold text-xs">Fecha</th>
                    <th className="font-semibold text-xs">Actividad</th>
                    <th className="font-semibold text-xs">Equipo</th>
                    <th className="font-semibold text-xs">Operador</th>
                    <th className="font-semibold text-xs text-center">Checklist</th>
                    <th className="font-semibold text-xs text-center">Evid.</th>
                    <th className="font-semibold text-xs">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const chkCount = [r.chkCondicionesGenerales, r.chkCargaBateria100, r.chk5sEquipo, r.chkPaseClienteVigente, r.chkExtintorFuncional].filter(Boolean).length;
                    return (
                      <tr key={r.recordId} className="hover:bg-indigo-50/30">
                        <td className="text-xs whitespace-nowrap">{formatDate(r.activityDate)}</td>
                        <td className="text-xs">{r.activityTitle.length > 40 ? r.activityTitle.substring(0, 40) + '...' : r.activityTitle}</td>
                        <td className="text-xs font-medium">{r.equipName}</td>
                        <td className="text-xs">{r.operatorName || '-'}</td>
                        <td className="text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${chkCount === 5 ? 'bg-emerald-100 text-emerald-700' : chkCount >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{chkCount}/5</span>
                        </td>
                        <td className="text-center text-xs">{r.evidenciasCount > 0 ? <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">📸 {r.evidenciasCount}</span> : '-'}</td>
                        <td className="text-xs text-slate-500 max-w-[150px] truncate">{r.notes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-slate-200 flex justify-between items-center bg-slate-50">
          <p className="text-xs text-slate-500">{rows.length} registro(s)</p>
          <button onClick={onClose} className="btn-secondary text-sm">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ── NOTES MODAL ── */
interface NotesModalProps {
  record: EquipRecordData;
  equipName: string;
  canEdit: boolean;
  onClose: () => void;
  onSave: (recordId: string, notes: string) => Promise<void>;
}
export function NotesModal({ record, equipName, canEdit, onClose, onSave }: NotesModalProps) {
  const [text, setText] = useState(record.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(record.id, text);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-800">📝 Notas</h3>
            <p className="text-xs text-slate-500 mt-0.5">{equipName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <textarea value={text} onChange={e => setText(e.target.value)} disabled={!canEdit} rows={6} placeholder="Observaciones del equipo..." className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none" />
          {record.notesUpdatedBy && <p className="text-[10px] text-slate-400 mt-2">Últ. actualización: {record.notesUpdatedBy}</p>}
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end">
          {canEdit && (
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
