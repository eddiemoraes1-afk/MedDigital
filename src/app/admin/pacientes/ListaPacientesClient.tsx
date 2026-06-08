'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Activity, User, Phone, FileText, Building2,
  Calendar, CheckCircle2, Stethoscope,
} from 'lucide-react'

const POR_PAGINA = 50

interface PacienteItem {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  convenio: string | null
  criado_em: string
  totalAtend: number
  totalAgend: number
  totalConsultas: number
  ultimoAtend: string | null
  vinculo: {
    cargo?: string | null
    empresas?: { nome?: string } | null
  } | null
}

interface Props {
  pacientes: PacienteItem[]
}

export default function ListaPacientesClient({ pacientes }: Props) {
  const [pagina, setPagina] = useState(1)

  const totalPaginas = Math.max(1, Math.ceil(pacientes.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const paginados = pacientes.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  if (pacientes.length === 0) {
    return (
      <div className="py-16 text-center">
        <Activity className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 font-medium">Nenhum paciente encontrado com esses filtros</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paciente</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">CPF</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contato</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresa</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Consultas</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Último atend.</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cadastro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginados.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <Link
                        href={`/admin/pacientes/${p.id}`}
                        className="font-medium text-[#5BBD9B] hover:underline"
                      >
                        {p.nome}
                      </Link>
                      {p.convenio && <p className="text-xs text-gray-400">{p.convenio}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {p.cpf ? (
                    <span className="font-mono text-xs text-gray-600 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-gray-400" />{p.cpf}
                    </span>
                  ) : <span className="text-xs text-gray-300">—</span>}
                </td>
                <td className="px-6 py-4">
                  {p.telefone ? (
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />{p.telefone}
                    </span>
                  ) : <span className="text-xs text-gray-300">—</span>}
                </td>
                <td className="px-6 py-4">
                  {p.vinculo ? (
                    <div>
                      <span className="text-xs font-medium text-purple-700 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {(p.vinculo.empresas as any)?.nome ?? '—'}
                      </span>
                      {p.vinculo.cargo && <p className="text-xs text-gray-400 mt-0.5">{p.vinculo.cargo}</p>}
                    </div>
                  ) : <span className="text-xs text-gray-300">Particular</span>}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {p.totalAtend > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                        <Stethoscope className="w-3 h-3" />
                        {p.totalAtend} via triagem
                      </span>
                    )}
                    {p.totalAgend > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">
                        <CheckCircle2 className="w-3 h-3" />
                        {p.totalAgend} agendada{p.totalAgend !== 1 ? 's' : ''}
                      </span>
                    )}
                    {p.totalConsultas === 0 && (
                      <span className="text-xs text-gray-400 px-2">0 consultas</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {p.ultimoAtend ? (
                    <span className="text-xs text-[#5BBD9B] font-medium flex items-center gap-1">
                      <Stethoscope className="w-3 h-3" />
                      {new Date(p.ultimoAtend).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(p.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 text-xs text-gray-500">
          <span>
            Exibindo {(paginaAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaAtual * POR_PAGINA, pacientes.length)} de {pacientes.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
              className="px-2.5 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ‹ Anterior
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPaginas || Math.abs(p - paginaAtual) <= 2)
              .reduce<(number | '…')[]>((acc, p, i, arr) => {
                if (i > 0 && (arr[i - 1] as number) + 1 < p) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '…'
                  ? <span key={`e${i}`} className="px-1">…</span>
                  : <button
                      key={p}
                      onClick={() => setPagina(p as number)}
                      className={`w-8 h-7 rounded-lg border text-xs font-medium transition-colors ${
                        paginaAtual === p
                          ? 'bg-[#1A3A2C] border-[#1A3A2C] text-white'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
              )}
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual === totalPaginas}
              className="px-2.5 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Próxima ›
            </button>
          </div>
        </div>
      )}
    </>
  )
}
