'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X, UploadCloud, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useState } from 'react';
import Papa from 'papaparse';

interface OdooImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OdooImportDialog({ open, onOpenChange, onSuccess }: OdooImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    setSuccessMsg(null);
    setFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        if (results.errors.length > 0 && results.data.length === 0) {
          setError("Error leyendo el archivo CSV. Revisa el formato.");
          return;
        }

        // Mapear Odoo columns (Esto asume ciertas posibles columnas de Odoo o generales)
        const mappedData = results.data.map((row: any) => {
          // Extraer nombre de campos que usualmente tira Odoo
          const name = row['Company'] || row['Compañía'] || row['Name'] || row['Nombre'] || row['Cliente'] || Object.values(row)[0];
          const code = row['Code'] || row['Código'] || row['Reference'] || null;
          
          return {
            name: String(name || '').trim(),
            code: code ? String(code).trim() : null,
            status: 'ACTIVO',
            notes: 'Importado de CSV Odoo'
          };
        }).filter(item => item.name.length > 0);

        setPreview(mappedData);
      }
    });
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/clientes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: preview })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error importando');

      setSuccessMsg(`¡Éxito! ${data.created} clientes creados, ${data.skipped} omitidos (ya existían).`);
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setFile(null);
        setPreview([]);
        setSuccessMsg(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(val) => {
      if(!loading) { onOpenChange(val); setFile(null); setPreview([]); setError(null); setSuccessMsg(null); }
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-2xl animate-slide-in">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-600" /> Importar desde Odoo
            </Dialog.Title>
            <Dialog.Close disabled={loading} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X size={20} />
            </Dialog.Close>
          </div>

          {!file ? (
            <div 
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
            >
              <UploadCloud size={48} className={`mx-auto mb-4 ${dragActive ? 'text-emerald-500' : 'text-slate-400'}`} />
              <p className="text-slate-600 font-medium mb-1">Arrastra tu archivo CSV aquí</p>
              <p className="text-sm text-slate-500 mb-4">O selecciona un archivo de tu computadora</p>
              <label className="btn-primary cursor-pointer inline-flex">
                <span>Examinar archivo</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleChange} />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-4 border border-slate-200">
                <FileSpreadsheet size={32} className="text-indigo-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{file.name}</p>
                  <p className="text-sm text-slate-500">{preview.length} clientes detectados</p>
                </div>
                <button onClick={() => { setFile(null); setPreview([]); }} disabled={loading} className="text-slate-400 hover:text-red-500 text-sm">
                  Cambiar
                </button>
              </div>

              {preview.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr><th className="px-3 py-2">Cliente / Empresa a Importar</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.slice(0, 10).map((p, i) => (
                        <tr key={i}><td className="px-3 py-2 text-slate-600">{p.name}</td></tr>
                      ))}
                      {preview.length > 10 && (
                        <tr><td className="px-3 py-2 text-center text-slate-400 italic">...y {preview.length - 10} más</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {error && <div className="bg-red-50 p-3 rounded-lg text-red-600 text-sm">{error}</div>}
              {successMsg && <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600 text-sm font-medium">{successMsg}</div>}

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" disabled={loading} onClick={() => onOpenChange(false)} className="btn-ghost">Cancelar</button>
                <button type="button" disabled={loading || preview.length === 0} onClick={handleImport} className="btn-primary min-w-[140px]">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Procesar Importación'}
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
