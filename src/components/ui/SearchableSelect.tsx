'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Option {
  id: string;
  name: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecciona una opción...',
  disabled = false,
  className = '',
  size = 'md',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    } else {
      setSearch(''); // Clear search when closed
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const paddingY = size === 'sm' ? 'py-1.5' : size === 'md' ? 'py-2' : 'py-3';
  const textSz = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div
        className={`flex items-center justify-between w-full bg-white border border-slate-300 rounded-lg px-3 ${paddingY} ${
          disabled ? 'bg-slate-100 cursor-not-allowed text-slate-400' : 'cursor-pointer hover:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <span className={`block truncate ${!selectedOption ? 'text-slate-500' : 'text-slate-900'} ${textSz}`}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && !disabled && (
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearch('');
              }}
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 animate-in slide-in-from-top-2 fade-in duration-100">
          <div className="p-2 border-b border-slate-100 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <ul className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-4 text-sm text-center text-slate-500">
                No se encontraron resultados
              </li>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <li
                    key={opt.id}
                    className={`px-3 py-2 text-sm rounded-md cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                  >
                    {opt.name}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
