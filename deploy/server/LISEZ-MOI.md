# Héberger le serveur NovaBulletin gratuitement (Google Cloud)

Le serveur (API) tourne sur la machine gratuite **Google Cloud « e2-micro »** (offre *Always Free*).
La base de données (Supabase), les fichiers (Cloudinary) et le site (Vercel) ne bougent pas.

Limites de l'offre gratuite : 1 machine e2-micro (2 vCPU partagés, 1 Go de mémoire — le script ajoute
4 Go de swap), 30 Go de disque standard, 1 Go de trafic sortant par mois (au-delà : environ 0,12 $/Go).
Seules les régions **us-west1, us-central1 et us-east1** sont gratuites.

## 1. Créer le compte (vous)

1. Allez sur **https://console.cloud.google.com** avec votre compte Google → acceptez les conditions.
2. **Activer la facturation** (« Start free ») : carte bancaire, vérification seulement. Les 300 $ de
   crédit d'essai ne sont pas nécessaires pour la machine e2-micro, qui reste gratuite ensuite.
3. Conseillé : **Facturation → Budgets et alertes → Créer un budget** de 1 $ pour être prévenu par e-mail.

## 2. Créer la machine (vous, ~5 min)

Menu ☰ → **Compute Engine → Instances de VM** (activez l'API si demandé, 1 minute) → **Créer une instance** :

1. **Nom** : `novabulletin`.
2. **Région** : **us-central1 (Iowa)** (ou us-east1 / us-west1 — pas une autre, sinon c'est payant).
3. **Type de machine** : série **E2** → **e2-micro**.
4. **Disque de démarrage** → *Modifier* : **Ubuntu**, **Ubuntu 22.04 LTS (x86/64)**,
   type **Disque persistant standard**, taille **30 Go**.
5. **Pare-feu** : cochez **Autoriser le trafic HTTP** et **Autoriser le trafic HTTPS**.
6. **Avancé → Sécurité → Gérer l'accès → Ajouter un élément** (clés SSH) : collez la clé publique
   fournie par l'assistant (une ligne qui commence par `ssh-ed25519` et finit par `novabulletin`).
7. **Créer**. Notez l'**adresse IP externe** affichée (ex. `34.123.45.67`).

## 3. Installer le serveur (l'assistant, ou vous)

Donnez l'adresse IP à l'assistant : il lance l'installation. Ou, depuis le dossier du projet :

```powershell
scp -i $HOME\.ssh\novabulletin_gcp deploy\server\.env deploy\server\setup.sh novabulletin@IP:~/
ssh -i $HOME\.ssh\novabulletin_gcp novabulletin@IP "bash ~/setup.sh"
```

Le script installe Docker, ajoute la mémoire d'appoint, télécharge le code, construit et démarre le
serveur avec une adresse HTTPS gratuite du type `https://34-123-45-67.sslip.io/api` (10 à 20 minutes la
première fois sur e2-micro).

## 4. Brancher le site sur le nouveau serveur

- `frontend/.env.production` → `VITE_API_URL=https://<adresse>/api`, puis push (Vercel republie le site).
- Google (connexion avec Google) : console Google Cloud → **API et services → Identifiants** → client OAuth
  → ajouter l'URI de redirection `https://<adresse>/api/auth/google/callback`.

> Ne pas arrêter la machine : l'adresse IP externe pourrait changer, et l'adresse du site avec elle.

## Mettre à jour le serveur après un changement de code

```bash
ssh -i ~/.ssh/novabulletin_gcp novabulletin@IP "bash /opt/novabulletin/deploy/server/update.sh"
```

## Dépannage

- Journaux : `sudo docker compose -f /opt/novabulletin/deploy/server/docker-compose.yml logs --tail=100 api`
- Redémarrer : `sudo docker compose -f /opt/novabulletin/deploy/server/docker-compose.yml restart`
- Le fichier `.env` contient des secrets : ne jamais le publier ni l'envoyer par message.

## Autre hébergeur (Oracle Cloud)

Les mêmes scripts fonctionnent sur une machine Oracle « Always Free » (Ubuntu, utilisateur `ubuntu`) :
ouvrir les ports 80 et 443 dans la *Security List* du sous-réseau, puis lancer `setup.sh` de la même façon.
