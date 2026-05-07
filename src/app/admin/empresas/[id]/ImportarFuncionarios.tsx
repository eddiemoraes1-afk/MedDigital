'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, Download, CheckCircle2, AlertCircle, FileSpreadsheet, ChevronRight } from 'lucide-react'

interface Props {
  empresaId: string
  empresaNome?: string
}

interface ResultadoImport {
  importados: number
  atualizados: number
  erros: string[]
}

export default function ImportarFuncionarios({ empresaId, empresaNome = '' }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [abas, setAbas] = useState<string[]>([])
  const [abaSelecionada, setAbaSelecionada] = useState('')
  const [abaIndex, setAbaIndex] = useState(0)
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImport | null>(null)
  const [erroGeral, setErroGeral] = useState('')

  const isFunservir = empresaNome.toLowerCase().includes('funservir')

  async function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setResultado(null)
    setErroGeral('')
    setAbas([])
    setAbaSelecionada('')
    setArquivo(file)

    const nome = file.name.toLowerCase()

    if (nome.endsWith('.xlsx') || nome.endsWith('.xls')) {
      try {
        // @ts-ignore
        const xlsx = await import('xlsx')
        const buffer = await file.arrayBuffer()
        const wb = xlsx.read(buffer, { type: 'array' })
        const nomes: string[] = wb.SheetNames
        setAbas(nomes)
        const prioridade = nomes.find(n =>
          n.toLowerCase().includes('funcion') || n.toLowerCase().includes('emplo') || n.toLowerCase().includes('staff')
        ) || nomes[nomes.length - 1]
        const idx = nomes.indexOf(prioridade)
        setAbaSelecionada(prioridade)
        setAbaIndex(idx >= 0 ? idx : nomes.length - 1)
      } catch {
        setErroGeral('Não foi possível ler as abas do arquivo.')
      }
    }
  }

  async function handleImportar() {
    if (!arquivo) return
    setCarregando(true)
    setResultado(null)
    setErroGeral('')

    const formData = new FormData()
    formData.append('arquivo', arquivo)
    formData.append('empresa_id', empresaId)
    if (abaSelecionada) formData.append('sheet_name', abaSelecionada)
    if (abas.length > 0) formData.append('sheet_index', String(abaIndex))

    try {
      const res = await fetch('/api/admin/importar-funcionarios', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao importar')
      setResultado(data)
      setArquivo(null)
      setAbas([])
      setAbaSelecionada('')
      if (inputRef.current) inputRef.current.value = ''
      router.refresh()
    } catch (err: any) {
      setErroGeral(err.message)
    } finally {
      setCarregando(false)
    }
  }

  async function baixarTemplate() {
    if (isFunservir) {
      // Template XLSX específico para Funservir
      // @ts-ignore
      const xlsx = await import('xlsx')
      const wb = xlsx.utils.book_new()

      const instrucoes = [
        ['Funservir · Importação de Servidores'],
        ['Preencha todos os campos obrigatórios (*). CPF sem pontuação ou com pontos e traço. Data: DD/MM/AAAA ou AAAA-MM-DD. Sexo: masculino | feminino | outro | nao_informado. Relação: estatutario | celetista | comissionado | estagiario | temporario'],
        [
          'nome_completo *',
          'cpf *',
          'email',
          'registro_funcional',
          'cargo *',
          'tipo_cargo',
          'secretaria *',
          'relacao *',
          'nome_mae *',
          'nome_social',
          'data_admissao',
          'data_nascimento *',
          'sexo *',
        ],
        [
          'João José da Silva',
          '521.784.986-01',
          'jose@funservir.com.br',
          'ROD-0001',
          'Motorista',
          'Operacional',
          'Secretaria de Operações',
          'estatutario',
          'Maria de Fátima Silva',
          '',
          '2021-03-15',
          '1983-09-15',
          'masculino',
        ],
      ]

      const ws = xlsx.utils.aoa_to_sheet(instrucoes)
      ws['!cols'] = [
        { wch: 30 }, { wch: 18 }, { wch: 28 }, { wch: 18 },
        { wch: 20 }, { wch: 20 }, { wch: 28 }, { wch: 16 },
        { wch: 30 }, { wch: 24 }, { wch: 14 }, { wch: 16 }, { wch: 12 },
      ]

      xlsx.utils.book_append_sheet(wb, ws, 'Servidores')
      xlsx.writeFile(wb, 'template_servidores_funservir.xlsx')
    } else {
      // Template CSV padrão
      const header = 'nome_completo,cpf,email,registro_funcional,cargo,departamento,data_admissao,data_nascimento,sexo'
      const exemplo = 'João Silva,123.456.789-00,joao@empresa.com,REG001,Analista,TI,2023-01-15,1990-05-20,masculino'
      const csv = `${header}\n${exemplo}`
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'template_funcionarios.csv'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const isXlsx = arquivo?.name.toLowerCase().match(/\.xlsx?$/)

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed">
        Importe um arquivo <strong>.csv</strong> ou <strong>.xlsx</strong> com a lista de{' '}
        {isFunservir ? 'servidores' : 'funcionários'}.{' '}
        {isFunservir
          ? <>Campos obrigatórios: <span className="font-mono">nome_completo</span>, <span className="font-mono">cpf</span>, <span className="font-mono">cargo</span>, <span className="font-mono">secretaria</span>, <span className="font-mono">relacao</span>, <span className="font-mono">nome_mae</span>.</>
          : <>Colunas obrigatórias: <span className="font-mono">nome_completo</span>, <span className="font-mono">cpf</span>.</>
        }
      </p>

      <button
        onClick={baixarTemplate}
        className="flex items-center gap-1.5 text-xs text-[#5BBD9B] hover:text-[#1A3A2C] transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        {isFunservir ? 'Baixar template XLSX (Funservir)' : 'Baixar template CSV'}
      </button>

      {/* Etapa 1 — Selecionar arquivo */}
      {!arquivo ? (
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#5BBD9B] hover:bg-green-50 transition-all"
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">Clique para selecionar</p>
            <p className="text-xs text-gray-400">.csv ou .xlsx</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleArquivoSelecionado}
          />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{arquivo.name}</p>
              <p className="text-xs text-gray-400">{(arquivo.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              onClick={() => { setArquivo(null); setAbas([]); setAbaSelecionada(''); if (inputRef.current) inputRef.current.value = '' }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Trocar
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleArquivoSelecionado}
            />
          </div>

          {isXlsx && abas.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Qual aba contém os {isFunservir ? 'servidores' : 'funcionários'}?
              </label>
              <select
                value={abaIndex}
                onChange={e => {
                  const idx = parseInt(e.target.value, 10)
                  setAbaIndex(idx)
                  setAbaSelecionada(abas[idx] ?? '')
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BBD9B] bg-white"
              >
                {abas.map((aba, idx) => (
                  <option key={idx} value={idx}>{aba}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleImportar}
            disabled={carregando || (!!isXlsx && !abaSelecionada)}
            className="w-full bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {carregando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
            ) : (
              <><ChevronRight className="w-4 h-4" /> Importar {isFunservir ? 'servidores' : 'funcionários'}</>
            )}
          </button>
        </div>
      )}

      {resultado && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-1">
          <p className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Importação concluída
          </p>
          <p className="text-xs text-green-600">{resultado.importados} novo(s) importado(s)</p>
          {resultado.atualizados > 0 && (
            <p className="text-xs text-green-600">{resultado.atualizados} registro(s) atualizado(s)</p>
          )}
          {resultado.erros.length > 0 && (
            <div className="mt-2 space-y-0.5">
              <p className="text-xs font-medium text-orange-600">Avisos:</p>
              {resultado.erros.map((e, i) => (
                <p key={i} className="text-xs text-orange-500">• {e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {erroGeral && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600">{erroGeral}</p>
        </div>
      )}

      <details className="text-xs text-gray-400">
        <summary className="cursor-pointer hover:text-gray-600">Colunas aceitas</summary>
        <div className="mt-2 space-y-0.5 pl-2">
          <p><span className="font-mono text-gray-600">nome_completo</span> — obrigatório</p>
          <p><span className="font-mono text-gray-600">cpf</span> — obrigatório, para vincular ao cadastro</p>
          <p><span className="font-mono text-gray-600">email</span></p>
          <p><span className="font-mono text-gray-600">registro_funcional</span></p>
          <p><span className="font-mono text-gray-600">cargo</span>{isFunservir ? ' — obrigatório' : ''}</p>
          <p><span className="font-mono text-gray-600">tipo_cargo</span></p>
          {isFunservir ? (
            <p><span className="font-mono text-gray-600">secretaria</span> — obrigatório (equivale a departamento)</p>
          ) : (
            <p><span className="font-mono text-gray-600">departamento</span></p>
          )}
          {isFunservir && (
            <>
              <p><span className="font-mono text-gray-600">relacao</span> — obrigatório (estatutario | celetista | comissionado | estagiario | temporario)</p>
              <p><span className="font-mono text-gray-600">nome_mae</span> — obrigatório</p>
              <p><span className="font-mono text-gray-600">nome_social</span> — opcional</p>
            </>
          )}
          <p><span className="font-mono text-gray-600">data_admissao</span> — formato YYYY-MM-DD ou DD/MM/AAAA</p>
          <p><span className="font-mono text-gray-600">data_nascimento</span>{isFunservir ? ' — obrigatório' : ''}</p>
          <p><span className="font-mono text-gray-600">sexo</span>{isFunservir ? ' — obrigatório' : ''} (masculino | feminino | outro | nao_informado)</p>
        </div>
      </details>
    </div>
  )
}
