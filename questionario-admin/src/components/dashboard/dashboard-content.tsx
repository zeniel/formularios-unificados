// src/components/dashboard/dashboard-content.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, HelpCircle, Plus, BarChart3, Loader2 } from 'lucide-react';

interface DashboardContentProps {
  nomPerfil?: string;
}

interface DashboardStats {
  formularios: number;
  perguntas: number;
  respostas: number;
}

interface StatCard {
  key: keyof DashboardStats;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
}

const statCards: StatCard[] = [
  {
    key: 'formularios',
    title: 'Formulários',
    description: 'Total de formulários',
    icon: FileText,
    href: '/formularios',
    color: 'bg-blue-500',
  },
  {
    key: 'perguntas',
    title: 'Perguntas',
    description: 'Total de perguntas',
    icon: HelpCircle,
    href: '/perguntas',
    color: 'bg-green-500',
  },
  {
    key: 'respostas',
    title: 'Respostas',
    description: 'Total de respostas',
    icon: BarChart3,
    href: '/respostas',
    color: 'bg-orange-500',
  },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('pt-BR');
}

export function DashboardContent({ nomPerfil }: DashboardContentProps) {
  const perfilUpper = nomPerfil?.toUpperCase() ?? '';
  const canCreate = perfilUpper === 'ADMINISTRADOR' || perfilUpper === 'PESQUISADOR';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (!res.ok) throw new Error('Falha ao buscar estatísticas');
        const json = await res.json();
        if (!cancelled && json.success) {
          setStats(json.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro desconhecido');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-500 mt-1">
            Visão geral do sistema de formulários
          </p>
        </div>

        {canCreate && (
          <Link
            href="/formularios/novo"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Formulário
          </Link>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map(card => {
          const Icon = card.icon;
          const value = stats ? formatNumber(stats[card.key]) : null;

          return (
            <Link
              key={card.key}
              href={card.href}
              className="card p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  {loading ? (
                    <div className="flex items-center mt-1">
                      <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
                    </div>
                  ) : error ? (
                    <p className="text-sm text-red-400">Erro</p>
                  ) : (
                    <p className="text-2xl font-semibold text-gray-900">{value}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">{card.description}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/formularios/novo"
                className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Criar Formulário</p>
                  <p className="text-sm text-gray-500">Novo formulário de pesquisa</p>
                </div>
              </Link>

              <Link
                href="/respostas"
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
