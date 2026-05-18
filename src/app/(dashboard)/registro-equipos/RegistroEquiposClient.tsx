'use client';
export function RegistroEquiposClient({ activities, weekendDates, selectedWeekend, userRole, userName, userId }: any) {
  return <div className="p-8"><h1 className="text-2xl font-bold">Registro Equipos — {selectedWeekend}</h1><p className="text-slate-500 mt-2">{activities.length} actividades con equipos</p></div>;
}
