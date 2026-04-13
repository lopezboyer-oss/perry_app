'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, Users, Search, FolderDown } from 'lucide-react';
import { ClientFormDialog, ClientFormData } from './components/ClientFormDialog';
import { ContactFormDialog, ContactFormData } from './components/ContactFormDialog';
import { OdooImportDialog } from './components/OdooImportDialog';

export default function DirectorioPage() {
  const [tab, setTab] = useState<'CLIENTES' | 'CONTACTOS'>('CLIENTES');
  const [clients, setClients] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [odooImportOpen, setOdooImportOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(undefined);
  const [editingContact, setEditingContact] = useState<any>(undefined);

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'CLIENTES') {
        const res = await fetch('/api/clientes');
        const data = await res.json();
        setClients(data);
      } else {
        const res = await fetch('/api/contactos');
        const data = await res.json();
        setContacts(data);
        
        // Also fetch clients for the dropdown if needed in contacts tab
        if (clients.length === 0) {
           const cRes = await fetch('/api/clientes');
           setClients(await cRes.json());
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ─── CLIENTS ACTIONS ───
  const handleSaveClient = async (data: ClientFormData) => {
    if (editingClient?.id) {
      const res = await fetch(`/api/clientes/${editingClient.id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
    } else {
      const res = await fetch('/api/clientes', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
    }
    fetchData();
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!window.confirm(`¿Seguro de borrar el cliente ${name}? Sólo se borrará si no tiene actividades históricas.`)) return;
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      fetchData();
    } catch (e) {
      alert("Falla de red.");
    }
  };

  // ─── CONTACTS ACTIONS ───
  const handleSaveContact = async (data: ContactFormData) => {
    if (editingContact?.id) {
      const res = await fetch(`/api/contactos/${editingContact.id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
    } else {
      const res = await fetch('/api/contactos', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
    }
    fetchData();
  };

  const handleDeleteContact = async (id: string, name: string) => {
    if (!window.confirm(`¿Seguro de borrar el contacto ${name}?`)) return;
    try {
      const res = await fetch(`/api/contactos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      fetchData();
    } catch (e) {
      alert("Falla de red.");
    }
  };

  const filteredData = tab === 'CLIENTES' 
    ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code?.toLowerCase().includes(search.toLowerCase()))
    : contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.client?.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-indigo-600" /> Directorio
          </h1>
          <p className="text-slate-500 mt-1">Plataforma central de Clientes y Contactos.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {tab === 'CLIENTES' ? (
            <>
              <button onClick={() => setOdooImportOpen(true)} className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
                <FolderDown size={18} className="text-emerald-600" />
                Importar Odoo
              </button>
              <button onClick={() => { setEditingClient(undefined); setClientFormOpen(true); }} className="btn-primary">
                <Plus size={18} />
                Nuevo Cliente
              </button>
            </>
          ) : (
            <button onClick={() => { setEditingContact(undefined); setContactFormOpen(true); }} className="btn-primary">
              <Plus size={18} />
              Nuevo Contacto
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="flex flex-col sm:flex-row border-b border-slate-200">
          <div className="flex">
            <button onClick={() => setTab('CLIENTES')} className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${tab === 'CLIENTES' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
              <Building2 size={18} /> Empresas ({clients.length})
            </button>
            <button onClick={() => setTab('CONTACTOS')} className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${tab === 'CONTACTOS' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
              <Users size={18} /> Contactos 
            </button>
          </div>
          <div className="p-3 sm:ml-auto flex items-center">
            <div className="relative relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder={`Buscar ${tab === 'CLIENTES' ? 'cliente' : 'contacto'}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Cargando directorio...</div>
          ) : tab === 'CLIENTES' ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Estadísticas</th>
                  <th className="px-6 py-4 text-right">Ajustes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        {c.status === 'INACTIVO' && <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" title="Inactivo"></span>}
                        {c.status === 'ACTIVO' && <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Activo"></span>}
                        {c.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.notes}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{c.code || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3 text-xs text-slate-500">
                        <span title="Reportes/Visitas" className="flex items-center gap-1"><span className="font-medium text-slate-700">{c._count?.activities || 0}</span> Rep.</span>
                        <span title="Oportunidades" className="flex items-center gap-1"><span className="font-medium text-slate-700">{c._count?.opportunities || 0}</span> Ops.</span>
                        <span title="Contactos" className="flex items-center gap-1"><span className="font-medium text-slate-700">{c.contacts?.length || 0}</span> User.</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => {setEditingClient(c); setClientFormOpen(true);}} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteClient(c.id, c.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500">Ningún cliente encontrado</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Contacto Orgánico</th>
                  <th className="px-6 py-4">Información</th>
                  <th className="px-6 py-4 text-right">Ajustes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 border-l-2 border-transparent hover:border-indigo-400">
                      <div className="font-semibold text-slate-800">{c.name}</div>
                      <div className="text-sm font-medium text-indigo-600 flex items-center gap-1.5 mt-0.5">
                        {c.client?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{c.position || 'SIN CARGO ESPECIFICADO'}</div>
                      <div className="text-sm">{c.email || '-'}</div>
                      <div className="text-sm">{c.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => {setEditingContact(c); setContactFormOpen(true);}} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteContact(c.id, c.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr><td colSpan={3} className="p-8 text-center text-slate-500">Ningún contacto encontrado</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <OdooImportDialog open={odooImportOpen} onOpenChange={setOdooImportOpen} onSuccess={fetchData} />
      <ClientFormDialog open={clientFormOpen} onOpenChange={setClientFormOpen} initialData={editingClient} onSubmit={handleSaveClient} />
      <ContactFormDialog open={contactFormOpen} onOpenChange={setContactFormOpen} initialData={editingContact} onSubmit={handleSaveContact} clients={clients.map(c=>({id: c.id, name: c.name}))} />
    </div>
  );
}
