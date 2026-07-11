FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY . .

RUN npm ci
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

EXPOSE 3000
ENV PORT=3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
