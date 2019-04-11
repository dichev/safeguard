# Grafana / Prometheus monitoring

Safeguard exposes prometheus metrics which should be displayed in Grafana for greater visibility and alerting.

Here is an example docker stack with configured dashboard showing all metrics

### Run
```bash
cd test/monitoring
docker-compose up
```

In browser go to:
- **Grafana:** [http://localhost:4444](http://localhost:3000) (admin : admin) - look for SafeGuard dashboard
- **Prometheus:** [http://localhost:9090/graph](http://localhost:9090/graph)

```bash
./run.sh
```
When this script is stopped it will destroy the container automatically (it's intended only for test purposes)


### Metrics source
```
curl http://localhost:4444/heartbeat
curl http://localhost:4444/metrics
```