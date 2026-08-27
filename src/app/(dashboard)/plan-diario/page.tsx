import { PlanDiarioClient } from './PlanDiarioClient';

export const metadata = {
  title: 'Plan Diario (Lunes a Viernes) | Perry App',
  description: 'Gestión regular de actividades de lunes a viernes, trazabilidad de soportes cruzados inter-empresa y descansos.',
};

export default function PlanDiarioPage() {
  return <PlanDiarioClient />;
}
