// src/lib/auth/credencial.ts
// Validação da credencial corporativa CNJ

import crypto from 'crypto';

const SEPARADOR_BASE = 'SEPARADORCREDENCIALCNJ';

/**
 * Gera o separador usado para "quebrar" a string da credencial.
 * Mesma lógica do PHP: md5(SEPARADOR_BASE + sufixo)
 *
 * - sufixo ";" → separador dos pares atributo=valor da credencial
 * - sufixo "|" → separador dos pares atributo=valor do usuário
 */
function getSeparadorCredencial(sufixo: string): string {
  return crypto.createHash('md5').update(SEPARADOR_BASE + sufixo).digest('hex');
}

function decodificarAtributo(attr: string): string {
  try {
    return Buffer.from(attr, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

// Tipos
export interface UsuarioCredencial {
  seqUsuario?: string;
  nomUsuario?: string;
  numCpf?: string;
  seqOrgao?: string;
  dscEmail?: string;
  [key: string]: unknown;
}

export interface CredencialVO {
  id?: string;
  seqSistema?: string;
  seqPerfil?: string;
  funcionalidadesPerfil?: string;
  timeToLive?: number;
  usuario?: UsuarioCredencial;
  [key: string]: unknown;
}

export type CredencialResult =
  | { success: true; credencial: CredencialVO }
  | { success: false; error: string };

/**
 * Valida a credencial corporativa CNJ
 * 
 * A credencial tem formato:
 * - Base64(dados_credencial + \n + dados_usuario) + hash_32_chars
 * 
 * Os dados são pares atributo/valor separados por hashes MD5
 */
export function validarCredencial(credencialEnviada: string): CredencialResult {
  if (!credencialEnviada?.trim()) {
    return { success: false, error: 'Credencial inválida ou vazia' };
  }

  try {
    // Separar parte codificada do hash final
    const credencialCodificada = credencialEnviada.slice(0, -32);
    // const hashRecebido = credencialEnviada.slice(-32); // Para validação futura

    // Decodificar Base64
    const stringCredencial = Buffer.from(credencialCodificada, 'base64').toString('utf-8');

    // Parsear parte da credencial
    const separadorCredencial = getSeparadorCredencial(';');
    const atributosCredencial = stringCredencial.split(separadorCredencial);
    const credencial: Record<string, unknown> = {};

    for (let i = 0; i < atributosCredencial.length - 2; i += 2) {
      const atributo = decodificarAtributo(atributosCredencial[i]);
      const valor = decodificarAtributo(atributosCredencial[i + 1]);
      if (atributo) {
        credencial[atributo] = valor;
      }
    }

    // Parsear parte do usuário (após \n)
    const inicioUsuario = stringCredencial.indexOf('\n');
    if (inicioUsuario === -1) {
      return { success: false, error: 'Formato de credencial inválido' };
    }

    const stringUsuario = stringCredencial.slice(inicioUsuario);
    const separadorUsuario = getSeparadorCredencial('|');
    const atributosUsuario = stringUsuario.split(separadorUsuario);
    const usuario: Record<string, unknown> = {};

    for (let i = 0; i < atributosUsuario.length - 2; i += 2) {
      const atributo = decodificarAtributo(atributosUsuario[i]);
      const valor = decodificarAtributo(atributosUsuario[i + 1]);
      if (atributo) {
        usuario[atributo] = valor;
      }
    }

    credencial.usuario = usuario;

    // Validar TTL
    const timeToLive = Number(credencial.timeToLive);
    if (isNaN(timeToLive) || Date.now() / 1000 > timeToLive) {
      return { success: false, error: 'Sua credencial expirou!' };
    }

    // Validar se tem dados mínimos
    if (!usuario.seqUsuario) {
      return { success: false, error: 'Usuário não identificado na credencial' };
    }

    return {
      success: true,
      credencial: credencial as CredencialVO,
    };
  } catch (error) {
    console.error('Erro ao validar credencial:', error);
    return { success: false, error: 'Erro ao processar credencial' };
  }
}
