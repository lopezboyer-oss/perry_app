const fs = require('fs');

let content = fs.readFileSync('src/app/(dashboard)/analisis-economico/AnalisisEconomicoClient.tsx', 'utf8');

// 1. Add TechAssignmentModal import
content = content.replace(
  "import { ManualTimeOverrideModal } from '@/components/ui/ManualTimeOverrideModal';",
  "import { TechAssignmentModal } from '@/components/ui/TechAssignmentModal';"
);

// 2. Add state and handleDeleteAssignment
const stateStr = `
  const [techAssignmentModal, setTechAssignmentModal] = useState<{
    activityId: string;
    activityTitle: string;
    assignmentId?: string;
    initialTimeIn?: string;
    initialTimeOut?: string;
    initialTechnicianId?: string;
    initialTechnicianName?: string;
  } | null>(null);

  const handleDeleteAssignment = async (activityId: string, assignmentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este técnico de la actividad?')) return;
    try {
      await fetch(\`/api/activities/\${activityId}/tech-assignments/\${assignmentId}\`, { method: 'DELETE' });
      fetchEconomicData();
    } catch (err) {
      alert('Error al eliminar');
    }
  };
`;
// find `const [manualOverrideModal, setManualOverrideModal] = useState...`
const manualOverrideStateRegex = /const \[manualOverrideModal, setManualOverrideModal\] = useState[^;]+;/;
content = content.replace(manualOverrideStateRegex, stateStr.trim());

// 3. Remove Horas Hombre block (it starts from `<div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">` up to `})()}`
const horasHombreRegex = /\{\/\* Horas Hombre Detailed Table \*\/\}.*?\{\(\(\) => \{.*?\n          \}\)\(\)\}/s;
content = content.replace(horasHombreRegex, '');

// 4. Replace Mano de Obra table
const manoDeObraRegex = /\{\/\* Técnicos \*\/\}.*?<\/div>\n\s+<\/div>/s;
const newManoDeObra = `{/* Técnicos */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-600 mb-4 uppercase tracking-wide">
                    Mano de Obra (Técnicos por Actividad)
                  </h4>
                  {economicData.perryActivities?.length > 0 ? (
                    <div className="space-y-6">
                      {economicData.perryActivities.map((act: any) => (
                        <div key={act.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                            <div>
                              <h5 className="font-bold text-slate-800">{act.title}</h5>
                              <p className="text-xs text-slate-500">{new Date(act.date).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'short' })}</p>
                            </div>
                            <button
                              onClick={() => setTechAssignmentModal({
                                activityId: act.id,
                                activityTitle: act.title,
                              })}
                              className="text-xs font-bold px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
                            >
                              + Agregar Técnico
                            </button>
                          </div>
                          
                          {act.technicians && act.technicians.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-slate-100 font-bold text-slate-500 bg-white">
                                    <th className="px-4 py-2">Nombre</th>
                                    <th className="px-4 py-2">Horario</th>
                                    <th className="px-4 py-2 text-right">Horas</th>
                                    <th className="px-4 py-2 text-right">Costo</th>
                                    <th className="px-4 py-2 text-center">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {act.technicians.map((t: any) => (
                                    <tr key={t.assignmentId} className="hover:bg-slate-50/50">
                                      <td className="px-4 py-2 font-medium text-slate-700">{t.name}</td>
                                      <td className="px-4 py-2 text-slate-600 font-mono">
                                        {t.timeIn || '--:--'} - {t.timeOut || '--:--'}
                                      </td>
                                      <td className="px-4 py-2 text-right">{Number(t.hours).toFixed(1)} h</td>
                                      <td className="px-4 py-2 text-right font-bold text-slate-800">${t.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                      <td className="px-4 py-2 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <button
                                            onClick={() => setTechAssignmentModal({
                                              activityId: act.id,
                                              activityTitle: act.title,
                                              assignmentId: t.assignmentId,
                                              initialTimeIn: t.timeIn,
                                              initialTimeOut: t.timeOut,
                                              initialTechnicianId: t.id,
                                              initialTechnicianName: t.name,
                                            })}
                                            className="text-indigo-600 hover:text-indigo-800"
                                            title="Editar Horario"
                                          >
                                            Editar
                                          </button>
                                          <button
                                            onClick={() => handleDeleteAssignment(act.id, t.assignmentId)}
                                            className="text-rose-600 hover:text-rose-800"
                                            title="Eliminar"
                                          >
                                            Borrar
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-4 py-6 text-center text-xs text-slate-400 italic">
                              No hay técnicos asignados a esta actividad.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No hay actividades en este folio.</p>
                  )}
                </div>`;
content = content.replace(manoDeObraRegex, newManoDeObra);

// 5. Replace the Modal rendering at the bottom
const modalRenderRegex = /\{manualOverrideModal && \([^]+?ManualTimeOverrideModal[^]+?\}\)}/s;
const newModalRender = `{techAssignmentModal && (
        <TechAssignmentModal
          activityId={techAssignmentModal.activityId}
          activityTitle={techAssignmentModal.activityTitle}
          assignmentId={techAssignmentModal.assignmentId}
          initialTimeIn={techAssignmentModal.initialTimeIn}
          initialTimeOut={techAssignmentModal.initialTimeOut}
          initialTechnicianId={techAssignmentModal.initialTechnicianId}
          initialTechnicianName={techAssignmentModal.initialTechnicianName}
          onClose={() => setTechAssignmentModal(null)}
          onSaved={() => {
            setTechAssignmentModal(null);
            fetchEconomicData();
          }}
        />
      )}`;
content = content.replace(modalRenderRegex, newModalRender);

// Oh wait, I also need to put the comparative cards into this section! The user wants the variance cards to be kept, probably at the top of the Perry Resources Detail. Let's do this manually after running the script if needed.

fs.writeFileSync('src/app/(dashboard)/analisis-economico/AnalisisEconomicoClient.tsx', content);
