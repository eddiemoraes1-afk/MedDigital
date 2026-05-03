'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, Download, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  empresaId: string
}

interface ResultadoImport {
  importados: number
  atualizados: number
  erros: string[]
}

export default function ImportarFuncionarios({ empresaId }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImport | null>(null)
  const [erroGeral, setErroGeral] = useState('')

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setCarregando(true)
    setResultado(null)
    setErroGeral('')

    const formData = new FormData()
    formData.append('arquivo', file)
    formData.append('empresa_id', empresaId)

    try {
      const res = await fetch('/api/admin/importar-funcionarios', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao importar')
      setResultado(data)
      router.refresh()
    } catch (err: any) {
      setErroGeral(err.message)
    } finally {
      setCarregando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function baixarTemplate() {
    const header = 'nome_completo,cpf,email,registro_funcional,cargo,departamento,data_admissao'
    const exemplo = 'João Silva,123.456.789-00,joao@empresa.com,REG001,Analista,TI,2023-01-15'
    const csv = `${header}\n${exemplo}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_funcionarios.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Instrução */}
      <p className="text-xs text-gray-500 leading-relaxed">
        Importe um arquivo <strong>.csv</strong> ou <strong>.xlsx</strong> com a lista de funcionários.
        Colunas obrigatórias: <span className="font-mono">nome_completo</span>, <span className="font-mono">cpf</span>.
      </p>

      {/* Botão template */}
      <button
        onClick={baixarTemplate}
        className="flex items-center gap-1.5 text-xs text-[#2E75B6] hover:text-[#1A3A5C] transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Baixar template CSV
      </button>

      {/* Upload */}
      <div
        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#2E75B6] hover:bg-blue-50 transition-all"
        onClick={() => inputRef.current?.click()}
      >
        {carregando ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-[#2E75B6] animate-spin" />
            <p className="text-sm text-gray-500">Importando...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">Clique para selecionar</p>
            <p className="text-xs text-gray-400">.csv ou .xlsx</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleArquivo}
          disabled={carregando}
        />
      </div>

      {/* Resultado */}
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

      {/* Colunas aceitas */}
      <details className="text-xs text-gray-400">
        <summary className="cursor-pointer hover:text-gray-600">Colunas aceitas</summary>
        <div className="mt-2 space-y-0.5 pl-2">
          <p><span className="font-mono text-gray-600">nome_completo</span> — obrigatório</p>
          <p><span className="font-mono text-gray-600">cpf</span> — obrigatório, para vincular ao cadastro</p>
          <p><span className="font-mono text-gray-600">email</span></p>
          <p><span className="font-mono text-gray-600">registro_funcional</span></p>
          <p><span className="font-mono text-gray-600">cargo</span></p>
          <p><span className="font-mono text-gray-600">departamento</span></p>
          <p><span className="font-mono text-gray-600">data_admissao</span> — formato YYYY-MM-DD</p>
        </div>
      </details>
    </div>
  )
}
