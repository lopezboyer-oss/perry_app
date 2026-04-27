'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Target,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  HelpCircle,
  CalendarDays,
  LogOut,
  Clock,
  DollarSign,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/actividades', label: 'Actividades', icon: ClipboardList },
  { href: '/atc-finde', label: 'ATC Finde', icon: CalendarDays },
  { href: '/planes-pasados', label: 'Planes Pasados', icon: Clock },
  { href: '/cobranza', label: 'Cobranza', icon: DollarSign },
  { href: '/actividades/nueva', label: 'Nueva Actividad', icon: ClipboardPlus },
  { href: '/reportes/importar', label: 'Importar Reporte', icon: FileText },
  // { href: '/oportunidades', label: 'Oportunidades', icon: Target },
  { href: '/analitica', label: 'Analítica', icon: BarChart3 },
  { href: '/guia', label: 'Guía Perry', icon: HelpCircle },
];

interface SidebarProps {
  user: { name: string; email: string; role: string };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sidebar-desktop hidden md:flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/50 transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 shadow-lg shadow-indigo-500/20">
              <img src="/perry-logo.jpg" alt="Perry" width={36} height={36} className="w-full h-full object-cover" />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold text-white tracking-tight">
                PERRY APP
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          })}
          
          {user.role === 'ADMIN' && (
            <Link
              href="/usuarios"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mt-4 border-t border-slate-700/50 pt-4',
                pathname === '/usuarios' || pathname.startsWith('/usuarios/')
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
              title={collapsed ? 'Personal' : undefined}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              {!collapsed && 'Gestión de Recursos'}
            </Link>
          )}

          {['ADMIN', 'SUPERVISOR', 'SUPERVISOR_SAFETY_LP'].includes(user.role) && (
            <Link
              href="/directorio"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                pathname === '/directorio' || pathname.startsWith('/directorio/')
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
              title={collapsed ? 'Directorio' : undefined}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
              {!collapsed && 'Gestión de Clientes'}
            </Link>
          )}
        </nav>

        {/* Collapse button */}
        <div className="p-2 border-t border-slate-700/50">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2 mt-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-sm"
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
              {!collapsed && 'Cerrar Sesión'}
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg">
        <nav className="flex justify-around py-2 px-1">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-colors',
                  isActive ? 'text-indigo-600' : 'text-slate-500'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="truncate max-w-[60px]">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
