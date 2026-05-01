#!/bin/bash
# MedDigital — deploy rápido
# Uso: ./deploy.sh "mensagem do commit" (ou sem argumento para mensagem automática)

MSG="${1:-update: $(date '+%d/%m %H:%M')}"

echo "📦 Preparando deploy..."
git add -A

if git diff --cached --quiet; then
  echo "✅ Nada para commitar — fazendo push do que já está commitado..."
else
  git commit -m "$MSG"
fi

echo "🚀 Enviando para o GitHub (Vercel vai fazer deploy automaticamente)..."
git push

echo "✅ Pronto! Acompanhe o deploy em: https://vercel.com/eddiemoraes1-afk/med-digital"
