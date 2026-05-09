'use client'

import { useState } from 'react'
import { X, Mail, MessageCircle, Download, Copy, Check, Smartphone } from 'lucide-react'
import {
  type AtestadoHTMLParams,
  baixarAtestado,
  criarArquivoAtestado,
  textoResumido,
} from '@/lib/atestadoHTML'

interface Props {
  params: AtestadoHTMLParams
  onClose: () => void
}

export default function AtestadoShareModal({ params, onClose }: Props) {
  const [copiado, setCopiado] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const [compartilhando, setCompartilhando] = useState(false)

  const texto = textoResumido(params)
  const assunto = encodeURIComponent('Atestado Médico — RovarisMed')
  const corpo = encodeURIComponent(texto)

  async function compartilharArquivo() {
    setCompartilhando(true)
    try {
      const file = criarArquivoAtestado(params)
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Atestado Médico — RovarisMed' })
        onClose()
        return
      }
      // Fallback: share só texto
      if ('share' in navigator) {
        await navigator.share({ title: 'Atestado Médico — RovarisMed', text: texto })
        onClose()
        return
      }
    } catch {
      // usuário cancelou — fica no modal
    } finally {
      setCompartilhando(false)
    }
  }

  function baixar() {
    setBaixando(true)
    baixarAtestado(params)
    setTimeout(() => setBaixando(false), 1500)
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
            <p className="font-semibold text-[#1A3A2C] text-sm">Encaminhar atestado</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {params.dias} dia(s) · {params.paciente.nome}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {/* Compartilhar arquivo (mobile native share) */}
          {temNativeShare && (
            <button
              onClick={compartilharArquivo}
              disabled={compartilhando}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 border border-[#5BBD9B] bg-[#F0FDF4] transition-colors"
            >
              <div className="w-9 h-9 bg-[#5BBD9B] rounded-xl flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm text-[#1A3A2C]">
                  {compartilhando ? 'Abrindo...' : 'Compartilhar arquivo'}
                </p>
                <p className="text-xs text-gray-500">WhatsApp, iMessage, e-mail, Drive…</p>
              </div>
            </button>
          )}

          {/* Email */}
          <a
            href={`mailto:?subject=${assunto}&body=${corpo}`}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors"
          >
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-700">E-mail</p>
              <p className="text-xs text-gray-400">Abre seu cliente de e-mail</p>
            </div>
          </a>

          {/* WhatsApp Web */}
          <a
            href={`https://wa.me/?text=${corpo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors"
          >
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-700">WhatsApp</p>
              <p className="text-xs text-gray-400">Abre o WhatsApp Web com o texto</p>
            </div>
          </a>

          {/* Baixar arquivo */}
          <button
            onClick={baixar}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${baixando ? 'bg-green-100' : 'bg-purple-100'}`}>
              {baixando
                ? <Check className="w-4 h-4 text-green-600" />
                : <Download className="w-4 h-4 text-purple-600" />
              }
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-gray-700">
                {baixando ? 'Baixado!' : 'Baixar arquivo'}
              </p>
              <p className="text-xs text-gray-400">Salve e encaminhe pelo app que preferir</p>
            </div>
          </button>

          {/* Copiar texto */}
          <button
            onClick={copiar}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors"
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
              <p className="text-xs text-gray-400">Copia os dados do atestado</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
