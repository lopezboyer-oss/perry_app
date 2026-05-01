'use client';

import { Shield, Users, Eye, Check, X } from 'lucide-react';

const roles = [
  { name: 'Admin Maestro', tag: 'ADMIN', emoji: '🟣', color: '#7c3aed', bg: 'bg-purple-50 border-purple-100', desc: 'Control total. Configura empresas, usuarios, recursos y ve toda la información consolidada.' },
  { name: 'Administración', tag: 'ADMINISTRACION', emoji: '🔴', color: '#e11d48', bg: 'bg-rose-50 border-rose-100', desc: 'Acceso administrativo. Gestiona recursos y usuarios. Similar al Admin pero sin acceso a Consorcio.' },
  { name: 'Supervisor', tag: 'SUPERVISOR', emoji: '🟡', color: '#f59e0b', bg: 'bg-amber-50 border-amber-100', desc: 'Lidera equipos de ingenieros. Ve las actividades de su equipo, puede asignar recursos y editar notas.' },
  { name: 'Safety & L.P.', tag: 'SUPERVISOR_SAFETY_LP', emoji: '🟢', color: '#0d9488', bg: 'bg-teal-50 border-teal-100', desc: 'Supervisa seguridad. Gestiona Safety Dedicados, choferes, auditorías y notas de seguridad.' },
  { name: 'Ingeniero', tag: 'INGENIERO', emoji: '🔵', color: '#10b981', bg: 'bg-emerald-50 border-emerald-100', desc: 'Operativo. Registra sus propias actividades, consulta planes y exporta información.' },
];

const C = () => <span className="text-emerald-600 font-bold">✅</span>;
const Xx = () => <span className="text-red-500 font-bold">❌</span>;
const Ey = () => <span className="text-amber-500 font-semibold">👁️</span>;
const Tm = () => <span className="text-blue-500 font-semibold">👥</span>;
const Sl = () => <span className="text-purple-500 font-semibold">👤</span>;

const th = 'px-3 py-2.5 text-left font-semibold text-slate-600 text-xs whitespace-nowrap bg-slate-50 border-b-2 border-slate-200';
const td = 'px-3 py-2 border-b border-slate-100 text-center text-sm';
const tdl = 'px-3 py-2 border-b border-slate-100 text-sm font-medium text-slate-800';

export function PerfilesGuide() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Roles */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><Users size={20} className="text-indigo-500" /> Perfiles de Usuario</h2>
        <p className="text-sm text-slate-500 mb-4">Perry App tiene <strong>5 perfiles</strong> con niveles de acceso progresivos:</p>
        <div className="space-y-3">
          {roles.map(r => (
            <div key={r.tag} className={`flex gap-3 p-4 rounded-xl border ${r.bg}`}>
              <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ background: r.color }} />
              <div>
                <p className="font-bold text-sm text-slate-800">{r.emoji} {r.name} <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/60 text-slate-600 ml-1">{r.tag}</span></p>
                <p className="text-xs text-slate-600 mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Acceso a Páginas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><Eye size={20} className="text-indigo-500" /> Acceso a Páginas por Perfil</h2>
        <div className="overflow-x-auto">
          <table className="w-full"><thead><tr>
            <th className={th}>Página</th><th className={th}>🟣 Admin</th><th className={th}>🔴 Admón</th><th className={th}>🟡 Super</th><th className={th}>🟢 Safety</th><th className={th}>🔵 Ing.</th>
          </tr></thead><tbody>
            {[
              ['Dashboard',1,1,1,1,1],['Actividades',1,1,1,1,1],['ATC Finde',1,1,1,1,1],['Planes Pasados',1,1,1,1,1],
              ['Recibos',1,1,1,1,1],['Importar Reporte',1,1,1,1,1],['Oportunidades',1,1,1,1,1],['Analítica',1,1,1,1,1],
              ['Guía Perry',1,1,1,1,1],['Gestión de Clientes',1,1,1,1,0],['Gestión de Recursos',1,1,0,0,0],['Consorcio',1,0,0,0,0],
            ].map(([page,...vals]) => (
              <tr key={page as string} className="hover:bg-slate-50/80">
                <td className={tdl}>{page as string}</td>
                {(vals as number[]).map((v,i) => <td key={i} className={td}>{v ? <C /> : <Xx />}</td>)}
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>

      {/* Permisos de Acción */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><Shield size={20} className="text-indigo-500" /> Permisos de Acción — Actividades</h2>
        <div className="overflow-x-auto">
          <table className="w-full"><thead><tr>
            <th className={th}>Acción</th><th className={th}>🟣 Admin</th><th className={th}>🔴 Admón</th><th className={th}>🟡 Super</th><th className={th}>🟢 Safety</th><th className={th}>🔵 Ing.</th>
          </tr></thead><tbody>
            <tr><td className={tdl}>Ver actividades</td><td className={td}><C /> Todas</td><td className={td}><C /> Todas</td><td className={td}><Tm /> Equipo</td><td className={td}><C /> Todas</td><td className={td}><Sl /> Propias</td></tr>
            <tr><td className={tdl}>Crear actividades</td><td className={td}><C /></td><td className={td}><C /></td><td className={td}><C /></td><td className={td}><C /></td><td className={td}><C /></td></tr>
            <tr><td className={tdl}>Editar actividades</td><td className={td}><C /> Todas</td><td className={td}><C /> Todas</td><td className={td}><Tm /> Equipo</td><td className={td}><C /> Todas</td><td className={td}><Sl /> Propias</td></tr>
            <tr><td className={tdl}>Exportar CSV</td><td className={td}><C /></td><td className={td}><C /></td><td className={td}><C /></td><td className={td}><C /></td><td className={td}><C /></td></tr>
          </tbody></table>
        </div>
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
          👥 <strong>&quot;Su equipo&quot;</strong> = El supervisor ve sus propias actividades + las de los ingenieros que tiene asignados.
        </div>
      </div>

      {/* Gestión de Recursos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><Shield size={20} className="text-indigo-500" /> Permisos — Gestión de Recursos</h2>
        <div className="overflow-x-auto">
          <table className="w-full"><thead><tr>
            <th className={th}>Recurso</th><th className={th}>🟣 Admin</th><th className={th}>🔴 Admón</th><th className={th}>🟡 Super</th><th className={th}>🟢 Safety</th><th className={th}>🔵 Ing.</th>
          </tr></thead><tbody>
            <tr><td className={tdl}>Usuarios</td><td className={td}><C /></td><td className={td}><C /></td><td className={td}><Xx /></td><td className={td}><Xx /></td><td className={td}><Xx /></td></tr>
            <tr><td className={tdl}>Técnicos</td><td className={td}><C /></td><td className={td}><C /></td><td className={td}><Ey /> Ver</td><td className={td}><Ey /> Ver</td><td className={td}><Xx /></td></tr>
            <tr><td className={tdl}>Safety Dedicado</td><td className={td}><C /></td><td className={td}><C /></td><td className={td}><Ey /> Ver</td><td className={td}><C /></td><td className={td}><Ey /> Ver</td></tr>
            <tr><td className={tdl}>Vehículos</td><td className={td}><C /></td><td className={td}><C /></td><td className={td}><Ey /> Ver</td><td className={td}><Ey /> Ver</td><td className={td}><Xx /></td></tr>
            <tr><td className={tdl}>Choferes</td><td className={td}><C /></td><td className={td}><C /></td><td className={td}><Xx /></td><td className={td}><C /></td><td className={td}><Xx /></td></tr>
            <tr><td className={tdl}>Eq. Elevación</td><td className={td}><C /></td><td className={td}><C /></td><td className={td}><Ey /> Ver</td><td className={td}><Ey /> Ver</td><td className={td}><Xx /></td></tr>
            <tr><td className={tdl}>Contratistas</td><td className={td}><C /></td><td className={td}><C /></td><td className={td}><Xx /></td><td className={td}><Xx /></td><td className={td}><Xx /></td></tr>
          </tbody></table>
        </div>
      </div>

      {/* Jerarquía */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">📊 Jerarquía Visual de Accesos</h2>
        <pre className="bg-slate-800 text-green-400 rounded-xl p-5 text-xs leading-relaxed overflow-x-auto font-mono">{`┌──────────────────────────────────────────────────────┐
│                  🟣 ADMIN MAESTRO                     │
│  ┌────────────────────────────────────────────────┐  │
│  │             🔴 ADMINISTRACIÓN                   │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │   🟡 SUPERVISOR    🟢 SAFETY & L.P.      │  │  │
│  │  │  ┌────────────────────────────────────┐  │  │  │
│  │  │  │         🔵 INGENIERO               │  │  │  │
│  │  │  │  • Mis actividades                 │  │  │  │
│  │  │  │  • Registrar / Editar propias      │  │  │  │
│  │  │  │  • ATC Finde (ver + editar mías)   │  │  │  │
│  │  │  │  • Exportar CSV                    │  │  │  │
│  │  │  └────────────────────────────────────┘  │  │  │
│  │  │  + Actividades del equipo                │  │  │
│  │  │  + Asignar recursos en ATC Finde         │  │  │
│  │  │  + Directorio de Clientes                │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  │  + Gestión de Recursos (usuarios, técnicos..)  │  │
│  └────────────────────────────────────────────────┘  │
│  + Consorcio (préstamos inter-empresa)               │
│  + Selector "TODAS" las empresas                     │
└──────────────────────────────────────────────────────┘`}</pre>
      </div>

      {/* Guías rápidas por rol */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">🚀 Guía Rápida por Rol</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100"><h3 className="font-bold text-purple-800 text-sm mb-1">🟣 Admin Maestro</h3><p className="text-xs text-purple-700">Acceso total. Todas las páginas, todos los datos. Consorcio y auditoría Safety completa.</p></div>
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-100"><h3 className="font-bold text-rose-800 text-sm mb-1">🔴 Administración</h3><p className="text-xs text-rose-700">Como Admin pero sin Consorcio. Gestiona usuarios y recursos operativos.</p></div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100"><h3 className="font-bold text-amber-800 text-sm mb-1">🟡 Supervisor</h3><p className="text-xs text-amber-700">Ve su equipo. Asigna técnicos, vehículos y equipos. No puede gestionar usuarios ni Safety.</p></div>
          <div className="bg-teal-50 rounded-xl p-4 border border-teal-100"><h3 className="font-bold text-teal-800 text-sm mb-1">🟢 Safety & L.P.</h3><p className="text-xs text-teal-700">Ve todas las actividades. Gestiona Safety Dedicados y choferes. No puede gestionar usuarios.</p></div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 mt-3"><h3 className="font-bold text-emerald-800 text-sm mb-1">🔵 Ingeniero</h3><p className="text-xs text-emerald-700">Ve solo sus actividades. Registra y edita las propias. No puede asignar recursos ni ver actividades de otros.</p></div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
        💡 <strong>¿Necesitas un acceso diferente?</strong> Contacta a un Admin Maestro para ajustar tu perfil o asignarte empresas adicionales.
      </div>
    </div>
  );
}
