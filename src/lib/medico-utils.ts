/**
 * Utilitários compartilhados do domínio médico.
 * Sem 'use client' — pode ser importado tanto em Server quanto em Client Components.
 */

export function drTitle(sexo: string | null | undefined): string {
  if (sexo === 'masculino') return 'Dr.'
  if (sexo === 'feminino') return 'Dra.'
  return 'Dr(a).'
}
