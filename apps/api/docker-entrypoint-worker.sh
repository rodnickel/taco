#!/bin/sh
set -e

echo "=== Taco Worker Startup ==="

# Aguarda o PostgreSQL estar disponivel
echo "Aguardando PostgreSQL..."
until nc -z postgres 5432; do
  echo "PostgreSQL ainda nao disponivel, aguardando..."
  sleep 2
done
echo "PostgreSQL disponivel!"

# Aguarda o Redis estar disponivel
echo "Aguardando Redis..."
until nc -z redis 6379; do
  echo "Redis ainda nao disponivel, aguardando..."
  sleep 2
done
echo "Redis disponivel!"

echo "Iniciando worker..."
exec node dist/worker.js
