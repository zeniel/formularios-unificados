// src/app/auth/erro/page.tsx
import { AlertCircle } from 'lucide-react';

interface ErrorPageProps {
  searchParams: { msg?: string };
}

export default function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const message = searchParams.msg || 'Erro de autenticação';
  const corporativoUrl = process.env.NEXT_PUBLIC_CNJ_CORPORATIVO_URL || 'https://www.cnj.jus.br/corporativo';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Erro de Autenticação
          </h1>

          <p className="text-gray-600 mb-6">
            {message}
          </p>

          <div className="space-y-3">
            <a
              href={corporativoUrl}
              className="block w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ir para o Portal Corporativo
            </a>

            <a
              href="/"
              className="block w-full px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Tentar Novamente
            </a>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Se o problema persistir, entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
}
