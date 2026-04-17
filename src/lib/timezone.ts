/**
 * Utilidades de Zona Horaria — América/Tijuana (PST/PDT)
 *
 * Toda la lógica de fechas del sistema debe pasar por estas funciones
 * para garantizar que las fechas se interpreten en hora del Pacífico.
 */

const TIMEZONE = 'America/Tijuana';

/**
 * Convierte un string de fecha tipo "YYYY-MM-DD" a un objeto Date
 * que represente el mediodía de ese día en la zona horaria de Tijuana.
 *
 * Esto previene el problema de que `new Date("2026-04-16")` cree
 * una fecha UTC medianoche que al convertirse a PST retrocede al día anterior.
 */
export function parseLocalDate(dateStr: string): Date {
  // Append noon time to avoid any timezone day-shift
  return new Date(`${dateStr}T12:00:00`);
}

/**
 * Obtiene la fecha actual en Tijuana como string "YYYY-MM-DD".
 */
export function getTijuanaToday(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts; // format: YYYY-MM-DD
}

/**
 * Obtiene el día de la semana (0=Dom, 6=Sáb) de una fecha
 * según la zona horaria de Tijuana, NO UTC.
 */
export function getTijuanaDayOfWeek(date: Date): number {
  const dayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
  }).format(date);

  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[dayStr] ?? date.getDay();
}
