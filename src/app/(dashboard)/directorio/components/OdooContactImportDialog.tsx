'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X, UploadCloud, Users, Loader2 } from 'lucide-react';
import { useState } from 'react';
import Papa from 'papaparse';

interface OdooContactImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OdooContactImportDialog({ open, onOpenChange, onSuccess }: OdooContactImportDialogProps) {
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

        // Mapear Odoo columns de forma inteligente para ignorar problemas de codificación UTF-8 (ej. COMPAA)
        const mappedData = results.data.map((row: any) => {
          const keys = Object.keys(row);
          const getVal = (keywords: string[]) => {
            const key = keys.find(k => keywords.some(kw => k.toUpperCase().includes(kw)));
            return key ? row[key] : '';
          };
          
          const name = getVal(['NAME', 'NOMBRE', 'CONTACT', 'CONTACTO']);
          const companyName = getVal(['COMPAN', 'COMPA', 'CLIENTE']); // Atrapa 'COMPAÑIA', 'COMPAA', 'COMPANY', 'COMPAA'
          const position = getVal(['JOB', 'PUESTO', 'CARGO', 'POSITION']);
          const email = getVal(['EMAIL', 'CORREO']);
          const phone = getVal(['PHONE', 'TELEF', 'MOBILE', 'MOVIL']);
          
          return {
            name: String(name).trim(),
            companyName: String(companyName).trim(),
            position: String(position).trim(),
            email: String(email).trim(),
            phone: String(phone).trim(),
            notes: 'Importado de CSV Odoo'
          };
        }).filter(item => item.name.length > 0 && item.companyName.length > 0);

        if (mappedData.length === 0) {
           setError("No se encontraron contactos válidos. Asegúrate de que las columnas de 'Nombre' y 'Compañía' existan.");
        } else {
           setPreview(mappedData);
        }
      }
    });
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/contactos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: preview })
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Fallo del servidor (No es JSON): ${text.substring(0, 100)}...`);
      }

      if (!res.ok) throw new Error(data.error || 'Error importando contactos');

      setSuccessMsg(`¡Éxito! ${data.created} contactos guardados, ${data.skipped} omitidos (duplicados), ${data.newClients || 0} nuevos clientes generados de forma automática.`);
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setFile(null);
        setPreview([]);
        setSuccessMsg(null);
      }, 4000);
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
              <Users className="text-blue-600" /> Importar Contactos desde Odoo
            </Dialog.Title>
            <Dialog.Close disabled={loading} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X size={20} />
            </Dialog.Close>
          </div>

          {!file ? (
            <div 
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
            >
              <UploadCloud size={48} className={`mx-auto mb-4 ${dragActive ? 'text-blue-500' : 'text-slate-400'}`} />
              <p className="text-slate-600 font-medium mb-1">Arrastra tu CSV de contactos aquí</p>
              <p className="text-sm text-slate-500 mb-4">El archivo debe contener la columna del Cliente asociado</p>
              <label className="btn-primary cursor-pointer inline-flex bg-blue-600 hover:bg-blue-700">
                <span>Examinar archivo</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleChange} />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-4 border border-slate-200">
                <Users size={32} className="text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{file.name}</p>
                  <p className="text-sm text-slate-500">{preview.length} contactos detectados</p>
                </div>
                <button onClick={() => { setFile(null); setPreview([]); setError(null); }} disabled={loading} className="text-slate-400 hover:text-red-500 text-sm">
                  Cambiar
                </button>
              </div>

              {preview.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Contacto</th>
                        <th className="px-3 py-2 text-blue-600">Pertenece al Cliente:</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.slice(0, 10).map((p, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-slate-600 font-medium">{p.name}</td>
                          <td className="px-3 py-2 text-slate-500">{p.companyName}</td>
                        </tr>
                      ))}
                      {preview.length > 10 && (
                        <tr><td colSpan={2} className="px-3 py-2 text-center text-slate-400 italic">...y {preview.length - 10} más ocultos</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {error && <div className="bg-red-50 p-3 rounded-lg text-red-600 text-sm">{error}</div>}
              {successMsg && <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600 text-sm font-medium">{successMsg}</div>}

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" disabled={loading} onClick={() => onOpenChange(false)} className="btn-ghost">Cancelar</button>
                <button type="button" disabled={loading || preview.length === 0} onClick={handleImport} className="btn-primary min-w-[140px] bg-blue-600 hover:bg-blue-700">
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
