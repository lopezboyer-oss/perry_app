'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';

type Role = 'ADMIN' | 'SUPERVISOR' | 'SUPERVISOR_SAFETY_LP' | 'INGENIERO';

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: Role;
  supervisorId?: string | null;
  isSafetyDesignado?: boolean;
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  initialData?: Partial<UserFormData> & { id?: string };
  supervisors: { id: string; name: string }[];
}

export function UserFormDialog({ open, onOpenChange, onSubmit, initialData, supervisors }: UserFormDialogProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'INGENIERO',
    supervisorId: null,
    isSafetyDesignado: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          email: initialData.email || '',
          password: '',
          role: initialData.role || 'INGENIERO',
          supervisorId: initialData.supervisorId || null,
          isSafetyDesignado: initialData.isSafetyDesignado || false,
        });
      } else {
        setFormData({ name: '', email: '', password: '', role: 'INGENIERO', supervisorId: null, isSafetyDesignado: false });
      }
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-2xl animate-slide-in">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-xl font-bold text-slate-800">
              {isEditing ? 'Editar Personal' : 'Nuevo Miembro del Equipo'}
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X size={20} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Ej. Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico <span className="text-red-500">*</span></label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="juan@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña {isEditing && <span className="text-slate-400 font-normal">(Opcional, dejar en blanco para no cambiar)</span>} {!isEditing && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!isEditing}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol en el Sistema <span className="text-red-500">*</span></label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="INGENIERO">👨‍🔧 Ingeniero de Campo</option>
                <option value="SUPERVISOR">👨‍💼 Supervisor</option>
                <option value="SUPERVISOR_SAFETY_LP">🛡️ Supervisor Safety & L.P.</option>
                <option value="ADMIN">👑 Administrador</option>
              </select>
            </div>

            {formData.role === 'INGENIERO' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reporta a (Supervisor)</label>
                <select
                  value={formData.supervisorId || ''}
                  onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value || null })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">-- Sin supervisor directo --</option>
                  {supervisors.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 py-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isSafetyDesignado || false}
                  onChange={(e) => setFormData({ ...formData, isSafetyDesignado: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700">🟢 Acreditado como Safety Designado</span>
              </label>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary min-w-[120px]"
              >
                {loading ? 'Guardando...' : 'Guardar y Asignar'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
