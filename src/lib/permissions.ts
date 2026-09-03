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

/** Roles con acceso a auditoría safety y asignación de Safety Dedicado */
export const canEditAudit = (role: string) => ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR_SAFETY_LP'].includes(role);
export const canViewAudit = (role: string) => ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR_SAFETY_LP'].includes(role);

/** Asignación exclusiva de Safety Dedicado — Coordinador de Safety & Dirección */
export const canManageSafetyDedicado = (role: string, email?: string) => {
  const norm = (email || '').toLowerCase().trim();
  if (['lopezboyer@gmail.com', 'enrique.lopez.gsi@gmail.com', 'carlos.sevilla@grupocaseme.com'].some(e => norm.includes(e.split('@')[0]))) {
    return true;
  }
  return ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR_SAFETY_LP'].includes(role);
};

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

/** Access to Manage External API Keys — RESTRICTED STRICTLY TO IVAN LOPEZ ONLY */
export const canManageApiKeys = (email: string) => {
  const normalized = (email || '').toLowerCase().trim();
  const allowed = ['lopezboyer@gmail.com', 'ivanjoselopezboyer@gmail.com', 'ivan@grupocaseme.com'];
  return allowed.some(e => normalized.includes(e) || normalized.includes('lopezboyer'));
};

/** Access to Treasury Dashboard & Financial Balances — RESTRICTED TO DIRECTORS (IVAN LOPEZ & ENRIQUE LOPEZ) */
export const canAccessTreasuryDashboard = (email: string) => {
  const normalized = (email || '').toLowerCase().trim();
  const allowed = [
    'lopezboyer@gmail.com',
    'ivanjoselopezboyer@gmail.com',
    'ivan@grupocaseme.com',
    'enrique.lopez.gsi@gmail.com',
    'enrique.lopez@grupocaseme.com',
  ];
  return allowed.some(e => normalized.includes(e) || normalized.includes('lopezboyer') || normalized.includes('enrique.lopez'));
};

/** Verifica si un usuario tiene acceso al módulo de nóminas (Directores, Admin o Asistentes con accessNominas) */
export const canAccessPayrollModule = (user: { email: string; role?: string; accessNominas?: boolean } | null) => {
  if (!user) return false;
  if (canAccessTreasuryDashboard(user.email) || user.role === 'ADMIN') return true;
  return Boolean(user.accessNominas);
};

/** Resolves official Director name for tokenized digital signatures */
export const resolveDirectorSignerName = (email: string, userName?: string): string => {
  const normEmail = (email || '').toLowerCase().trim();
  if (['lopezboyer@gmail.com', 'ivanjoselopezboyer@gmail.com', 'ivan@grupocaseme.com'].includes(normEmail) || normEmail.includes('lopezboyer')) {
    return 'IVAN JOSE LOPEZ BOYER';
  }
  if (['enrique.lopez.gsi@gmail.com', 'enrique.lopez@grupocaseme.com'].includes(normEmail) || normEmail.includes('enrique.lopez')) {
    return 'JOSE ENRIQUE LOPEZ BOYER';
  }
  if (['carlos.sevilla@grupocaseme.com', 'carlos.lopez@gsingenieria.mx', 'caseme1970@gmail.com'].includes(normEmail) || normEmail.includes('carlos')) {
    return 'CARLOS SEVILLA MERCADO';
  }
  if (userName) return userName.toUpperCase();
  return normEmail.split('@')[0].toUpperCase();
};

/** Checks if email belongs to an authorized C-Suite Director who can sign payrolls */
export const canAuthorizePayroll = (email: string, role?: string): boolean => {
  const normEmail = (email || '').toLowerCase().trim();
  const directorEmails = [
    'lopezboyer@gmail.com',
    'ivanjoselopezboyer@gmail.com',
    'ivan@grupocaseme.com',
    'enrique.lopez.gsi@gmail.com',
    'enrique.lopez@grupocaseme.com',
    'carlos.sevilla@grupocaseme.com',
    'carlos.lopez@gsingenieria.mx',
    'caseme1970@gmail.com',
  ];
  if (directorEmails.some(e => normEmail.includes(e) || normEmail.includes('lopezboyer') || normEmail.includes('enrique.lopez') || normEmail.includes('carlos'))) return true;
  if (role === 'ADMIN') return true;
  return false;
};
