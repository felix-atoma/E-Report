#!/usr/bin/env bash
# NovaBulletin — mettre le serveur à jour avec le dernier code (après un « git push »).
# Sur la machine :   bash /opt/novabulletin/deploy/server/update.sh
set -euo pipefail
cd /opt/novabulletin
git pull --ff-only
cd deploy/server
sudo docker compose --env-file .env up -d --build api
sudo docker image prune -f >/dev/null
echo "✅ Serveur mis à jour."
