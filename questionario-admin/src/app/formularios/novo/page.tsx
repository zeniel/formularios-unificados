// src/app/formularios/novo/page.tsx
import { getUsuario } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { FormularioForm } from '@/components/formularios/formulario-form';

export default async function NovoFormularioPage() {
  const usuario = await getUsuario();

  if (!usuario) {
    redirect('/auth/erro?msg=Sessão expirada');
  }

  const perfilUpper = usuario.nomPerfil?.toUpperCase() ?? '';
  if (perfilUpper !== 'ADMINISTRADOR' && perfilUpper !== 'PESQUISADOR') {
    redirect('/formularios');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar nomPerfil={usuario.nomPerfil} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header usuario={usuario} />

        <main className="flex-1 overflow-y-auto p-6">
          <FormularioForm />
        </main>
      </div>
    </div>
  );
}
