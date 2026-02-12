// src/app/formularios/periodicos/page.tsx
import { getUsuario } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { FormulariosContent } from '@/components/formularios/formularios-content';

export default async function FormulariosPeriodicosPage() {
  const usuario = await getUsuario();

  if (!usuario) {
    redirect('/auth/erro?msg=Sessão expirada');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar nomPerfil={usuario.nomPerfil} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header usuario={usuario} />

        <main className="flex-1 overflow-y-auto p-6">
          <FormulariosContent nomPerfil={usuario.nomPerfil} tipo="periodico" />
        </main>
      </div>
    </div>
  );
}
