'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimeInput24hProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return `${h}:00`;
});

/**
 * A text-based time input that always shows 24-hour format (HH:MM).
 * Auto-formats: inserts colon after 2 digits, limits to valid time range.
 * Includes a clock icon popover with 1-hour intervals while preserving manual text entry.
 */
export function TimeInput24h({ value, onChange, onBlur, className = '', placeholder = 'HH:MM' }: TimeInput24hProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (raw: string) => {
    // Strip non-digit characters
    let digits = raw.replace(/[^\d]/g, '');
    
    // Limit to 4 digits
    digits = digits.slice(0, 4);
    
    // If first 2 digits form an invalid hour (>23), treat first digit as hour, rest as minutes
    if (digits.length >= 2) {
      const first2 = parseInt(digits.slice(0, 2), 10);
      if (first2 > 23) {
        const hourPart = '0' + digits[0];
        const minutePart = digits.slice(1, 3);
        digits = hourPart + minutePart;
        digits = digits.slice(0, 4);
      }
    }
    
    // Build formatted value
    let formatted = '';
    if (digits.length <= 2) {
      formatted = digits;
    } else {
      formatted = digits.slice(0, 2) + ':' + digits.slice(2);
    }
    
    // Validate minutes (00-59) if complete
    if (digits.length >= 4) {
      const minutes = parseInt(digits.slice(2, 4), 10);
      if (minutes > 59) {
        formatted = digits.slice(0, 2) + ':59';
      }
    }
    
    onChange(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    
    if (e.ctrlKey || e.metaKey) return;
    
    if (!/[\d:]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleSelectHour = (hour: string) => {
    onChange(hour);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center w-full">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        maxLength={5}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        className={`${className} pr-9`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setIsOpen(!isOpen)}
        className="absolute right-2.5 p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
        title="Seleccionar hora (intervalo 1h)"
      >
        <Clock size={16} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-2 max-h-56 overflow-y-auto grid grid-cols-3 gap-1 animate-in fade-in zoom-in-95 duration-100">
          {HOUR_OPTIONS.map((h) => {
            const isSelected = value === h;
            return (
              <button
                key={h}
                type="button"
                onClick={() => handleSelectHour(h)}
                className={`px-2 py-1.5 text-xs font-mono font-medium rounded-lg text-center transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600'
                }`}
              >
                {h}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

