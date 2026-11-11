# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
RUN mkdir -p /etc/nginx/templates /etc/nginx/snippets
COPY nginx/default.conf nginx/tls.conf nginx/locations.conf /etc/nginx/templates/
COPY nginx/nginx-entrypoint.sh /usr/local/bin/mc-nginx-entrypoint.sh
RUN chmod +x /usr/local/bin/mc-nginx-entrypoint.sh
COPY --from=build /web/dist /usr/share/nginx/html
EXPOSE 80 443
ENTRYPOINT ["/usr/local/bin/mc-nginx-entrypoint.sh"]
