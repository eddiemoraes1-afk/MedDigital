import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// ─── Helper: identifica a empresa do usuário logado ─────────────────────────────
async function getEmpresa() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado', status: 401 as const }

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfis_sistema')
    .select('role, empresa_id')
    .eq('usuario_id', user.id)
    .single()

  if (!perfil || perfil.role !== 'empresa' || !perfil.empresa_id) {
    return { erro: 'Não autorizado', status: 403 as const }
  }

  return { empresaId: perfil.empresa_id as string, usuarioId: user.id, admin }
}

// ─── Helper: limpa e valida CPF ────────────────────────────────────────────────
function limparCpf(cpf: unknown): string | null {
  if (typeof cpf !== 'string') return null
  const d = cpf.replace(/\D/g, '')
  return d.length === 11 ? d : null
}

// ─── Helper: valida data no formato YYYY-MM-DD ─────────────────────────────────
function validarData(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null
  const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(v + 'T12:00:00')
  return isNaN(d.getTime()) ? null : v.trim()
}

// ─── Helper: string opcional limpa ─────────────────────────────────────────────
function txt(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t : null
}

const SEXOS = ['masculino', 'feminino', 'outro', 'nao_informado']

// ══════════════════════════════════════════════════════════════════════════════
// POST — adicionar novo funcionário
// ══════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const ctx = await getEmpresa()
  if ('erro' in ctx) return NextResponse.json({ error: ctx.erro }, { status: ctx.status })
  const { empresaId, admin } = ctx

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })

  const nome = txt(body.nome_completo)
  if (!nome) return NextResponse.json({ error: 'Nome completo é obrigatório' }, { status: 400 })

  const cpf = limparCpf(body.cpf)
  if (body.cpf && !cpf) {
    return NextResponse.json({ error: 'CPF inválido — deve ter 11 dígitos' }, { status: 400 })
  }

  // Verifica duplicidade de CPF na mesma empresa
  if (cpf) {
    const { data: existente } = await admin
      .from('vinculos_empresa')
      .select('id, nome_completo, ativo')
      .eq('empresa_id', empresaId)
      .eq('cpf', cpf)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({
        error: existente.ativo
          ? `Este CPF já está cadastrado para ${existente.nome_completo}`
          : `Este CPF pertence a ${existente.nome_completo}, que está inativo. Reative o cadastro em vez de criar um novo.`,
        vinculo_existente: existente.id,
      }, { status: 409 })
    }
  }

  // Se o CPF já é paciente da plataforma, vincula automaticamente
  let pacienteId: string | null = null
  if (cpf) {
    const { data: paciente } = await admin
      .from('pacientes')
      .select('id')
      .eq('cpf', cpf)
      .maybeSingle()
    pacienteId = paciente?.id ?? null
  }

  const sexoRaw = typeof body.sexo === 'string' ? body.sexo.toLowerCase().trim() : ''
  const sexo = SEXOS.includes(sexoRaw) ? sexoRaw : null

  const { data, error } = await admin
    .from('vinculos_empresa')
    .insert({
      empresa_id:         empresaId,
      nome_completo:      nome,
      cpf,
      email:              txt(body.email),
      registro_funcional: txt(body.registro_funcional),
      cargo:              txt(body.cargo),
      tipo_cargo:         txt(body.tipo_cargo),
      departamento:       txt(body.departamento),
      relacao:            txt(body.relacao) ?? 'titular',
      nome_mae:           txt(body.nome_mae),
      nome_social:        txt(body.nome_social),
      data_admissao:      validarData(body.data_admissao),
      data_nascimento:    validarData(body.data_nascimento),
      sexo,
      paciente_id:        pacienteId,
      ativo:              true,
    })
    .select(`
      id, nome_completo, cpf, email, cargo, tipo_cargo, departamento,
      relacao, nome_mae, nome_social, data_admissao, ativo, paciente_id
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ vinculo: data, mensagem: 'Funcionário adicionado com sucesso' }, { status: 201 })
}

// ══════════════════════════════════════════════════════════════════════════════
// PATCH — editar dados OU ativar/desativar funcionário
// ══════════════════════════════════════════════════════════════════════════════
export async function PATCH(req: NextRequest) {
  const ctx = await getEmpresa()
  if ('erro' in ctx) return NextResponse.json({ error: ctx.erro }, { status: ctx.status })
  const { empresaId, admin } = ctx

  const body = await req.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: 'ID do funcionário é obrigatório' }, { status: 400 })

  // Confirma que o vínculo pertence à empresa do usuário (segurança)
  const { data: vinculo } = await admin
    .from('vinculos_empresa')
    .select('id, empresa_id, nome_completo')
    .eq('id', body.id)
    .maybeSingle()

  if (!vinculo || vinculo.empresa_id !== empresaId) {
    return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}

  // Ativar / desativar (demissão ou readmissão)
  if (typeof body.ativo === 'boolean') {
    updates.ativo = body.ativo
    // Registra a data de desligamento quando desativa
    if (body.ativo === false) {
      updates.data_desligamento = validarData(body.data_desligamento)
        ?? new Date().toISOString().split('T')[0]
    } else {
      updates.data_desligamento = null
    }
  }

  // Campos de texto editáveis
  const camposTexto = [
    'nome_completo', 'email', 'registro_funcional', 'cargo', 'tipo_cargo',
    'departamento', 'relacao', 'nome_mae', 'nome_social',
  ] as const

  for (const campo of camposTexto) {
    if (campo in body) {
      const valor = txt(body[campo])
      if (campo === 'nome_completo' && !valor) {
        return NextResponse.json({ error: 'Nome completo não pode ficar vazio' }, { status: 400 })
      }
      updates[campo] = valor
    }
  }

  // Datas
  if ('data_admissao' in body)   updates.data_admissao   = validarData(body.data_admissao)
  if ('data_nascimento' in body) updates.data_nascimento = validarData(body.data_nascimento)

  // Sexo
  if ('sexo' in body) {
    const s = typeof body.sexo === 'string' ? body.sexo.toLowerCase().trim() : ''
    updates.sexo = SEXOS.includes(s) ? s : null
  }

  // CPF — valida unicidade se alterado
  if ('cpf' in body) {
    const cpf = limparCpf(body.cpf)
    if (body.cpf && !cpf) {
      return NextResponse.json({ error: 'CPF inválido — deve ter 11 dígitos' }, { status: 400 })
    }
    if (cpf) {
      const { data: outro } = await admin
        .from('vinculos_empresa')
        .select('id, nome_completo')
        .eq('empresa_id', empresaId)
        .eq('cpf', cpf)
        .neq('id', body.id)
        .maybeSingle()
      if (outro) {
        return NextResponse.json({
          error: `Este CPF já está cadastrado para ${outro.nome_completo}`,
        }, { status: 409 })
      }
      // Vincula ao paciente se já existir na plataforma
      const { data: paciente } = await admin
        .from('pacientes')
        .select('id')
        .eq('cpf', cpf)
        .maybeSingle()
      if (paciente) updates.paciente_id = paciente.id
    }
    updates.cpf = cpf
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('vinculos_empresa')
    .update(updates)
    .eq('id', body.id)
    .select(`
      id, nome_completo, cpf, email, cargo, tipo_cargo, departamento,
      relacao, nome_mae, nome_social, data_admissao, ativo, paciente_id
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mensagem = typeof body.ativo === 'boolean'
    ? (body.ativo ? 'Funcionário reativado' : 'Funcionário desativado')
    : 'Dados atualizados'

  return NextResponse.json({ vinculo: data, mensagem })
}
