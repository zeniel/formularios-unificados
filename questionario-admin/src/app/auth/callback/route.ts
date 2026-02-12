// src/app/auth/callback/route.ts
// Rota de callback da autenticação corporativa CNJ

import { NextRequest, NextResponse } from 'next/server';
import { validarCredencial } from '@/lib/auth/credencial';
import { buildSessionData, setSessionCookie, UsuarioSessao } from '@/lib/auth/session';
import { getCorporativoClient } from '@/lib/corporativo/client';

async function handleCallback(request: NextRequest) {
  const method = request.method;
  const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());

  console.log(`[auth/callback] ── Recebendo ${method} ──`);
  console.log('[auth/callback] Query params:', queryParams);
  console.log('[auth/callback] Content-Type:', request.headers.get('content-type') || '(nenhum)');

  // Credencial pode vir via query param (GET) ou form body (POST)
  let credencialParam = request.nextUrl.searchParams.get('c');
  let credencialSource = credencialParam ? 'query-param' : 'nenhum';

  if (!credencialParam && method === 'POST') {
    try {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        credencialParam = formData.get('c') as string | null;
        credencialSource = credencialParam ? 'form-body' : 'nenhum';

        // Log de todos os campos do form
        const formEntries: Record<string, string> = {};
        formData.forEach((value, key) => {
          formEntries[key] = key === 'c'
            ? `${String(value).substring(0, 40)}... (${String(value).length} chars)`
            : String(value);
        });
        console.log('[auth/callback] Form body params:', formEntries);
      } else {
        const body = await request.text();
        const params = new URLSearchParams(body);
        credencialParam = params.get('c');
        credencialSource = credencialParam ? 'text-body' : 'nenhum';
      }
    } catch {
      // fallback: keep null
    }
  }

  console.log(`[auth/callback] Credencial recebida via: ${credencialSource} (${credencialParam ? credencialParam.length + ' chars' : 'VAZIA'})`);

  // Validar credencial
  const result = validarCredencial(credencialParam ?? '');

  if (!result.success) {
    console.log(`[auth/callback] ✗ Credencial inválida: ${result.error}`);
    const errorUrl = new URL('/auth/erro', request.url);
    errorUrl.searchParams.set('msg', result.error);
    return NextResponse.redirect(errorUrl);
  }

  const { credencial } = result;
  const usuarioCred = credencial.usuario!;

  // Log de TODOS os campos da credencial (chave=valor)
  console.log('[auth/callback] ── Credencial parseada ──');
  console.log('[auth/callback] Campos da credencial:');
  for (const [key, value] of Object.entries(credencial)) {
    if (key === 'usuario') continue; // logado separadamente
    console.log(`[auth/callback]   ${key} = ${String(value)}`);
  }
  console.log('[auth/callback] Campos do usuário:');
  for (const [key, value] of Object.entries(usuarioCred)) {
    console.log(`[auth/callback]   ${key} = ${String(value)}`);
  }

  try {
    const nomPerfil = credencial.nomPerfil ? String(credencial.nomPerfil) : undefined;
    const seqPerfil = credencial.seqPerfil ? parseInt(String(credencial.seqPerfil), 10) : undefined;

    // Sem perfil definido no corporativo → sem acesso
    if (!nomPerfil) {
      console.log('[auth/callback] ✗ Sem nomPerfil na credencial');
      const errorUrl = new URL('/auth/erro', request.url);
      errorUrl.searchParams.set('msg', 'Usuário sem perfil definido no sistema corporativo.');
      return NextResponse.redirect(errorUrl);
    }

    // Buscar dados do órgão + tribunal via corporativo-proxy
    let orgaoData: { descricao?: string; sigla?: string; uf?: string } = {};

    if (usuarioCred.seqOrgao) {
      const client = getCorporativoClient();
      const orgao = await client.getOrgao(parseInt(String(usuarioCred.seqOrgao), 10));
      if (orgao) {
        orgaoData = {
          descricao: orgao.dscOrgao,
          sigla: orgao.tipoOrgao?.codigo,
          uf: orgao.tribunal?.ufs?.[0],
        };
      }
    }

    // Montar dados do usuário — perfil vem direto do corporativo
    const usuario: UsuarioSessao = {
      seqUsuario: parseInt(usuarioCred.seqUsuario!, 10),
      nomUsuario: String(usuarioCred.nomUsuario || ''),
      numCpf: usuarioCred.numCpf ? String(usuarioCred.numCpf) : undefined,
      seqOrgao: usuarioCred.seqOrgao ? parseInt(String(usuarioCred.seqOrgao), 10) : undefined,
      dscOrgao: orgaoData.descricao,
      siglaOrgao: orgaoData.sigla,
      ufOrgao: orgaoData.uf,
      seqPerfil,
      nomPerfil,
    };

    // Criar sessão e setar cookie diretamente no redirect response.
    // Usa status 303 (See Other) para forçar GET no redirect, mesmo se o callback recebeu POST.
    const sessionData = buildSessionData(usuario);
    const response = NextResponse.redirect(new URL('/', request.url), 303);
    setSessionCookie(response, sessionData);

    console.log('[auth/callback] ✓ Login OK:', {
      seqUsuario: usuario.seqUsuario,
      nomUsuario: usuario.nomUsuario,
      nomPerfil,
      seqPerfil,
      seqOrgao: usuario.seqOrgao,
      redirectTo: '/',
    });

    return response;
  } catch (error) {
    console.error('Erro ao processar login:', error);
    const errorUrl = new URL('/auth/erro', request.url);
    errorUrl.searchParams.set('msg', 'Erro interno ao processar autenticação.');
    return NextResponse.redirect(errorUrl);
  }
}

// Portal CNJ pode enviar tanto GET quanto POST
export async function GET(request: NextRequest) {
  return handleCallback(request);
}

export async function POST(request: NextRequest) {
  return handleCallback(request);
}
