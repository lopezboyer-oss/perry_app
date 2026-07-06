'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ImagePlus, MessageSquare, Loader2, X, Bot } from 'lucide-react';

interface Part {
  id?: string;
  name: string;
  quantity: number;
  status: string;
  providerType: string;
}

interface Photo {
  id: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface Props {
  activityId: string;
  equipo: string | null;
  folioOdoo: string | null;
  initialPhotos?: string | null; // JSON string
  userName: string;
}

export function ManPowerDetailSection({ activityId, equipo, folioOdoo, initialPhotos, userName }: Props) {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos ? JSON.parse(initialPhotos) : []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load parts
  useEffect(() => {
    fetch(`/api/actividades/${activityId}/parts`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setParts(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Error al cargar materiales');
        setLoading(false);
      });
  }, [activityId]);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiParsedParts, setAiParsedParts] = useState<Partial<Part>[] | null>(null);

  const processAI = async () => {
    if (!aiInputText.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/parse-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiInputText })
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity || 1,
          providerType: 'COTIZAR',
          status: 'VALIDANDO'
        }));
        setAiParsedParts(mapped);
      } else {
        const err = await res.json();
        alert('Error: ' + err.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con IA');
    } finally {
      setAiLoading(false);
    }
  };

  const saveAiParts = async () => {
    if (!aiParsedParts || aiParsedParts.length === 0) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/actividades/${activityId}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiParsedParts)
      });
      if (res.ok) {
        const newParts = await res.json();
        setParts([...parts, ...newParts]);
        setAiModalOpen(false);
        setAiParsedParts(null);
        setAiInputText('');
      } else {
        alert('Error al guardar los materiales');
      }
    } catch (err) {
      console.error(err);
      alert('Error guardando materiales');
    } finally {
      setAiLoading(false);
    }
  };

  const addPart = async () => {
    const name = prompt('Nombre del material:');
    if (!name) return;
    
    try {
      const res = await fetch(`/api/actividades/${activityId}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          quantity: 1,
          providerType: 'COTIZAR',
          status: 'VALIDANDO'
        })
      });
      if (res.ok) {
        const newPart = await res.json();
        setParts([...parts, newPart]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updatePart = async (index: number, updates: Partial<Part>) => {
    const part = parts[index];
    const newParts = [...parts];
    newParts[index] = { ...part, ...updates };
    
    // Auto adjust status if providerType changes
    if (updates.providerType === 'CLIENTE' && part.providerType !== 'CLIENTE') {
      newParts[index].status = 'VALIDANDO';
    } else if (updates.providerType === 'COTIZAR' && part.providerType !== 'COTIZAR') {
      newParts[index].status = 'VALIDANDO';
    }

    setParts(newParts);

    if (part.id) {
      fetch(`/api/parts/${part.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newParts[index])
      });
    }
  };

  const deletePart = async (index: number) => {
    if (!confirm('¿Eliminar este material?')) return;
    const part = parts[index];
    const newParts = parts.filter((_, i) => i !== index);
    setParts(newParts);
    if (part.id) {
      fetch(`/api/parts/${part.id}`, { method: 'DELETE' });
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (!confirm(`¿Cambiar el estatus a "${newStatus}" para TODOS los materiales?`)) return;
    
    const newParts = parts.map(p => {
      return { ...p, status: newStatus };
    });
    setParts(newParts);

    try {
      await Promise.all(parts.filter(p => p.id).map(p => 
        fetch(`/api/parts/${p.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })
      ));
    } catch (err) {
      console.error(err);
      alert('Hubo un error al actualizar algunos materiales');
    }
  };

  const bulkUpdateProvider = async (newProvider: string) => {
    if (!confirm(`¿Cambiar el proveedor a "${newProvider === 'COTIZAR' ? 'Contratista' : 'Cliente'}" para TODOS los materiales?`)) return;
    
    const newParts = parts.map(p => {
      let status = p.status;
      if (newProvider === 'CLIENTE' && p.providerType !== 'CLIENTE') status = 'VALIDANDO';
      else if (newProvider === 'COTIZAR' && p.providerType !== 'COTIZAR') status = 'VALIDANDO';
      return { ...p, providerType: newProvider, status };
    });
    setParts(newParts);

    try {
      await Promise.all(newParts.filter(p => p.id).map(p => 
        fetch(`/api/parts/${p.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerType: p.providerType, status: p.status })
        })
      ));
    } catch (err) {
      console.error(err);
      alert('Hubo un error al actualizar algunos proveedores');
    }
  };

  const bulkDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas ELIMINAR TODOS los materiales de este equipo? Esta acción no se puede deshacer.')) return;
    
    const partsToDelete = parts.filter(p => p.id);
    setParts([]);
    
    try {
      await Promise.all(partsToDelete.map(p => fetch(`/api/parts/${p.id}`, { method: 'DELETE' })));
    } catch (err) {
      console.error(err);
      alert('Error eliminando algunos materiales en el servidor.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (photos.length + files.length > 8) {
      alert('Máximo 8 fotos permitidas en total');
      return;
    }

    setUploadingImage(true);
    let uploadedCount = 0;
    const newAddedPhotos: Photo[] = [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        const newPhoto: Photo = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          url: base64,
          uploadedBy: userName,
          uploadedAt: new Date().toISOString()
        };
        
        newAddedPhotos.push(newPhoto);
        uploadedCount++;

        // When all files are processed, update state and server
        if (uploadedCount === files.length) {
          const finalPhotos = [...photos, ...newAddedPhotos];
          setPhotos(finalPhotos);
          
          try {
            const res = await fetch(`/api/actividades/${activityId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ manPowerPhotos: JSON.stringify(finalPhotos) })
            });
            if (!res.ok) console.error('Error del servidor:', await res.text());
          } catch (err) {
            console.error('Error guardando fotos', err);
          } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const deletePhoto = async (id: string) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    const newPhotos = photos.filter(p => p.id !== id);
    setPhotos(newPhotos);
    try {
      const res = await fetch(`/api/actividades/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manPowerPhotos: JSON.stringify(newPhotos) })
      });
      if (!res.ok) console.error('Error del servidor:', await res.text());
    } catch (err) {
      console.error(err);
    }
  };

  const notifyClient = () => {
    const pendingClient = parts.filter(p => p.providerType === 'CLIENTE' && p.status === 'VALIDANDO');
    let msg = `Hola Ingeniero! \uD83D\uDC4B\nPara el trabajo en curso del\n*Equipo:* ${equipo || 'N/A'}\n\nSe requiere el siguiente material, háganos saber si usted tiene alguno o le enviamos la cotización por todo el lote:\n\n`;
    if (pendingClient.length === 0) {
      msg += 'No hay materiales en estatus de validación para revisión en este momento.';
    } else {
      pendingClient.forEach(p => {
        msg += `\uD83D\uDD39 ${p.quantity}x ${p.name}\n`;
      });
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const notifyDriver = () => {
    const compras = parts.filter(p => p.providerType === 'COTIZAR' && p.status === 'COMPRAR');
    let msg = `Estimado Chofer \uD83D\uDC4B, apóyanos con la compra del siguiente material para el proyecto con:\n\n*Folio Odoo:* ${folioOdoo || 'N/A'}\n*Equipo:* ${equipo || 'N/A'}\n\n`;
    if (compras.length === 0) {
      msg += 'No hay materiales requeridos para comprar en este momento. \uD83D\uDC4D';
    } else {
      compras.forEach(p => {
        msg += `\uD83D\uDD39 ${p.quantity}x ${p.name}\n`;
      });
      msg += `\n¡Muchas gracias por tu valioso apoyo! \uD83D\uDE4F\uD83D\uDE80`;
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return <div className="p-6 card mt-4 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" /> Cargando...</div>;

  return (
    <div id="materiales" className="card mt-6 p-6 border-indigo-200 border-2 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-10"></div>
      <h2 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-2">
        🛠️ Desglose Man Power: Equipo <span className="text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded uppercase font-mono">{equipo || 'SIN ASIGNAR'}</span>
      </h2>

      {/* Materiales */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Materiales y Equipos Requeridos</h3>
          <div className="flex flex-wrap gap-2 justify-end">
            {parts.length > 0 && (
              <button onClick={bulkDelete} className="btn-secondary text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100 mr-2">
                <Trash2 size={14} /> Borrar Todo
              </button>
            )}
            <button onClick={notifyDriver} className="btn-secondary text-xs bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
              <MessageSquare size={14} /> Avisar Chofer
            </button>
            <button onClick={notifyClient} className="btn-secondary text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
              <MessageSquare size={14} /> Avisar Cliente
            </button>
            <button onClick={() => setAiModalOpen(true)} className="inline-flex items-center gap-1 bg-violet-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-violet-700">
              <Bot size={16} /> Importar WhatsApp
            </button>
            <button onClick={addPart} className="inline-flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
              <Plus size={16} /> Añadir Material
            </button>
          </div>
        </div>

        {parts.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <p className="text-slate-500 text-sm">No hay materiales registrados para este equipo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 rounded-tl-lg">Material</th>
                  <th className="py-2 px-3 w-24 text-center">Cant.</th>
                  <th className="py-2 px-3 w-40 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span>Provee</span>
                      <select 
                        className="text-xs bg-white border border-slate-200 rounded px-1 py-0.5 text-slate-600 w-full cursor-pointer hover:border-indigo-300 focus:ring-1 focus:ring-indigo-500"
                        onChange={(e) => {
                          if (e.target.value) {
                            bulkUpdateProvider(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Cambio Masivo...</option>
                        <option value="COTIZAR">Todos a Contratista</option>
                        <option value="CLIENTE">Todos a Cliente</option>
                      </select>
                    </div>
                  </th>
                  <th className="py-2 px-3 w-48 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span>Estatus</span>
                      <select 
                        className="text-xs bg-white border border-slate-200 rounded px-1 py-0.5 text-slate-600 w-full cursor-pointer hover:border-indigo-300 focus:ring-1 focus:ring-indigo-500"
                        onChange={(e) => {
                          if (e.target.value) {
                            bulkUpdateStatus(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Cambio Masivo...</option>
                        <option value="VALIDANDO">Todos a Validando</option>
                        <option value="COTIZANDO">Todos a Cotizando</option>
                        <option value="COMPRAR">Todos a Comprar</option>
                        <option value="EN_BODEGA">Todos a En Bodega</option>
                        <option value="INSTALADO">Todos a Instalado</option>
                        <option value="FACTURADO">Todos a Facturado</option>
                      </select>
                    </div>
                  </th>
                  <th className="py-2 px-3 w-16 text-center rounded-tr-lg"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parts.map((part, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 px-3">
                      <input type="text" value={part.name} onChange={(e) => updatePart(idx, { name: e.target.value })} className="w-full text-sm border-transparent hover:border-slate-300 focus:border-indigo-500 rounded bg-transparent px-2 py-1" />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input type="number" min={1} value={part.quantity} onChange={(e) => updatePart(idx, { quantity: parseInt(e.target.value) || 1 })} className="w-16 text-sm text-center border-transparent hover:border-slate-300 focus:border-indigo-500 rounded bg-transparent px-2 py-1" />
                    </td>
                    <td className="py-2 px-3">
                      <select value={part.providerType} onChange={(e) => updatePart(idx, { providerType: e.target.value })} className="w-full text-sm font-medium bg-slate-100 border-none rounded-lg text-slate-700 py-1.5 focus:ring-0">
                        <option value="COTIZAR">Contratista</option>
                        <option value="CLIENTE">Cliente</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <select value={part.status} onChange={(e) => updatePart(idx, { status: e.target.value })} className={`w-full text-sm font-medium border-none rounded-lg py-1.5 focus:ring-0 ${part.status === 'INSTALADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {part.providerType === 'COTIZAR' ? (
                          <>
                            <option value="VALIDANDO">Validando</option>
                            <option value="COTIZANDO">Cotizando</option>
                            <option value="COMPRAR">Comprar</option>
                            <option value="EN_BODEGA">En Bodega</option>
                            <option value="INSTALADO">Instalado</option>
                            <option value="FACTURADO">Facturado</option>
                          </>
                        ) : (
                          <>
                            <option value="VALIDANDO">Validando</option>
                            <option value="EN_BODEGA">En Bodega</option>
                            <option value="INSTALADO">Instalado</option>
                          </>
                        )}
                      </select>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button onClick={() => deletePart(idx)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Evidencia Fotográfica */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Evidencia Fotográfica ({photos.length}/8)</h3>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploadingImage || photos.length >= 8}
            className="inline-flex items-center gap-1 btn-secondary text-sm disabled:opacity-50"
          >
            {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />} 
            Subir Foto
          </button>
          <input 
            type="file" 
            accept="image/*" 
            multiple
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            className="hidden" 
          />
        </div>

        {photos.length === 0 ? (
           <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
             <p className="text-slate-500 text-sm">No hay fotos subidas. (Máximo 8)</p>
           </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((photo, i) => (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 flex items-center justify-center">
                <img src={photo.url} alt={`Evidencia ${i + 1}`} className="object-cover w-full h-full" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <button onClick={() => deletePhoto(photo.id)} className="self-end bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600">
                    <Trash2 size={14} />
                  </button>
                  <div className="text-white text-[10px] bg-black/60 p-1 rounded backdrop-blur-sm">
                    <p className="font-medium truncate">{photo.uploadedBy}</p>
                    <p className="text-white/70">{new Date(photo.uploadedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Bot className="text-violet-600" size={20} /> Asistente IA de Materiales
              </h3>
              <button onClick={() => setAiModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 bg-slate-50">
              {!aiParsedParts ? (
                <>
                  <p className="text-sm text-slate-600 mb-2">Pega aquí el mensaje de texto, reporte o lista enviada por los técnicos de campo. La Inteligencia Artificial analizará el texto para extraer cada material y su cantidad.</p>
                  <textarea
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                    className="w-full h-48 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none shadow-inner"
                    placeholder="Ejemplo: Se necesitan 2 codos de 45 de ductos 14, 5 Ductape, 1m Tubería cobre tipo L..."
                  />
                  
                  <div className="mt-4 flex justify-end">
                    <button 
                      onClick={processAI}
                      disabled={!aiInputText.trim() || aiLoading}
                      className="bg-violet-600 text-white px-6 py-2 rounded-lg font-medium shadow flex items-center gap-2 hover:bg-violet-700 disabled:opacity-50 transition-all"
                    >
                      {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
                      {aiLoading ? 'Procesando...' : 'Analizar Texto'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-medium text-slate-700">Revisa y edita los materiales extraídos ({aiParsedParts.length} elementos)</p>
                    <button 
                      onClick={() => setAiParsedParts(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline"
                    >
                      Volver a analizar
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-4">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Material Extraído</th>
                          <th className="py-2 px-3 w-24 text-center">Cant.</th>
                          <th className="py-2 px-3 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {aiParsedParts.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-1 px-3">
                              <input 
                                type="text" 
                                value={item.name} 
                                onChange={(e) => {
                                  const newArr = [...aiParsedParts];
                                  newArr[idx].name = e.target.value;
                                  setAiParsedParts(newArr);
                                }} 
                                className="w-full text-sm border border-transparent hover:border-slate-300 focus:border-violet-500 rounded px-2 py-1 transition-colors" 
                              />
                            </td>
                            <td className="py-1 px-3">
                              <input 
                                type="number" 
                                min={1} 
                                value={item.quantity} 
                                onChange={(e) => {
                                  const newArr = [...aiParsedParts];
                                  newArr[idx].quantity = parseInt(e.target.value) || 1;
                                  setAiParsedParts(newArr);
                                }} 
                                className="w-full text-sm text-center border border-transparent hover:border-slate-300 focus:border-violet-500 rounded px-2 py-1 transition-colors" 
                              />
                            </td>
                            <td className="py-1 px-3 text-center">
                              <button 
                                onClick={() => {
                                  setAiParsedParts(aiParsedParts.filter((_, i) => i !== idx));
                                }}
                                className="text-red-400 hover:text-red-600 p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {aiParsedParts.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-slate-500">
                              Todos los elementos eliminados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                    <button 
                      onClick={() => setAiModalOpen(false)}
                      className="px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={saveAiParts}
                      disabled={aiLoading || aiParsedParts.length === 0}
                      className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium shadow flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 transition-all"
                    >
                      {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      {aiLoading ? 'Guardando...' : 'Guardar Materiales'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
