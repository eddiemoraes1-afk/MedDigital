// ============================================================
// MEDDIGITAL — Tipos TypeScript
// ============================================================

export type PerfilUsuario = 'paciente' | 'medico' | 'admin'

export interface Usuario {
  id: string
  email: string
  perfil: PerfilUsuario
  nome: string
  criado_em: string
}

export interface Paciente {
  id: string
  usuario_id: string
  nome: string
  cpf: string
  data_nascimento: string
  telefone: string
  endereco?: string
  convenio?: string
  criado_em: string
}

export interface Medico {
  id: string
  usuario_id: string
  nome: string
  crm: string
  crm_uf: string
  especialidade: string
  telefone: string
  status: 'em_analise' | 'aprovado' | 'reprovado' | 'suspenso'
  dados_bancarios?: DadosBancarios
  criado_em: string
}

export interface DadosBancarios {
  banco: string
  agencia: string
  conta: string
  tipo: 'corrente' | 'poupanca'
  cpf_cnpj: string
}

export interface Triagem {
  id: string
  paciente_id: string
  sintomas: string
  classificacao_risco: 'verde' | 'amarelo' | 'laranja' | 'vermelho'
  direcionamento: 'virtual' | 'presencial' | 'orientacao'
  resumo_ia: string
  historico_chat: MensagemChat[]
  status: 'em_andamento' | 'concluida'
  criado_em: string
}

export interface MensagemChat {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Atendimento {
  id: string
  paciente_id: string
  medico_id?: string
  triagem_id?: string
  tipo: 'virtual' | 'presencial'
  status: 'aguardando' | 'em_andamento' | 'concluido' | 'cancelado'
  notas_medico?: string
  duracao_minutos?: number
  criado_em: string
  iniciado_em?: string
  finalizado_em?: string
}

export interface FilaAtendimento {
  id: string
  paciente: Paciente
  triagem: Triagem
  atendimento: Atendimento
  tempo_espera_minutos: number
}
