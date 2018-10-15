# Bull Queue Exporter

Prometheus exporter for Bull metrics.
Data is scraped by [prometheus](https://prometheus.io).


# Docker 

image: `274311808069.dkr.ecr.us-east-1.amazonaws.com/bull-prom-metrics:latest`

| variable             | default                  | description                                |
|----------------------|--------------------------|--------------------------------------------|
| EXPORTER_REDIS_URL   | redis://localhost:6379/0 | Redis uri to connect                       |
| EXPORTER_PREFIX      | bull                     | prefix for queues                          |
| EXPORTER_STAT_PREFIX | uhapp_queue_             | prefix for exported metrics                |
| EXPORTER_QUEUES      | -                        | a space separated list of queues to check  |
