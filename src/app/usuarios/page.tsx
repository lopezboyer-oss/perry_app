'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, UserCog, User } from 'lucide-react';
import { UserFormDialog, UserFormData } from './components/UserFormDialog';
import { useRouter } from 'next/navigation';

interface SupervisorRef {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'INGENIERO';
  supervisorId: string | null;
  supervisor: { name: string } | null;
  isActive: boolean;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserFormData> & { id?: string } | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.status === 403) {
        // Not admin
        router.push('/dashboard');
        return;
      }
      if (!res.ok) throw new Error('Error al cargar personal');
      const data: UserData[] = await res.json();
      setUsers(data);
      // Extract supervisors (both Admin and Supervisors can be assigned as direct superiors)
      const validSuperiors = data
        .filter(u => u.role === 'ADMIN' || u.role === 'SUPERVISOR')
        .map(u => ({ id: u.id, name: u.name }));
      setSupervisors(validSuperiors);
    } catch (error) {
      console.error(error);
      alert('Hubo un error cargando el equipo.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingUser(undefined);
    setFormOpen(true);
  };

  const handleOpenEdit = (user: UserData) => {
    setEditingUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      supervisorId: user.supervisorId,
    });
    setFormOpen(true);
  };

  const handleDelete = async (user: UserData) => {
    if (!window.confirm(`¿Estás súper seguro de eliminar a ${user.name}? Todo su historial activo se cambiará a "POR ASIGNAR", pero perderá el acceso a la plataforma.`)) return;
    
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchUsers(); // reload list
    } catch (error) {
      alert('Error eliminando al usuario');
    }
  };

  const handleFormSubmit = async (data: UserFormData) => {
    try {
      if (editingUser?.id) {
        // Edit mode
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        // Create mode
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      await fetchUsers();
    } catch (error: any) {
      alert(`Error guardando: ${error.message}`);
      throw error; // Let Dialog handle error silently if needed
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando personal...</div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestión de Personal</h1>
          <p className="text-slate-500 mt-1">Administra los roles, accesos y estructura de tu equipo.</p>
        </div>
        <button onClick={handleOpenNew} className="btn-primary">
          <Plus size={18} />
          Añadir Miembro
        </button>
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
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'SUPERVISOR' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {user.role === 'ADMIN' ? <Shield size={12}/> : user.role === 'SUPERVISOR' ? <UserCog size={12}/> : <User size={12}/>}
                      {user.role === 'ADMIN' ? 'Administrador' : user.role === 'SUPERVISOR' ? 'Supervisor' : 'Ingeniero'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {user.supervisor?.name ? (
                      <span className="flex items-center gap-1.5"><Shield size={14} className="text-slate-400"/> {user.supervisor.name}</span>
                    ) : (
                      <span className="text-slate-400 italic">-- Directivo --</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleOpenEdit(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(user)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar/Desactivar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No hay personal registrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editingUser}
        supervisors={supervisors}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
