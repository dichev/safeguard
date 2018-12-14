# Prometheus

This script will run prometheus container that listen for safeguard metrics. 
```bash
./run.sh
```
When this script is stopped it will destroy the container automatically (it's intended only for test purposes)

### Prometheus dash
``` 
http://localhost:9090/graph
```

### Metrics source
```
curl http://localhost:3000/heartbeat
curl http://localhost:3000/metrics
```