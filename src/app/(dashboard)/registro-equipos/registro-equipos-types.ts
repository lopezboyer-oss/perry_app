// Types and helpers for RegistroEquiposClient

export interface EquipAssignment {
  assignmentId: string;
  equipId: string;
  equipName: string;
  equipOwnership: string | null;
}

export interface TechAssignment {
  technicianId: string;
  technicianName: string;
}

export interface EquipRecordData {
  id: string;
  equipId: string;
  operatorId: string | null;
  operatorName: string | null;
  operatorUpdatedBy: string | null;
  operatorUpdatedAt: string | null;
  chkCondicionesGenerales: boolean;
  chkCargaBateria100: boolean;
  chk5sEquipo: boolean;
  chkPaseClienteVigente: boolean;
  chkExtintorFuncional: boolean;
  checklistUpdatedBy: string | null;
  checklistUpdatedAt: string | null;
  evidencias: string[];
  notes: string | null;
  notesUpdatedBy: string | null;
  notesUpdatedAt: string | null;
  weekendOf: string | null;
}

export interface REActivity {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  workOrderFolio: string | null;
  userId: string | null;
  user: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
  company: { id: string; name: string; shortName: string | null } | null;
  equips: EquipAssignment[];
  techs: TechAssignment[];
  equipRecords: EquipRecordData[];
}

export interface FolioReportRow {
  recordId: string;
  activityId: string;
  activityTitle: string;
  activityDate: string;
  startTime: string | null;
  endTime: string | null;
  supOperativo: string | null;
  company: string | null;
  companyShort: string | null;
  folio: string | null;
  equipId: string;
  equipName: string;
  operatorName: string | null;
  chkCondicionesGenerales: boolean;
  chkCargaBateria100: boolean;
  chk5sEquipo: boolean;
  chkPaseClienteVigente: boolean;
  chkExtintorFuncional: boolean;
  checklistUpdatedBy: string | null;
  checklistUpdatedAt: string | null;
  evidenciasCount: number;
  notes: string | null;
  weekendOf: string | null;
}

export interface Props {
  activities: REActivity[];
  weekendDates: string[];
  selectedWeekend: string;
  userRole: string;
  userName: string;
  userId: string;
}

export const DAY_NAMES = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export const CHECKLIST_ITEMS: { key: string; label: string; icon: string }[] = [
  { key: 'chkCondicionesGenerales', label: 'Condiciones Generales', icon: '🔧' },
  { key: 'chkCargaBateria100', label: 'Carga Batería 100%', icon: '🔋' },
  { key: 'chk5sEquipo', label: '5S Equipo', icon: '🧹' },
  { key: 'chkPaseClienteVigente', label: 'Pase Cliente Vigente', icon: '🪪' },
  { key: 'chkExtintorFuncional', label: 'Extintor Funcional', icon: '🧯' },
];

export function getChecklistScore(rec: EquipRecordData): number {
  let s = 0;
  if (rec.chkCondicionesGenerales) s++;
  if (rec.chkCargaBateria100) s++;
  if (rec.chk5sEquipo) s++;
  if (rec.chkPaseClienteVigente) s++;
  if (rec.chkExtintorFuncional) s++;
  return s;
}

export function canEdit(userRole: string): boolean {
  return ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(userRole);
}

export function canViewFolioReport(userRole: string): boolean {
  return ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR'].includes(userRole);
}
