// src/components/layout/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  nomPerfil?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  perfis: string[];
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    perfis: ['ADMINISTRADOR', 'VISUALIZADOR', 'PESQUISADOR'],
  },
  {
    href: '/formularios',
    label: 'Formulários',
    icon: FileText,
    perfis: ['ADMINISTRADOR', 'VISUALIZADOR', 'PESQUISADOR'],
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
    perfis: ['ADMINISTRADOR'],
  },
];

export function Sidebar({ nomPerfil }: SidebarProps) {
  const pathname = usePathname();
  const perfilUpper = nomPerfil?.toUpperCase() ?? '';

  const visibleItems = navItems.filter(item =>
    item.perfis.some(p => p === perfilUpper)
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">Formulários</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 mr-3',
                isActive ? 'text-blue-700' : 'text-gray-400'
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Formulários Unificados CNJ
        </p>
        <p className="text-xs text-gray-400 text-center mt-1">
          v0.1.0
        </p>
      </div>
    </aside>
  );
}
