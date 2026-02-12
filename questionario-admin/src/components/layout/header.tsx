// src/components/layout/header.tsx
'use client';

import { UsuarioSessao } from '@/lib/auth/session';
import { LogOut, User } from 'lucide-react';

interface HeaderProps {
  usuario: UsuarioSessao;
}

export function Header({ usuario }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Título da página */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Formulários Unificados CNJ
        </h1>
      </div>

      {/* User menu */}
      <div className="flex items-center space-x-4">
        {/* Perfil */}
        {usuario.nomPerfil && (
          <span className="hidden md:inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            {usuario.nomPerfil}
          </span>
        )}

        {/* User info */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {usuario.nomUsuario}
              </p>
              {usuario.dscOrgao && (
                <p className="text-xs text-gray-500">{usuario.dscOrgao}</p>
              )}
            </div>
          </div>

          {/* Logout */}
          <a
            href="/auth/sair"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
