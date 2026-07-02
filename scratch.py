import re

with open('src/app/(dashboard)/analisis-economico/AnalisisEconomicoClient.tsx', 'r') as f:
    content = f.read()

# 1. Remove Horas Hombre Detailed Table (lines 477 to 611 approximately)
# We find: `{/* Horas Hombre Detailed Table */}` up to `})()}`
pattern1 = r'\{\/\* Horas Hombre Detailed Table \*\/}.*?\}\)\(\)\}'
content = re.sub(pattern1, '', content, flags=re.DOTALL)

# 2. Replace Perry Resources Detail -> `showPerryDetail && (` up to `Seguridad e Higiene / Supervisores`
pattern2 = r'\{showPerryDetail && \(\s*<div className="p-5 space-y-6">\s*\{\/\* Técnicos \*\/}.*?(?=\{\/\* Seguridad \*\/})'

replacement2 = """{showPerryDetail && (() => {
              const projectedCost = economicData.perryResources?.summary?.projectedLaborCost || 0;
              const realCost = economicData.perryResources?.summary?.laborCost || 0;
              const variance = projectedCost - realCost;
              const isNegative = variance < 0;
              
              return (
              <div className="p-5 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-slate-800">Costo de Mano de Obra</h4>
                    <p className="text-xs text-slate-500">Comparativa de nómina real (Perry) vs presupuestada (Odoo).</p>
                    <div className="mt-2">
                      {isNegative ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300">
                          Excedido por ${abs(variance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                          Ahorro de ${variance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cotizadas (Odoo)</span>
                      <p className="text-lg font-bold text-slate-700">${projectedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right border-l border-slate-200 pl-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reales (Perry)</span>
                      <p className={`text-lg font-bold ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ${realCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Técnicos */}
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
                                    <th className="px-4 py-2 text-right">Tarifa</th>
                                    <th className="px-4 py-2 text-right">Costo</th>
                                    <th className="px-4 py-2 text-center">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {act.technicians.map((t: any) => (
                                    <tr key={t.assignmentId} className="hover:bg-slate-50/50">
                                      <td className="px-4 py-2 font-medium text-slate-700">{t.name} <span className="text-[10px] text-slate-400 font-normal ml-1">({t.contractor})</span></td>
                                      <td className="px-4 py-2 text-slate-600 font-mono">
                                        {t.timeIn || '--:--'} - {t.timeOut || '--:--'}
                                      </td>
                                      <td className="px-4 py-2 text-right">{Number(t.hours).toFixed(1)} h</td>
                                      <td className="px-4 py-2 text-right">${t.rate.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
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
                                            className="text-indigo-600 hover:text-indigo-800 font-medium"
                                          >
                                            Editar
                                          </button>
                                          <button
                                            onClick={() => handleDeleteAssignment(act.id, t.assignmentId)}
                                            className="text-rose-600 hover:text-rose-800 font-medium"
                                          >
                                            Eliminar
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
                </div>
                """
content = re.sub(pattern2, replacement2, content, flags=re.DOTALL)

# 3. Add closing `})()}` to Perry Resources Detail, where it ends before Odoo Detail Breakdown
# We search for `</div>\n            )}` in that section and replace with `</div>\n              );\n            })()}`
# Let's do a more robust approach:
# The section starts with `{showPerryDetail && (() => {`
# We need to close it. The original had `{showPerryDetail && (` ... `</div>\n            )}`
pattern3 = r'<\/div>\n\s+<\/div>\n\s+\)\}'
content = re.sub(pattern3, r'</div>\n                </div>\n              );\n            })()}', content, count=1, flags=re.DOTALL)


# 4. Replace ManualTimeOverrideModal with TechAssignmentModal at the bottom
pattern4 = r'\{manualOverrideModal && \(\s*<ManualTimeOverrideModal.*?/>\s*\)\}'
replacement4 = """{techAssignmentModal && (
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
            loadEconomicData(null, economicSearchFolio);
          }}
        />
      )}"""
content = re.sub(pattern4, replacement4, content, flags=re.DOTALL)

with open('src/app/(dashboard)/analisis-economico/AnalisisEconomicoClient.tsx', 'w') as f:
    f.write(content)

