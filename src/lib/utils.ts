import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Devuelve la fecha de HOY en zona horaria de Tijuana como "YYYY-MM-DD".
 * Seguro para uso en cliente (navegador) y servidor.
 */
export function getLocalToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Tijuana',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Calcula duración en minutos entre dos horarios HH:mm
 */
export function calculateDuration(startTime: string, endTime: string): number | null {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const diff = endMin - startMin;
  return diff > 0 ? diff : null;
}

/**
 * Formatea minutos a cadena legible
 */
export function formatDuration(minutes: number | null): string {
  if (!minutes) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/**
 * Calcula días entre dos fechas
 */
export function daysBetween(start: Date | string | null, end: Date | string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Formato de fecha corta en español
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-MX', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formato de fecha para input type="date" — usa UTC porque las fechas
 * en BD son calendar dates almacenadas en UTC (noon o midnight).
 */
export function toInputDate(date: Date | string | null): string {
  if (!date) return '';
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Etiquetas para tipos de actividad
 */
export const activityTypeLabels: Record<string, string> = {
  VISITA_CAMPO: 'Visita de Campo',
  COTIZACION: 'Cotización',
  EJECUCION: 'Ejecución',
  PLANEACION: 'Planeación',
  DISENO: 'Diseño',
  CONSORCIO: 'Consorcio',
};

/**
 * Etiquetas para estatus de actividad
 */
export const activityStatusLabels: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En Progreso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
};

/**
 * Etiquetas para estatus de oportunidad
 */
export const opportunityStatusLabels: Record<string, string> = {
  PROGRAMADA: 'Programada',
  VISITADA: 'Visitada',
  EN_ESPERA_INFORMACION: 'Esperando Información',
  COTIZACION_EN_PROCESO: 'Cotización en Proceso',
  COTIZACION_ENVIADA: 'Cotización Enviada',
  GANADA: 'Ganada',
  PERDIDA: 'Perdida',
};

/**
 * Colores para tipos de actividad
 */
export const activityTypeColors: Record<string, string> = {
  VISITA_CAMPO: 'bg-blue-100 text-blue-800 border-blue-200',
  COTIZACION: 'bg-amber-100 text-amber-800 border-amber-200',
  EJECUCION: 'bg-green-100 text-green-800 border-green-200',
  PLANEACION: 'bg-purple-100 text-purple-800 border-purple-200',
  DISENO: 'bg-rose-100 text-rose-800 border-rose-200',
  CONSORCIO: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

/**
 * Empresas del consorcio
 */
export const CONSORTIUM_COMPANIES = [
  'GRUPO CASEME',
  'DROBOTS',
  'OPUS INGENIUM',
  'VULCAN FORGE',
  'SAINPRO',
] as const;

/**
 * Etiquetas para roles de usuario
 */
export const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  SUPERVISOR_SAFETY_LP: 'Supervisor Safety & L.P.',
  INGENIERO: 'Ingeniero',
};

export const roleColors: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  SUPERVISOR: 'bg-amber-100 text-amber-700',
  SUPERVISOR_SAFETY_LP: 'bg-teal-100 text-teal-700',
  INGENIERO: 'bg-emerald-100 text-emerald-700',
};

/**
 * Colores para estatus de oportunidad
 */
export const opportunityStatusColors: Record<string, string> = {
  PROGRAMADA: 'bg-blue-100 text-blue-800',
  VISITADA: 'bg-cyan-100 text-cyan-800',
  EN_ESPERA_INFORMACION: 'bg-yellow-100 text-yellow-800',
  COTIZACION_EN_PROCESO: 'bg-orange-100 text-orange-800',
  COTIZACION_ENVIADA: 'bg-indigo-100 text-indigo-800',
  GANADA: 'bg-green-100 text-green-800',
  PERDIDA: 'bg-red-100 text-red-800',
};

/**
 * Colores para estatus de actividad
 */
export const activityStatusColors: Record<string, string> = {
  PENDIENTE: 'bg-gray-100 text-gray-800',
  EN_PROGRESO: 'bg-blue-100 text-blue-800',
  COMPLETADA: 'bg-green-100 text-green-800',
  CANCELADA: 'bg-red-100 text-red-800',
};
