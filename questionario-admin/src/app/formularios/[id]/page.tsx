// src/app/formularios/[id]/page.tsx
import { getUsuario } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { FormularioDetalhes } from '@/components/formularios/formulario-detalhes';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FormularioDetalheePage({ params }: PageProps) {
  const usuario = await getUsuario();

  if (!usuario) {
    redirect('/auth/erro?msg=Sessão expirada');
  }

  const { id } = await params;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar nomPerfil={usuario.nomPerfil} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header usuario={usuario} />

        <main className="flex-1 overflow-y-auto p-6">
          <FormularioDetalhes id={parseInt(id, 10)} nomPerfil={usuario.nomPerfil} />
        </main>
      </div>
    </div>
  );
}
