# Héberger le serveur NovaBulletin sur Oracle Cloud (gratuit)

Le serveur (API) tourne sur une machine **Oracle Cloud « Always Free »**. La base de données (Supabase),
les fichiers (Cloudinary) et le site (Vercel) ne bougent pas.

## 1. Créer le compte Oracle (vous)

1. Allez sur **https://www.oracle.com/cloud/free/** → **Start for free**.
2. Région d'accueil (**Home Region**) : **Germany Central (Frankfurt)** — on ne peut plus la changer ensuite.
3. Renseignez vos informations et une carte bancaire (vérification seulement, rien n'est prélevé pour les
   ressources « Always Free »).

## 2. Créer la machine (vous, ~10 min)

1. Menu ☰ → **Compute → Instances → Create instance**.
2. **Name** : `novabulletin`.
3. **Image and shape** → *Edit* :
   - Image : **Canonical Ubuntu 22.04** (ou 24.04).
   - Shape : **Ampere → VM.Standard.A1.Flex**, **2 OCPU** et **12 GB** de mémoire
     (mention « Always Free-eligible »).
4. **Networking** : laissez créer un nouveau réseau (VCN) avec un **sous-réseau public** et
   **Assign a public IPv4 address** coché.
5. **Add SSH keys** : **Generate a key pair for me** → **Save private key** (gardez ce fichier, ex.
   `C:\Users\felix\novabulletin.key`).
6. **Create**. Notez l'**adresse IP publique** affichée (ex. `129.151.10.20`).

> Message « Out of capacity » : réessayez un peu plus tard, ou changez d'*Availability domain*.

## 3. Ouvrir les ports web (vous, 2 min)

Page de l'instance → lien du **Subnet** → **Security Lists** → *Default Security List* →
**Add Ingress Rules** :
- Source CIDR `0.0.0.0/0`, protocole **TCP**, ports de destination **80,443** → *Add*.

## 4. Installer le serveur (une commande)

Depuis Windows (PowerShell), dans le dossier du projet :

```powershell
scp -i C:\Users\felix\novabulletin.key deploy\oracle\.env deploy\oracle\setup.sh ubuntu@IP_PUBLIQUE:~/
ssh -i C:\Users\felix\novabulletin.key ubuntu@IP_PUBLIQUE "bash ~/setup.sh"
```

Le script installe Docker, ouvre le pare-feu, télécharge le code, construit et démarre le serveur avec
une adresse HTTPS gratuite du type `https://129-151-10-20.sslip.io/api`. Il affiche l'adresse à la fin.

> Ou : donnez à l'assistant l'IP et le chemin du fichier de clé, il lance l'installation lui-même.

## 5. Brancher le site sur le nouveau serveur

- `frontend/.env.production` → `VITE_API_URL=https://<adresse>/api`, puis push (Vercel republie le site).
- Google (connexion avec Google) : console Google Cloud → identifiants OAuth → ajouter l'URI de redirection
  `https://<adresse>/api/auth/google/callback`.

## Mettre à jour le serveur après un changement de code

```bash
ssh -i C:\Users\felix\novabulletin.key ubuntu@IP_PUBLIQUE "bash /opt/novabulletin/deploy/oracle/update.sh"
```

## Dépannage

- Journaux : `sudo docker compose -f /opt/novabulletin/deploy/oracle/docker-compose.yml logs --tail=100 api`
- Redémarrer : `sudo docker compose -f /opt/novabulletin/deploy/oracle/docker-compose.yml restart`
- Le fichier `.env` contient des secrets : ne jamais le publier ni l'envoyer par message.
