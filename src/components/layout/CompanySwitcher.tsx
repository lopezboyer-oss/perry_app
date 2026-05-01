'use client';

import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Globe, Check } from 'lucide-react';

interface CompanyOption {
  id: string;
  name: string;
  shortName: string | null;
  color: string | null;
  isDefault: boolean;
}

interface Props {
  companies: CompanyOption[];
  activeCompanyId: string | null; // null = "TODAS"
  isAdminMaestro: boolean;
}

export function CompanySwitcher({ companies, activeCompanyId, isAdminMaestro }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click — must be before any conditional return (Rules of Hooks)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Don't show if user has only 1 company and is not ADMIN
  if (companies.length <= 1 && !isAdminMaestro) return null;

  const activeCompany = companies.find(c => c.id === activeCompanyId);
  const label = activeCompany ? (activeCompany.shortName || activeCompany.name) : 'TODAS';
  const dotColor = activeCompany?.color || '#6366F1';

  const switchCompany = async (companyId: string | null) => {
    // Set cookie via API
    await fetch('/api/company/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId }),
    });
    setOpen(false);
    // Reload page to get new data
    window.location.reload();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-700 shadow-sm"
      >
        {activeCompany ? (
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
        ) : (
          <Globe size={14} className="text-indigo-500" />
        )}
        <span className="hidden sm:inline max-w-[120px] truncate">{label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-1 animate-fade-in">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Empresa Activa</p>
          </div>

          {companies.map(c => (
            <button
              key={c.id}
              onClick={() => switchCompany(c.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                c.id === activeCompanyId 
                  ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || '#94A3B8' }} />
              <span className="flex-1 text-left truncate">{c.name}</span>
              {c.id === activeCompanyId && <Check size={14} className="text-indigo-500" />}
            </button>
          ))}

          {/* Option "TODAS" — only for ADMIN */}
          {isAdminMaestro && (
            <>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={() => switchCompany(null)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                  !activeCompanyId 
                    ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Globe size={14} className="text-indigo-500" />
                <span className="flex-1 text-left">TODAS (Consolidado)</span>
                {!activeCompanyId && <Check size={14} className="text-indigo-500" />}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
