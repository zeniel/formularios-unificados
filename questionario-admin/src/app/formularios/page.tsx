// src/app/formularios/page.tsx
// Redirect raiz para /formularios/periodicos
import { redirect } from 'next/navigation';

export default function FormulariosPage() {
  redirect('/formularios/periodicos');
}
