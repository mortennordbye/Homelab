#!/usr/bin/env bash
set -euo pipefail

# required env vars provided by env_file=.env
: "${PORT_FILE:?missing PORT_FILE}"
: "${QBT_USER:?missing QBT_USER}"
: "${QBT_PASS:?missing QBT_PASS}"
: "${QBT_PORT:?missing QBT_PORT}"

# sanity checks
if [[ ! -r "$PORT_FILE" ]]; then
  echo "ERROR: $PORT_FILE not found or unreadable" >&2
  exit 1
fi

port="$(<"$PORT_FILE")"
if ! [[ "$port" =~ ^[0-9]+$ ]]; then
  echo "ERROR: '$port' is not a number" >&2
  exit 1
fi

# wait for qBittorrent to come up
timeout 180 bash -c 'until nc -z 127.0.0.1 "$QBT_PORT"; do sleep 5; done'

# wait for WebUI auth to succeed
timeout 180 bash -c '
  until curl --silent --retry 10 --retry-delay 15 --max-time 10 \
              --data "username=$QBT_USER&password=$QBT_PASS" \
              --cookie-jar /tmp/qb-cookies.txt \
              http://127.0.0.1:$QBT_PORT/api/v2/auth/login >/dev/null
  do
    sleep 15
  done
'

# update listen_port
if curl --silent --retry 10 --retry-delay 15 --max-time 10 \
        --data "json={\"random_port\":false,\"listen_port\":${port}}" \
        --cookie /tmp/qb-cookies.txt \
        http://127.0.0.1:${QBT_PORT}/api/v2/app/setPreferences >/dev/null; then
  echo "listen_port set to ${port}"
else
  echo "failed to set listen_port" >&2
  exit 1
fi
