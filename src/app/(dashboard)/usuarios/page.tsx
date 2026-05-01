'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Edit2, Trash2, Shield, User, HardHat, CheckSquare, Truck, ChevronsUp, Building2, Filter } from 'lucide-react';
import { UserFormDialog, UserFormData } from './components/UserFormDialog';
import { useRouter } from 'next/navigation';
import { roleLabels, roleColors } from '@/lib/utils';

interface SupervisorRef { id: string; name: string; }
interface UserData { id: string; name: string; email: string; role: string; isSafetyDesignado: boolean; supervisorId: string | null; supervisor: { name: string } | null; isActive: boolean; baseCompanyId: string | null; companies: { companyId: string; isDefault: boolean; company: { id: string; name: string; shortName: string | null; color: string | null } }[]; }
interface TechnicianData { id: string; name: string; type: string; isCruzVerde: boolean; isActive: boolean; }
interface SafetyData { id: string; name: string; isActive: boolean; }
interface VehicleData { id: string; name: string; isAvailable: boolean; isActive: boolean; }
interface DriverData { id: string; name: string; isActive: boolean; }
interface EquipData { id: string; name: string; ownership: string; isActive: boolean; }
interface ContractorData { id: string; name: string; isActive: boolean; _count?: { technicians: number }; }

type TabKey = 'users' | 'techs' | 'safety' | 'vehicles' | 'drivers' | 'equips' | 'contractors';

export default function UsuariosPage() {
  const [tab, setTab] = useState<TabKey>('techs');
  const [users, setUsers] = useState<UserData[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorRef[]>([]);
  const [techs, setTechs] = useState<TechnicianData[]>([]);
  const [safetyList, setSafetyList] = useState<SafetyData[]>([]);
  const [vehicleList, setVehicleList] = useState<VehicleData[]>([]);
  const [driverList, setDriverList] = useState<DriverData[]>([]);
  const [equipList, setEquipList] = useState<EquipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserFormData> & { id?: string } | undefined>(undefined);
  const [userRole, setUserRole] = useState('');
  const router = useRouter();

  // ── Form states ──
  const [techFormOpen, setTechFormOpen] = useState(false);
  const [techFormData, setTechFormData] = useState({ id: '', name: '', type: 'PROPIO', isCruzVerde: false, contractorId: '', baseCompanyId: '' });
  const [techFilterType, setTechFilterType] = useState('');
  const [techFilterEmpresa, setTechFilterEmpresa] = useState('');
  const techFormRef = useRef<HTMLDivElement>(null);
  const [safetyFormOpen, setSafetyFormOpen] = useState(false);
  const [safetyFormData, setSafetyFormData] = useState({ id: '', name: '' });
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [vehicleFormData, setVehicleFormData] = useState({ id: '', name: '', isAvailable: true });
  const [driverFormOpen, setDriverFormOpen] = useState(false);
  const [driverFormData, setDriverFormData] = useState({ id: '', name: '' });
  const [equipFormOpen, setEquipFormOpen] = useState(false);
  const [equipFormData, setEquipFormData] = useState({ id: '', name: '', ownership: 'PROPIO' });
  const [contractorList, setContractorList] = useState<ContractorData[]>([]);
  const [contractorFormOpen, setContractorFormOpen] = useState(false);
  const [contractorFormData, setContractorFormData] = useState({ id: '', name: '' });
  const [companyList, setCompanyList] = useState<{ id: string; name: string; shortName: string | null; color: string | null }[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [usersRes, techRes, safetyRes, vehicleRes, driverRes, equipRes, contractorRes, companyRes] = await Promise.all([
        fetch('/api/users'), fetch('/api/technicians'), fetch('/api/safety-dedicado'),
        fetch('/api/vehicles'), fetch('/api/drivers'), fetch('/api/elevation-equip'), fetch('/api/contractors'),
        fetch('/api/company/mine'),
      ]);
      if (usersRes.status === 403) { router.push('/dashboard'); return; }

      const usersData: UserData[] = await usersRes.json();
      setUsers(usersData);
      setSupervisors(usersData.filter(u => ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(u.role)).map(u => ({ id: u.id, name: u.name })));
      setTechs(await techRes.json());
      setSafetyList(await safetyRes.json());
      setVehicleList(await vehicleRes.json());
      setDriverList(await driverRes.json());
      setEquipList(await equipRes.json());
      setContractorList(await contractorRes.json());

      const companyData = await companyRes.json();
      if (companyData.companies) setCompanyList(companyData.companies);

      const sessionRes = await fetch('/api/auth/session');
      if (sessionRes.ok) { const sess = await sessionRes.json(); setUserRole(sess?.user?.role || ''); }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // ── User CRUD ──
  const handleOpenNew = () => { setEditingUser(undefined); setFormOpen(true); };
  const handleOpenEdit = (user: UserData) => {
    const defaultUC = user.companies?.find(c => c.isDefault);
    setEditingUser({
      id: user.id, name: user.name, email: user.email, role: user.role,
      supervisorId: user.supervisorId, isSafetyDesignado: user.isSafetyDesignado,
      baseCompanyId: user.baseCompanyId,
      companyIds: user.companies?.map(c => c.companyId) || [],
      defaultCompanyId: defaultUC?.companyId || null,
    });
    setFormOpen(true);
  };
  const handleDelete = async (user: UserData) => { if (!window.confirm(`¿Eliminar a ${user.name}?`)) return; await fetch(`/api/users/${user.id}`, { method: 'DELETE' }); await fetchAll(); };
  const handleFormSubmit = async (data: UserFormData) => {
    if (editingUser?.id) { const res = await fetch(`/api/users/${editingUser.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!res.ok) throw new Error(await res.text()); }
    else { const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!res.ok) throw new Error(await res.text()); }
    await fetchAll();
  };

  // ── Technician CRUD ──
  const handleSaveTech = async () => {
    const method = techFormData.id ? 'PUT' : 'POST';
    const url = techFormData.id ? `/api/technicians/${techFormData.id}` : '/api/technicians';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(techFormData) });
    if (!res.ok) { alert('Error al guardar técnico'); return; }
    setTechFormOpen(false); setTechFormData({ id: '', name: '', type: 'PROPIO', isCruzVerde: false, contractorId: '', baseCompanyId: '' }); await fetchAll();
  };
  const handleDeleteTech = async (id: string, name: string) => { if (!window.confirm(`¿Desactivar a ${name}?`)) return; await fetch(`/api/technicians/${id}`, { method: 'DELETE' }); await fetchAll(); };

  // ── Safety CRUD ──
  const handleSaveSafety = async () => {
    const method = safetyFormData.id ? 'PUT' : 'POST';
    const url = safetyFormData.id ? `/api/safety-dedicado/${safetyFormData.id}` : '/api/safety-dedicado';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(safetyFormData) });
    if (!res.ok) { alert('Error al guardar Safety'); return; }
    setSafetyFormOpen(false); setSafetyFormData({ id: '', name: '' }); await fetchAll();
  };
  const handleDeleteSafety = async (id: string, name: string) => { if (!window.confirm(`¿Desactivar a ${name}?`)) return; await fetch(`/api/safety-dedicado/${id}`, { method: 'DELETE' }); await fetchAll(); };

  // ── Vehicle CRUD ──
  const handleSaveVehicle = async () => {
    const method = vehicleFormData.id ? 'PUT' : 'POST';
    const url = vehicleFormData.id ? `/api/vehicles/${vehicleFormData.id}` : '/api/vehicles';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vehicleFormData) });
    if (!res.ok) { alert('Error al guardar vehículo'); return; }
    setVehicleFormOpen(false); setVehicleFormData({ id: '', name: '', isAvailable: true }); await fetchAll();
  };
  const handleDeleteVehicle = async (id: string, name: string) => { if (!window.confirm(`¿Desactivar ${name}?`)) return; await fetch(`/api/vehicles/${id}`, { method: 'DELETE' }); await fetchAll(); };

  // ── Driver CRUD ──
  const handleSaveDriver = async () => {
    const method = driverFormData.id ? 'PUT' : 'POST';
    const url = driverFormData.id ? `/api/drivers/${driverFormData.id}` : '/api/drivers';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(driverFormData) });
    if (!res.ok) { alert('Error al guardar chofer'); return; }
    setDriverFormOpen(false); setDriverFormData({ id: '', name: '' }); await fetchAll();
  };
  const handleDeleteDriver = async (id: string, name: string) => { if (!window.confirm(`¿Desactivar a ${name}?`)) return; await fetch(`/api/drivers/${id}`, { method: 'DELETE' }); await fetchAll(); };

  // ── Equip CRUD ──
  const handleSaveEquip = async () => {
    const method = equipFormData.id ? 'PUT' : 'POST';
    const url = equipFormData.id ? `/api/elevation-equip/${equipFormData.id}` : '/api/elevation-equip';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(equipFormData) });
    if (!res.ok) { alert('Error al guardar equipo'); return; }
    setEquipFormOpen(false); setEquipFormData({ id: '', name: '', ownership: 'PROPIO' }); await fetchAll();
  };
  const handleDeleteEquip = async (id: string, name: string) => { if (!window.confirm(`¿Desactivar ${name}?`)) return; await fetch(`/api/elevation-equip/${id}`, { method: 'DELETE' }); await fetchAll(); };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando personal...</div>;

  const isAdmin = userRole === 'ADMIN' || userRole === 'ADMINISTRACION';
  const canManageTechs = isAdmin;
  const canManageSafety = isAdmin || userRole === 'SUPERVISOR_SAFETY_LP';
  const canManageDrivers = isAdmin || userRole === 'SUPERVISOR_SAFETY_LP';
  const canManageVehicles = isAdmin;
  const canManageEquips = isAdmin;

  // Build available tabs based on role
  const allTabs: { key: TabKey; label: string; icon: any; visible: boolean }[] = [
    { key: 'users', label: 'Usuarios', icon: User, visible: isAdmin },
    { key: 'techs', label: 'Técnicos', icon: HardHat, visible: true },
    { key: 'safety', label: 'Safety Dedicado', icon: Shield, visible: true },
    { key: 'vehicles', label: 'Vehículos', icon: Truck, visible: true },
    { key: 'drivers', label: 'Choferes', icon: User, visible: canManageDrivers },
    { key: 'equips', label: 'Eq. Elevación', icon: ChevronsUp, visible: true },
    { key: 'contractors', label: 'Contratistas', icon: Building2, visible: isAdmin },
  ];
  const visibleTabs = allTabs.filter((t) => t.visible);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestión de Recursos</h1>
          <p className="text-slate-500 mt-1">Administra usuarios, técnicos, vehículos y recursos operativos.</p>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
              tab === t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: USERS ── */}
      {tab === 'users' && isAdmin && (
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
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">{user.name.charAt(0)}</div>
                          <div>
                            <p className="font-semibold text-slate-800">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${roleColors[user.role] || 'bg-gray-100 text-gray-700'}`}>{roleLabels[user.role] || user.role}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{user.supervisor?.name || <span className="text-slate-400 italic">-- Directivo --</span>}</td>
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
          <UserFormDialog open={formOpen} onOpenChange={setFormOpen} initialData={editingUser} supervisors={supervisors} onSubmit={handleFormSubmit} companies={companyList} />
        </>
      )}

      {/* ── TAB: TÉCNICOS ── */}
      {tab === 'techs' && (() => {
        // Build unique empresa options from techs
        const empresaOptions: { value: string; label: string }[] = [];
        const seen = new Set<string>();
        techs.forEach((t) => {
          const tAny = t as any;
          if (t.type === 'EXTERNO' && tAny.contractor) {
            const k = `c-${tAny.contractor.id}`;
            if (!seen.has(k)) { seen.add(k); empresaOptions.push({ value: k, label: tAny.contractor.name }); }
          } else if (tAny.baseCompany) {
            const k = `b-${tAny.baseCompany.id}`;
            if (!seen.has(k)) { seen.add(k); empresaOptions.push({ value: k, label: tAny.baseCompany.shortName || tAny.baseCompany.name }); }
          }
        });
        empresaOptions.sort((a, b) => a.label.localeCompare(b.label));

        // Filter techs
        const filteredTechs = techs.filter((t) => {
          const tAny = t as any;
          if (techFilterType && t.type !== techFilterType) return false;
          if (techFilterEmpresa) {
            if (t.type === 'EXTERNO' && tAny.contractor) {
              if (techFilterEmpresa !== `c-${tAny.contractor.id}`) return false;
            } else if (tAny.baseCompany) {
              if (techFilterEmpresa !== `b-${tAny.baseCompany.id}`) return false;
            } else {
              return false;
            }
          }
          return true;
        });

        const scrollToForm = () => {
          setTimeout(() => techFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        };

        return (
        <>
          {canManageTechs && (
            <div className="flex justify-end mb-4">
              <button onClick={() => { setTechFormData({ id: '', name: '', type: 'PROPIO', isCruzVerde: false, contractorId: '', baseCompanyId: companyList[0]?.id || '' }); setTechFormOpen(true); setTimeout(() => techFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }} className="btn-primary"><Plus size={18} /> Añadir Técnico</button>
            </div>
          )}
          {techFormOpen && (
            <div ref={techFormRef} className="card p-6 mb-4 border-l-4 border-l-indigo-500">
              <h3 className="font-semibold text-slate-800 mb-4">{techFormData.id ? 'Editar' : 'Nuevo'} Técnico</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                  <input type="text" value={techFormData.name} onChange={(e) => setTechFormData({ ...techFormData, name: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select value={techFormData.type} onChange={(e) => setTechFormData({ ...techFormData, type: e.target.value, contractorId: e.target.value === 'PROPIO' ? '' : techFormData.contractorId })} className="w-full">
                    <option value="PROPIO">Propio</option>
                    <option value="EXTERNO">Externo</option>
                  </select>
                </div>
                {techFormData.type === 'EXTERNO' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Empresa Contratista</label>
                    <select value={techFormData.contractorId} onChange={(e) => setTechFormData({ ...techFormData, contractorId: e.target.value })} className="w-full">
                      <option value="">— Seleccionar —</option>
                      {contractorList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={techFormData.isCruzVerde} onChange={(e) => setTechFormData({ ...techFormData, isCruzVerde: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm font-medium text-slate-700">🟢 Cruz Verde (Safety Designado)</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Empresa Base</label>
                  <select value={techFormData.baseCompanyId} onChange={(e) => setTechFormData({ ...techFormData, baseCompanyId: e.target.value })} className="w-full">
                    <option value="">— Sin asignar —</option>
                    {companyList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveTech} className="btn-primary text-sm">Guardar</button>
                <button onClick={() => setTechFormOpen(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </div>
          )}
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
            <Filter size={16} className="text-slate-400" />
            <select value={techFilterType} onChange={(e) => setTechFilterType(e.target.value)} className="text-sm rounded-lg py-1.5 px-3 border-slate-200">
              <option value="">Todos los tipos</option>
              <option value="PROPIO">Propio</option>
              <option value="EXTERNO">Externo</option>
            </select>
            <select value={techFilterEmpresa} onChange={(e) => setTechFilterEmpresa(e.target.value)} className="text-sm rounded-lg py-1.5 px-3 border-slate-200">
              <option value="">Todas las empresas</option>
              {empresaOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {(techFilterType || techFilterEmpresa) && (
              <button onClick={() => { setTechFilterType(''); setTechFilterEmpresa(''); }} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-auto">
                Limpiar filtros
              </button>
            )}
            <span className="text-xs text-slate-400 ml-auto">{filteredTechs.length} de {techs.length}</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr><th className="px-6 py-4">Nombre</th><th className="px-6 py-4">Tipo</th><th className="px-6 py-4">Empresa</th><th className="px-6 py-4">Cruz Verde</th>{canManageTechs && <th className="px-6 py-4 text-right">Acciones</th>}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTechs.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{t.name}</td>
                      <td className="px-6 py-4"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.type === 'PROPIO' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{t.type === 'PROPIO' ? 'Propio' : 'Externo'}</span></td>
                      <td className="px-6 py-4">{t.type === 'EXTERNO' && (t as any).contractor ? <span className="text-xs font-medium text-white px-2 py-0.5 rounded bg-orange-500">{(t as any).contractor.name}</span> : (t as any).baseCompany ? <span className="text-xs font-medium text-white px-2 py-0.5 rounded" style={{ backgroundColor: (t as any).baseCompany.color || '#6366f1' }}>{(t as any).baseCompany.shortName || (t as any).baseCompany.name}</span> : <span className="text-slate-400 text-xs">—</span>}</td>
                      <td className="px-6 py-4">{t.isCruzVerde ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckSquare size={12} /> Acreditado</span> : <span className="text-slate-400 text-xs">—</span>}</td>
                      {canManageTechs && (
                        <td className="px-6 py-4"><div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setTechFormData({ id: t.id, name: t.name, type: t.type, isCruzVerde: t.isCruzVerde, contractorId: (t as any).contractor?.id || '', baseCompanyId: (t as any).baseCompanyId || '' }); setTechFormOpen(true); scrollToForm(); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteTech(t.id, t.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div></td>
                      )}
                    </tr>
                  ))}
                  {filteredTechs.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">{techs.length > 0 ? 'No hay técnicos con estos filtros.' : 'No hay técnicos registrados.'}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
        );
      })()}

      {/* ── TAB: SAFETY DEDICADO ── */}
      {tab === 'safety' && (
        <>
          {canManageSafety && (
            <div className="flex justify-end mb-4">
              <button onClick={() => { setSafetyFormData({ id: '', name: '' }); setSafetyFormOpen(true); }} className="btn-primary"><Plus size={18} /> Añadir Safety Dedicado</button>
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
                  <tr><th className="px-6 py-4">Nombre</th><th className="px-6 py-4">Categoría</th>{canManageSafety && <th className="px-6 py-4 text-right">Acciones</th>}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safetyList.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{s.name}</td>
                      <td className="px-6 py-4"><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Shield size={12} /> Dedicado</span></td>
                      {canManageSafety && (
                        <td className="px-6 py-4"><div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setSafetyFormData({ id: s.id, name: s.name }); setSafetyFormOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteSafety(s.id, s.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div></td>
                      )}
                    </tr>
                  ))}
                  {safetyList.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No hay personal Safety Dedicado registrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: VEHÍCULOS ── */}
      {tab === 'vehicles' && (
        <>
          {canManageVehicles && (
            <div className="flex justify-end mb-4">
              <button onClick={() => { setVehicleFormData({ id: '', name: '', isAvailable: true }); setVehicleFormOpen(true); }} className="btn-primary"><Plus size={18} /> Añadir Vehículo</button>
            </div>
          )}
          {vehicleFormOpen && (
            <div className="card p-6 mb-4 border-l-4 border-l-violet-500">
              <h3 className="font-semibold text-slate-800 mb-4">{vehicleFormData.id ? 'Editar' : 'Nuevo'} Vehículo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre / Identificador *</label>
                  <input type="text" value={vehicleFormData.name} onChange={(e) => setVehicleFormData({ ...vehicleFormData, name: e.target.value })} className="w-full" placeholder="Ej: Camioneta 01, Van Perry-03" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={vehicleFormData.isAvailable} onChange={(e) => setVehicleFormData({ ...vehicleFormData, isAvailable: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    <span className="text-sm font-medium text-slate-700">✅ Disponible para asignar</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveVehicle} className="btn-primary text-sm">Guardar</button>
                <button onClick={() => setVehicleFormOpen(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr><th className="px-6 py-4">Nombre</th><th className="px-6 py-4">Disponible</th>{canManageVehicles && <th className="px-6 py-4 text-right">Acciones</th>}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicleList.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{v.name}</td>
                      <td className="px-6 py-4">
                        {v.isAvailable ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">✅ Disponible</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">❌ No disponible</span>}
                      </td>
                      {canManageVehicles && (
                        <td className="px-6 py-4"><div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setVehicleFormData({ id: v.id, name: v.name, isAvailable: v.isAvailable }); setVehicleFormOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteVehicle(v.id, v.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div></td>
                      )}
                    </tr>
                  ))}
                  {vehicleList.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No hay vehículos registrados.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: CHOFERES ── */}
      {tab === 'drivers' && canManageDrivers && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setDriverFormData({ id: '', name: '' }); setDriverFormOpen(true); }} className="btn-primary"><Plus size={18} /> Añadir Chofer</button>
          </div>
          {driverFormOpen && (
            <div className="card p-6 mb-4 border-l-4 border-l-cyan-500">
              <h3 className="font-semibold text-slate-800 mb-4">{driverFormData.id ? 'Editar' : 'Nuevo'} Chofer</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo *</label>
                <input type="text" value={driverFormData.name} onChange={(e) => setDriverFormData({ ...driverFormData, name: e.target.value })} className="w-full md:w-1/2" />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveDriver} className="btn-primary text-sm">Guardar</button>
                <button onClick={() => setDriverFormOpen(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr><th className="px-6 py-4">Nombre</th><th className="px-6 py-4 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {driverList.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{d.name}</td>
                      <td className="px-6 py-4"><div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setDriverFormData({ id: d.id, name: d.name }); setDriverFormOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteDriver(d.id, d.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div></td>
                    </tr>
                  ))}
                  {driverList.length === 0 && <tr><td colSpan={2} className="px-6 py-8 text-center text-slate-500">No hay choferes registrados.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: EQ. ELEVACIÓN ── */}
      {tab === 'equips' && (
        <>
          {canManageEquips && (
            <div className="flex justify-end mb-4">
              <button onClick={() => { setEquipFormData({ id: '', name: '', ownership: 'PROPIO' }); setEquipFormOpen(true); }} className="btn-primary"><Plus size={18} /> Añadir Equipo</button>
            </div>
          )}
          {equipFormOpen && (
            <div className="card p-6 mb-4 border-l-4 border-l-orange-500">
              <h3 className="font-semibold text-slate-800 mb-4">{equipFormData.id ? 'Editar' : 'Nuevo'} Equipo de Elevación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre / Identificador *</label>
                  <input type="text" value={equipFormData.name} onChange={(e) => setEquipFormData({ ...equipFormData, name: e.target.value })} className="w-full" placeholder="Ej: Grúa Telescópica 40T" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select value={equipFormData.ownership} onChange={(e) => setEquipFormData({ ...equipFormData, ownership: e.target.value })} className="w-full">
                    <option value="PROPIO">Propio</option>
                    <option value="RENTADO">Rentado</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveEquip} className="btn-primary text-sm">Guardar</button>
                <button onClick={() => setEquipFormOpen(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr><th className="px-6 py-4">Nombre</th><th className="px-6 py-4">Tipo</th>{canManageEquips && <th className="px-6 py-4 text-right">Acciones</th>}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {equipList.map((eq) => (
                    <tr key={eq.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{eq.name}</td>
                      <td className="px-6 py-4"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${eq.ownership === 'PROPIO' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{eq.ownership === 'PROPIO' ? 'Propio' : 'Rentado'}</span></td>
                      {canManageEquips && (
                        <td className="px-6 py-4"><div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setEquipFormData({ id: eq.id, name: eq.name, ownership: eq.ownership }); setEquipFormOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteEquip(eq.id, eq.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div></td>
                      )}
                    </tr>
                  ))}
                  {equipList.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No hay equipos de elevación registrados.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: CONTRATISTAS ── */}
      {tab === 'contractors' && isAdmin && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setContractorFormData({ id: '', name: '' }); setContractorFormOpen(true); }} className="btn-primary"><Plus size={18} /> Añadir Contratista</button>
          </div>
          {contractorFormOpen && (
            <div className="card p-6 mb-4 border-l-4 border-l-orange-500">
              <h3 className="font-semibold text-slate-800 mb-4">{contractorFormData.id ? 'Editar' : 'Nuevo'} Contratista</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Empresa *</label>
                <input type="text" value={contractorFormData.name} onChange={(e) => setContractorFormData({ ...contractorFormData, name: e.target.value })} className="w-full max-w-md" placeholder="Ej: MANTENIMIENTO INDUSTRIAL DEL NORTE" />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={async () => {
                  const method = contractorFormData.id ? 'PUT' : 'POST';
                  const url = contractorFormData.id ? `/api/contractors/${contractorFormData.id}` : '/api/contractors';
                  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: contractorFormData.name }) });
                  if (!res.ok) { const err = await res.json(); alert(err.error || 'Error'); return; }
                  setContractorFormOpen(false); setContractorFormData({ id: '', name: '' }); await fetchAll();
                }} className="btn-primary text-sm">Guardar</button>
                <button onClick={() => setContractorFormOpen(false)} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr><th className="px-6 py-4">Empresa</th><th className="px-6 py-4">Técnicos Asignados</th><th className="px-6 py-4 text-right">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contractorList.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-orange-500" />
                          {c.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{c._count?.technicians || 0}</span>
                      </td>
                      <td className="px-6 py-4"><div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setContractorFormData({ id: c.id, name: c.name }); setContractorFormOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                        <button onClick={async () => { if (!window.confirm(`¿Desactivar ${c.name}?`)) return; await fetch(`/api/contractors/${c.id}`, { method: 'DELETE' }); await fetchAll(); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div></td>
                    </tr>
                  ))}
                  {contractorList.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No hay contratistas registrados. Añade uno para asignar a técnicos externos.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
