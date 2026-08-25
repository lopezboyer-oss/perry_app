// Centralized permission helpers for multi-company Perry
// Use these instead of hardcoding role checks everywhere

/** Admin Maestro — acceso global a todo, ve todas las empresas */
export const isAdminMaestro = (role: string) => role === 'ADMIN';

/** Admin de empresa — acceso total pero limitado a su(s) empresa(s) */
export const isAdminEmpresa = (role: string) => role === 'ADMINISTRACION';

/** Cualquier tipo de admin (maestro o empresa) */
export const isAnyAdmin = (role: string) => ['ADMIN', 'ADMINISTRACION'].includes(role);

/** Roles que pueden gestionar recursos (usuarios, técnicos, etc.) */
export const canManageResources = (role: string) => ['ADMIN', 'ADMINISTRACION'].includes(role);

/** Roles que ven recibos — todos los roles (ingeniero ve solo los suyos) */
export const canViewRecibos = (_role: string) => true;

/** Roles que pueden ver el módulo Consorcio */
export const canViewConsorcio = (role: string) => role === 'ADMIN';

/** Roles que ven el company switcher (todos si tienen 2+ empresas) */
export const canSwitchCompany = (role: string, companyCount: number) => {
  if (role === 'ADMIN') return true; // ADMIN siempre ve el switcher
  return companyCount >= 2;
};

/** Solo ADMIN puede ver la opción "TODAS" (vista consolidada) */
export const canViewAllCompanies = (role: string) => role === 'ADMIN';

/** Roles que pueden acceder a la gestión de usuarios */
export const canManageUsers = (role: string) => ['ADMIN', 'ADMINISTRACION'].includes(role);

/** Roles con acceso a auditoría safety */
export const canEditAudit = (role: string) => ['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(role);
export const canViewAudit = (role: string) => ['ADMIN', 'SUPERVISOR_SAFETY_LP'].includes(role);

/** Odoo company IDs to exclude (test company) */
export const EXCLUDED_ODOO_COMPANY_IDS = [6];

/** Roles/users with access to the Economic Analysis feature */
export const canViewEconomicAnalysis = (email: string, role: string) => {
  const allowedEmails = [
    'lopezboyer@gmail.com',
    'joseangel.molina.gsi@gmail.com',
    'caseme1970@gmail.com',
  ];
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (allowedEmails.includes(normalizedEmail)) return true;
  if (['ADMIN', 'ADMINISTRACION'].includes(role)) return true;
  return false;
};

/** Access to Perry Intelligence (WhatsApp) — restricted to Ivan Lopez only */
export const canAccessWhatsappCoPilot = (email: string) => {
  const allowedEmails = ['lopezboyer@gmail.com'];
  return allowedEmails.includes(email);
};

/** Access to Treasury Dashboard & Financial Balances — RESTRICTED TO IVAN LOPEZ ONLY */
export const canAccessTreasuryDashboard = (email: string) => {
  const normalized = (email || '').toLowerCase().trim();
  const allowed = ['lopezboyer@gmail.com', 'ivanjoselopezboyer@gmail.com', 'ivan@grupocaseme.com'];
  return allowed.some(e => normalized.includes(e) || normalized.includes('lopezboyer'));
};
