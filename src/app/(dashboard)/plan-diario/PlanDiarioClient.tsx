'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Calendar,
  Building,
  Plus,
  FileSpreadsheet,
  Printer,
  AlertTriangle,
  Users,
  CheckCircle2,
  Trash2,
  Edit,
  UserCheck,
  Briefcase,
  X,
} from 'lucide-react';
import { exportDailyPlanPDFClient } from '@/lib/pdf/daily-plan-pdf-exporter';
import { useSession } from 'next-auth/react';

const COMPANIES = ['TODAS', 'GRUPO CASEME', 'DROBOTS', 'OPUS INGENIUM', 'VULCAN FORGE'];

interface Activity {
  id?: string;
  title: string;
  assignedPersonnel: string;
  dayOfWeek: string;
  startTime: string;
  clientName: string;
  supervisorOperativo: string;
  supervisorCotizador: string;
  supervisorTMMBC: string;
  safetyDedicado: string;
  cotizacionFolio: string;
  poNumber: string;
  isCrossSupport: boolean;
  crossSupportCompany: string;
  notes: string;
}

interface PersonnelStatus {
  id?: string;
  personName: string;
  statusType: string; // DESCANSO, VACACIONES, COMPRAS
  originCompany: string;
  notes: string;
}

interface Plan {
  id: string;
  planDate: string;
  companyName: string;
  status: string;
  activities?: Activity[];
  personnelStatus?: PersonnelStatus[];
}

interface Warning {
  personName: string;
  count: number;
  assignments: { companyName: string; activityTitle: string }[];
}

export function PlanDiarioClient() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const userRole = user?.role || 'INGENIERO';
  const userEmail = (user?.email || '').toLowerCase().trim();

  // Roles 1 a 3 pueden cargar/editar: ADMIN (Perfil 1), ADMINISTRACION (Perfil 2), SUPERVISOR (Perfil 3) o Directores
  const isDirector = ['lopezboyer@gmail.com', 'enrique.lopez.gsi@gmail.com', 'carlos.sevilla@grupocaseme.com', 'carlos.lopez@gsingenieria.mx'].some(
    (e) => userEmail && userEmail.includes(e.split('@')[0])
  );
  const canEdit = isDirector || ['ADMIN', 'ADMINISTRACION', 'SUPERVISOR'].includes(userRole);

  // Roles 1 y 2 pueden filtrar todas las empresas (Vista Consolidada): ADMIN, ADMINISTRACION o Directores
  const canFilterAllCompanies = isDirector || ['ADMIN', 'ADMINISTRACION'].includes(userRole);

  // Empresa base del usuario
  const userCompany = (user?.companyName || user?.baseCompany?.name || '').toUpperCase().trim();

  // Initial date defaults to 2026-08-27 (where initial seeded data lives) or today's date
  const [selectedDate, setSelectedDate] = useState('2026-08-27');
  const [selectedCompany, setSelectedCompany] = useState('TODAS');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);

  // Restricción automática por empresa si no es Admin/Administración
  useEffect(() => {
    if (!canFilterAllCompanies && userCompany) {
      const match = COMPANIES.find((c) => c !== 'TODAS' && (userCompany.includes(c) || c.includes(userCompany)));
      if (match) {
        setSelectedCompany(match);
      }
    }
  }, [canFilterAllCompanies, userCompany]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState('GRUPO CASEME');
  const [modalActivities, setModalActivities] = useState<Activity[]>([]);
  const [modalPersonnelStatus, setModalPersonnelStatus] = useState<PersonnelStatus[]>([]);

  // Fetch Plans from API
  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plan-diario?date=${selectedDate}&company=${encodeURIComponent(selectedCompany)}`);
      if (res.ok) {
        const data = await res.json();
        setPlans(Array.isArray(data.plans) ? data.plans : []);
        setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      }
    } catch (err) {
      console.error('Error cargando Plan Diario:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [selectedDate, selectedCompany]);

  // Open Modal for creating/editing plan for a company
  const handleOpenModal = (compName?: string) => {
    const targetComp = compName || (selectedCompany === 'TODAS' ? 'GRUPO CASEME' : selectedCompany);
    setEditingCompany(targetComp);

    // Find existing plan for company if present
    const existingPlan = (plans || []).find((p) => p && p.companyName && p.companyName.toUpperCase() === targetComp.toUpperCase());

    if (existingPlan && Array.isArray(existingPlan.activities) && existingPlan.activities.length > 0) {
      setModalActivities(existingPlan.activities.map((a) => ({ ...a })));
      setModalPersonnelStatus((existingPlan.personnelStatus || []).map((ps) => ({ ...ps })));
    } else {
      // Default initial row
      setModalActivities([
        {
          title: '',
          assignedPersonnel: '',
          dayOfWeek: 'JUEVES',
          startTime: '08:00 AM',
          clientName: '',
          supervisorOperativo: '',
          supervisorCotizador: '',
          supervisorTMMBC: '',
          safetyDedicado: '',
          cotizacionFolio: '',
          poNumber: '',
          isCrossSupport: false,
          crossSupportCompany: '',
          notes: '',
        },
      ]);
      setModalPersonnelStatus([]);
    }
    setModalOpen(true);
  };

  const handleAddActivityRow = () => {
    setModalActivities([
      ...modalActivities,
      {
        title: '',
        assignedPersonnel: '',
        dayOfWeek: 'JUEVES',
        startTime: '08:00 AM',
        clientName: '',
        supervisorOperativo: '',
        supervisorCotizador: '',
        supervisorTMMBC: '',
        safetyDedicado: '',
        cotizacionFolio: '',
        poNumber: '',
        isCrossSupport: false,
        crossSupportCompany: '',
        notes: '',
      },
    ]);
  };

  const handleAddPersonnelStatusRow = () => {
    setModalPersonnelStatus([
      ...modalPersonnelStatus,
      {
        personName: '',
        statusType: 'DESCANSO',
        originCompany: editingCompany,
        notes: '',
      },
    ]);
  };

  const handleSavePlan = async () => {
    try {
      const res = await fetch('/api/plan-diario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          companyName: editingCompany,
          activities: (modalActivities || []).filter((a) => a && a.title && a.title.trim().length > 0),
          personnelStatus: (modalPersonnelStatus || []).filter((ps) => ps && ps.personName && ps.personName.trim().length > 0),
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchPlans();
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'Error al guardar el Plan Diario');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión en el servidor');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('¿Estás seguro de eliminar este Plan Diario de la fecha seleccionada?')) return;
    try {
      const res = await fetch(`/api/plan-diario?planId=${planId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPlans();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportPDF = () => {
    exportDailyPlanPDFClient({
      dateStr: selectedDate,
      selectedCompany,
      plans: plans || [],
      warnings: warnings || [],
    });
  };

  const handleExportExcel = () => {
    window.open(`/api/plan-diario/export-excel?date=${selectedDate}&company=${encodeURIComponent(selectedCompany)}`, '_blank');
  };

  // Calculate Metrics safely
  const totalActivities = (plans || []).reduce((acc, p) => acc + (p?.activities?.length || 0), 0);
  const totalCrossSupport = (plans || []).reduce(
    (acc, p) =>
      acc +
      (p?.activities || []).filter((a) => a?.isCrossSupport || (a?.assignedPersonnel || '').toLowerCase().includes('global')).length,
    0
  );
  const totalRestPersonnel = (plans || []).reduce((acc, p) => acc + (p?.personnelStatus?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-1">
            <Calendar className="w-4 h-4" /> Control Operativo Lunes a Viernes
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            📅 Plan Diario de Trabajo
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Asignaciones regulares, descansos y trazabilidad de soportes cruzados inter-empresa • Perry Intelligence
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canEdit ? (
            <button
              onClick={() => handleOpenModal()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-900/30 flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> ➕ Cargar / Editar Plan
            </button>
          ) : (
            <div className="bg-slate-950 border border-slate-800 text-slate-400 text-xs font-bold py-2.5 px-3.5 rounded-xl flex items-center gap-2">
              <span>👁️ Vista de Lectura (Perfil Ingeniero)</span>
            </div>
          )}
          <button
            onClick={handleExportPDF}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-sky-400" /> 📄 Exportar PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" /> 📊 Exportar Excel
          </button>
        </div>
      </div>

      {/* Date & Company Selection Bar */}
      <div className="bg-slate-900/80 backdrop-blur p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Fecha del Plan:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-white font-bold text-sm px-4 py-2 rounded-xl focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
          />
        </div>

        {/* Company Filter Tabs (Restricted by Role & Company) */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {COMPANIES.filter((comp) => {
            if (canFilterAllCompanies) return true;
            if (comp === 'TODAS') return false;
            if (!userCompany) return true;
            return userCompany.includes(comp) || comp.includes(userCompany);
          }).map((comp) => (
            <button
              key={comp}
              onClick={() => setSelectedCompany(comp)}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                selectedCompany === comp
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {comp === 'TODAS' ? '🌐 TODAS (CONSOLIDADO)' : comp}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Actividades Totales</span>
            <span className="text-2xl font-black text-white">{totalActivities} Programadas</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">Soportes Cruzados</span>
            <span className="text-2xl font-black text-sky-300">{totalCrossSupport} Inter-Empresa</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className={`bg-slate-900 p-5 rounded-2xl border ${(warnings || []).length > 0 ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-800'} flex items-center justify-between shadow-md`}>
          <div>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Sobre-Asignación</span>
            <span className="text-2xl font-black text-amber-300">{(warnings || []).length} Alertas Preventivas</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Descansos / Vacaciones</span>
            <span className="text-2xl font-black text-emerald-300">{totalRestPersonnel} Colaboradores</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Technician Overlap Warning Banner */}
      {(warnings || []).length > 0 && (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm uppercase tracking-wide">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ⚠️ AVISO PREVENTIVO: PERSONAL CON DOBLE O MÚLTIPLE ASIGNACIÓN EN EL DÍA
          </div>
          <p className="text-slate-300 text-xs">
            Los siguientes ingenieros/técnicos están asignados a 2 o más actividades en el Plan Diario de la fecha seleccionada.
            <span className="text-amber-300 font-bold block mt-0.5">Nota: Este aviso es informativo y no limita su registro.</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {warnings.map((w, idx) => (
              <div key={idx} className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200">
                <span className="font-extrabold text-white text-sm block mb-1">👤 {w.personName} ({w.count} Asignaciones)</span>
                <ul className="space-y-1 text-[11px] text-slate-300 pl-2">
                  {(w.assignments || []).map((a, i) => (
                    <li key={i} className="list-disc">
                      <strong className="text-amber-300">{a.companyName}:</strong> {a.activityTitle}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plans List */}
      {loading ? (
        <div className="bg-slate-900 p-12 rounded-3xl border border-slate-800 text-center">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-3"></div>
          <p className="text-slate-400 text-sm font-bold">Cargando Plan Diario...</p>
        </div>
      ) : (plans || []).length === 0 ? (
        <div className="bg-slate-900 p-12 rounded-3xl border border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No hay plan diario registrado para esta fecha</h3>
            <p className="text-slate-400 text-xs mt-1">
              {canEdit
                ? 'Haz clic en "Cargar Nuevo Plan" para registrar las actividades y personal.'
                : 'No se encontraron actividades registradas para esta empresa y fecha.'}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => handleOpenModal()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Cargar Nuevo Plan
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {(plans || []).map((plan) => {
            const activities = plan.activities || [];
            const personnelStatus = plan.personnelStatus || [];

            return (
              <div key={plan.id} className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                {/* Card Header */}
                <div className="bg-slate-950 p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-black text-white tracking-tight">{plan.companyName ? plan.companyName.toUpperCase() : ''}</h2>
                      <span className="text-slate-400 text-xs font-semibold">
                        Plan Diario • {activities.length} Actividades Programadas
                      </span>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(plan.companyName)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2 px-3 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
                      >
                        <Edit className="w-3.5 h-3.5 text-indigo-400" /> Editar Plan
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-xs py-2 px-3 rounded-xl border border-rose-800/40 flex items-center gap-1.5 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                    </div>
                  )}
                </div>

                {/* Activity Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="bg-slate-950/60 text-slate-400 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4 min-w-[240px]">Actividad / Trabajo</th>
                        <th className="py-3 px-4 min-w-[200px]">Personas Asignadas</th>
                        <th className="py-3 px-4 min-w-[100px]">Horario</th>
                        <th className="py-3 px-4 min-w-[130px]">Cliente</th>
                        <th className="py-3 px-4 min-w-[180px]">Supervisión & Safety</th>
                        <th className="py-3 px-4 min-w-[140px]">Cotización / P.O.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {activities.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-500">
                            Sin actividades agregadas
                          </td>
                        </tr>
                      ) : (
                        activities.map((act, idx) => {
                          const isCross = act.isCrossSupport || (act.assignedPersonnel || '').toLowerCase().includes('global');
                          return (
                            <tr key={act.id || idx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 px-4 font-black text-slate-400 text-center">{idx + 1}</td>
                              <td className="py-3.5 px-4">
                                <span className="font-extrabold text-white text-sm block leading-snug">{act.title}</span>
                                {isCross && (
                                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-extrabold">
                                    🤝 SOPORTE CRUZADO INTER-EMPRESA
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-300">
                                <div className="whitespace-pre-line leading-relaxed">{act.assignedPersonnel || '-'}</div>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-300">
                                <div>{act.dayOfWeek || 'JUEVES'}</div>
                                <div className="text-slate-400 text-[11px]">{act.startTime || '08:00 AM'}</div>
                              </td>
                              <td className="py-3.5 px-4 font-extrabold text-indigo-300">
                                {act.clientName || 'OFICINA / TRAILA'}
                              </td>
                              <td className="py-3.5 px-4 text-[11px] space-y-0.5">
                                {act.supervisorOperativo && (
                                  <div>
                                    <span className="text-slate-400">Op:</span> <strong className="text-white">{act.supervisorOperativo}</strong>
                                  </div>
                                )}
                                {act.supervisorCotizador && (
                                  <div>
                                    <span className="text-slate-400">Cotiz:</span> <span className="text-slate-300">{act.supervisorCotizador}</span>
                                  </div>
                                )}
                                {act.supervisorTMMBC && (
                                  <div>
                                    <span className="text-slate-400">TMMBC:</span> <span className="text-amber-300 font-bold">{act.supervisorTMMBC}</span>
                                  </div>
                                )}
                                {act.safetyDedicado && (
                                  <div>
                                    <span className="text-slate-400">Safety:</span> <span className="text-emerald-400 font-bold">{act.safetyDedicado}</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px]">
                                {act.cotizacionFolio && (
                                  <div className="text-sky-400 font-bold">Cot: {act.cotizacionFolio}</div>
                                )}
                                {act.poNumber && (
                                  <div className="text-slate-400">PO: {act.poNumber}</div>
                                )}
                                {!act.cotizacionFolio && !act.poNumber && <span className="text-slate-600">-</span>}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Personnel Status Footer (Descansos / Vacaciones / Compras) */}
                {personnelStatus.length > 0 && (
                  <div className="bg-slate-950/80 p-4 border-t border-slate-800">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                      Estatus Especial de Personal (Descansos / Vacaciones / Logística):
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {personnelStatus.map((ps, idx) => {
                        const st = (ps.statusType || 'DESCANSO').toUpperCase();
                        const isVac = st.includes('VACACION');
                        const isComp = st.includes('COMPRA');
                        return (
                          <div
                            key={idx}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 ${
                              isVac
                                ? 'bg-rose-950/40 text-rose-300 border-rose-800/50'
                                : isComp
                                ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/50'
                                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                            }`}
                          >
                            <span className="opacity-70">{st}:</span>
                            <span>{ps.personName}</span>
                            {ps.notes && <span className="opacity-80 font-normal">({ps.notes})</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Load / Edit Plan Modal */}
      {modalOpen && canEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-8">
            <div className="bg-slate-950 p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white">Cargar / Editar Plan Diario</h3>
                <p className="text-slate-400 text-xs">
                  Empresa: <strong className="text-indigo-400">{editingCompany}</strong> • Fecha: <strong className="text-white">{selectedDate}</strong>
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-xl">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Select Editing Company */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Empresa del Plan:</label>
                <select
                  value={editingCompany}
                  onChange={(e) => setEditingCompany(e.target.value)}
                  disabled={!canFilterAllCompanies}
                  className="bg-slate-950 border border-slate-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl w-full max-w-xs focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                >
                  {COMPANIES.filter((c) => {
                    if (canFilterAllCompanies) return c !== 'TODAS';
                    if (!userCompany) return c !== 'TODAS';
                    return userCompany.includes(c) || c.includes(userCompany);
                  }).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activities Editor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Actividades Programadas</h4>
                  <button
                    onClick={handleAddActivityRow}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Actividad
                  </button>
                </div>

                {modalActivities.map((act, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 relative">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <span className="font-black text-xs text-indigo-400">Actividad #${idx + 1}</span>
                      <button
                        onClick={() => setModalActivities(modalActivities.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Quitar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Título de Actividad / Trabajo:</label>
                        <input
                          type="text"
                          placeholder="ej. REPARACIÓN CON SOLDADURA EN ANDÉN AD13"
                          value={act.title}
                          onChange={(e) => {
                            const copy = [...modalActivities];
                            copy[idx].title = e.target.value;
                            setModalActivities(copy);
                          }}
                          className="bg-slate-900 border border-slate-800 text-white text-xs font-bold p-2.5 rounded-xl w-full focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Cliente / Planta:</label>
                        <input
                          type="text"
                          placeholder="ej. INFINEON, TMMBC, FACILITIES"
                          value={act.clientName}
                          onChange={(e) => {
                            const copy = [...modalActivities];
                            copy[idx].clientName = e.target.value;
                            setModalActivities(copy);
                          }}
                          className="bg-slate-900 border border-slate-800 text-white text-xs font-bold p-2.5 rounded-xl w-full focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">
                          Personas Asignadas (Personal + Empresa si es Soporte Cruzado):
                        </label>
                        <textarea
                          rows={2}
                          placeholder="ej. Drobots (Jose Centeno, Luis Centeno) | Global Support (Mauricio Velasquez)"
                          value={act.assignedPersonnel}
                          onChange={(e) => {
                            const copy = [...modalActivities];
                            copy[idx].assignedPersonnel = e.target.value;
                            // Auto-detect cross support
                            if (e.target.value.toLowerCase().includes('global') || e.target.value.toLowerCase().includes('soporte')) {
                              copy[idx].isCrossSupport = true;
                              copy[idx].crossSupportCompany = 'GLOBAL SUPPORT';
                            }
                            setModalActivities(copy);
                          }}
                          className="bg-slate-900 border border-slate-800 text-white text-xs p-2.5 rounded-xl w-full focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Horario & Día:</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="08:00 AM"
                            value={act.startTime}
                            onChange={(e) => {
                              const copy = [...modalActivities];
                              copy[idx].startTime = e.target.value;
                              setModalActivities(copy);
                            }}
                            className="bg-slate-900 border border-slate-800 text-white text-xs p-2.5 rounded-xl w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Supervisor Operativo:</label>
                        <input
                          type="text"
                          placeholder="ej. Jordan Zellhubert"
                          value={act.supervisorOperativo}
                          onChange={(e) => {
                            const copy = [...modalActivities];
                            copy[idx].supervisorOperativo = e.target.value;
                            setModalActivities(copy);
                          }}
                          className="bg-slate-900 border border-slate-800 text-white text-xs p-2.5 rounded-xl w-full"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Supervisor Cotizador / TMMBC:</label>
                        <input
                          type="text"
                          placeholder="ej. Javier Oropeza"
                          value={act.supervisorCotizador}
                          onChange={(e) => {
                            const copy = [...modalActivities];
                            copy[idx].supervisorCotizador = e.target.value;
                            setModalActivities(copy);
                          }}
                          className="bg-slate-900 border border-slate-800 text-white text-xs p-2.5 rounded-xl w-full"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Cotización / PO (Odoo):</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Cot. S02389"
                            value={act.cotizacionFolio}
                            onChange={(e) => {
                              const copy = [...modalActivities];
                              copy[idx].cotizacionFolio = e.target.value;
                              setModalActivities(copy);
                            }}
                            className="bg-slate-900 border border-slate-800 text-sky-300 font-mono text-xs p-2.5 rounded-xl w-full"
                          />
                          <input
                            type="text"
                            placeholder="PO 45204634"
                            value={act.poNumber}
                            onChange={(e) => {
                              const copy = [...modalActivities];
                              copy[idx].poNumber = e.target.value;
                              setModalActivities(copy);
                            }}
                            className="bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs p-2.5 rounded-xl w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Personnel Status Editor (Descansos / Vacaciones) */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Estatus Especial de Personal (Descansos / Vacaciones / Compras)
                  </h4>
                  <button
                    onClick={handleAddPersonnelStatusRow}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Estatus
                  </button>
                </div>

                {modalPersonnelStatus.map((ps, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3">
                    <select
                      value={ps.statusType}
                      onChange={(e) => {
                        const copy = [...modalPersonnelStatus];
                        copy[idx].statusType = e.target.value;
                        setModalPersonnelStatus(copy);
                      }}
                      className="bg-slate-900 border border-slate-800 text-white text-xs font-bold p-2 rounded-lg"
                    >
                      <option value="DESCANSO">DESCANSO</option>
                      <option value="VACACIONES">VACACIONES</option>
                      <option value="COMPRAS">COMPRAS / LOGÍSTICA</option>
                      <option value="TRAILA_PERRY">OFICINA / TRAILA</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Nombre del Colaborador (ej. Victor Piña)"
                      value={ps.personName}
                      onChange={(e) => {
                        const copy = [...modalPersonnelStatus];
                        copy[idx].personName = e.target.value;
                        setModalPersonnelStatus(copy);
                      }}
                      className="bg-slate-900 border border-slate-800 text-white text-xs font-bold p-2 rounded-lg flex-1 min-w-[200px]"
                    />

                    <button
                      onClick={() => setModalPersonnelStatus(modalPersonnelStatus.filter((_, i) => i !== idx))}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 p-6 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 px-5 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePlan}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-900/40 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Guardar Plan Diario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
