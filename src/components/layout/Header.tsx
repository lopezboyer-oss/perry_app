'use client';

import { logoutAction } from '@/app/actions/auth';
import { LogOut, User, Menu, X, CalendarDays, LayoutDashboard, ClipboardList, FileText, Target, BarChart3, ClipboardPlus, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/actividades', label: 'Actividades', icon: ClipboardList },
  { href: '/atc-finde', label: 'ATC Finde', icon: CalendarDays },
  { href: '/actividades/nueva', label: 'Nueva Actividad', icon: ClipboardPlus },
  { href: '/reportes/importar', label: 'Importar Reporte', icon: FileText },
  // { href: '/oportunidades', label: 'Oportunidades', icon: Target },
  { href: '/analitica', label: 'Analítica', icon: BarChart3 },
  { href: '/guia', label: 'Guía Perry', icon: HelpCircle },
];

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  INGENIERO: 'Ingeniero',
};

interface HeaderProps {
  user: { name: string; email: string; role: string };
}

export function Header({ user }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shadow-sm flex-shrink-0">
        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Page context */}
        <div className="hidden md:block" />

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500">{roleLabels[user.role] || user.role}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
            {user.name.charAt(0)}
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center h-16 px-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg overflow-hidden shadow-lg shadow-indigo-500/20">
                  <img src="/perry-logo.jpg" alt="Perry" width={36} height={36} className="w-full h-full object-cover" />
                </div>
                <span className="text-lg font-bold text-slate-800">PERRY APP</span>
              </div>
            </div>
            <nav className="py-4 px-3 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              
              {/* Only ADMIN sees User Management */}
              {user.role === 'ADMIN' && (
                <Link
                  href="/usuarios"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-4 border-t border-slate-100 pt-4',
                    pathname === '/usuarios' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <User size={20} className={pathname === '/usuarios' ? 'text-purple-600' : 'text-slate-400'} />
                  Gestión de Personal
                </Link>
              )}

              {/* ADMIN and SUPERVISOR see Directory */}
              {(user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
                <Link
                  href="/directorio"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    pathname === '/directorio' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={pathname === '/directorio' ? 'text-emerald-600' : 'text-slate-400'}><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                  Catálogo Directorio
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
