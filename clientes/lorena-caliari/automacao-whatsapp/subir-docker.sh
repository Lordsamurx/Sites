#!/usr/bin/env bash
# Importa (ou atualiza) os dois workflows no n8n do Docker, publica o 02 e sobe o n8n.
# Uso: ./subir-docker.sh   (no Windows, rode os mesmos comandos do README no PowerShell)
set -euo pipefail
cd "$(dirname "$0")"
docker compose run --rm --no-deps n8n import:workflow --separate --input=/workflows
docker compose run --rm --no-deps n8n publish:workflow --id=LorenaAgenda0002
docker compose up -d
echo "Pronto: abra http://localhost:5678"
