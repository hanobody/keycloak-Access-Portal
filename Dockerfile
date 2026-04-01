FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ARG AUTH_SECRET=build-placeholder-secret-123456
ARG KEYCLOAK_ISSUER=https://auth.optlink.top/realms/devops
ARG KEYCLOAK_CLIENT_ID=access-portal
ARG KEYCLOAK_CLIENT_SECRET=build-placeholder-client-secret
ENV AUTH_SECRET=$AUTH_SECRET
ENV KEYCLOAK_ISSUER=$KEYCLOAK_ISSUER
ENV KEYCLOAK_CLIENT_ID=$KEYCLOAK_CLIENT_ID
ENV KEYCLOAK_CLIENT_SECRET=$KEYCLOAK_CLIENT_SECRET
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
