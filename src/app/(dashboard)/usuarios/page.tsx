'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, UserCog, User, HardHat, CheckSquare } from 'lucide-react';
import { UserFormDialog, UserFormData } from './components/UserFormDialog';
import { useRouter } from 'next/navigation';
import { roleLabels, roleColors } from '@/lib/utils';

interface SupervisorRef { id: string; name: string; }
interface UserData {
  id: string; name: string; email: string;
  role: string; supervisorId: string | null;
  supervisor: { name: string } | null; isActive: boolean;
}
interface TechnicianData {
  id: string; name: string; type: string;
  isCruzVerde: boolean; isActive: boolean;
}
interface SafetyData { id: string; name: string; isActive: boolean; }

export default function UsuariosPage() {
  const [tab, setTab] = useState<'users' | 'techs' | 'safety'>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorRef[]>([]);
  const [techs, setTechs] = useState<TechnicianData[]>([]);
  const [safetyList, setSafetyList] = useState<SafetyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserFormData> & { id?: string } | undefined>(undefined);
  const [userRole, setUserRole] = useState('');
  const router = useRouter();

  // ── Tech form state ──
  const [techFormOpen, setTechFormOpen] = useState(false);
  const [techFormData, setTechFormData] = useState({ id: '', name: '', type: 'PROPIO', isCruzVerde: false });
  // ── Safety form state ──
  const [safetyFormOpen, setSafetyFormOpen] = useState(false);
  const [safetyFormData, setSafetyFormData] = useState({ id: '', name: '' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [usersRes, techRes, safetyRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/technicians'),
        fetch('/api/safety-dedicado'),
      ]);
      if (usersRes.status === 403) { router.push('/dashboard'); return; }

      const usersData: UserData[] = await usersRes.json();
      setUsers(usersData);
      setSupervisors(
        usersData
          .filter(u => ['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(u.role))
          .map(u => ({ id: u.id, name: u.name }))
      );
      setTechs(await techRes.json());
      setSafetyList(await safetyRes.json());

      // Detect current user's role from session
      const sessionRes = await fetch('/api/auth/session');
      if (sessionRes.ok) {
        const sess = await sessionRes.json();
        setUserRole(sess?.user?.role || '');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ── User CRUD ──
  const handleOpenNew = () => { setEditingUser(undefined); setFormOpen(true); };
  const handleOpenEdit = (user: UserData) => {
    setEditingUser({ id: user.id, name: user.name, email: user.email, role: user.role, supervisorId: user.supervisorId });
    setFormOpen(true);
  };
  const handleDelete = async (user: UserData) => {
    if (!window.confirm(`¿Eliminar a ${user.name}?`)) return;
    await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    await fetchAll();
  };
  const handleFormSubmit = async (data: UserFormData) => {
    if (editingUser?.id) {
      const res = await fetch(`/api/users/${editingUser.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(await res.text());
    } else {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(await res.text());
    }
    await fetchAll();
  };

  // ── Technician CRUD ──
  const handleSaveTech = async () => {
    const method = techFormData.id ? 'PUT' : 'POST';
    const url = techFormData.id ? `/api/technicians/${techFormData.id}` : '/api/technicians';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(techFormData) });
    if (!res.ok) { alert('Error al guardar técnico'); return; }
    setTechFormOpen(false);
    setTechFormData({ id: '', name: '', type: 'PROPIO', isCruzVerde: false });
    await fetchAll();
  };
  const handleDeleteTech = async (id: string, name: string) => {
    if (!window.confirm(`¿Desactivar a ${name}?`)) return;
    await fetch(`/api/technicians/${id}`, { method: 'DELETE' });
    await fetchAll();
  };

  // ── Safety CRUD ──
  const handleSaveSafety = async () => {
    const method = safetyFormData.id ? 'PUT' : 'POST';
    const url = safetyFormData.id ? `/api/safety-dedicado/${safetyFormData.id}` : '/api/safety-dedicado';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(safetyFormData) });
    if (!res.ok) { alert('Error al guardar Safety'); return; }
    setSafetyFormOpen(false);
    setSafetyFormData({ id: '', name: '' });
    await fetchAll();
  };
  const handleDeleteSafety = async (id: string, name: string) => {
    if (!window.confirm(`¿Desactivar a ${name}?`)) return;
    await fetch(`/api/safety-dedicado/${id}`, { method: 'DELETE' });
    await fetchAll();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando personal...</div>;

  const canManageTechs = userRole === 'ADMIN';
  const canManageSafety = userRole === 'ADMIN' || userRole === 'SUPERVISOR_SAFETY_LP';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestión de Personal</h1>
          <p className="text-slate-500 mt-1">Administra usuarios, técnicos y personal de safety.</p>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {[
          { key: 'users' as const, label: 'Usuarios del Sistema', icon: User },
          { key: 'techs' as const, label: 'Técnicos', icon: HardHat },
          { key: 'safety' as const, label: 'Safety Dedicado', icon: Shield },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              tab === t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: USERS ── */}
      {tab === 'users' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={handleOpenNew} className="btn-primary"><Plus size={18} /> Añadir Miembro</button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="px-6 py-4">Miembro del Equipo</th>
                    <th className="px-6 py-4">Rol & Permisos</th>
                    <th className="px-6 py-4">Reporta A</th>
                    <th className="px-6 py-4 text-right">Ajustes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${roleColors[user.role] || 'bg-gray-100 text-gray-700'}`}>
                          {roleLabels[user.role] || user.role}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {user.supervisor?.name || <span className="text-slate-400 italic">-- Directivo --</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenEdit(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(user)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <UserFormDialog open={formOpen} onOpenChange={setFormOpen} initialData={editingUser} supervisors={supervisors} onSubmit={handleFormSubmit} />
        </>
      )}

      {/* ── TAB: TÉCNICOS ── */}
      {tab === 'techs' && (
        <>
          {canManageTechs && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setTechFormData({ id: '', name: '', type: 'PROPIO', isCruzVerde: false }); setTechFormOpen(true); }}
                className="btn-primary"
              >
                <Plus size={18} /> Añadir Técnico
              </button>
            </div>
          )}

          {techFormOpen && (
            <div className="card p-6 mb-4 border-l-4 border-l-indigo-500">
              <h3 className="font-semibold text-slate-800 mb-4">{techFormData.id ? 'Editar' : 'Nuevo'} Técnico</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                  <input type="text" value={techFormData.name} onChange={(e) => setTechFormData({ ...techFormData, name: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select value={techFormData.type} onChange={(e) => setTechFormData({ ...techFormData, type: e.target.value })} className="w-full">
                    <option value="PROPIO">Propio</option>
                    <option value="EXTERNO">Externo</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={techFormData.isCruzVerde} onChange={(e) => setTechFormData({ ...techFormData, isCruzVerde: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm font-medium text-slate-700">🟢 Cruz Verde (Safety Designado)</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveTech} className="btn-primary text-sm">Guardar</button>
                <button onClick={() => setTechFormOpen(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Cruz Verde</th>
                    {canManageTechs && <th className="px-6 py-4 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {techs.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{t.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.type === 'PROPIO' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {t.type === 'PROPIO' ? 'Propio' : 'Externo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {t.isCruzVerde ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            <CheckSquare size={12} /> Acreditado
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      {canManageTechs && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setTechFormData({ id: t.id, name: t.name, type: t.type, isCruzVerde: t.isCruzVerde }); setTechFormOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => handleDeleteTech(t.id, t.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {techs.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No hay técnicos registrados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: SAFETY DEDICADO ── */}
      {tab === 'safety' && (
        <>
          {canManageSafety && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setSafetyFormData({ id: '', name: '' }); setSafetyFormOpen(true); }}
                className="btn-primary"
              >
                <Plus size={18} /> Añadir Safety Dedicado
              </button>
            </div>
          )}

          {safetyFormOpen && (
            <div className="card p-6 mb-4 border-l-4 border-l-amber-500">
              <h3 className="font-semibold text-slate-800 mb-4">{safetyFormData.id ? 'Editar' : 'Nuevo'} Safety Dedicado</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo *</label>
                <input type="text" value={safetyFormData.name} onChange={(e) => setSafetyFormData({ ...safetyFormData, name: e.target.value })} className="w-full md:w-1/2" />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveSafety} className="btn-primary text-sm">Guardar</button>
                <button onClick={() => setSafetyFormOpen(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Categoría</th>
                    {canManageSafety && <th className="px-6 py-4 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safetyList.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          <Shield size={12} /> Dedicado
                        </span>
                      </td>
                      {canManageSafety && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setSafetyFormData({ id: s.id, name: s.name }); setSafetyFormOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => handleDeleteSafety(s.id, s.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {safetyList.length === 0 && (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No hay personal Safety Dedicado registrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
