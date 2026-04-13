'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/actividades', label: 'Actividades', icon: ClipboardList },
  { href: '/actividades/nueva', label: 'Nueva Actividad', icon: ClipboardPlus },
  { href: '/reportes/importar', label: 'Importar Reporte', icon: FileText },
  { href: '/oportunidades', label: 'Oportunidades', icon: Target },
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
              {!collapsed && 'Gestión de Personal'}
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
