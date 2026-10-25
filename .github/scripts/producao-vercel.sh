#!/usr/bin/env bash
# Promoção e rollback da produção pela API REST da Vercel.
#
# Os comandos `vercel promote` e `vercel rollback` da CLI consultam a conta
# pessoal (/v2/user), que o token do pipeline, restrito à equipe, não acessa.
# Os endpoints de projeto usados aqui são os mesmos que a CLI chama por dentro
# e aceitam o token restrito.
#
# Uso:
#   producao-vercel.sh id <url-do-deploy>   → ID do deploy
#   producao-vercel.sh atual                → ID do deploy em produção (vazio se nenhum)
#   producao-vercel.sh promover <id>        → coloca o deploy no domínio de produção
#   producao-vercel.sh reverter <id>        → volta a produção para um deploy anterior
#
# Ambiente: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID.
set -euo pipefail

: "${VERCEL_TOKEN:?}" "${VERCEL_ORG_ID:?}" "${VERCEL_PROJECT_ID:?}"
readonly API=https://api.vercel.com
readonly TENTATIVAS=36 INTERVALO_S=5 # até 3 minutos esperando a troca de domínio

# Em caso de erro, repassa a resposta da API ao log (código e mensagem; não
# contém o token).
chamar() {
  local metodo=$1 caminho=$2 resposta
  if ! resposta=$(curl -sS --fail-with-body --max-time 30 -X "$metodo" \
    -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' \
    ${3:+--data "$3"} "$API$caminho?teamId=$VERCEL_ORG_ID"); then
    echo "::error::API da Vercel, $metodo $caminho: $resposta" >&2
    return 1
  fi
  printf '%s' "$resposta"
}

producao_atual() {
  chamar GET "/v9/projects/$VERCEL_PROJECT_ID" | jq -r '.targets.production.id // empty'
}

# A promoção e o rollback são assíncronos: só terminam quando o projeto aponta
# a produção para o deploy pedido.
aguardar_producao() {
  local esperado=$1
  for ((i = 1; i <= TENTATIVAS; i++)); do
    if [[ "$(producao_atual)" == "$esperado" ]]; then
      echo "produção aponta para $esperado"
      return 0
    fi
    sleep "$INTERVALO_S"
  done
  echo "::error::a produção não passou para $esperado em $((TENTATIVAS * INTERVALO_S)) s"
  return 1
}

case "${1:-}" in
  id) chamar GET "/v13/deployments/${2#https://}" | jq -re .id ;;
  atual) producao_atual ;;
  promover)
    chamar POST "/v10/projects/$VERCEL_PROJECT_ID/promote/$2" '{}' > /dev/null
    aguardar_producao "$2"
    ;;
  reverter)
    chamar POST "/v9/projects/$VERCEL_PROJECT_ID/rollback/$2" '{}' > /dev/null
    aguardar_producao "$2"
    ;;
  *)
    echo "uso: $0 {id <url>|atual|promover <id>|reverter <id>}" >&2
    exit 2
    ;;
esac
