'use client';

import {
  Shield, Users, Eye, Zap, Wrench, ShieldCheck, CheckCircle2,
  XCircle, Forklift, AlertTriangle, Info, Check, X, Bookmark
} from 'lucide-react';

const roles = [
  {
    name: 'Admin Maestro',
    tag: 'ADMIN',
    emoji: '🟣',
    color: 'from-violet-600 to-indigo-600',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-100',
    bg: 'bg-gradient-to-br from-violet-50/50 to-indigo-50/20',
    desc: 'Control total. Configura empresas, usuarios, recursos y ve toda la información consolidada. Acceso completo a Consorcio, préstamos y exenciones TERA.'
  },
  {
    name: 'Administración',
    tag: 'ADMINISTRACION',
    emoji: '🔴',
    color: 'from-rose-600 to-pink-600',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-100',
    bg: 'bg-gradient-to-br from-rose-50/50 to-pink-50/20',
    desc: 'Acceso administrativo para facturación, recursos y usuarios. Similar al Admin Maestro pero restringido de realizar préstamos Consorcio.'
  },
  {
    name: 'Supervisor',
    tag: 'SUPERVISOR',
    emoji: '🟡',
    color: 'from-amber-500 to-orange-500',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-100',
    bg: 'bg-gradient-to-br from-amber-50/50 to-orange-50/20',
    desc: 'Lidera equipos de ingenieros. Ve actividades de su equipo, asigna recursos en ATC Finde, crea días extra de planeación y accede a reporte de folios Odoo.'
  },
  {
    name: 'Safety & L.P.',
    tag: 'SUPERVISOR_SAFETY_LP',
    emoji: '🟢',
    color: 'from-teal-500 to-emerald-500',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-100',
    bg: 'bg-gradient-to-br from-teal-50/50 to-emerald-50/20',
    desc: 'Supervisa seguridad industrial. Gestiona personal de Safety Dedicado, choferes, auditorías, notas de alerta y tiene poder exclusivo para eximir actividades de TERA.'
  },
  {
    name: 'Ingeniero',
    tag: 'INGENIERO',
    emoji: '🔵',
    color: 'from-blue-500 to-sky-500',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-100',
    bg: 'bg-gradient-to-br from-blue-50/50 to-sky-50/20',
    desc: 'Operativo técnico. Registra y edita sus propias actividades, consulta planes del fin de semana, realiza su registro horario (4 fases) y checklists de equipos.'
  },
];

const C = () => (
  <span className="inline-flex items-center justify-center bg-emerald-100 text-emerald-800 rounded-full p-0.5" title="Acceso Permitido">
    <Check size={12} className="stroke-[3]" />
  </span>
);

const Xx = () => (
  <span className="inline-flex items-center justify-center bg-rose-100 text-rose-800 rounded-full p-0.5" title="Acceso Denegado">
    <X size={12} className="stroke-[3]" />
  </span>
);

const Ey = () => <span className="text-amber-600 font-semibold text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-100">👁️ Solo Ver</span>;
const Tm = () => <span className="text-indigo-600 font-semibold text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">👥 Equipo</span>;
const Sl = () => <span className="text-blue-600 font-semibold text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-100">👤 Propias</span>;

const th = 'px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider bg-slate-50 border-b border-slate-200';
const td = 'px-4 py-3 border-b border-slate-100 text-center text-sm';
const tdl = 'px-4 py-3 border-b border-slate-100 text-sm font-medium text-slate-800';

export function PerfilesGuide() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Visual Welcome Header Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-500/20">
        <div className="absolute right-0 top-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-[200px] h-[200px] bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row items-center gap-6 z-10">
          <div className="relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-indigo-950/50">
            <img src="/perry-logo.jpg" alt="Perry Logo" className="w-full h-full object-cover" />
          </div>
          <div className="text-center md:text-left space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Shield size={12} /> Guía de Permisos
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Perfiles y Privilegios en Perry</h1>
            <p className="text-sm text-indigo-200 max-w-xl">
              Perry App implementa un control de acceso basado en roles (RBAC) estructurado jerárquicamente para garantizar la seguridad de la información corporativa.
            </p>
          </div>
        </div>
      </div>

      {/* 5 Perfiles de Usuario Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <Users size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Perfiles de Usuario</h2>
            <p className="text-xs text-slate-500">Niveles de acceso del sistema</p>
          </div>
        </div>

        <div className="grid gap-4">
          {roles.map(r => (
            <div key={r.tag} className={`flex flex-col md:flex-row gap-4 p-5 rounded-2xl border ${r.borderColor} ${r.bg} transition-all hover:shadow-md`}>
              <div className="flex items-center gap-3 flex-shrink-0 md:w-56">
                <span className="text-xl">{r.emoji}</span>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">{r.name}</h4>
                  <span className="inline-block text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded-md border text-slate-500 mt-0.5">
                    {r.tag}
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-600 md:flex-1 md:border-l md:border-slate-200 md:pl-4 flex items-center">
                {r.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modern Hierarchical Structure Representation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <Bookmark size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Jerarquía y Herencia de Accesos</h2>
            <p className="text-xs text-slate-500">Visualización de niveles de poder de arriba hacia abajo</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {/* Admin Maestro Box */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-2">🟣 Admin Maestro</span>
              <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded font-bold">Consorcio + Todas las Empresas</span>
            </div>
          </div>

          <div className="pl-6 border-l-2 border-indigo-100 space-y-3">
            {/* Administracion Box */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-2">🔴 Administración</span>
                <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded font-bold">Gestión de Usuarios y Recursos</span>
              </div>
            </div>

            <div className="pl-6 border-l-2 border-pink-100 flex flex-col md:flex-row gap-3">
              {/* Supervisor Box */}
              <div className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm flex items-center gap-2">🟡 Supervisor</span>
                  <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded font-bold">Lidera Equipo</span>
                </div>
              </div>

              {/* Safety Box */}
              <div className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm flex items-center gap-2">🟢 Safety & L.P.</span>
                  <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded font-bold">Industrial & TERA</span>
                </div>
              </div>
            </div>

            <div className="pl-6 border-l-2 border-slate-200">
              <div className="pl-6 border-l-2 border-emerald-100">
                {/* Ingeniero Box */}
                <div className="bg-gradient-to-r from-blue-500 to-sky-600 text-white rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm flex items-center gap-2">🔵 Ingeniero</span>
                    <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded font-bold">Operación & Autogestión</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tablas de Acceso a Páginas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <Eye size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Acceso a Módulos (Páginas)</h2>
            <p className="text-xs text-slate-500">¿Quién puede ver qué módulo en la barra de navegación?</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className={th}>Módulo o Página</th>
                <th className={`${th} text-center`}>🟣 Admin</th>
                <th className={`${th} text-center`}>🔴 Admón</th>
                <th className={`${th} text-center`}>🟡 Super</th>
                <th className={`${th} text-center`}>🟢 Safety</th>
                <th className={`${th} text-center`}>🔵 Ing.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { page: 'Dashboard & Analítica', values: [1, 1, 1, 1, 1] },
                { page: 'Actividades (Listado & Crear)', values: [1, 1, 1, 1, 1] },
                { page: 'ATC Finde (Plan Finde)', values: [1, 1, 1, 1, 1] },
                { page: 'Reg. Equipos (Checklist)', values: [1, 1, 1, 1, 1] },
                { page: 'Planes Pasados (Historial)', values: [1, 1, 1, 1, 1] },
                { page: 'Recibos (Facturación Odoo)', values: [1, 1, 1, 1, 1] },
                { page: 'Oportunidades (Odoo)', values: [1, 1, 1, 1, 1] },
                { page: 'Importar Reporte (Texto/Chat)', values: [1, 1, 1, 1, 1] },
                { page: 'Alarma TERA (Monitoreo)', values: [1, 1, 1, 1, 0] },
                { page: 'Gestión de Clientes', values: [1, 1, 1, 1, 0] },
                { page: 'Guía Perry', values: [1, 1, 1, 1, 1] },
                { page: 'Gestión de Recursos', values: [1, 1, 0, 0, 0] },
                { page: 'Consorcio (Préstamos)', values: [1, 0, 0, 0, 0] },
              ].map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/50">
                  <td className={tdl}>{item.page}</td>
                  {item.values.map((v, i) => (
                    <td key={i} className={td}>
                      {v ? <C /> : <Xx />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permisos de Acción - Actividades y TERA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <ShieldCheck size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Permisos de Acción — Actividades & TERA</h2>
            <p className="text-xs text-slate-500">Permisos finos sobre la gestión del plan y seguridad</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className={th}>Acción</th>
                <th className={`${th} text-center`}>🟣 Admin</th>
                <th className={`${th} text-center`}>🔴 Admón</th>
                <th className={`${th} text-center`}>🟡 Super</th>
                <th className={`${th} text-center`}>🟢 Safety</th>
                <th className={`${th} text-center`}>🔵 Ing.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className={tdl}>Ver y Editar Actividades</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><Tm /> Equipo</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><Sl /> Propias</td>
              </tr>
              <tr>
                <td className={tdl}>🚫 Cancelar / Deshacer Actividades</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><Xx /></td>
                <td className={td}><C /> Todas</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><Sl /> Propias</td>
              </tr>
              <tr>
                <td className={tdl}>🛡️ Exención TERA (Marcar Exenta N/A)</td>
                <td className={td}><C /></td>
                <td className={td}><Xx /></td>
                <td className={td}><Xx /></td>
                <td className={td}><C /></td>
                <td className={td}><Xx /></td>
              </tr>
              <tr>
                <td className={tdl}>📷 Subir / Eliminar TERA & Folio TERA</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><C /> Asignadas</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><Sl /> Propias</td>
              </tr>
              <tr>
                <td className={tdl}>🔍 Cargar TERA Auditor (Safety Oficial)</td>
                <td className={td}><C /></td>
                <td className={td}><Xx /></td>
                <td className={td}><Xx /></td>
                <td className={td}><C /></td>
                <td className={td}><Xx /></td>
              </tr>
              <tr>
                <td className={tdl}>⏰ Registro Horario (1-4 fases)</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><C /> Asignadas</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><C /> Propias</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="flex gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-800">
          <Info size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Nota sobre Sup. Operativo:</p>
            <p>
              Cualquier usuario asignado como <strong>Supervisor Operativo</strong> en ATC Finde (a través de Asignación de Safety, Técnicos, o Safety Dedicado) adquiere automáticamente los permisos para realizar cargas TERA y registro de horario en la actividad correspondiente, sin importar su perfil base.
            </p>
          </div>
        </div>
      </div>

      {/* Registro Equipos Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <Forklift size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Permisos — Registro de Equipos</h2>
            <p className="text-xs text-slate-500">Control de checklist, fotos de evidencia y folios de equipo</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className={th}>Acción en Registro de Equipos</th>
                <th className={`${th} text-center`}>🟣 Admin</th>
                <th className={`${th} text-center`}>🔴 Admón</th>
                <th className={`${th} text-center`}>🟡 Super</th>
                <th className={`${th} text-center`}>🟢 Safety</th>
                <th className={`${th} text-center`}>🔵 Ing.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className={tdl}>Llenar checklist & subir evidencias (fotos)</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><Sl /> Propias</td>
              </tr>
              <tr>
                <td className={tdl}>Asignar Operador del Equipo</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><C /> Todas</td>
                <td className={td}><Sl /> Propias</td>
              </tr>
              <tr>
                <td className={tdl}>📂 Ver Reporte Histórico por Folio (Odoo)</td>
                <td className={td}><C /></td>
                <td className={td}><C /></td>
                <td className={td}><C /></td>
                <td className={td}><Xx /></td>
                <td className={td}><Xx /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Gestion de Recursos Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <Wrench size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Permisos — Gestión de Recursos</h2>
            <p className="text-xs text-slate-500">¿Quién puede crear y modificar catálogos operativos?</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className={th}>Catálogo</th>
                <th className={`${th} text-center`}>🟣 Admin</th>
                <th className={`${th} text-center`}>🔴 Admón</th>
                <th className={`${th} text-center`}>🟡 Super</th>
                <th className={`${th} text-center`}>🟢 Safety</th>
                <th className={`${th} text-center`}>🔵 Ing.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className={tdl}>Usuarios</td>
                <td className={td}><C /></td>
                <td className={td}><C /></td>
                <td className={td}><Xx /></td>
                <td className={td}><Xx /></td>
                <td className={td}><Xx /></td>
              </tr>
              <tr>
                <td className={tdl}>Técnicos (Internos & Contratistas)</td>
                <td className={td}><C /></td>
                <td className={td}><C /></td>
                <td className={td}><Ey /></td>
                <td className={td}><Ey /></td>
                <td className={td}><Xx /></td>
              </tr>
              <tr>
                <td className={tdl}>Safety Dedicado</td>
                <td className={td}><C /></td>
                <td className={td}><C /></td>
                <td className={td}><Ey /></td>
                <td className={td}><C /></td>
                <td className={td}><Ey /></td>
              </tr>
              <tr>
                <td className={tdl}>Vehículos</td>
                <td className={td}><C /></td>
                <td className={td}><C /></td>
                <td className={td}><Ey /></td>
                <td className={td}><Ey /></td>
                <td className={td}><Xx /></td>
              </tr>
              <tr>
                <td className={tdl}>Choferes</td>
                <td className={td}><C /></td>
                <td className={td}><C /></td>
                <td className={td}><Xx /></td>
                <td className={td}><C /></td>
                <td className={td}><Xx /></td>
              </tr>
              <tr>
                <td className={tdl}>Equipos de Elevación</td>
                <td className={td}><C /></td>
                <td className={td}><C /></td>
                <td className={td}><Ey /></td>
                <td className={td}><Ey /></td>
                <td className={td}><Xx /></td>
              </tr>
              <tr>
                <td className={tdl}>Contratistas</td>
                <td className={td}><C /></td>
                <td className={td}><C /></td>
                <td className={td}><Xx /></td>
                <td className={td}><Xx /></td>
                <td className={td}><Xx /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Alertas de Conflictos Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-rose-50 rounded-xl">
            <AlertTriangle size={20} className="text-rose-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Detección de Conflictos Cross-Company</h2>
            <p className="text-xs text-slate-500">Reglas automáticas de validación en asignaciones</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          El sistema analiza dinámicamente el plan para advertir al programador en tiempo real si un recurso compartido (técnico, vehículo, chofer o equipo) ya ha sido asignado en otra actividad de la misma fecha que se superponga en horarios.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            <span className="font-bold block text-slate-700">Técnicos & Choferes</span>
            <span className="text-slate-500">Advertencia visual en la tarjeta de asignación</span>
          </div>
          <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            <span className="font-bold block text-slate-700">Vehículos & Equipos</span>
            <span className="text-slate-500">Alerta de superposición en tiempo real</span>
          </div>
          <div className="bg-red-50 rounded-xl px-4 py-3 border border-red-100 text-red-800">
            <span className="font-bold block text-red-900">Safety Dedicado</span>
            <span className="text-red-700">⚠️ Bloqueo inmediato para evitar doble asignación</span>
          </div>
        </div>
      </div>

    </div>
  );
}
