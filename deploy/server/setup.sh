#!/usr/bin/env bash
# NovaBulletin — installation du serveur sur une machine Linux (Google Cloud ou Oracle Cloud, Ubuntu 22.04/24.04, ARM ou x86).
# À lancer UNE fois, connecté à la machine :   bash setup.sh
# Prérequis : le fichier .env (réglages du serveur) copié dans le même dossier que ce script.
set -euo pipefail

REPO="https://github.com/felix-atoma/E-Report.git"
APP_DIR="/opt/novabulletin"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> 1/6  Mise à jour du système et outils"
export DEBIAN_FRONTEND=noninteractive
sudo -E apt-get update -y -qq
sudo -E apt-get install -y -qq git curl ca-certificates iptables-persistent >/dev/null || sudo -E apt-get install -y -qq git curl ca-certificates

echo "==> 2/6  Installation de Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
fi

echo "==> 3/6  Mémoire d'appoint et ports web 80 et 443"
# Petites machines (Google e2-micro : 1 Go) : 4 Go de swap pour la construction et Chromium
if [ "$(awk '/MemTotal/ {print $2}' /proc/meminfo)" -lt 3000000 ] && ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
  sudo chmod 600 /swapfile && sudo mkswap /swapfile >/dev/null && sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi
# Les images Ubuntu d'Oracle bloquent tout sauf SSH (règle REJECT) : on autorise HTTP et HTTPS avant elle.
# Google Cloud n'a pas de pare-feu sur la machine (il se règle dans la console) : rien à faire.
if sudo iptables -S INPUT | grep -q -- '-j REJECT'; then
  for PORT in 80 443; do
    sudo iptables -C INPUT -p tcp --dport "$PORT" -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 1 -p tcp --dport "$PORT" -j ACCEPT
  done
  sudo netfilter-persistent save 2>/dev/null || sudo sh -c 'iptables-save > /etc/iptables/rules.v4' || true
fi

echo "==> 4/6  Téléchargement du code NovaBulletin"
if [ -d "$APP_DIR/.git" ]; then
  sudo git -C "$APP_DIR" pull --ff-only
else
  sudo git clone --depth 1 "$REPO" "$APP_DIR"
fi
sudo chown -R "$USER":"$USER" "$APP_DIR"

echo "==> 5/6  Réglages du serveur"
if [ ! -f "$APP_DIR/deploy/server/.env" ]; then
  if [ -f "$HERE/.env" ]; then cp "$HERE/.env" "$APP_DIR/deploy/server/.env"
  else echo "ERREUR : fichier .env introuvable (copiez-le à côté de setup.sh)"; exit 1; fi
fi
# Adresse HTTPS gratuite basée sur l'IP publique : 1-2-3-4.sslip.io
PUBLIC_IP="$(curl -fsS https://api.ipify.org || curl -fsS https://ifconfig.me)"
API_DOMAIN="${API_DOMAIN:-$(echo "$PUBLIC_IP" | tr '.' '-').sslip.io}"
grep -q '^API_DOMAIN=' "$APP_DIR/deploy/server/.env" \
  && sed -i "s|^API_DOMAIN=.*|API_DOMAIN=$API_DOMAIN|" "$APP_DIR/deploy/server/.env" \
  || echo "API_DOMAIN=$API_DOMAIN" >> "$APP_DIR/deploy/server/.env"
# Adresse publique du serveur dans les réglages (liens des PDF, retour Google, paiements)
sed -i "s|__API_URL__|https://$API_DOMAIN|g" "$APP_DIR/deploy/server/.env"
chmod 600 "$APP_DIR/deploy/server/.env"

echo "==> 6/6  Construction et démarrage (5 à 10 minutes la première fois)"
cd "$APP_DIR/deploy/server"
sudo docker compose --env-file .env up -d --build

echo
echo "Vérification de l'adresse du serveur (le certificat HTTPS peut prendre 1 minute)…"
for i in $(seq 1 30); do
  if curl -fsS "https://$API_DOMAIN/api/health" >/dev/null 2>&1; then
    echo "✅ Serveur en ligne : https://$API_DOMAIN/api"
    echo "   À mettre dans Vercel (VITE_API_URL) : https://$API_DOMAIN/api"
    exit 0
  fi
  sleep 10
done
echo "⚠️  Le serveur ne répond pas encore. Voir les journaux : sudo docker compose -f $APP_DIR/deploy/server/docker-compose.yml logs --tail=100 api"
echo "   Vérifiez aussi que les ports 80 et 443 sont ouverts (Google : cases HTTP/HTTPS de la machine ; Oracle : Security List — voir LISEZ-MOI)."
