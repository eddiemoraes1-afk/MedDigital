'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, UserPlus, Save, AlertCircle } from 'lucide-react'

export interface FuncionarioForm {
  id?: string
  nome_completo: string
  nome_social: string
  cpf: string
  email: string
  registro_funcional: string
  cargo: string
  tipo_cargo: string
  departamento: string
  relacao: string
  nome_mae: string
  data_admissao: string
  data_nascimento: string
  sexo: string
}

const VAZIO: FuncionarioForm = {
  nome_completo: '', nome_social: '', cpf: '', email: '',
  registro_funcional: '', cargo: '', tipo_cargo: '', departamento: '',
  relacao: 'titular', nome_mae: '', data_admissao: '', data_nascimento: '', sexo: '',
}

function mascaraCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

interface Props {
  aberto: boolean
  inicial?: Partial<FuncionarioForm> | null
  onFechar: () => void
  onSalvo: () => void
}

export default function FuncionarioFormModal({ aberto, inicial, onFechar, onSalvo }: Props) {
  const editando = Boolean(inicial?.id)
  const [form, setForm] = useState<FuncionarioForm>(VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (aberto) {
      setForm({ ...VAZIO, ...(inicial ?? {}) })
      setErro(null)
    }
  }, [aberto, inicial])

  function set<K extends keyof FuncionarioForm>(campo: K, valor: string) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  async function salvar() {
    if (!form.nome_completo.trim()) {
      setErro('O nome completo é obrigatório.')
      return
    }
    const cpfDigitos = form.cpf.replace(/\D/g, '')
    if (cpfDigitos && cpfDigitos.length !== 11) {
      setErro('O CPF precisa ter 11 dígitos.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      const payload: Record<string, unknown> = {
        nome_completo:      form.nome_completo.trim(),
        nome_social:        form.nome_social.trim() || null,
        cpf:                cpfDigitos || null,
        email:              form.email.trim() || null,
        registro_funcional: form.registro_funcional.trim() || null,
        cargo:              form.cargo.trim() || null,
        tipo_cargo:         form.tipo_cargo.trim() || null,
        departamento:       form.departamento.trim() || null,
        relacao:            form.relacao.trim() || 'titular',
        nome_mae:           form.nome_mae.trim() || null,
        data_admissao:      form.data_admissao || null,
        data_nascimento:    form.data_nascimento || null,
        sexo:               form.sexo || null,
      }
      if (editando) payload.id = inicial!.id

      const res = await fetch('/api/empresa/funcionarios/gerenciar', {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar')

      onSalvo()
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto) return null

  const label = 'block text-xs font-semibold text-gray-500 mb-1'
  const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(15, 23, 42, 0.55)' }}
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-[#1A3A2C] flex items-center gap-2">
            {editando
              ? <><Save className="w-4 h-4 text-[#5BBD9B]" /> Editar funcionário</>
              : <><UserPlus className="w-4 h-4 text-[#5BBD9B]" /> Adicionar funcionário</>}
          </h3>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5 space-y-4">
          {erro && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{erro}</p>
            </div>
          )}

          {/* Dados principais */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={label}>Nome completo *</label>
              <input
                className={input}
                value={form.nome_completo}
                onChange={e => set('nome_completo', e.target.value)}
                placeholder="Ex: Maria Aparecida da Silva"
                autoFocus
              />
            </div>

            <div>
              <label className={label}>CPF</label>
              <input
                className={`${input} font-mono`}
                value={mascaraCpf(form.cpf)}
                onChange={e => set('cpf', e.target.value)}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Necessário para o funcionário acessar a plataforma
              </p>
            </div>

            <div>
              <label className={label}>E-mail</label>
              <input
                className={input}
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="nome@empresa.com.br"
              />
            </div>

            <div>
              <label className={label}>Cargo</label>
              <input
                className={input}
                value={form.cargo}
                onChange={e => set('cargo', e.target.value)}
                placeholder="Ex: Operador de máquina"
              />
            </div>

            <div>
              <label className={label}>Setor / Departamento</label>
              <input
                className={input}
                value={form.departamento}
                onChange={e => set('departamento', e.target.value)}
                placeholder="Ex: Produção"
              />
            </div>

            <div>
              <label className={label}>Data de admissão</label>
              <input
                className={input}
                type="date"
                value={form.data_admissao}
                onChange={e => set('data_admissao', e.target.value)}
              />
            </div>

            <div>
              <label className={label}>Data de nascimento</label>
              <input
                className={input}
                type="date"
                value={form.data_nascimento}
                onChange={e => set('data_nascimento', e.target.value)}
              />
            </div>

            <div>
              <label className={label}>Sexo</label>
              <select className={input} value={form.sexo} onChange={e => set('sexo', e.target.value)}>
                <option value="">Não informado</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label className={label}>Relação</label>
              <select className={input} value={form.relacao} onChange={e => set('relacao', e.target.value)}>
                <option value="titular">Titular (funcionário)</option>
                <option value="dependente">Dependente</option>
              </select>
            </div>
          </div>

          {/* Campos opcionais */}
          <details className="pt-1">
            <summary className="text-xs font-semibold text-[#5BBD9B] cursor-pointer select-none hover:underline">
              Campos adicionais (opcional)
            </summary>
            <div className="grid sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label className={label}>Nome social</label>
                <input className={input} value={form.nome_social} onChange={e => set('nome_social', e.target.value)} />
              </div>
              <div>
                <label className={label}>Nome da mãe</label>
                <input className={input} value={form.nome_mae} onChange={e => set('nome_mae', e.target.value)} />
              </div>
              <div>
                <label className={label}>Registro funcional / Matrícula</label>
                <input className={input} value={form.registro_funcional} onChange={e => set('registro_funcional', e.target.value)} />
              </div>
              <div>
                <label className={label}>Tipo de cargo</label>
                <input className={input} value={form.tipo_cargo} onChange={e => set('tipo_cargo', e.target.value)} />
              </div>
            </div>
          </details>
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onFechar}
            disabled={salvando}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-opacity disabled:opacity-60"
            style={{ background: '#1A3A2C' }}
          >
            {salvando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              : editando
                ? <><Save className="w-4 h-4" /> Salvar alterações</>
                : <><UserPlus className="w-4 h-4" /> Adicionar funcionário</>}
          </button>
        </div>
      </div>
    </div>
  )
}
