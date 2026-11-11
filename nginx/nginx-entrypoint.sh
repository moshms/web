#!/bin/sh
set -eu

MC_DOMAIN="${MC_DOMAIN:-_}"
export MC_DOMAIN

mkdir -p /etc/nginx/conf.d /etc/nginx/snippets

if [ "${MC_TLS:-off}" = "on" ]; then
    envsubst '${MC_DOMAIN}' < /etc/nginx/templates/tls.conf > /etc/nginx/conf.d/default.conf
else
    cp /etc/nginx/templates/default.conf /etc/nginx/conf.d/default.conf
fi

cp /etc/nginx/templates/locations.conf /etc/nginx/snippets/mc-locations.conf

(while true; do sleep 21600; nginx -s reload || true; done) &

exec nginx -g 'daemon off;'
