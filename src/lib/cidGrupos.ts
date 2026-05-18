// Mapeamento dos 22 grupos oficiais CID-10

export interface CidGrupoInfo {
  codigo: string
  nome: string
  abrev: string
  startLetter: string
  startNum: number
  endLetter: string
  endNum: number
}

export const CID_GRUPOS: CidGrupoInfo[] = [
  { codigo: 'A00-B99', nome: 'Algumas doenças infecciosas e parasitárias',                                         abrev: 'Infecciosas',        startLetter: 'A', startNum: 0,  endLetter: 'B', endNum: 99 },
  { codigo: 'C00-D48', nome: 'Neoplasias [tumores]',                                                              abrev: 'Neoplasias',         startLetter: 'C', startNum: 0,  endLetter: 'D', endNum: 48 },
  { codigo: 'D50-D89', nome: 'Doenças do sangue e dos órgãos hematopoéticos e alguns transtornos imunitários',    abrev: 'Sangue/Imun.',       startLetter: 'D', startNum: 50, endLetter: 'D', endNum: 89 },
  { codigo: 'E00-E90', nome: 'Doenças endócrinas, nutricionais e metabólicas',                                    abrev: 'Endócrinas',         startLetter: 'E', startNum: 0,  endLetter: 'E', endNum: 90 },
  { codigo: 'F00-F99', nome: 'Transtornos mentais e comportamentais',                                             abrev: 'Transt. mentais',    startLetter: 'F', startNum: 0,  endLetter: 'F', endNum: 99 },
  { codigo: 'G00-G99', nome: 'Doenças do sistema nervoso',                                                        abrev: 'Sist. nervoso',      startLetter: 'G', startNum: 0,  endLetter: 'G', endNum: 99 },
  { codigo: 'H00-H59', nome: 'Doenças do olho e anexos',                                                          abrev: 'Olho',               startLetter: 'H', startNum: 0,  endLetter: 'H', endNum: 59 },
  { codigo: 'H60-H95', nome: 'Doenças do ouvido e da apófise mastóide',                                          abrev: 'Ouvido',             startLetter: 'H', startNum: 60, endLetter: 'H', endNum: 95 },
  { codigo: 'I00-I99', nome: 'Doenças do aparelho circulatório',                                                  abrev: 'Circulatório',       startLetter: 'I', startNum: 0,  endLetter: 'I', endNum: 99 },
  { codigo: 'J00-J99', nome: 'Doenças do aparelho respiratório',                                                  abrev: 'Respiratório',       startLetter: 'J', startNum: 0,  endLetter: 'J', endNum: 99 },
  { codigo: 'K00-K93', nome: 'Doenças do aparelho digestivo',                                                     abrev: 'Digestivo',          startLetter: 'K', startNum: 0,  endLetter: 'K', endNum: 93 },
  { codigo: 'L00-L99', nome: 'Doenças da pele e do tecido subcutâneo',                                            abrev: 'Pele',               startLetter: 'L', startNum: 0,  endLetter: 'L', endNum: 99 },
  { codigo: 'M00-M99', nome: 'Doenças do sistema osteomuscular e do tecido conjuntivo',                           abrev: 'Osteomuscular',      startLetter: 'M', startNum: 0,  endLetter: 'M', endNum: 99 },
  { codigo: 'N00-N99', nome: 'Doenças do aparelho geniturinário',                                                 abrev: 'Geniturinário',      startLetter: 'N', startNum: 0,  endLetter: 'N', endNum: 99 },
  { codigo: 'O00-O99', nome: 'Gravidez, parto e puerpério',                                                       abrev: 'Gravidez',           startLetter: 'O', startNum: 0,  endLetter: 'O', endNum: 99 },
  { codigo: 'P00-P96', nome: 'Algumas afecções originadas no período perinatal',                                  abrev: 'Perinatal',          startLetter: 'P', startNum: 0,  endLetter: 'P', endNum: 96 },
  { codigo: 'Q00-Q99', nome: 'Malformações congênitas, deformidades e anomalias cromossômicas',                   abrev: 'Malformações',       startLetter: 'Q', startNum: 0,  endLetter: 'Q', endNum: 99 },
  { codigo: 'R00-R99', nome: 'Sintomas, sinais e achados anormais de exames clínicos e de laboratório',           abrev: 'Sintomas',           startLetter: 'R', startNum: 0,  endLetter: 'R', endNum: 99 },
  { codigo: 'S00-T98', nome: 'Lesões, envenenamento e algumas outras consequências de causas externas',           abrev: 'Lesões',             startLetter: 'S', startNum: 0,  endLetter: 'T', endNum: 98 },
  { codigo: 'V01-Y98', nome: 'Causas externas de morbidade e de mortalidade',                                     abrev: 'Causas externas',    startLetter: 'V', startNum: 1,  endLetter: 'Y', endNum: 98 },
  { codigo: 'Z00-Z99', nome: 'Fatores que influenciam o estado de saúde e o contato com os serviços de saúde',   abrev: 'Fatores de saúde',   startLetter: 'Z', startNum: 0,  endLetter: 'Z', endNum: 99 },
  { codigo: 'U04-U99', nome: 'Códigos reservados para propósitos especiais da OMS',                               abrev: 'Códigos OMS',        startLetter: 'U', startNum: 4,  endLetter: 'U', endNum: 99 },
]

/** Converte letra + número em um valor numérico comparável */
function cidVal(letter: string, num: number): number {
  return letter.charCodeAt(0) * 1000 + num
}

/**
 * Recebe um código CID-10 (ex: "J15", "M54.5", "F32") e retorna o nome completo do grupo.
 * Retorna "Não classificado" se não encontrar correspondência.
 */
export function cidParaGrupo(cid: string): string {
  const g = encontrarGrupo(cid)
  return g ? g.nome : 'Não classificado'
}

/**
 * Retorna a abreviação do grupo para uso em gráficos.
 */
export function cidParaGrupoAbrev(cid: string): string {
  const g = encontrarGrupo(cid)
  return g ? g.abrev : 'Outros'
}

/**
 * Retorna o código do grupo (ex: "J00-J99") ou null.
 */
export function cidParaGrupoCodigo(cid: string): string | null {
  const g = encontrarGrupo(cid)
  return g ? g.codigo : null
}

function encontrarGrupo(cid: string): CidGrupoInfo | null {
  if (!cid) return null
  const m = cid.trim().toUpperCase().match(/^([A-Z])(\d{2})/)
  if (!m) return null
  const letter = m[1]
  const num = parseInt(m[2], 10)
  const val = cidVal(letter, num)

  for (const grupo of CID_GRUPOS) {
    const start = cidVal(grupo.startLetter, grupo.startNum)
    const end   = cidVal(grupo.endLetter,   grupo.endNum)
    if (val >= start && val <= end) return grupo
  }
  return null
}
