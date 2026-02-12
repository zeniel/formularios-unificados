// src/app/page.tsx
import { getUsuario } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { DashboardContent } from '@/components/dashboard/dashboard-content';

export default async function HomePage() {
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
          <DashboardContent nomPerfil={usuario.nomPerfil} />
        </main>
      </div>
    </div>
  );
}
