// src/components/layout/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PerfilSistema } from '@/lib/auth/session';
import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  FolderTree,
  Settings,
  Users,
  BarChart3,
} from 'lucide-react';

interface SidebarProps {
  perfis: PerfilSistema[];
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  perfis: PerfilSistema[]; // Perfis que podem ver este item
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    perfis: ['ADMINISTRADOR', 'VISUALIZADOR', 'PESQUISADOR'],
  },
  {
    href: '/questionarios',
    label: 'Questionários',
    icon: FileText,
    perfis: ['ADMINISTRADOR', 'VISUALIZADOR', 'PESQUISADOR'],
  },
  {
    href: '/perguntas',
    label: 'Perguntas',
    icon: HelpCircle,
    perfis: ['ADMINISTRADOR', 'VISUALIZADOR', 'PESQUISADOR'],
  },
  {
    href: '/categorias',
    label: 'Categorias',
    icon: FolderTree,
    perfis: ['ADMINISTRADOR', 'PESQUISADOR'],
  },
  {
    href: '/respostas',
    label: 'Respostas',
    icon: BarChart3,
    perfis: ['ADMINISTRADOR', 'PESQUISADOR'],
  },
  {
    href: '/usuarios',
    label: 'Usuários',
    icon: Users,
    perfis: ['ADMINISTRADOR'],
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
    perfis: ['ADMINISTRADOR'],
  },
];

export function Sidebar({ perfis }: SidebarProps) {
  const pathname = usePathname();

  // Filtrar itens de menu baseado nos perfis do usuário
  const visibleItems = navItems.filter(item =>
    item.perfis.some(p => perfis.includes(p))
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">Questionários</span>
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
          Sistema de Questionários
        </p>
        <p className="text-xs text-gray-400 text-center mt-1">
          v0.1.0
        </p>
      </div>
    </aside>
  );
}
