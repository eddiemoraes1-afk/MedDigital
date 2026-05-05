/**
 * Utilitário de tema dinâmico por empresa.
 * Gera CSS variables e valores de cor baseados na cor_primaria da empresa.
 */

/** Recebe hex (#RRGGBB) e retorna { r, g, b } */
function hexParaRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

/** Calcula luminância relativa (0=escuro, 1=claro) */
function luminancia(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/** Cor de texto que contrasta bem com o fundo informado */
export function corTextoContraste(corFundo: string): string {
  const { r, g, b } = hexParaRgb(corFundo)
  return luminancia(r, g, b) > 0.5 ? '#1A1A1A' : '#ffffff'
}

/** Cor de texto suave (menor contraste, para legendas no header) */
export function corTextoSuave(corFundo: string): string {
  const { r, g, b } = hexParaRgb(corFundo)
  return luminancia(r, g, b) > 0.5 ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.70)'
}

export interface TemaEmpresa {
  /** Cor principal da empresa (#RRGGBB) */
  corPrimaria: string
  /** Valor RGB separado por vírgula: "R,G,B" — útil para rgba() */
  corRgb: string
  /** Cor de texto sobre o fundo principal (branco ou escuro) */
  corTexto: string
  /** Cor de texto suave para legendas */
  corTextoSuave: string
  /** Fundo bem claro (tint 6%) para a página */
  corBgPagina: string
  /** Tint médio (12%) para cards de destaque */
  corBgCard: string
  /** CSS variables prontas para usar em style={{}} */
  vars: React.CSSProperties
}

/**
 * Gera o tema completo a partir da cor primária.
 * Se nenhuma cor for fornecida, usa o verde padrão do sistema.
 */
export function gerarTema(corPrimaria: string | null | undefined): TemaEmpresa {
  const cor = corPrimaria && /^#[0-9A-Fa-f]{6}$/.test(corPrimaria) ? corPrimaria : '#1A3A2C'
  const { r, g, b } = hexParaRgb(cor)

  const texto = corTextoContraste(cor)
  const textoSuave = corTextoSuave(cor)
  const bgPagina = `rgba(${r},${g},${b},0.05)`
  const bgCard = `rgba(${r},${g},${b},0.10)`

  return {
    corPrimaria: cor,
    corRgb: `${r},${g},${b}`,
    corTexto: texto,
    corTextoSuave: textoSuave,
    corBgPagina: bgPagina,
    corBgCard: bgCard,
    vars: {
      '--cor-empresa': cor,
      '--cor-empresa-rgb': `${r},${g},${b}`,
      '--cor-empresa-texto': texto,
      '--cor-empresa-texto-suave': textoSuave,
      '--cor-empresa-bg': bgPagina,
      '--cor-empresa-bg-card': bgCard,
    } as React.CSSProperties,
  }
}
