'use client'

import { useRef, useState } from 'react'
import { Upload, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  empresaId: string
  logoAtual: string | null
  corAtual: string | null
}

/** Extrai a cor dominante de um arquivo de imagem usando Canvas API */
async function extrairCorDominante(file: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const tamanho = 60
        canvas.width = tamanho
        canvas.height = tamanho
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve('#1A3A2C'); return }

        ctx.drawImage(img, 0, 0, tamanho, tamanho)
        const dados = ctx.getImageData(0, 0, tamanho, tamanho).data

        const mapa: Record<string, number> = {}
        for (let i = 0; i < dados.length; i += 4) {
          const r = dados[i], g = dados[i + 1], b = dados[i + 2], a = dados[i + 3]
          // Ignorar pixels transparentes, brancos e pretos
          if (a < 100) continue
          if (r > 235 && g > 235 && b > 235) continue
          if (r < 20 && g < 20 && b < 20) continue
          // Quantizar para agrupar cores similares
          const qr = Math.round(r / 30) * 30
          const qg = Math.round(g / 30) * 30
          const qb = Math.round(b / 30) * 30
          const chave = `${qr},${qg},${qb}`
          mapa[chave] = (mapa[chave] || 0) + 1
        }

        const entradas = Object.entries(mapa).sort((a, b) => b[1] - a[1])
        if (entradas.length === 0) { resolve('#1A3A2C'); return }

        const [r, g, b] = entradas[0][0].split(',').map(Number)
        const hex = '#' + [r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, '0')).join('')
        resolve(hex)
      } catch {
        resolve('#1A3A2C')
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve('#1A3A2C') }
    img.src = url
  })
}

export default function LogoEmpresa({ empresaId, logoAtual, corAtual }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [corExtraida, setCorExtraida] = useState<string | null>(corAtual)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const logoExibida = preview || logoAtual

  async function aoSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    setArquivo(f)
    setMensagem(null)

    // Preview imediato
    const url = URL.createObjectURL(f)
    setPreview(url)

    // Extrair cor dominante
    const cor = await extrairCorDominante(f)
    setCorExtraida(cor)
  }

  async function salvar() {
    if (!arquivo) return
    setSalvando(true)
    setMensagem(null)

    try {
      const formData = new FormData()
      formData.append('arquivo', arquivo)
      if (corExtraida) formData.append('cor_primaria', corExtraida)

      const res = await fetch(`/api/admin/empresas/${empresaId}/logo`, {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        setMensagem({ tipo: 'erro', texto: json.error || 'Erro ao salvar' })
      } else {
        setMensagem({ tipo: 'ok', texto: 'Logo salva com sucesso!' })
        setArquivo(null)
        // Atualizar preview com URL definitiva
        setPreview(json.logo_url)
        setTimeout(() => window.location.reload(), 800)
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro de conexão. Tente novamente.' })
    } finally {
      setSalvando(false)
    }
  }

  async function remover() {
    if (!confirm('Remover a logo desta empresa?')) return
    setRemovendo(true)
    setMensagem(null)
    try {
      await fetch(`/api/admin/empresas/${empresaId}/logo`, { method: 'DELETE' })
      setPreview(null)
      setCorExtraida(null)
      setArquivo(null)
      setMensagem({ tipo: 'ok', texto: 'Logo removida.' })
      setTimeout(() => window.location.reload(), 800)
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao remover.' })
    } finally {
      setRemovendo(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Área da logo */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-gray-300 transition-colors relative group"
        onClick={() => inputRef.current?.click()}
        title="Clique para alterar a logo"
      >
        {logoExibida ? (
          <>
            <img src={logoExibida} alt="Logo" className="w-full h-full object-contain p-1" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
              <Upload className="w-5 h-5 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-300">
            <Upload className="w-6 h-6" />
            <span className="text-[10px]">Logo</span>
          </div>
        )}
      </div>

      {/* Paleta de cor extraída */}
      {corExtraida && (
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-4 rounded-full border border-gray-200 shrink-0"
            style={{ backgroundColor: corExtraida }}
            title={`Cor extraída: ${corExtraida}`}
          />
          <span className="text-[10px] text-gray-400 font-mono">{corExtraida}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
        className="hidden"
        onChange={aoSelecionarArquivo}
      />

      {/* Botões de ação */}
      <div className="flex gap-2">
        {arquivo ? (
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 text-xs bg-[#1A3A2C] hover:bg-[#5BBD9B] text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            {salvando ? 'Salvando...' : 'Salvar logo'}
          </button>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Upload className="w-3 h-3" />
            {logoExibida ? 'Alterar logo' : 'Subir logo'}
          </button>
        )}

        {logoExibida && !arquivo && (
          <button
            onClick={remover}
            disabled={removendo}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg transition-colors"
          >
            {removendo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Mensagem de feedback */}
      {mensagem && (
        <p className={`text-xs flex items-center gap-1 ${mensagem.tipo === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
          {mensagem.tipo === 'ok'
            ? <CheckCircle2 className="w-3 h-3" />
            : <AlertCircle className="w-3 h-3" />
          }
          {mensagem.texto}
        </p>
      )}

      <p className="text-[10px] text-gray-300 text-center leading-tight">
        PNG, JPG, SVG ou WEBP · máx 2MB<br />
        A cor da página será extraída da logo
      </p>
    </div>
  )
}
