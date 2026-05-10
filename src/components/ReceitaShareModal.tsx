'use client'

import { useState } from 'react'
import { X, Mail, MessageCircle, Download, Copy, Check, Smartphone, Loader2, Info } from 'lucide-react'
import {
  type ReceitaHTMLParams,
  gerarHTMLReceita,
  nomeArquivoReceita,
  textoResumidoReceita,
} from '@/lib/receitaHTML'
import { criarFilePDF, baixarComoPDF } from '@/lib/gerarPDF'

interface Props {
  params: ReceitaHTMLParams
  onClose: () => void
}

type Acao = 'share' | 'email' | 'whatsapp' | 'baixar' | null

const LABEL_TIPO: Record<string, string> = {
  simples: 'Receita Simples',
  especial: 'Receita Especial',
  antimicrobiano: 'Antimicrobiano (2 vias)',
}

export default function ReceitaShareModal({ params, onClose }: Props) {
  const [copiado, setCopiado] = useState(false)
  const [acaoAtiva, setAcaoAtiva] = useState<Acao>(null)
  const [erro, setErro] = useState('')

  const texto = textoResumidoReceita(params)
  const tipoLabel = LABEL_TIPO[params.tipo] ?? 'Receita Médica'
  const assunto = encodeURIComponent(`${tipoLabel} — RovarisMed`)
  const corpoPDF = encodeURIComponent(
    `${texto}\n\n— O arquivo PDF da receita foi salvo no seu dispositivo. Adicione-o como anexo.`
  )
  const corpoWA = encodeURIComponent(
    `${texto}\n\n_O PDF da receita foi salvo no seu dispositivo. Anexe o arquivo ao enviar._`
  )
  const htmlDoc = gerarHTMLReceita(params, false)
  const nomeDoc = nomeArquivoReceita(params.paciente, params.dataEmissao)

  const ocupado = acaoAtiva !== null

  async function gerarEExecutar(acao: Acao, executar: () => void) {
    setAcaoAtiva(acao)
    setErro('')
    try {
      await baixarComoPDF(htmlDoc, nomeDoc)
      executar()
    } catch {
      setErro('Erro ao gerar o PDF. Tente novamente.')
    } finally {
      setAcaoAtiva(null)
    }
  }

  async function compartilharNativo() {
    setAcaoAtiva('share')
    setErro('')
    try {
      const file = await criarFilePDF(htmlDoc, nomeDoc)
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${tipoLabel} — RovarisMed` })
        onClose()
        return
      }
      if ('share' in navigator) {
        await navigator.share({ title: `${tipoLabel} — RovarisMed`, text: texto })
        onClose()
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setErro('Erro ao gerar PDF. Tente baixar manualmente.')
    } finally {
      setAcaoAtiva(null)
    }
  }

  async function copiar() {
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const temNativeShare = typeof window !== 'undefined' && 'share' in navigator

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-semibold text-[#1A3A2C] text-sm">Encaminhar receita</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {tipoLabel} · {params.paciente.nome}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">

          {/* Aviso informativo */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-700 mb-1">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>O PDF é gerado e salvo no dispositivo antes de abrir o app. Basta anexá-lo ao enviar.</span>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-600">
              {erro}
            </div>
          )}

          {/* Compartilhar nativo (mobile) */}
          {temNativeShare && (
            <button
              onClick={compartilharNativo}
              disabled={ocupado}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 border border-[#5BBD9B] bg-[#F0FDF4] transition-colors disabled:opacity-60"
            >
              <div className="w-9 h-9 bg-[#5BBD9B] rounded-xl flex items-center justify-center shrink-0">
                {acaoAtiva === 'share'
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <Smartphone className="w-4 h-4 text-white" />
                }
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm text-[#1A3A2C]">
                  {acaoAtiva === 'share' ? 'Gerando PDF…' : 'Compartilhar PDF'}
                </p>
                <p className="text-xs text-gray-500">Envia o arquivo PDF direto pelo app</p>
              </div>
            </button>
          )}

          {/* E-mail — baixa PDF + abre cliente de e-mail */}
          <button
            onClick={() => gerarEExecutar('email', () => {
              window.location.href = `mailto:?subject=${assunto}&body=${corpoPDF}`
            })}
            disabled={ocupado}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors disabled:opacity-60"
          >
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              {acaoAtiva === 'email'
                ? <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                : <Mail className="w-4 h-4 text-blue-600" />
              }
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-gray-700">
                {acaoAtiva === 'email' ? 'Gerando PDF…' : 'E-mail'}
              </p>
              <p className="text-xs text-gray-400">Salva o PDF + abre o cliente de e-mail</p>
            </div>
          </button>

          {/* WhatsApp — baixa PDF + abre WhatsApp Web */}
          <button
            onClick={() => gerarEExecutar('whatsapp', () => {
              window.open(`https://wa.me/?text=${corpoWA}`, '_blank')
            })}
            disabled={ocupado}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors disabled:opacity-60"
          >
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
              {acaoAtiva === 'whatsapp'
                ? <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                : <MessageCircle className="w-4 h-4 text-green-600" />
              }
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-gray-700">
                {acaoAtiva === 'whatsapp' ? 'Gerando PDF…' : 'WhatsApp'}
              </p>
              <p className="text-xs text-gray-400">Salva o PDF + abre o WhatsApp Web</p>
            </div>
          </button>

          {/* Baixar PDF apenas */}
          <button
            onClick={() => gerarEExecutar('baixar', () => {})}
            disabled={ocupado}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors disabled:opacity-60"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${acaoAtiva === 'baixar' ? 'bg-green-100' : 'bg-purple-100'}`}>
              {acaoAtiva === 'baixar'
                ? <Check className="w-4 h-4 text-green-600" />
                : <Download className="w-4 h-4 text-purple-600" />
              }
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-gray-700">
                {acaoAtiva === 'baixar' ? 'Baixando…' : 'Baixar PDF'}
              </p>
              <p className="text-xs text-gray-400">Salva a receita em PDF no dispositivo</p>
            </div>
          </button>

          {/* Copiar texto */}
          <button
            onClick={copiar}
            disabled={ocupado}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors disabled:opacity-60"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${copiado ? 'bg-green-100' : 'bg-gray-100'}`}>
              {copiado
                ? <Check className="w-4 h-4 text-green-600" />
                : <Copy className="w-4 h-4 text-gray-600" />
              }
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-gray-700">
                {copiado ? 'Copiado!' : 'Copiar texto'}
              </p>
              <p className="text-xs text-gray-400">Copia os dados da receita</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
