# syntax=docker/dockerfile:1.7
# ------------------------------------------------------------------ build
FROM node:26-alpine AS builder
WORKDIR /app

# Vite inlines VITE_* at build time.
ARG VITE_API_URL=http://localhost:8000
ARG VITE_SITE_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SITE_URL=$VITE_SITE_URL

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------------------------------------------------------------- runtime
FROM nginx:1.27-alpine AS runner

RUN apk add --no-cache curl
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
