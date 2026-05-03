'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function aprovarMedico(medicoId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('medicos')
    .update({ status: 'aprovado' })
    .eq('id', medicoId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/admin/medicos')
}

export async function reprovarMedico(medicoId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('medicos')
    .update({ status: 'reprovado' })
    .eq('id', medicoId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  revalidatePath('/admin/medicos')
}

export async function toggleMedicoAtivo(medicoId: string, ativo: boolean) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('medicos')
    .update({ ativo })
    .eq('id', medicoId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/medicos')
  revalidatePath(`/admin/medicos/${medicoId}`)
}
