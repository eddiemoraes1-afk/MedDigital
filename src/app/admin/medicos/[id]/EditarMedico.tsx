'use client'

import { useRef, useState } from 'react'
import { Camera, CheckCircle2, Loader2, Pencil, Trash2, User2 } from 'lucide-react'

interface Props {
  medicoId: string
  nomeatual: string
  especialidadeAtual: string | null
  crmAtual: string | null
  crmUfAtual: string | null
  rqeAtual: string | null
  sexoAtual: string | null
  telefoneAtual: string | null
  cidadeAtual: string | null
  estadoAtual: string | null
  bioAtual: string | null
  fotoAtual: string | null
}

export default function EditarMedico({
  medicoId,
  nomeatual,
  especialidadeAtual,
  crmAtual,
  crmUfAtual,
  rqeAtual,
  sexoAtual,
  telefoneAtual,
  cidadeAtual,
  estadoAtual,
  bioAtual,
  fotoAtual,
}: Props) {
  const [aberto, setAberto] = useState(false)

  /* ── foto ──────────────────────────────────────────────────────────── */
  const [fotoUrl, setFotoUrl] = useState<string | null>(fotoAtual)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFoto(true)
    setErroFoto('')
    const fd = new FormData()
    fd.append('arquivo', file)
    try {
      const res = await fetch(`/api/admin/medico/${medicoId}/foto`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setErroFoto(json.error ?? 'Erro no upload'); return }
      setFotoUrl(json.foto_url)
    } catch {
      setErroFoto('Erro de conexão')
    } finally {
      setUploadingFoto(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleRemoverFoto() {
    setUploadingFoto(true)
    await fetch(`/api/admin/medico/${medicoId}/foto`, { method: 'DELETE' })
    setFotoUrl(null)
    setUploadingFoto(false)
  }

  /* ── dados ─────────────────────────────────────────────────────────── */
  const [nome, setNome] = useState(nomeatual)
  const [especialidade, setEspecialidade] = useState(especialidadeAtual ?? '')
  const [crm, setCrm] = useState(crmAtual ?? '')
  const [crmUf, setCrmUf] = useState(crmUfAtual ?? '')
  const [rqe, setRqe] = useState(rqeAtual ?? '')
  const [sexo, setSexo] = useState(sexoAtual ?? '')
  const [telefone, setTelefone] = useState(telefoneAtual ?? '')
  const [cidade, setCidade] = useState(cidadeAtual ?? '')
  const [estado, setEstado] = useState(estadoAtual ?? '')
  const [bio, setBio] = useState(bioAtual ?? '')

  const [savingDados, setSavingDados] = useState(false)
  const [savedDados, setSavedDados] = useState(false)
  const [erroDados, setErroDados] = useState('')

  async function handleSalvarDados() {
    if (!nome.trim()) { setErroDados('Nome é obrigatório'); return }
    setSavingDados(true)
    setErroDados('')
    try {
      const res = await fetch(`/api/admin/medico/${medicoId}/dados`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, especialidade, crm, crm_uf: crmUf, rqe, sexo, telefone, cidade, estado, bio }),
      })
      const json = await res.json()
      if (!res.ok) { setErroDados(json.error ?? 'Erro ao salvar'); return }
      setSavedDados(true)
      setTimeout(() => setSavedDados(false), 2500)
    } catch {
      setErroDados('Erro de conexão')
    } finally {
      setSavingDados(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setAberto(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-[#1A3A2C] text-sm flex items-center gap-2">
          <Pencil className="w-4 h-4 text-gray-400" /> Editar dados do médico
        </span>
        <span className="text-gray-400 text-xs">{aberto ? '▲' : '▼'}</span>
      </button>

      {aberto && (
        <div className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">

          {/* ── Foto ── */}
          <div>
            <p className="text-xs text-gray-400 font-medium mb-2">Foto do médico</p>
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                {fotoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={fotoUrl} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <User2 className="w-8 h-8 text-gray-300" />
                )}
                {uploadingFoto && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-[#5BBD9B]" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingFoto}
                  className="flex items-center gap-1.5 text-xs bg-[#1A3A2C] text-white px-3 py-1.5 rounded-lg hover:bg-[#122a1f] transition-colors disabled:opacity-50"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {fotoUrl ? 'Trocar foto' : 'Enviar foto'}
                </button>
                {fotoUrl && (
                  <button
                    onClick={handleRemoverFoto}
                    disabled={uploadingFoto}
                    className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFoto} />
            </div>
            {erroFoto && <p className="text-xs text-red-500 mt-1">{erroFoto}</p>}
            <p className="text-xs text-gray-400 mt-1">PNG, JPG ou WEBP · máx. 3 MB</p>
          </div>

          {/* ── Dados ── */}
          <div className="space-y-3">
            <Field label="Nome completo *" value={nome} onChange={setNome} />
            <Field label="Especialidade" value={especialidade} onChange={setEspecialidade} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="CRM" value={crm} onChange={setCrm} />
              <Field label="UF do CRM" value={crmUf} onChange={setCrmUf} placeholder="SP" maxLength={2} />
            </div>
            <Field label="RQE (opcional)" value={rqe} onChange={setRqe} placeholder="Ex: 12345" />
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Sexo</label>
              <div className="flex gap-2">
                {[['masculino', 'Masculino (Dr.)'], ['feminino', 'Feminino (Dra.)']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSexo(val)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border-2 font-medium transition-all ${
                      sexo === val
                        ? 'bg-[#1A3A2C] border-[#1A3A2C] text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-[#1A3A2C]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Telefone" value={telefone} onChange={setTelefone} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Cidade" value={cidade} onChange={setCidade} />
              <Field label="Estado" value={estado} onChange={setEstado} placeholder="SP" maxLength={2} />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1 block">Bio</label>
              <textarea
                value={bio}
                onChange={e => { setBio(e.target.value); setSavedDados(false) }}
                rows={3}
                placeholder="Breve apresentação do médico..."
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40 resize-none"
              />
            </div>

            {erroDados && <p className="text-xs text-red-500">{erroDados}</p>}

            <button
              onClick={handleSalvarDados}
              disabled={savingDados}
              className="w-full flex items-center justify-center gap-1.5 bg-[#1A3A2C] hover:bg-[#122a1f] text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-60 transition-colors"
            >
              {savingDados ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : savedDados ? (
                <><CheckCircle2 className="w-3.5 h-3.5 text-[#5BBD9B]" /> Salvo!</>
              ) : (
                'Salvar alterações'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, maxLength,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 font-medium mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5BBD9B]/40"
      />
    </div>
  )
}
