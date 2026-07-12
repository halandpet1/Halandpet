FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY . .

RUN npm ci --omit=optional && npx prisma generate && npm run build && npm prune --omit=dev

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENTRYPOINT ["sh", "-c", "npx prisma migrate deploy && npm run start -- --hostname 0.0.0.0"]
