# Pasarela: compila la SPA y la sirve con Nginx. Contexto de construcción: la raíz del repositorio.
# VERIFICAR: fijar las etiquetas exactas de las imágenes base al construir por primera vez (ADR-14).

# Etapa 1: compilar la SPA
FROM node:24-alpine AS web-build
WORKDIR /build
COPY web/package.json web/package-lock.json web/.npmrc ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Etapa 2: Nginx (arquitectura 2.4: 1.30.5 estable)
FROM nginx:1.30.5-alpine
COPY deploy/gateway/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/gateway/snippets/ /etc/nginx/gateway/
COPY --from=web-build /build/dist /usr/share/nginx/html
EXPOSE 80
