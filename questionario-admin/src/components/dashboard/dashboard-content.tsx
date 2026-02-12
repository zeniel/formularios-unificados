// src/components/dashboard/dashboard-content.tsx
'use client';

import Link from 'next/link';
import { FileText, HelpCircle, FolderTree, Plus, BarChart3 } from 'lucide-react';

interface DashboardContentProps {
  nomPerfil?: string;
}

interface StatCard {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
}

export function DashboardContent({ nomPerfil }: DashboardContentProps) {
  const perfilUpper = nomPerfil?.toUpperCase() ?? '';
  const canCreate = perfilUpper === 'ADMINISTRADOR' || perfilUpper === 'PESQUISADOR';

  // TODO: Buscar estatísticas reais via API
  const stats: StatCard[] = [
    {
      title: 'Questionários',
      value: '-',
      description: 'Total de questionários',
      icon: FileText,
      href: '/questionarios',
      color: 'bg-blue-500',
    },
    {
      title: 'Perguntas',
      value: '-',
      description: 'Total de perguntas',
      icon: HelpCircle,
      href: '/perguntas',
      color: 'bg-green-500',
    },
    {
      title: 'Categorias',
      value: '-',
      description: 'Total de categorias',
      icon: FolderTree,
      href: '/categorias',
      color: 'bg-purple-500',
    },
    {
      title: 'Respostas',
      value: '-',
      description: 'Total de respostas',
      icon: BarChart3,
      href: '/respostas',
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-500 mt-1">
            Visão geral do sistema de questionários
          </p>
        </div>

        {canCreate && (
          <Link
            href="/questionarios/novo"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Questionário
          </Link>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.title}
              href={stat.href}
              className="card p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">{stat.description}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      {canCreate && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Ações Rápidas</h3>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/questionarios/novo"
                className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Criar Questionário</p>
                  <p className="text-sm text-gray-500">Novo formulário de pesquisa</p>
                </div>
              </Link>

              <Link
                href="/categorias/nova"
                className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FolderTree className="w-8 h-8 text-purple-500" />
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Criar Categoria</p>
                  <p className="text-sm text-gray-500">Organizar perguntas</p>
                </div>
              </Link>

              <Link
                href="/questionarios"
                className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="w-8 h-8 text-orange-500" />
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Ver Respostas</p>
                  <p className="text-sm text-gray-500">Analisar resultados</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent activity placeholder */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Atividade Recente</h3>
        </div>
        <div className="card-content">
          <div className="text-center py-8 text-gray-500">
            <p>Carregando atividades recentes...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
