#! /bin/bash

source .envrc

echo "Stopping SubQL nodes..."
docker compose stop subql-node-cfg subql-node-base subql-node-eth

echo "Creating database backup..."
docker compose exec subql-db pg_dump -U ${SUBQL_DB_USER} postgres | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

echo "Restarting SubQL nodes..."
docker compose start subql-node-cfg subql-node-base subql-node-eth

echo "Backup complete!"