'use client';

import { useState, useRef } from 'react';

interface TimeInput24hProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
}

/**
 * A text-based time input that always shows 24-hour format (HH:MM).
 * Auto-formats: inserts colon after 2 digits, limits to valid time range.
 */
export function TimeInput24h({ value, onChange, onBlur, className = '', placeholder = 'HH:MM' }: TimeInput24hProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (raw: string) => {
    // Strip non-digit characters
    let digits = raw.replace(/[^\d]/g, '');
    
    // Limit to 4 digits
    digits = digits.slice(0, 4);
    
    // Build formatted value
    let formatted = '';
    if (digits.length <= 2) {
      formatted = digits;
    } else {
      formatted = digits.slice(0, 2) + ':' + digits.slice(2);
    }
    
    // Validate hours (00-23) and minutes (00-59) if complete
    if (digits.length >= 2) {
      const hours = parseInt(digits.slice(0, 2), 10);
      if (hours > 23) {
        formatted = '23' + (digits.length > 2 ? ':' + digits.slice(2) : '');
      }
    }
    if (digits.length === 4) {
      const minutes = parseInt(digits.slice(2, 4), 10);
      if (minutes > 59) {
        formatted = digits.slice(0, 2) + ':59';
      }
    }
    
    onChange(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, arrows
    const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    
    // Allow Ctrl/Cmd shortcuts (copy, paste, select all)
    if (e.ctrlKey || e.metaKey) return;
    
    // Only allow digits and colon
    if (!/[\d:]/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
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
      className={className}
    />
  );
}
