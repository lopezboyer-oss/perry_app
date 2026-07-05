'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ImagePlus, MessageSquare, Loader2, X } from 'lucide-react';

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
      newParts[index].status = 'EN_BODEGA';
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photos.length >= 8) {
      alert('Máximo 8 fotos permitidas');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const newPhoto: Photo = {
        id: Date.now().toString(),
        url: base64,
        uploadedBy: userName,
        uploadedAt: new Date().toISOString()
      };
      
      const newPhotos = [...photos, newPhoto];
      setPhotos(newPhotos);
      
      try {
        await fetch(`/api/actividades/${activityId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manPowerPhotos: JSON.stringify(newPhotos) })
        });
      } catch (err) {
        console.error('Error guardando foto', err);
      } finally {
        setUploadingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const deletePhoto = async (id: string) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    const newPhotos = photos.filter(p => p.id !== id);
    setPhotos(newPhotos);
    try {
      await fetch(`/api/actividades/${activityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manPowerPhotos: JSON.stringify(newPhotos) })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const notifyClient = () => {
    const pendingClient = parts.filter(p => p.providerType === 'CLIENTE' && p.status !== 'INSTALADO');
    let msg = `Hola, te informamos sobre el estatus de materiales para el equipo ${equipo || 'N/A'}:\n\n`;
    if (pendingClient.length === 0) {
      msg += 'Actualmente no hay materiales pendientes por parte del cliente.';
    } else {
      msg += 'Materiales pendientes por entregar (Cliente):\n';
      pendingClient.forEach(p => {
        msg += `- ${p.quantity}x ${p.name} (${p.status})\n`;
      });
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const notifyDriver = () => {
    const pendingCaseme = parts.filter(p => p.providerType === 'COTIZAR' && p.status === 'EN_BODEGA');
    let msg = `Chofer, favor de trasladar los siguientes materiales para el Folio: ${folioOdoo || 'N/A'}, Equipo: ${equipo || 'N/A'}:\n\n`;
    if (pendingCaseme.length === 0) {
      msg += 'No hay materiales en bodega listos para trasladar.';
    } else {
      pendingCaseme.forEach(p => {
        msg += `- ${p.quantity}x ${p.name}\n`;
      });
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
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
          <div className="flex gap-2">
            <button onClick={notifyDriver} className="btn-secondary text-xs bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
              <MessageSquare size={14} /> Avisar Chofer
            </button>
            <button onClick={notifyClient} className="btn-secondary text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
              <MessageSquare size={14} /> Avisar Cliente
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
                  <th className="py-2 px-3 w-40 text-center">Provee</th>
                  <th className="py-2 px-3 w-48 text-center">Estatus</th>
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
                        <option value="COTIZAR">Caseme (Cotizar)</option>
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

    </div>
  );
}
