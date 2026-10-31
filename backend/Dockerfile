FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine
# Chromium pour les PDF ; polices Liberation (mêmes dimensions qu Arial) et DejaVu pour une mise en page identique
RUN apk add --no-cache openssl chromium nss freetype harfbuzz ca-certificates ttf-freefont font-liberation ttf-dejavu
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
EXPOSE 4000
# Au démarrage : met la base au niveau du schéma Prisma (ajouts seulement — sans --accept-data-loss, un
# changement qui supprimerait des données est refusé et signalé dans les logs), puis lance le serveur.
# Un échec n'empêche pas le démarrage : le serveur reste joignable et l'erreur est visible dans les logs Render.
CMD ["sh", "-c", "npx prisma db push --skip-generate || echo 'PRISMA DB PUSH FAILED: schema not applied, see error above'; exec node dist/main"]
