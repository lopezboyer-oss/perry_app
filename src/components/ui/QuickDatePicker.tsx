'use client';

import React, { useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { getLocalToday, parseLocalDate } from '@/lib/timezone';

interface QuickDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  className?: string;
  showPresets?: boolean;
  showSteppers?: boolean;
  showFormattedBadge?: boolean;
  compact?: boolean;
}

export function QuickDatePicker({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  minDate,
  maxDate,
  className = '',
  showPresets = true,
  showSteppers = true,
  showFormattedBadge = true,
  compact = false,
}: QuickDatePickerProps) {
  const today = getLocalToday();

  // Helper to format Date to YYYY-MM-DD
  const toDateString = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Helper to add days
  const addDays = (baseDateStr: string, days: number): string => {
    if (!baseDateStr) return today;
    const d = parseLocalDate(baseDateStr);
    d.setDate(d.getDate() + days);
    return toDateString(d);
  };

  // Compute upcoming key days from today
  const presets = useMemo(() => {
    const base = parseLocalDate(today);
    const dayOfWeek = base.getDay(); // 0 is Sunday, 1 is Monday, 6 is Saturday

    // Tomorrow
    const tom = new Date(base);
    tom.setDate(base.getDate() + 1);

    // Next Saturday
    const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
    const sat = new Date(base);
    sat.setDate(base.getDate() + (dayOfWeek === 6 ? 0 : daysUntilSat));

    // Next Sunday
    const daysUntilSun = (0 - dayOfWeek + 7) % 7 || 7;
    const sun = new Date(base);
    sun.setDate(base.getDate() + (dayOfWeek === 0 ? 0 : daysUntilSun));

    // Next Monday
    const daysUntilMon = (1 - dayOfWeek + 7) % 7 || 7;
    const mon = new Date(base);
    mon.setDate(base.getDate() + (dayOfWeek === 1 ? 0 : daysUntilMon));

    return [
      { label: 'Hoy', date: today, key: 'hoy' },
      { label: 'Mañana', date: toDateString(tom), key: 'manana' },
      { label: 'Sábado', date: toDateString(sat), key: 'sab' },
      { label: 'Domingo', date: toDateString(sun), key: 'dom' },
      { label: 'Lunes', date: toDateString(mon), key: 'lun' },
    ];
  }, [today]);

  // Formatted Spanish day label
  const humanDate = useMemo(() => {
    if (!value) return null;
    try {
      const d = parseLocalDate(value);
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const dayName = days[d.getDay()];
      const dayNum = d.getDate();
      const monthName = months[d.getMonth()];
      const year = d.getFullYear();

      const isToday = value === today;
      const isTomorrow = value === addDays(today, 1);
      const isYesterday = value === addDays(today, -1);

      let tag = '';
      if (isToday) tag = ' (Hoy)';
      else if (isTomorrow) tag = ' (Mañana)';
      else if (isYesterday) tag = ' (Ayer)';

      return {
        dayName,
        fullFormatted: `${dayName}, ${dayNum} de ${monthName} ${year}${tag}`,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      };
    } catch {
      return null;
    }
  }, [value, today]);

  const handleStep = (delta: number) => {
    const nextDate = addDays(value || today, delta);
    if (minDate && nextDate < minDate) return;
    if (maxDate && nextDate > maxDate) return;
    onChange(nextDate);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        </div>
      )}

      {/* Input Row with Steppers */}
      <div className="flex items-center gap-1.5">
        {showSteppers && (
          <button
            type="button"
            onClick={() => handleStep(-1)}
            disabled={disabled || (Boolean(minDate) && value <= minDate!)}
            className="flex items-center justify-center w-8 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 active:bg-indigo-100 disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0 cursor-pointer touch-manipulation shadow-2xs"
            title="Día anterior (-1 día)"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        <div className="relative flex-1">
          <input
            type="date"
            value={value}
            min={minDate}
            max={maxDate}
            required={required}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full text-sm font-semibold !bg-white !border-slate-300 rounded-lg py-2 px-3 focus:!ring-2 focus:!ring-indigo-500 focus:!border-indigo-500 shadow-2xs ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
        </div>

        {showSteppers && (
          <button
            type="button"
            onClick={() => handleStep(1)}
            disabled={disabled || (Boolean(maxDate) && value >= maxDate!)}
            className="flex items-center justify-center w-8 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 active:bg-indigo-100 disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0 cursor-pointer touch-manipulation shadow-2xs"
            title="Día siguiente (+1 día)"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Human Date Badge */}
      {showFormattedBadge && humanDate && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-900 bg-indigo-50/80 border border-indigo-100/80 px-2.5 py-1 rounded-md">
          <Calendar size={13} className="text-indigo-600 shrink-0" />
          <span className="truncate">{humanDate.fullFormatted}</span>
          {humanDate.isWeekend && (
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-indigo-200/70 text-indigo-800 px-1.5 py-0.2 rounded shrink-0">
              Finde
            </span>
          )}
        </div>
      )}

      {/* Quick Presets Pills */}
      {showPresets && !disabled && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {presets.map((p) => {
            const isSelected = value === p.date;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onChange(p.date)}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer touch-manipulation ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
