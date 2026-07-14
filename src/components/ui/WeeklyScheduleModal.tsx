'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, Clock, CalendarDays, Download, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';

interface WeeklyScheduleModalProps {
  userId: string;
  userName: string;
  initialWeekStart: string; // YYYY-MM-DD (Monday)
  onClose: () => void;
}

interface TimeEntry {
  id: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  method: string;
  timestamp: string;
}

interface WorkShift {
  start: Date;
  end: Date | null; // null = still working
}

interface DayData {
  date: Date;
  dayName: string;
  dayShort: string;
  shifts: { startHour: number; endHour: number; startTime: string; endTime: string }[];
  hours: number;
}

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getMonday(dateStr: string): Date {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatWeekStart(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const startStr = weekStart.toLocaleDateString('es-MX', opts);
  const endStr = end.toLocaleDateString('es-MX', { ...opts, year: 'numeric' });
  return `${startStr} — ${endStr}`;
}

// ISO 8601 week number
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Convert a Date to fractional hours within a specific day (0-24)
function toHourFraction(date: Date, dayStart: Date): number {
  const ms = date.getTime() - dayStart.getTime();
  return Math.max(0, Math.min(24, ms / (1000 * 60 * 60)));
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function WeeklyScheduleModal({ userId, userName, initialWeekStart, onClose }: WeeklyScheduleModalProps) {
  const [weekStart, setWeekStart] = useState<string>(initialWeekStart);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayData[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const fetchWeeklyData = async (ws: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/time-clock/weekly?userId=${userId}&weekStart=${ws}`);
      if (!res.ok) return;
      const data = await res.json();
      processEntries(data.entries, data.entryBeforeWeek, ws);
    } catch (err) {
      console.error('Error fetching weekly data:', err);
    } finally {
      setLoading(false);
    }
  };

  const processEntries = (entries: TimeEntry[], entryBeforeWeek: TimeEntry | null, ws: string) => {
    const weekStartDate = new Date(ws + 'T00:00:00');

    // Build shifts: pair CHECK_IN -> CHECK_OUT
    const allEvents: TimeEntry[] = [];
    
    // If the last entry before the week was a CHECK_IN, it means a shift carries over
    if (entryBeforeWeek && entryBeforeWeek.type === 'CHECK_IN') {
      allEvents.push({
        id: 'carryover',
        type: 'CHECK_IN',
        method: 'CARRY',
        timestamp: entryBeforeWeek.timestamp,
      });
    }
    
    allEvents.push(...entries);

    // Pair CHECK_INs with CHECK_OUTs
    const shifts: WorkShift[] = [];
    let pendingCheckIn: Date | null = null;

    for (const entry of allEvents) {
      if (entry.type === 'CHECK_IN') {
        if (pendingCheckIn) {
          // Previous CHECK_IN without CHECK_OUT — create an open shift
          shifts.push({ start: pendingCheckIn, end: null });
        }
        pendingCheckIn = new Date(entry.timestamp);
      } else if (entry.type === 'CHECK_OUT') {
        if (pendingCheckIn) {
          shifts.push({ start: pendingCheckIn, end: new Date(entry.timestamp) });
          pendingCheckIn = null;
        }
      }
    }
    // If there's a pending CHECK_IN at the end, mark as still working
    if (pendingCheckIn) {
      shifts.push({ start: pendingCheckIn, end: null });
    }

    // Build day data
    const daysData: DayData[] = [];
    let totalH = 0;

    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(weekStartDate);
      dayStart.setDate(weekStartDate.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayShifts: DayData['shifts'] = [];
      let dayHours = 0;

      for (const shift of shifts) {
        const shiftEnd = shift.end || new Date(); // Use "now" for open shifts
        
        // Check if shift overlaps with this day
        if (shift.start <= dayEnd && shiftEnd >= dayStart) {
          // Clamp to day boundaries
          const clampedStart = shift.start < dayStart ? dayStart : shift.start;
          const clampedEnd = shiftEnd > dayEnd ? dayEnd : shiftEnd;
          
          const startHour = toHourFraction(clampedStart, dayStart);
          const endHour = toHourFraction(clampedEnd, dayStart);
          
          if (endHour > startHour) {
            dayShifts.push({
              startHour,
              endHour,
              startTime: formatTime(clampedStart),
              endTime: shift.end === null && clampedEnd >= dayEnd ? 'En curso' : formatTime(clampedEnd),
            });
            dayHours += endHour - startHour;
          }
        }
      }

      totalH += dayHours;
      daysData.push({
        date: dayStart,
        dayName: DAY_NAMES[i],
        dayShort: DAY_SHORT[i],
        shifts: dayShifts,
        hours: Number(dayHours.toFixed(1)),
      });
    }

    setDays(daysData);
    setTotalHours(Number(totalH.toFixed(1)));
  };

  useEffect(() => {
    fetchWeeklyData(weekStart);
  }, [weekStart]);

  const navigateWeek = (direction: -1 | 1) => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + direction * 7);
    setWeekStart(formatWeekStart(d));
  };

  const isCurrentWeek = (() => {
    const now = new Date();
    const ws = new Date(weekStart + 'T00:00:00');
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    we.setHours(23, 59, 59, 999);
    return now >= ws && now <= we;
  })();

  const currentHourFraction = (() => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  })();

  // Hour labels for the grid
  const hourLabels = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

  // Generate filename
  const getFileName = () => {
    const safeName = userName.replace(/\s+/g, '_');
    const ws = new Date(weekStart + 'T12:00:00');
    const we = new Date(ws); we.setDate(ws.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).replace(/\s/g, '');
    return `Semana_${safeName}_${fmt(ws)}-${fmt(we)}_${ws.getFullYear()}`;
  };

  // Build text summary for WhatsApp
  const buildTextSummary = () => {
    const ws = new Date(weekStart + 'T12:00:00');
    const we = new Date(ws); we.setDate(ws.getDate() + 6);
    const fmtRange = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const dayLines = days.map(d => `${d.dayShort}: ${d.hours > 0 ? d.hours + 'h' : '—'}`).join(' | ');
    const wn = getISOWeekNumber(new Date(weekStart + 'T12:00:00'));
    return `📊 *Semana Laboral — ${userName}*\n📅 Semana ${wn} | ${fmtRange(ws)} — ${fmtRange(we)}, ${ws.getFullYear()}\n\n${dayLines}\n\n⏱️ *Total Semana: ${totalHours}h*`;
  };

  // Capture chart as PNG
  const captureImage = async (): Promise<Blob | null> => {
    if (!captureRef.current) return null;
    try {
      const dataUrl = await toPng(captureRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 1.5,
        width: Math.min(captureRef.current.scrollWidth, 600),
        style: { borderRadius: '0', maxWidth: '600px' },
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (err) {
      console.error('Error capturing image:', err);
      return null;
    }
  };

  // Download handler
  const handleDownload = async () => {
    setCapturing(true);
    try {
      const blob = await captureImage();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getFileName()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setCapturing(false);
    }
  };

  // Export/Share handler — Web Share API on mobile (with image), fallback to download + WhatsApp text on desktop
  const handleExport = async () => {
    setCapturing(true);
    try {
      const blob = await captureImage();
      const text = buildTextSummary();

      // Try Web Share API with image (works on mobile — user picks WhatsApp, Telegram, etc.)
      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], `${getFileName()}.png`, { type: 'image/png' });
        const shareData = { text, files: [file] };
        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            return;
          } catch (e) {
            // User cancelled share — that's ok
            return;
          }
        }
      }

      // Desktop fallback: download image + open WhatsApp with text
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${getFileName()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
      const encodedText = encodeURIComponent(text);
      setTimeout(() => {
        window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
      }, 500);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
              <CalendarDays size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Semana Laboral</h3>
              <p className="text-xs text-slate-500">{userName}</p>
            </div>
          </div>
          
          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title="Semana anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center min-w-[180px]">
              <span className="text-xs font-bold text-slate-700 block">
                {formatDateRange(new Date(weekStart + 'T12:00:00'))}
              </span>
              <span className="text-[10px] font-bold text-indigo-600">
                Semana {getISOWeekNumber(new Date(weekStart + 'T12:00:00'))}
              </span>
            </div>
            <button
              onClick={() => navigateWeek(1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title="Semana siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="p-12 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
              <p className="text-xs text-slate-500">Cargando horario semanal...</p>
            </div>
          ) : (
            <div ref={captureRef} className="space-y-0.5 bg-white px-3 py-2">
              {/* Capture Header (visible in image) */}
              <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">📊 Semana Laboral</h4>
                  <p className="text-[10px] text-slate-600 font-semibold">{userName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-700">{formatDateRange(new Date(weekStart + 'T12:00:00'))}</p>
                  <p className="text-[9px] font-bold text-indigo-600">Semana {getISOWeekNumber(new Date(weekStart + 'T12:00:00'))}</p>
                </div>
              </div>
              {/* Hour Labels Header */}
              <div className="flex items-center">
                <div className="w-[44px] shrink-0"></div>
                <div className="flex-1 relative h-4">
                  {hourLabels.map(h => (
                    <span
                      key={h}
                      className="absolute text-[8px] text-slate-400 font-mono -translate-x-1/2"
                      style={{ left: `${(h / 24) * 100}%` }}
                    >
                      {h.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
                <div className="w-[44px] shrink-0"></div>
              </div>

              {/* Day Rows */}
              {days.map((day, idx) => {
                const isToday = isCurrentWeek && new Date().toDateString() === day.date.toDateString();
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-0 rounded-lg transition-colors ${
                      isToday ? 'bg-blue-50/60 ring-1 ring-blue-200' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Day Label */}
                    <div className="w-[44px] shrink-0 text-right pr-2 py-1.5">
                      <div className={`text-[10px] font-bold ${isToday ? 'text-blue-700' : 'text-slate-600'}`}>
                        {day.dayShort}
                      </div>
                      <div className="text-[8px] text-slate-400">
                        {day.date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 relative h-[28px] bg-slate-100 rounded-md overflow-hidden border border-slate-200/60">
                      {/* Grid lines */}
                      {hourLabels.slice(1, -1).map(h => (
                        <div
                          key={h}
                          className="absolute top-0 bottom-0 w-px bg-slate-200/60"
                          style={{ left: `${(h / 24) * 100}%` }}
                        />
                      ))}

                      {/* Work shift bars */}
                      {day.shifts.map((shift, sIdx) => {
                        const left = (shift.startHour / 24) * 100;
                        const width = ((shift.endHour - shift.startHour) / 24) * 100;
                        return (
                          <div
                            key={sIdx}
                            className="absolute top-[3px] bottom-[3px] rounded-sm bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm cursor-default group"
                            style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                            title={`${shift.startTime} — ${shift.endTime}`}
                          >
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                              <div className="bg-slate-800 text-white text-[8px] font-mono px-1.5 py-0.5 rounded-md shadow-lg whitespace-nowrap">
                                {shift.startTime} — {shift.endTime}
                              </div>
                              <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-0.5" />
                            </div>

                            {/* Inline time label (only if shift is wide enough) */}
                            {width > 10 && (
                              <span className="absolute inset-0 flex items-center justify-center text-[7px] text-white/90 font-bold tracking-wide">
                                {shift.startTime}–{shift.endTime}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Current time indicator */}
                      {isToday && isCurrentWeek && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-red-500 z-[5]"
                          style={{ left: `${(currentHourFraction / 24) * 100}%` }}
                        >
                          <div className="absolute -top-0.5 -left-[2px] w-[5px] h-[5px] rounded-full bg-red-500" />
                        </div>
                      )}
                    </div>

                    {/* Daily Hours */}
                    <div className="w-[44px] shrink-0 text-right pr-2 py-1.5">
                      <span className={`text-[10px] font-bold tabular-nums ${
                        day.hours > 0 ? 'text-emerald-700' : 'text-slate-300'
                      }`}>
                        {day.hours > 0 ? `${day.hours}h` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Total Footer */}
              <div className="flex items-center justify-end pt-2 mt-1.5 border-t border-slate-200">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <Clock size={12} className="text-blue-600" />
                  <span className="text-[10px] font-bold text-blue-800">Total Semana:</span>
                  <span className="text-xs font-black text-blue-700 tabular-nums">{totalHours}h</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={capturing || loading}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/15"
            >
              {capturing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Descargar PNG
            </button>
            <button
              onClick={handleExport}
              disabled={capturing || loading}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15"
            >
              {capturing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
              Exportar
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
