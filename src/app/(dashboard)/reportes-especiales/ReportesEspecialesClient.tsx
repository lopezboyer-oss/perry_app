'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  PieChart as PieIcon,
  BarChart3,
  Download,
  DollarSign,
  TrendingUp,
  Award,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronDown,
  FileText,
  ChevronUp,
  TrendingDown,
  Users
} from 'lucide-react';
import { activityTypeLabels, getLocalToday } from '@/lib/utils';
import { canViewEconomicAnalysis } from '@/lib/permissions';
import * as XLSX from 'xlsx';

// Tipos de datos
interface CompanyInfo {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

interface ActivityItem {
  id: string;
  title: string;
  date: string;
  status: string;
  type: string;
  durationMinutes: number | null;
  startTime: string | null;
  endTime: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  workOrderFolio: string | null;
  company: {
    id: string;
    name: string;
    shortName: string | null;
    color: string | null;
  } | null;
  client: {
    id: string;
    name: string;
  } | null;
}

interface ClientProps {
  companies: CompanyInfo[];
  currentUserEmail: string;
}

export function ReportesEspecialesClient({ companies, currentUserEmail }: ClientProps) {
  // Rango de fechas por defecto: primer día del mes actual hasta hoy
  const todayStr = getLocalToday();
  const firstDayOfMonthStr = todayStr.substring(0, 8) + '01';

  const [startDate, setStartDate] = useState(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Costos por hora de Carlos López (con persistencia en localStorage)
  const [rateWeekday, setRateWeekday] = useState(250);
  const [rateWeekend, setRateWeekend] = useState(350);

  // Estados de datos
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [carlosUser, setCarlosUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Control de vista activa y modal de detalle
  const [activeTab, setActiveTab] = useState<'schedule' | 'charts' | 'table' | 'economico'>('schedule');
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  // Estados para Análisis Económico (Odoo vs Perry)
  const [economicData, setEconomicData] = useState<any>(null);
  const [economicLoading, setEconomicLoading] = useState(false);
  const [economicError, setEconomicError] = useState<string | null>(null);
  const [economicSearchFolio, setEconomicSearchFolio] = useState('');
  const [showOdooDetail, setShowOdooDetail] = useState(true);
  const [showPerryDetail, setShowPerryDetail] = useState(true);

  const loadEconomicData = async (targetId: string | null, targetFolio: string | null) => {
    setEconomicLoading(true);
    setEconomicError(null);
    try {
      const param = targetId 
        ? `activityId=${encodeURIComponent(targetId)}` 
        : `folio=${encodeURIComponent(targetFolio || '')}`;
      const res = await fetch(`/api/odoo/trabajos-abiertos/breakdown?${param}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar el análisis económico');
      setEconomicData(data);
      if (data.folio) {
        setEconomicSearchFolio(data.folio);
      }
    } catch (err: any) {
      setEconomicError(err.message || 'Error de conexión');
      setEconomicData(null);
    } finally {
      setEconomicLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const actParam = params.get('activityId');
      const folioParam = params.get('folio');
      
      if (tabParam === 'economico') {
        setActiveTab('economico');
        if (actParam) {
          loadEconomicData(actParam, null);
        } else if (folioParam) {
          loadEconomicData(null, folioParam);
        }
      }
    }
  }, []);

  // Cargar tarifas del localStorage
  useEffect(() => {
    const savedW = localStorage.getItem('carlos_rate_weekday');
    const savedE = localStorage.getItem('carlos_rate_weekend');
    if (savedW) setRateWeekday(Number(savedW));
    if (savedE) setRateWeekend(Number(savedE));
  }, []);

  // Consultar actividades
  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reportes-especiales/carlos?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al obtener datos');
      }
      const data = await res.json();
      setActivities(data.activities);
      setCarlosUser(data.carlos);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al consultar las actividades');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al cambiar el rango de fechas
  useEffect(() => {
    fetchActivities();
  }, [startDate, endDate]);

  // Actualizar tarifas y guardar en localStorage
  const handleRateWeekdayChange = (val: number) => {
    setRateWeekday(val);
    localStorage.setItem('carlos_rate_weekday', val.toString());
  };

  const handleRateWeekendChange = (val: number) => {
    setRateWeekend(val);
    localStorage.setItem('carlos_rate_weekend', val.toString());
  };

  // Ajustes de atajos de fecha rápidos
  const setQuickRange = (rangeType: 'this-week' | 'last-week' | 'this-month' | 'last-month') => {
    const today = new Date(todayStr + 'T12:00:00');
    let start = new Date(today);
    let end = new Date(today);

    if (rangeType === 'this-week') {
      const dow = today.getDay(); // 0 Dom, 1 Lun, etc.
      const diffToMon = dow === 0 ? -6 : 1 - dow;
      start.setDate(today.getDate() + diffToMon);
      end.setDate(start.getDate() + 6);
    } else if (rangeType === 'last-week') {
      const dow = today.getDay();
      const diffToMon = (dow === 0 ? -6 : 1 - dow) - 7;
      start.setDate(today.getDate() + diffToMon);
      end.setDate(start.getDate() + 6);
    } else if (rangeType === 'this-month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 12, 0, 0);
    } else if (rangeType === 'last-month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12, 0, 0);
      end = new Date(today.getFullYear(), today.getMonth(), 0, 12, 0, 0);
    }

    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    setStartDate(fmt(start));
    setEndDate(fmt(end));
  };

  // Obtener día de la semana según Tijuana (0=Dom, 6=Sáb)
  const getLocalDayOfWeek = (dateStr: string): number => {
    const d = new Date(dateStr);
    const dayStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Tijuana',
      weekday: 'short',
    }).format(d);
    const map: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    return map[dayStr] ?? d.getDay();
  };

  // Obtener el lunes de la semana correspondiente a una fecha
  const getMondayOfWeek = (dateStr: string): string => {
    const d = new Date(dateStr);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Tijuana',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(d);
    const m = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const y = parts.find(p => p.type === 'year')?.value;
    
    const localDate = new Date(`${y}-${m}-${day}T12:00:00`);
    const dayOfWeek = localDate.getDay();
    const diff = localDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(localDate);
    monday.setDate(diff);
    return monday.toISOString().split('T')[0];
  };

  // Mapeo local de Tijuana YYYY-MM-DD para agrupar
  const getTijuanaLocalDateStr = (dateStr: string): string => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Tijuana',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  };

  // Procesamiento y cálculo de actividades
  const processedActivities = useMemo(() => {
    return activities.map(a => {
      const dow = getLocalDayOfWeek(a.date);
      const isWeekend = dow === 0 || dow === 6;
      const hours = (a.durationMinutes || 0) / 60;
      const rate = isWeekend ? rateWeekend : rateWeekday;
      const cost = hours * rate;
      const localDateStr = getTijuanaLocalDateStr(a.date);
      const weekMonday = getMondayOfWeek(a.date);

      return {
        ...a,
        localDateStr,
        weekMonday,
        isWeekend,
        hours,
        rate,
        cost,
        dow,
      };
    });
  }, [activities, rateWeekday, rateWeekend]);

  // Lista de semanas únicas para el selector de horario
  const uniqueWeeks = useMemo(() => {
    const w = Array.from(new Set(processedActivities.map(a => a.weekMonday)));
    w.sort((a, b) => b.localeCompare(a));
    return w;
  }, [processedActivities]);

  // Semana activa del horario (default: la primera disponible, o la actual)
  const [activeWeek, setActiveWeek] = useState<string>('');

  useEffect(() => {
    if (uniqueWeeks.length > 0) {
      if (!activeWeek || !uniqueWeeks.includes(activeWeek)) {
        setActiveWeek(uniqueWeeks[0]);
      }
    } else {
      setActiveWeek('');
    }
  }, [uniqueWeeks, activeWeek]);

  // Resumen agrupado por empresa
  const companySummary = useMemo(() => {
    const summaryMap: Record<string, {
      id: string;
      name: string;
      shortName: string;
      color: string;
      weekdayHours: number;
      weekendHours: number;
      weekdayCost: number;
      weekendCost: number;
      totalHours: number;
      totalCost: number;
    }> = {};

    // Inicializar empresas del grupo
    companies.forEach(co => {
      summaryMap[co.id] = {
        id: co.id,
        name: co.name,
        shortName: co.shortName,
        color: co.color,
        weekdayHours: 0,
        weekendHours: 0,
        weekdayCost: 0,
        weekendCost: 0,
        totalHours: 0,
        totalCost: 0,
      };
    });

    // Empresa fallback (si no está asociada)
    const fallbackId = 'sin-empresa';
    summaryMap[fallbackId] = {
      id: fallbackId,
      name: 'Sin Empresa Asignada',
      shortName: 'S/E',
      color: '#64748b', // Slate
      weekdayHours: 0,
      weekendHours: 0,
      weekdayCost: 0,
      weekendCost: 0,
      totalHours: 0,
      totalCost: 0,
    };

    // Acumular
    processedActivities.forEach(a => {
      const coId = a.company?.id || fallbackId;
      const target = summaryMap[coId] || summaryMap[fallbackId];

      if (a.isWeekend) {
        target.weekendHours += a.hours;
        target.weekendCost += a.cost;
      } else {
        target.weekdayHours += a.hours;
        target.weekdayCost += a.cost;
      }
      target.totalHours += a.hours;
      target.totalCost += a.cost;
    });

    // Retornar lista filtrando las que tengan 0 horas (excepto si están en DB, aunque es mejor filtrar las de 0 horas de consorcio para limpieza)
    return Object.values(summaryMap).filter(item => item.totalHours > 0 || item.id !== fallbackId);
  }, [processedActivities, companies]);

  // KPIs
  const kpis = useMemo(() => {
    let totalHours = 0;
    let weekdayHours = 0;
    let weekendHours = 0;
    let totalCost = 0;

    processedActivities.forEach(a => {
      totalHours += a.hours;
      if (a.isWeekend) {
        weekendHours += a.hours;
      } else {
        weekdayHours += a.hours;
      }
      totalCost += a.cost;
    });

    // Empresa donde más invierte tiempo
    let topCompany = 'Ninguna';
    let topCompanyHours = 0;
    companySummary.forEach(c => {
      if (c.totalHours > topCompanyHours) {
        topCompanyHours = c.totalHours;
        topCompany = c.name;
      }
    });
    const topCompanyPercent = totalHours > 0 ? Math.round((topCompanyHours / totalHours) * 100) : 0;

    // Tipo de actividad más frecuente
    const typeCount: Record<string, number> = {};
    processedActivities.forEach(a => {
      typeCount[a.type] = (typeCount[a.type] || 0) + 1;
    });
    let topType = 'Ninguna';
    let topTypeVal = 0;
    Object.entries(typeCount).forEach(([type, count]) => {
      if (count > topTypeVal) {
        topTypeVal = count;
        topType = activityTypeLabels[type] || type;
      }
    });
    const topTypePercent = processedActivities.length > 0 ? Math.round((topTypeVal / processedActivities.length) * 100) : 0;

    // Actividad en la que más ha trabajado
    let topActivityTitle = 'Ninguna';
    let topActivityHours = 0;
    processedActivities.forEach(a => {
      if (a.hours > topActivityHours) {
        topActivityHours = a.hours;
        topActivityTitle = a.title;
      }
    });

    return {
      totalHours,
      weekdayHours,
      weekendHours,
      totalCost,
      topCompany: topCompanyHours > 0 ? `${topCompany} (${topCompanyPercent}%)` : 'Ninguna',
      topType: topTypeVal > 0 ? `${topType} (${topTypePercent}%)` : 'Ninguna',
      topActivity: topActivityHours > 0 ? `${topActivityTitle.substring(0, 35)}${topActivityTitle.length > 35 ? '...' : ''} (${topActivityHours} hrs)` : 'Ninguna',
    };
  }, [processedActivities, companySummary]);

  // Actividades filtradas para la semana seleccionada
  const weekDaysData = useMemo(() => {
    if (!activeWeek) return [];
    
    // Generar los 7 días de la semana seleccionada (Lunes a Domingo)
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const [y, m, d] = activeWeek.split('-').map(Number);
    const monday = new Date(y, m - 1, d, 12, 0, 0);

    const weekActivities = processedActivities.filter(a => a.weekMonday === activeWeek);

    return dayNames.map((name, index) => {
      const current = new Date(monday);
      current.setDate(monday.getDate() + index);
      const dateStr = current.toISOString().split('T')[0];
      const label = current.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

      // Filtrar actividades para este día específico
      const dayActs = weekActivities.filter(a => a.localDateStr === dateStr);

      return {
        dayName: name,
        dateStr,
        label,
        activities: dayActs,
      };
    });
  }, [activeWeek, processedActivities]);

  // Datos para los gráficos
  const chartData = useMemo(() => {
    // 1. Horas por Empresa (BarChart)
    const byCompany = companySummary
      .filter(c => c.totalHours > 0)
      .map(c => ({
        name: c.shortName,
        fullName: c.name,
        horas: Math.round(c.totalHours * 10) / 10,
        color: c.color,
      }));

    // 2. Gráfico por semana y día para la semana activa
    const scheduleChart = weekDaysData.map(wd => {
      const dataPoint: any = { name: wd.dayName.substring(0, 3) };
      // Agregar horas por empresa para este día
      companies.forEach(co => {
        const sum = wd.activities
          .filter(a => a.company?.id === co.id)
          .reduce((acc, curr) => acc + curr.hours, 0);
        dataPoint[co.shortName] = Math.round(sum * 10) / 10;
      });

      // Suma sin empresa
      const sumNoCo = wd.activities
        .filter(a => !a.company)
        .reduce((acc, curr) => acc + curr.hours, 0);
      dataPoint['S/E'] = Math.round(sumNoCo * 10) / 10;

      return dataPoint;
    });

    return {
      byCompany,
      scheduleChart,
    };
  }, [companySummary, weekDaysData, companies]);

  // Helper to calculate weekly grid and chart for any given week (used for multi-week print)
  const getWeekDaysDataForWeek = (weekMonday: string) => {
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const [y, m, d] = weekMonday.split('-').map(Number);
    const monday = new Date(y, m - 1, d, 12, 0, 0);

    const weekActivities = processedActivities.filter(a => a.weekMonday === weekMonday);

    return dayNames.map((name, index) => {
      const current = new Date(monday);
      current.setDate(monday.getDate() + index);
      const dateStr = current.toISOString().split('T')[0];
      const label = current.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      const dayActs = weekActivities.filter(a => a.localDateStr === dateStr);

      return {
        dayName: name,
        dateStr,
        label,
        activities: dayActs,
      };
    });
  };

  const getScheduleChartDataForWeek = (weekDays: ReturnType<typeof getWeekDaysDataForWeek>) => {
    return weekDays.map(wd => {
      const dataPoint: any = { name: wd.dayName.substring(0, 3) };
      companies.forEach(co => {
        const sum = wd.activities
          .filter(a => a.company?.id === co.id)
          .reduce((acc, curr) => acc + curr.hours, 0);
        dataPoint[co.shortName] = Math.round(sum * 10) / 10;
      });

      const sumNoCo = wd.activities
        .filter(a => !a.company)
        .reduce((acc, curr) => acc + curr.hours, 0);
      dataPoint['S/E'] = Math.round(sumNoCo * 10) / 10;

      return dataPoint;
    });
  };

  // Exportar reporte a Excel
  const handleExportExcel = () => {
    if (processedActivities.length === 0) return;

    const wb = XLSX.utils.book_new();

    // --- Pestaña 1: Resumen General ---
    const summaryRows: any[][] = [
      ['PERRY APP - REPORTES ESPECIALES'],
      ['REPORTE DE HORAS Y PRECALCULO DE COSTOS'],
      [],
      ['Colaborador:', carlosUser?.name || 'Carlos López'],
      ['Correo:', carlosUser?.email || 'carlos.lopez@gsingenieria.mx'],
      ['Período:', `${startDate} al ${endDate}`],
      ['Generado el:', new Date().toLocaleDateString('es-MX', { hour12: false })],
      [],
      ['TARIFAS ESTABLECIDAS'],
      ['Tarifa Lunes a Viernes (MXN):', `$${rateWeekday}.00 / hora`],
      ['Tarifa Sábado y Domingo (MXN):', `$${rateWeekend}.00 / hora`],
      [],
      [
        'Empresa',
        'Horas Entre Semana (Lun-Vie)',
        'Subtotal Entre Semana (MXN)',
        'Horas Fin de Semana (Sáb-Dom)',
        'Subtotal Fin de Semana (MXN)',
        'Total Horas',
        'Total a Pagar (MXN)'
      ]
    ];

    let totalWdHrs = 0;
    let totalWdVal = 0;
    let totalWeHrs = 0;
    let totalWeVal = 0;
    let grandHrs = 0;
    let grandVal = 0;

    companySummary.forEach(c => {
      summaryRows.push([
        c.name,
        c.weekdayHours,
        c.weekdayCost,
        c.weekendHours,
        c.weekendCost,
        c.totalHours,
        c.totalCost
      ]);
      totalWdHrs += c.weekdayHours;
      totalWdVal += c.weekdayCost;
      totalWeHrs += c.weekendHours;
      totalWeVal += c.weekendCost;
      grandHrs += c.totalHours;
      grandVal += c.totalCost;
    });

    summaryRows.push([
      'TOTAL GENERAL',
      totalWdHrs,
      totalWdVal,
      totalWeHrs,
      totalWeVal,
      grandHrs,
      grandVal
    ]);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen General");

    // --- Pestaña 2: Detalle de Actividades ---
    const detailRows: any[][] = [
      ['DETALLE DE ACTIVIDADES - CARLOS LÓPEZ'],
      ['Período del:', `${startDate} al ${endDate}`],
      [],
      [
        'Fecha',
        'Día',
        'Empresa',
        'Cliente',
        'Actividad / Tarea',
        'Tipo Actividad',
        'Estatus',
        'Horario',
        'Horas Invertidas',
        'Tipo de Tarifa',
        'Tarifa Aplicada (MXN)',
        'Subtotal (MXN)'
      ]
    ];

    processedActivities.forEach(a => {
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dowName = days[a.dow];
      const timeRange = a.startTime && a.endTime ? `${a.startTime} - ${a.endTime}` : '—';
      const typeLabel = activityTypeLabels[a.type] || a.type;

      detailRows.push([
        a.localDateStr,
        dowName,
        a.company?.name || 'Sin Empresa',
        a.client?.name || '—',
        a.title,
        typeLabel,
        a.status,
        timeRange,
        a.hours,
        a.isWeekend ? 'Fin de Semana' : 'Entre Semana',
        a.rate,
        a.cost
      ]);
    });

    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, wsDetail, "Detalle de Actividades");

    // Descargar archivo
    XLSX.writeFile(wb, `Reporte_Especial_Carlos_Lopez_${startDate}_al_${endDate}.xlsx`);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Reset root layout scroll and height blocks for printing */
          html, body, #__next, main, div.flex.h-screen, div.flex-1.flex.flex-col {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
          }
          
          /* Hide main app container components not needed for print */
          .sidebar-desktop,
          aside,
          header,
          .print\\:hidden {
            display: none !important;
          }
          
          /* Set standard margins */
          @page {
            size: letter;
            margin: 1.5cm;
          }
          
          body {
            background: white !important;
            color: #1e293b !important;
          }
          
          /* Page break controls */
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          .print-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }
          
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
      <div className="space-y-6 pb-20 md:pb-0 print:hidden">
      {/* Cabecera de Página */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
            <PieIcon className="w-8 h-8 text-indigo-600" />
            Reportes Especiales
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Consulta y conciliación de horas de soporte y precalculos de costos.
          </p>
        </div>

        {/* Dropdown Report Selector (Extensible) */}
        <div className="relative min-w-[260px]">
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Tipo de Reporte</label>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium shadow-sm hover:border-slate-300 cursor-pointer">
            <span className="flex-1 text-sm">Reporte de Horas — Carlos López</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Contenedor de Filtros y Configuración de Tarifas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Filtros */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Rango de Fechas
            </h3>
            {/* Quick selections */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setQuickRange('this-week')}
                className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 font-medium transition-colors"
              >
                Esta Sem.
              </button>
              <button
                onClick={() => setQuickRange('last-week')}
                className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 font-medium transition-colors"
              >
                Sem. Pasada
              </button>
              <button
                onClick={() => setQuickRange('this-month')}
                className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 font-medium transition-colors"
              >
                Este Mes
              </button>
              <button
                onClick={() => setQuickRange('last-month')}
                className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 font-medium transition-colors"
              >
                Mes Pasado
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Panel de Configuración de Costo Horario */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-4 h-4 text-indigo-500" />
            Costos Horarios (MXN)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1" title="Lunes a Viernes">
                Entre Semana (L-V)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={rateWeekday}
                  onChange={(e) => handleRateWeekdayChange(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1" title="Sábado y Domingo">
                Fin de Semana (S-D)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={rateWeekend}
                  onChange={(e) => handleRateWeekendChange(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700"
                />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic mt-1 leading-normal">
            * Guardado automático local en tu navegador.
          </p>
        </div>
      </div>

      {/* Spinner de Carga o Mensaje de Error */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Consultando actividades...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 gap-3">
          <AlertCircle className="w-12 h-12 text-rose-500" />
          <h3 className="font-semibold text-slate-800 text-lg">Error de Consulta</h3>
          <p className="text-slate-500 text-sm text-center max-w-md">{error}</p>
        </div>
      ) : (
        <>
          {/* Fila de KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-50">
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Horas Totales</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {Math.round(kpis.totalHours * 10) / 10}
                    <span className="text-sm font-normal text-slate-400 ml-1">hrs</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-none">
                    {Math.round(kpis.weekdayHours * 10) / 10} L-V | {Math.round(kpis.weekendHours * 10) / 10} S-D
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Monto Calculado</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    ${kpis.totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-none">
                    Estimación para pago
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-sky-50">
                  <Building2Icon className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Empresa Principal</p>
                  <p className="text-sm font-bold text-slate-700 mt-1.5 truncate max-w-[160px]" title={kpis.topCompany}>
                    {kpis.topCompany}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-none">
                    Mayor inversión de tiempo
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Actividad Común</p>
                  <p className="text-sm font-bold text-slate-700 mt-1.5 truncate max-w-[160px]" title={kpis.topType}>
                    {kpis.topType}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-none">
                    Tipo más recurrente
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-50">
                  <Award className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Actividad Mayor</p>
                  <p className="text-sm font-bold text-slate-700 mt-1.5 truncate max-w-[160px]" title={kpis.topActivity}>
                    {kpis.topActivity}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-none">
                    Sesión continua más larga
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Menú de Pestañas y Botón de Excel */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'schedule'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Horario Semanal
              </button>
              <button
                onClick={() => setActiveTab('charts')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'charts'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Gráficos y Estadísticas
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-all ${
                  activeTab === 'table'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                Tablas y Conciliación
              </button>
              {canViewEconomicAnalysis(currentUserEmail, '') && (
                <button
                  onClick={() => {
                    setActiveTab('economico');
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', window.location.pathname);
                    }
                  }}
                  className={`py-3 px-4 text-sm font-medium border-b-2 transition-all ${
                    activeTab === 'economico'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Análisis Económico 💰
                </button>
              )}
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportPDF}
                disabled={processedActivities.length === 0}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-sm px-4 py-2 rounded-lg shadow-sm transition-all w-full sm:w-auto"
              >
                <FileText className="w-4 h-4" />
                Exportar a PDF
              </button>
              <button
                onClick={handleExportExcel}
                disabled={processedActivities.length === 0}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-sm px-4 py-2 rounded-lg shadow-sm transition-all w-full sm:w-auto"
              >
                <Download className="w-4 h-4" />
                Exportar a Excel
              </button>
            </div>
          </div>

          {/* Renderizado de Vistas según Pestaña Activa */}
          <div className="space-y-6">
            {activeTab === 'schedule' && (
              <div className="space-y-6">
                {/* Selector de Semana en Horario */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    <span className="font-semibold text-slate-800 text-sm">Visualizar Horario por Semana:</span>
                  </div>

                  {uniqueWeeks.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={activeWeek}
                        onChange={(e) => setActiveWeek(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {uniqueWeeks.map(w => {
                          // Generar una etiqueta amigable "Lun DD a Dom DD de Mes"
                          const [y, m, d] = w.split('-').map(Number);
                          const dateObj = new Date(y, m - 1, d, 12, 0, 0);
                          const sunday = new Date(dateObj);
                          sunday.setDate(dateObj.getDate() + 6);
                          
                          const startFmt = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
                          const endFmt = sunday.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

                          return (
                            <option key={w} value={w}>
                              Semana: {startFmt} — {endFmt}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm italic">No hay actividades registradas en el período.</span>
                  )}
                </div>

                {/* Grid Semanal */}
                {activeWeek && weekDaysData.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {weekDaysData.map(wd => {
                      const isWeekendDay = wd.dayName === 'Sábado' || wd.dayName === 'Domingo';
                      return (
                        <div
                          key={wd.dateStr}
                          className={`rounded-xl border shadow-sm flex flex-col min-h-[300px] overflow-hidden ${
                            isWeekendDay
                              ? 'bg-slate-50/70 border-slate-200'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          {/* Cabecera del Día */}
                          <div className={`p-3 border-b text-center ${
                            isWeekendDay 
                              ? 'bg-slate-100/80 border-slate-200 text-slate-600' 
                              : 'bg-indigo-50/30 border-slate-100 text-slate-800'
                          }`}>
                            <p className="font-bold text-xs uppercase tracking-wider">{wd.dayName}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{wd.label}</p>
                          </div>

                          {/* Listado de Actividades del Día */}
                          <div className="p-2.5 flex-1 space-y-2 overflow-y-auto">
                            {wd.activities.length > 0 ? (
                              wd.activities.map(act => {
                                const companyColor = act.company?.color || '#64748b';
                                return (
                                  <div
                                    key={act.id}
                                    onClick={() => setSelectedActivity(act)}
                                    style={{
                                      borderLeft: `4px solid ${companyColor}`,
                                      backgroundColor: `${companyColor}0B`
                                    }}
                                    className="p-2 rounded border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all cursor-pointer text-left"
                                    title="Haz clic para ver más detalles"
                                  >
                                    <div className="flex justify-between items-start gap-1">
                                      <span
                                        style={{ color: companyColor }}
                                        className="text-[9px] font-bold uppercase tracking-wide"
                                      >
                                        {act.company?.shortName || 'S/E'}
                                      </span>
                                      <span className="text-[9px] font-bold text-slate-500 whitespace-nowrap bg-white px-1 py-0.5 rounded border border-slate-100 shadow-sm flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5" />
                                        {act.hours}h
                                      </span>
                                    </div>
                                    <p className="text-[11px] font-semibold text-slate-700 mt-1 leading-snug line-clamp-2">
                                      {act.title}
                                    </p>
                                    {act.client && (
                                      <p className="text-[9px] font-medium text-slate-400 mt-1 bg-white border border-slate-100 w-fit px-1 rounded truncate max-w-full">
                                        🏢 {act.client.name}
                                      </p>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="h-full flex items-center justify-center py-10">
                                <p className="text-[10px] text-slate-300 italic text-center leading-normal">
                                  Sin soporte
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-semibold text-slate-700">Sin Datos de Horario</h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
                      No se encontraron actividades registradas para Carlos en las semanas comprendidas en este rango de fechas.
                    </p>
                  </div>
                )}
                
                {/* Gráfico semanal rápido bajo la agenda */}
                {activeWeek && chartData.scheduleChart.some(d => Object.keys(d).length > 1) && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-800 text-sm mb-4">
                      Horas Invertidas por Día en esta Semana
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.scheduleChart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          {companies.map(co => (
                            <Bar
                              key={co.id}
                              dataKey={co.shortName}
                              stackId="a"
                              fill={co.color}
                              name={co.name}
                            />
                          ))}
                          <Bar
                            dataKey="S/E"
                            stackId="a"
                            fill="#64748b"
                            name="Sin Empresa"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'charts' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Horas Totales por Empresa */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                    Horas Totales por Empresa
                  </h3>
                  {chartData.byCompany.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.byCompany}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(value: any, name: any, props: any) => [`${value} hrs`, props.payload.fullName]}
                            contentStyle={{ borderRadius: '8px' }}
                          />
                          <Bar dataKey="horas" fill="#6366f1" radius={[4, 4, 0, 0]}>
                            {chartData.byCompany.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-72 flex items-center justify-center">
                      <p className="text-slate-400 text-sm italic">Sin datos disponibles</p>
                    </div>
                  )}
                </div>

                {/* Porcentaje de Tiempo por Empresa */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-indigo-500" />
                    Porcentaje de Distribución de Tiempo
                  </h3>
                  {chartData.byCompany.length > 0 ? (
                    <div className="h-72 flex flex-col md:flex-row items-center justify-center">
                      <div className="w-full md:w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData.byCompany}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={3}
                              dataKey="horas"
                            >
                              {chartData.byCompany.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} hrs`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Leyendas personalizadas */}
                      <div className="w-full md:w-1/2 flex flex-col gap-2 mt-4 md:mt-0">
                        {chartData.byCompany.map(c => {
                          const percent = kpis.totalHours > 0 ? ((c.horas / kpis.totalHours) * 100).toFixed(1) : '0';
                          return (
                            <div key={c.name} className="flex items-center gap-2 text-xs">
                              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                              <span className="font-bold text-slate-700 min-w-[30px]">{c.name}</span>
                              <span className="text-slate-400 truncate max-w-[120px]">{c.fullName}</span>
                              <span className="ml-auto font-semibold text-slate-600">{percent}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-72 flex items-center justify-center">
                      <p className="text-slate-400 text-sm italic">Sin datos disponibles</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'table' && (
              <div className="space-y-6">
                {/* 1. Tabla de Conciliación por Empresa */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <DollarSign className="w-4.5 h-4.5 text-indigo-500" />
                      Resumen de Cobro y Horas por Empresa del Grupo
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Montos calculados aplicando tarifa de entre semana (${rateWeekday}/hr) y fin de semana (${rateWeekend}/hr).
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          <th className="px-5 py-3">Empresa</th>
                          <th className="px-5 py-3 text-right">Horas L-V</th>
                          <th className="px-5 py-3 text-right">Subtotal L-V</th>
                          <th className="px-5 py-3 text-right">Horas S-D</th>
                          <th className="px-5 py-3 text-right">Subtotal S-D</th>
                          <th className="px-5 py-3 text-right">Total Horas</th>
                          <th className="px-5 py-3 text-right text-indigo-600 bg-indigo-50/30">Total a Facturar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {companySummary.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 font-semibold text-slate-800 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                              {c.name}
                            </td>
                            <td className="px-5 py-3 text-right text-slate-600 font-medium">
                              {Math.round(c.weekdayHours * 10) / 10} h
                            </td>
                            <td className="px-5 py-3 text-right text-slate-500">
                              ${c.weekdayCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-5 py-3 text-right text-slate-600 font-medium">
                              {Math.round(c.weekendHours * 10) / 10} h
                            </td>
                            <td className="px-5 py-3 text-right text-slate-500">
                              ${c.weekendCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-5 py-3 text-right text-slate-700 font-bold">
                              {Math.round(c.totalHours * 10) / 10} h
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-indigo-600 bg-indigo-50/10">
                              ${c.totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        
                        {/* Fila de Totales Generales */}
                        <tr className="bg-indigo-50/20 font-bold border-t-2 border-slate-200">
                          <td className="px-5 py-4 text-slate-800">TOTAL GENERAL</td>
                          <td className="px-5 py-4 text-right text-slate-800">
                            {Math.round(kpis.weekdayHours * 10) / 10} h
                          </td>
                          <td className="px-5 py-4 text-right text-slate-800">
                            ${companySummary.reduce((acc, c) => acc + c.weekdayCost, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-4 text-right text-slate-800">
                            {Math.round(kpis.weekendHours * 10) / 10} h
                          </td>
                          <td className="px-5 py-4 text-right text-slate-800">
                            ${companySummary.reduce((acc, c) => acc + c.weekendCost, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-4 text-right text-slate-800">
                            {Math.round(kpis.totalHours * 10) / 10} h
                          </td>
                          <td className="px-5 py-4 text-right text-indigo-700 text-sm">
                            ${kpis.totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Tabla de Detalle Actividades */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-800">Detalle Completo de Actividades</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Lista de tareas realizadas por Carlos en el período, ordenadas cronológicamente.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 border px-2.5 py-1 rounded-full shadow-sm">
                      {processedActivities.length} actividades
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          <th className="px-5 py-3">Fecha</th>
                          <th className="px-5 py-3">Empresa</th>
                          <th className="px-5 py-3">Cliente</th>
                          <th className="px-5 py-3">Descripción</th>
                          <th className="px-5 py-3">Tipo</th>
                          <th className="px-5 py-3">Horario</th>
                          <th className="px-5 py-3 text-right">Horas</th>
                          <th className="px-5 py-3 text-right">Costo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {processedActivities.map(a => {
                          const dowNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
                          const dowLabel = dowNames[a.dow];
                          const typeLabel = activityTypeLabels[a.type] || a.type;
                          const companyColor = a.company?.color || '#64748b';

                          return (
                            <tr key={a.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedActivity(a)}>
                              <td className="px-5 py-3 whitespace-nowrap text-slate-500 font-medium">
                                {a.localDateStr} <span className="text-[10px] text-slate-400">({dowLabel})</span>
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap">
                                <span
                                  style={{
                                    border: `1px solid ${companyColor}`,
                                    color: companyColor,
                                    backgroundColor: `${companyColor}0F`
                                  }}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold"
                                >
                                  {a.company?.shortName || 'S/E'}
                                </span>
                              </td>
                              <td className="px-5 py-3 font-semibold text-slate-700 max-w-[140px] truncate">
                                {a.client?.name || '—'}
                              </td>
                              <td className="px-5 py-3 text-slate-600 max-w-[240px] truncate" title={a.title}>
                                {a.title}
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                                {typeLabel}
                              </td>
                              <td className="px-5 py-3 whitespace-nowrap text-slate-400">
                                {a.startTime && a.endTime ? `${a.startTime} - ${a.endTime}` : '—'}
                              </td>
                              <td className="px-5 py-3 text-right font-semibold text-slate-600">
                                {a.hours} h
                              </td>
                              <td className="px-5 py-3 text-right font-bold text-slate-800">
                                ${a.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'economico' && (
              <div className="space-y-6">
                {/* Panel de Búsqueda */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Buscar por Folio Odoo (Orden de Venta)</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={economicSearchFolio}
                          onChange={(e) => setEconomicSearchFolio(e.target.value.toUpperCase().trim())}
                          placeholder="Ej: S06435"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-10 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-mono"
                        />
                        <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadEconomicData(null, economicSearchFolio)}
                        disabled={economicLoading || !economicSearchFolio.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2"
                      >
                        {economicLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Consultar Odoo
                      </button>
                      {economicData && (
                        <button
                          onClick={() => loadEconomicData(economicData.perryActivity?.id || null, economicData.folio)}
                          disabled={economicLoading}
                          className="border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 font-semibold text-sm px-3 py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center"
                          title="Recargar datos"
                        >
                          <RefreshCw className={`w-4 h-4 ${economicLoading ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {economicLoading && (
                  <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm gap-3">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-slate-500 font-medium text-sm">Cargando desglose económico...</p>
                  </div>
                )}

                {economicError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">Error al cargar datos</h4>
                      <p className="text-xs mt-1 text-rose-600">{economicError}</p>
                    </div>
                  </div>
                )}

                {economicData && !economicLoading && (
                  <>
                    {/* Fila de Datos Generales */}
                    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-xl p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold bg-white/10 text-indigo-200 px-2.5 py-0.5 rounded-full">Actividad Perry</span>
                        {economicData.perryActivity ? (
                          <>
                            <h2 className="text-lg font-bold mt-1.5">{economicData.perryActivity.title}</h2>
                            <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                              <span>📅 {new Date(economicData.perryActivity.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              <span>⏰ {economicData.perryActivity.startTime || '--:--'} a {economicData.perryActivity.endTime || '--:--'} ({economicData.perryActivity.durationHours} hrs)</span>
                              <span>🏢 Cliente: <strong className="text-white">{economicData.perryActivity.clientName}</strong></span>
                              <span>🏢 Empresa: <strong className="text-white">{economicData.perryActivity.companyName}</strong></span>
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-400 italic mt-2">Sin actividad Perry asociada (Búsqueda por folio directo)</p>
                        )}
                      </div>
                      <div className="bg-white/10 rounded-lg p-3 md:text-right shrink-0 border border-white/10">
                        <span className="text-[10px] uppercase font-bold text-indigo-200">Cotización Odoo</span>
                        <h3 className="text-xl font-mono font-bold mt-1 text-emerald-400">{economicData.odooOrder.name}</h3>
                        <p className="text-[11px] text-slate-300 mt-1">{economicData.odooOrder.companyName || '—'}</p>
                      </div>
                    </div>

                    {/* Tarjetas de Resumen KPI */}
                    {(() => {
                      const amountUntaxed = economicData.odooOrder.amountUntaxed || 0;
                      const totalCost = economicData.perryResources?.summary?.totalCost || 0;
                      const grossMargin = amountUntaxed - totalCost;
                      const marginPercent = amountUntaxed > 0 ? (grossMargin / amountUntaxed) * 100 : 0;
                      
                      const marginColorClass = grossMargin >= 0 
                        ? marginPercent >= 30 ? 'text-emerald-600 bg-emerald-50/50 border-emerald-200' : 'text-amber-600 bg-amber-50/50 border-amber-200'
                        : 'text-rose-600 bg-rose-50/50 border-rose-200';

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cotizado (Odoo Subtotal)</p>
                            <p className="text-2xl font-bold text-slate-800 mt-1">
                              ${amountUntaxed.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">Monto base sin IVA</p>
                          </div>

                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Costo Programado (Perry)</p>
                            <p className="text-2xl font-bold text-slate-800 mt-1">
                              ${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">Operación y recursos</p>
                          </div>

                          <div className={`rounded-xl border shadow-sm p-4 ${marginColorClass}`}>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-80">Margen Bruto Estimado</p>
                            <p className="text-2xl font-bold mt-1">
                              ${grossMargin.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] opacity-80 mt-1">Diferencia bruta</p>
                          </div>

                          <div className={`rounded-xl border shadow-sm p-4 ${marginColorClass}`}>
                            <p className="text-xs font-bold uppercase tracking-wider opacity-80">Porcentaje de Margen</p>
                            <p className="text-2xl font-bold mt-1">
                              {marginPercent.toFixed(1)}%
                            </p>
                            <p className="text-[10px] opacity-80 mt-1">Sobre el monto cotizado</p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Tabla Comparativa de Categorías */}
                    {(() => {
                      const odooLabor = economicData.odooBreakdown.labor?.reduce((acc: number, x: any) => acc + (x.subtotal || 0), 0) || 0;
                      const odooLifts = economicData.odooBreakdown.equipmentRental?.reduce((acc: number, x: any) => acc + (x.subtotal || 0), 0) || 0;
                      const odooSafety = economicData.odooBreakdown.coordination?.reduce((acc: number, x: any) => acc + (x.subtotal || 0), 0) || 0;
                      const odooMaterials = economicData.odooBreakdown.materials?.reduce((acc: number, x: any) => acc + (x.subtotal || 0), 0) || 0;
                      const odooIndirects = economicData.odooBreakdown.indirects?.reduce((acc: number, x: any) => acc + (x.subtotal || 0), 0) || 0;
                      const odooOther = economicData.odooBreakdown.other?.reduce((acc: number, x: any) => acc + (x.subtotal || 0), 0) || 0;

                      const perryLabor = economicData.perryResources?.summary?.laborCost || 0;
                      const perryLifts = economicData.perryResources?.summary?.equipmentCost || 0;
                      const perrySafety = economicData.perryResources?.summary?.safetyCost || 0;

                      const categories = [
                        { name: 'Mano de Obra / Servicios', odoo: odooLabor, perry: perryLabor },
                        { name: 'Renta de Equipos (Elevación)', odoo: odooLifts, perry: perryLifts },
                        { name: 'Seguridad y Coordinación', odoo: odooSafety, perry: perrySafety },
                        { name: 'Materiales y Suministros', odoo: odooMaterials, perry: 0, note: 'Perry no planifica costos de materiales' },
                        { name: 'Indirectos', odoo: odooIndirects, perry: 0, note: 'Perry no planifica costos indirectos' },
                        { name: 'Otros Conceptos', odoo: odooOther, perry: 0 },
                      ];

                      const amountUntaxed = economicData.odooOrder.amountUntaxed || 0;
                      const totalCost = economicData.perryResources?.summary?.totalCost || 0;

                      return (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-semibold text-slate-800">Comparativa de Recursos: Odoo vs Perry</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Conciliación de lo cotizado frente a los recursos programados para el fin de semana.</p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 bg-slate-100/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                  <th className="px-5 py-3">Categoría de Costo</th>
                                  <th className="px-5 py-3 text-right">Cotizado (Odoo)</th>
                                  <th className="px-5 py-3 text-right">Programado (Perry)</th>
                                  <th className="px-5 py-3 text-right">Desviación</th>
                                  <th className="px-5 py-3">Estado / Nota</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {categories.map((c, i) => {
                                  const variance = c.odoo - c.perry;
                                  const isNegative = variance < 0;
                                  const displayVariance = variance === 0 ? '—' : `$${Math.abs(variance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
                                  
                                  let statusBadge = (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                      Dentro de margen
                                    </span>
                                  );
                                  if (isNegative) {
                                    statusBadge = (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                        ⚠ Costo excedido
                                      </span>
                                    );
                                  } else if (c.note) {
                                    statusBadge = (
                                      <span className="text-[10px] text-slate-400 italic">
                                        {c.note}
                                      </span>
                                    );
                                  } else if (variance > 0 && c.perry > 0) {
                                    statusBadge = (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                                        Ahorro estimado
                                      </span>
                                    );
                                  }

                                  return (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-5 py-3 font-semibold text-slate-800">{c.name}</td>
                                      <td className="px-5 py-3 text-right text-slate-600">
                                        {c.odoo > 0 ? `$${c.odoo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}
                                      </td>
                                      <td className="px-5 py-3 text-right text-slate-600">
                                        {c.perry > 0 ? `$${c.perry.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}
                                      </td>
                                      <td className={`px-5 py-3 text-right font-bold ${isNegative ? 'text-rose-600' : variance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {isNegative ? '-' : variance > 0 ? '+' : ''}{displayVariance}
                                      </td>
                                      <td className="px-5 py-3">{statusBadge}</td>
                                    </tr>
                                  );
                                })}
                                
                                {/* Fila de Totales */}
                                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                  <td className="px-5 py-4 text-slate-800">TOTAL GENERAL (Subtotal sin IVA)</td>
                                  <td className="px-5 py-4 text-right text-slate-800">
                                    ${amountUntaxed.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-5 py-4 text-right text-slate-800">
                                    ${totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className={`px-5 py-4 text-right text-sm ${amountUntaxed - totalCost < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {amountUntaxed - totalCost >= 0 ? '+' : '-'}${Math.abs(amountUntaxed - totalCost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-5 py-4">
                                    {amountUntaxed - totalCost >= 0 ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                                        Operación Rentable
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300">
                                        Operación Deficitaria
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Detalle Odoo */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <button 
                        onClick={() => setShowOdooDetail(!showOdooDetail)}
                        className="w-full px-5 py-4 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                          <FileText className="w-4.5 h-4.5 text-indigo-500" />
                          Desglose Detallado de Cotización (Odoo Sale Order Lines)
                        </h3>
                        {showOdooDetail ? <ChevronUp className="w-4.5 h-4.5 text-slate-400" /> : <ChevronDown className="w-4.5 h-4.5 text-slate-400" />}
                      </button>
                      
                      {showOdooDetail && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-100/50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                <th className="px-5 py-3">Producto</th>
                                <th className="px-5 py-3">Descripción</th>
                                <th className="px-5 py-3 text-right">Cant.</th>
                                <th className="px-5 py-3 text-right">Precio Unitario</th>
                                <th className="px-5 py-3 text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {Object.entries(economicData.odooBreakdown).flatMap(([catKey, lines]: [string, any]) => {
                                if (!lines || lines.length === 0) return [];
                                return lines.map((l: any, idx: number) => (
                                  <tr key={`${catKey}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3 font-semibold text-slate-700 max-w-[150px] truncate" title={l.product}>
                                      {l.product}
                                    </td>
                                    <td className="px-5 py-3 text-slate-600 max-w-[300px] truncate" title={l.description}>
                                      {l.description}
                                    </td>
                                    <td className="px-5 py-3 text-right font-medium text-slate-700">{l.qty}</td>
                                    <td className="px-5 py-3 text-right text-slate-500">${l.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-5 py-3 text-right font-bold text-slate-800">${l.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                ));
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Detalle Perry */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <button 
                        onClick={() => setShowPerryDetail(!showPerryDetail)}
                        className="w-full px-5 py-4 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                          <Users className="w-4.5 h-4.5 text-indigo-500" />
                          Desglose de Recursos Asignados (Perry App)
                        </h3>
                        {showPerryDetail ? <ChevronUp className="w-4.5 h-4.5 text-slate-400" /> : <ChevronDown className="w-4.5 h-4.5 text-slate-400" />}
                      </button>

                      {showPerryDetail && (
                        <div className="p-5 space-y-6">
                          {/* Técnicos */}
                          <div>
                            <h4 className="text-xs font-bold text-indigo-600 mb-2 uppercase tracking-wide">Mano de Obra (Técnicos)</h4>
                            {economicData.perryResources.technicians?.length > 0 ? (
                              <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                                      <th className="px-4 py-2">Nombre</th>
                                      <th className="px-4 py-2">Contratista / Tipo</th>
                                      <th className="px-4 py-2 text-right">Horas</th>
                                      <th className="px-4 py-2 text-right">Tarifa / Hora</th>
                                      <th className="px-4 py-2 text-right">Costo Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {economicData.perryResources.technicians.map((t: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-2 font-medium text-slate-700">{t.name}</td>
                                        <td className="px-4 py-2 text-slate-500">{t.contractor} ({t.type})</td>
                                        <td className="px-4 py-2 text-right">{t.hours} h</td>
                                        <td className="px-4 py-2 text-right">${t.rate.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-2 text-right font-bold text-slate-800">${t.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No hay técnicos asignados en esta actividad.</p>
                            )}
                          </div>

                          {/* Seguridad */}
                          <div>
                            <h4 className="text-xs font-bold text-indigo-600 mb-2 uppercase tracking-wide">Seguridad e Higiene / Supervisores</h4>
                            {economicData.perryResources.safety?.length > 0 ? (
                              <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                                      <th className="px-4 py-2">Nombre</th>
                                      <th className="px-4 py-2">Rol Asignado</th>
                                      <th className="px-4 py-2 text-right">Costo Estimado</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {economicData.perryResources.safety.map((s: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-2 font-medium text-slate-700">{s.name}</td>
                                        <td className="px-4 py-2 text-slate-500">{s.role}</td>
                                        <td className="px-4 py-2 text-right font-bold text-slate-800">${s.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No hay personal de seguridad o supervisores asignados.</p>
                            )}
                          </div>

                          {/* Equipos */}
                          <div>
                            <h4 className="text-xs font-bold text-indigo-600 mb-2 uppercase tracking-wide">Equipos de Elevación</h4>
                            {economicData.perryResources.equipment?.length > 0 ? (
                              <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                                      <th className="px-4 py-2">Equipo</th>
                                      <th className="px-4 py-2">Propiedad</th>
                                      <th className="px-4 py-2 text-right">Costo Diario</th>
                                      <th className="px-4 py-2 text-right">Costo Flete</th>
                                      <th className="px-4 py-2 text-right">Costo Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {economicData.perryResources.equipment.map((eq: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-2 font-medium text-slate-700">{eq.name}</td>
                                        <td className="px-4 py-2 text-slate-500">{eq.ownership}</td>
                                        <td className="px-4 py-2 text-right">${eq.costPerDay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-2 text-right">${eq.freightCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-2 text-right font-bold text-slate-800">${eq.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No hay equipos de elevación asignados en esta actividad.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de Detalle de Actividad */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
            <div
              className="p-5 text-white flex justify-between items-start"
              style={{
                backgroundColor: selectedActivity.company?.color || '#4F46E5',
              }}
            >
              <div>
                <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded">
                  {selectedActivity.company?.name || 'Sin Empresa'}
                </span>
                <h3 className="font-bold text-lg mt-1 leading-snug">Detalle de Actividad</h3>
              </div>
              <button
                onClick={() => setSelectedActivity(null)}
                className="text-white/80 hover:text-white bg-black/10 hover:bg-black/20 rounded-full w-7 h-7 flex items-center justify-center font-bold transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">Descripción / Tarea</label>
                <p className="text-sm font-semibold text-slate-700 mt-1 leading-relaxed">
                  {selectedActivity.title}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Fecha</label>
                  <p className="text-sm font-medium text-slate-600 mt-0.5">
                    {getTijuanaLocalDateStr(selectedActivity.date)}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Cliente</label>
                  <p className="text-sm font-medium text-slate-600 mt-0.5">
                    🏢 {selectedActivity.client?.name || '—'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Tipo de Soporte</label>
                  <p className="text-sm font-medium text-slate-600 mt-0.5">
                    {activityTypeLabels[selectedActivity.type] || selectedActivity.type}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Horas Invertidas</label>
                  <p className="text-sm font-bold text-indigo-600 mt-0.5">
                    {((selectedActivity.durationMinutes || 0) / 60)} hrs
                    <span className="text-xs font-normal text-slate-400 ml-1">
                      ({selectedActivity.durationMinutes || 0} min)
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Horario Registrado</label>
                  <p className="text-sm font-medium text-slate-600 mt-0.5">
                    ⏰ {selectedActivity.startTime && selectedActivity.endTime
                      ? `${selectedActivity.startTime} a ${selectedActivity.endTime}`
                      : 'Sin horario registrado'}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">Folio Odoo / OT</label>
                  <p className="text-sm font-mono text-slate-600 mt-0.5">
                    {selectedActivity.workOrderFolio || '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedActivity(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Layout de Impresión (PDF) */}
    <div className="hidden print:block space-y-8 p-6 text-slate-800 bg-white">
      {/* Cabecera del Reporte */}
      <div className="border-b-2 border-slate-300 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">PERRY APP — REPORTE ESPECIAL</h1>
          <p className="text-xs text-slate-500 mt-1">Conciliación de Horas y Precalculo de Costos</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p><strong>Colaborador:</strong> {carlosUser?.name || 'Carlos López'}</p>
          <p><strong>Correo:</strong> {carlosUser?.email || 'carlos.lopez@gsingenieria.mx'}</p>
          <p><strong>Período:</strong> {startDate} al {endDate}</p>
          <p><strong>Generado:</strong> {new Date().toLocaleDateString('es-MX')}</p>
        </div>
      </div>

      {/* Tarifas */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tarifa Entre Semana (L-V)</span>
          <span className="text-lg font-bold text-slate-700">${rateWeekday}.00 MXN/hr</span>
        </div>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tarifa Fin de Semana (S-D)</span>
          <span className="text-lg font-bold text-slate-700">${rateWeekend}.00 MXN/hr</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '1rem' }}>
        <div className="border border-slate-200 rounded-xl p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Horas Totales</span>
          <span className="text-xl font-bold text-slate-800 mt-1 block">{Math.round(kpis.totalHours * 10) / 10} hrs</span>
          <span className="text-[9px] text-slate-400 block mt-1">{Math.round(kpis.weekdayHours * 10) / 10} L-V | {Math.round(kpis.weekendHours * 10) / 10} S-D</span>
        </div>
        <div className="border border-slate-200 rounded-xl p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monto a Pagar</span>
          <span className="text-xl font-bold text-emerald-600 mt-1 block">${kpis.totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-[9px] text-slate-400 block mt-1">Precalculado</span>
        </div>
        <div className="border border-slate-200 rounded-xl p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Empresa Principal</span>
          <span className="text-xs font-bold text-slate-700 mt-2 block truncate" title={kpis.topCompany}>{kpis.topCompany}</span>
          <span className="text-[9px] text-slate-400 block mt-1">Mayor inversión</span>
        </div>
        <div className="border border-slate-200 rounded-xl p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Actividad Común</span>
          <span className="text-xs font-bold text-slate-700 mt-2 block truncate" title={kpis.topType}>{kpis.topType}</span>
          <span className="text-[9px] text-slate-400 block mt-1">Tipo más recurrente</span>
        </div>
        <div className="border border-slate-200 rounded-xl p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Actividad Mayor</span>
          <span className="text-xs font-bold text-slate-700 mt-2 block truncate" title={kpis.topActivity}>{kpis.topActivity}</span>
          <span className="text-[9px] text-slate-400 block mt-1">Sesión más larga</span>
        </div>
      </div>

      {/* Tabla de Resumen por Empresa */}
      <div className="space-y-2">
        <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-1">Resumen de Cobro por Empresa</h3>
        <table className="w-full text-xs text-left border-collapse border border-slate-200">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
              <th className="px-4 py-2 border-r border-slate-200">Empresa</th>
              <th className="px-4 py-2 text-right border-r border-slate-200">Horas L-V</th>
              <th className="px-4 py-2 text-right border-r border-slate-200">Subtotal L-V</th>
              <th className="px-4 py-2 text-right border-r border-slate-200">Horas S-D</th>
              <th className="px-4 py-2 text-right border-r border-slate-200">Subtotal S-D</th>
              <th className="px-4 py-2 text-right border-r border-slate-200">Total Horas</th>
              <th className="px-4 py-2 text-right">Total a Facturar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {companySummary.map(c => (
              <tr key={c.id}>
                <td className="px-4 py-2 border-r border-slate-200 font-semibold">{c.name}</td>
                <td className="px-4 py-2 text-right border-r border-slate-200">{Math.round(c.weekdayHours * 10) / 10} h</td>
                <td className="px-4 py-2 text-right border-r border-slate-200">${c.weekdayCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-2 text-right border-r border-slate-200">{Math.round(c.weekendHours * 10) / 10} h</td>
                <td className="px-4 py-2 text-right border-r border-slate-200">${c.weekendCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-2 text-right border-r border-slate-200 font-bold">{Math.round(c.totalHours * 10) / 10} h</td>
                <td className="px-4 py-2 text-right font-bold text-indigo-600">${c.totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold border-t border-slate-300">
              <td className="px-4 py-2 border-r border-slate-200">TOTAL GENERAL</td>
              <td className="px-4 py-2 text-right border-r border-slate-200">{Math.round(kpis.weekdayHours * 10) / 10} h</td>
              <td className="px-4 py-2 text-right border-r border-slate-200">${companySummary.reduce((acc, c) => acc + c.weekdayCost, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td className="px-4 py-2 text-right border-r border-slate-200">{Math.round(kpis.weekendHours * 10) / 10} h</td>
              <td className="px-4 py-2 text-right border-r border-slate-200">${companySummary.reduce((acc, c) => acc + c.weekendCost, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td className="px-4 py-2 text-right border-r border-slate-200">{Math.round(kpis.totalHours * 10) / 10} h</td>
              <td className="px-4 py-2 text-right text-indigo-700">${kpis.totalCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Gráficos del Período */}
      {chartData.byCompany.length > 0 && (
        <div className="print-break-before space-y-4 pt-4">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-1">Gráficos y Estadísticas del Período</h3>
          <div className="grid grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem' }}>
            {/* Horas Totales por Empresa */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col items-center">
              <h4 className="text-xs font-bold text-slate-700 mb-3 text-center">Horas Totales por Empresa</h4>
              <BarChart width={320} height={200} data={chartData.byCompany} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Bar dataKey="horas" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {chartData.byCompany.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </div>

            {/* Distribución de Tiempo */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col items-center">
              <h4 className="text-xs font-bold text-slate-700 mb-3 text-center">Distribución de Tiempo</h4>
              <div className="flex items-center justify-between w-full gap-2" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                <PieChart width={140} height={140}>
                  <Pie
                    data={chartData.byCompany}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="horas"
                  >
                    {chartData.byCompany.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="flex flex-col gap-1.5 flex-1 max-w-[140px]" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {chartData.byCompany.map(c => {
                    const percent = kpis.totalHours > 0 ? ((c.horas / kpis.totalHours) * 100).toFixed(1) : '0';
                    return (
                      <div key={c.name} className="flex items-center gap-1.5 text-[9px] w-full" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="font-bold text-slate-700 truncate max-w-[40px]">{c.name}</span>
                        <span className="ml-auto font-semibold text-slate-500">{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Horarios Semanales del Periodo */}
      {uniqueWeeks.map((weekMonday) => {
        const weekDays = getWeekDaysDataForWeek(weekMonday);
        const weekChartData = getScheduleChartDataForWeek(weekDays);
        const hasChartData = weekChartData.some(d => Object.keys(d).length > 1);

        // Formatear etiqueta de la semana
        const [y, m, d] = weekMonday.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d, 12, 0, 0);
        const sunday = new Date(dateObj);
        sunday.setDate(dateObj.getDate() + 6);
        const startFmt = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
        const endFmt = sunday.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

        return (
          <div key={weekMonday} className="print-break-before space-y-4 pt-4">
            <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-1">
              Horario Semanal: {startFmt} — {endFmt}
            </h3>
            
            {/* Grid de 7 días */}
            <div className="grid grid-cols-7 gap-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.5rem' }}>
              {weekDays.map(wd => (
                <div key={wd.dateStr} className="border border-slate-200 rounded p-2 min-h-[160px] bg-slate-50/50">
                  <p className="font-bold text-[9px] text-slate-600 uppercase text-center border-b border-slate-200 pb-1">{wd.dayName.substring(0, 3)} {wd.label}</p>
                  <div className="mt-1 space-y-1">
                    {wd.activities.map(act => (
                      <div key={act.id} className="p-1 rounded text-[8px] bg-white border border-slate-100 leading-snug">
                        <span className="font-bold text-[7px] block" style={{ color: act.company?.color || '#64748b' }}>
                          {act.company?.shortName || 'S/E'} ({act.hours}h)
                        </span>
                        <p className="font-medium text-slate-700 line-clamp-2">{act.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Gráfico semanal rápido bajo la agenda en impresión */}
            {hasChartData && (
              <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col items-center mt-4">
                <h4 className="text-xs font-bold text-slate-700 mb-3 text-center">Horas Invertidas por Día — Semana {startFmt} a {endFmt}</h4>
                <BarChart width={680} height={180} data={weekChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  {companies.map(co => (
                    <Bar
                      key={co.id}
                      dataKey={co.shortName}
                      stackId="a"
                      fill={co.color}
                      name={co.name}
                    />
                  ))}
                  <Bar
                    dataKey="S/E"
                    stackId="a"
                    fill="#64748b"
                    name="Sin Empresa"
                  />
                </BarChart>
              </div>
            )}
          </div>
        );
      })}

      <div className="print-break-before pt-4" />

      {/* Detalle Completo de Actividades */}
      <div className="space-y-2">
        <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-1">Detalle de Actividades Ejecutadas</h3>
        <table className="w-full text-[9px] text-left border-collapse border border-slate-200">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 font-bold uppercase text-slate-500">
              <th className="px-3 py-1.5 border-r border-slate-200">Fecha</th>
              <th className="px-3 py-1.5 border-r border-slate-200">Empresa</th>
              <th className="px-3 py-1.5 border-r border-slate-200">Cliente</th>
              <th className="px-3 py-1.5 border-r border-slate-200">Descripción de Actividad</th>
              <th className="px-3 py-1.5 border-r border-slate-200">Horas</th>
              <th className="px-3 py-1.5">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {processedActivities.map(a => (
              <tr key={a.id}>
                <td className="px-3 py-1.5 border-r border-slate-200 whitespace-nowrap">{a.localDateStr}</td>
                <td className="px-3 py-1.5 border-r border-slate-200 font-semibold">{a.company?.shortName || 'S/E'}</td>
                <td className="px-3 py-1.5 border-r border-slate-200 font-medium truncate max-w-[100px]">{a.client?.name || '—'}</td>
                <td className="px-3 py-1.5 border-r border-slate-200 leading-normal">{a.title}</td>
                <td className="px-3 py-1.5 border-r border-slate-200 text-right whitespace-nowrap font-medium">{a.hours} h</td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap font-bold">${a.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>
);
}

// Icono auxiliar dinámico
function Building2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}
