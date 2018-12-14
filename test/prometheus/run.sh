#!/usr/bin/env bash
set -e

# Always start from the base project directory
cd $(dirname $(realpath $0))/../


# auto stop the container on exit
function finish {
    docker stop prometheus
}
trap finish EXIT




# run the container
echo -e "Running Prometheus container, please see:\nhttp://localhost:9090/graph\n\n"
WIN_PATH='d:/www/analytics/safeguard/test/prometheus'
docker run --rm \
  --name prometheus \
  --add-host="localhost:192.168.100.100" \
  -p 9090:9090 \
  -v ${WIN_PATH}/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus



